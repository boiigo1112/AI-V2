package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/config"
	"github.com/blacken/admin-panel/models"
	"github.com/blacken/admin-panel/services"
)

type AuthHandler struct {
	svc *services.AuthService
	cfg *config.Config
}

func NewAuthHandler(svc *services.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{svc: svc, cfg: cfg}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	resp, err := h.svc.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	user, err := h.svc.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	if h.cfg.GoogleClientID == "" {
		c.JSON(http.StatusNotImplemented, gin.H{
			"error": "google oauth not configured, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
		})
		return
	}

	q := url.Values{
		"client_id":     {h.cfg.GoogleClientID},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"response_type": {"code"},
		"scope":         {"email profile"},
	}

	c.Redirect(http.StatusTemporaryRedirect, "https://accounts.google.com/o/oauth2/auth?"+q.Encode())
}

type googleTokenResponse struct {
	AccessToken string `json:"access_token"`
}

type googleUserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
	Picture string `json:"picture"`
}

func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing authorization code"})
		return
	}

	token, err := h.exchangeGoogleCode(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "google token exchange failed"})
		return
	}

	info, err := h.fetchGoogleUser(token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch google user info"})
		return
	}

	result, err := h.svc.LoginOrCreateOAuth("google", info.ID, info.Email, info.Name, info.Picture)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) exchangeGoogleCode(code string) (string, error) {
	resp, err := http.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {h.cfg.GoogleClientID},
		"client_secret": {h.cfg.GoogleClientSecret},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != http.StatusOK {
		return "", errors.New("google returned " + resp.Status)
	}

	var tr googleTokenResponse
	if err := json.Unmarshal(body, &tr); err != nil {
		return "", err
	}

	return tr.AccessToken, nil
}

func (h *AuthHandler) fetchGoogleUser(token string) (*googleUserInfo, error) {
	u := "https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + url.QueryEscape(token)
	resp, err := http.Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var info googleUserInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}

	return &info, nil
}

func (h *AuthHandler) GithubLogin(c *gin.Context) {
	if h.cfg.GithubClientID == "" {
		c.JSON(http.StatusNotImplemented, gin.H{
			"error": "github oauth not configured, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET",
		})
		return
	}

	q := url.Values{
		"client_id":    {h.cfg.GithubClientID},
		"redirect_uri": {h.cfg.GithubRedirectURL},
		"scope":        {"user:email"},
	}

	c.Redirect(http.StatusTemporaryRedirect, "https://github.com/login/oauth/authorize?"+q.Encode())
}

type githubEmail struct {
	Email    string `json:"email"`
	Primary  bool   `json:"primary"`
	Verified bool   `json:"verified"`
}

type githubUser struct {
	ID        int    `json:"id"`
	Login     string `json:"login"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Email     string `json:"email"`
}

func (h *AuthHandler) GithubCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		var cb models.OAuthCallback
		if err := c.ShouldBindJSON(&cb); err != nil || cb.Code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing authorization code"})
			return
		}
		code = cb.Code
	}

	token, err := h.exchangeGithubCode(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "github token exchange failed"})
		return
	}

	info, err := h.fetchGithubUser(token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch github user info"})
		return
	}

	result, err := h.svc.LoginOrCreateOAuth("github", info.Login, info.Email, info.Name, info.AvatarURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "authentication failed"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AuthHandler) exchangeGithubCode(code string) (string, error) {
	resp, err := http.PostForm("https://github.com/login/oauth/access_token", url.Values{
		"client_id":     {h.cfg.GithubClientID},
		"client_secret": {h.cfg.GithubClientSecret},
		"code":          {code},
		"redirect_uri":  {h.cfg.GithubRedirectURL},
	})
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	values, err := url.ParseQuery(string(body))
	if err != nil {
		return "", err
	}

	t := values.Get("access_token")
	if t == "" {
		return "", errors.New("github returned no access token")
	}

	return t, nil
}

func (h *AuthHandler) fetchGithubUser(token string) (*githubUser, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var info githubUser
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, err
	}

	if info.Name == "" {
		info.Name = info.Login
	}

	if info.Email == "" {
		email, err := h.fetchGithubPrimaryEmail(token)
		if err == nil {
			info.Email = email
		}
	}

	return &info, nil
}

func (h *AuthHandler) fetchGithubPrimaryEmail(token string) (string, error) {
	req, _ := http.NewRequest("GET", "https://api.github.com/user/emails", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var emails []githubEmail
	if err := json.Unmarshal(body, &emails); err != nil {
		return "", err
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}

	return "", errors.New("no verified primary email found")
}
