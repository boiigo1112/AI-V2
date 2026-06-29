package services

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/blacken/admin-panel/config"
	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/models"
)

type AuthService struct {
	cfg *config.Config
}

func NewAuthService(cfg *config.Config) *AuthService {
	return &AuthService{cfg: cfg}
}

func (s *AuthService) Login(req models.LoginRequest) (*models.LoginResponse, error) {
	user, err := database.GetUserByUsername(req.Username)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	perms, err := database.GetUserPermissions(user.ID)
	if err != nil {
		return nil, err
	}
	user.Permissions = perms

	database.DB.Exec(`UPDATE users SET last_login = NOW() WHERE id = $1`, user.ID)

	token, err := s.generateToken(user)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.LoginResponse{Token: token, User: user}, nil
}

func (s *AuthService) Register(req models.RegisterRequest) (*models.LoginResponse, error) {
	// Validate input
	if strings.TrimSpace(req.Username) == "" {
		return nil, errors.New("username is required")
	}
	if !emailRegex.MatchString(req.Email) {
		return nil, errors.New("invalid email format")
	}
	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	// Check if username already exists
	existing, err := database.GetUserByUsername(req.Username)
	if err == nil && existing.ID != "" {
		return nil, errors.New("username already exists")
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to process password")
	}

	// Default role ID for regular users
	defaultRoleID := "00000000-0000-0000-0000-000000000003"

	// Insert new user
	var u models.User
	err = database.DB.QueryRow(`
		INSERT INTO users (username, email, password, full_name, role_id, is_active)
		VALUES ($1, $2, $3, $4, $5, true)
		RETURNING id, username, email, full_name, avatar_url, provider, role_id, is_active, created_at, updated_at
	`, req.Username, req.Email, string(hash), req.Username, defaultRoleID).Scan(
		&u.ID, &u.Username, &u.Email, &u.FullName, &u.AvatarURL,
		&u.Provider, &u.RoleID, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, errors.New("username or email already exists")
		}
		// User might have been created despite scan error - try login
		if loginResp, loginErr := s.Login(models.LoginRequest{Username: req.Username, Password: req.Password}); loginErr == nil {
			return loginResp, nil
		}
		return nil, errors.New("failed to create user")
	}

	// Fetch role
	role, _ := database.GetRoleByID(u.RoleID)
	u.Role = role

	// Generate JWT token
	token, err := s.generateToken(u)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.LoginResponse{Token: token, User: u}, nil
}

func (s *AuthService) LoginOrCreateOAuth(provider, providerID, email, name, avatarURL string) (*models.LoginResponse, error) {
	user, err := database.GetUserByEmail(email)
	if errors.Is(err, sql.ErrNoRows) {
		newUser, err := s.createOAuthUser(provider, providerID, email, name, avatarURL)
		if err != nil {
			return nil, err
		}
		user = *newUser
	} else if err != nil {
		return nil, err
	} else {
		database.DB.Exec(`UPDATE users SET last_login = NOW(), avatar_url = $1 WHERE id = $2`, avatarURL, user.ID)
	}

	perms, _ := database.GetUserPermissions(user.ID)
	user.Permissions = perms

	token, err := s.generateToken(user)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	return &models.LoginResponse{Token: token, User: user}, nil
}

func (s *AuthService) createOAuthUser(provider, providerID, email, name, avatarURL string) (*models.User, error) {
	var u models.User
	err := database.DB.QueryRow(`
		INSERT INTO users (username, email, full_name, avatar_url, provider, provider_id, role_id)
		VALUES ($1, $2, $3, $4, $5, $6, '00000000-0000-0000-0000-000000000003')
		RETURNING id, username, email, full_name, avatar_url, provider, role_id, is_active, created_at, updated_at
	`, email, email, name, avatarURL, provider, providerID).Scan(
		&u.ID, &u.Username, &u.Email, &u.FullName, &u.AvatarURL,
		&u.Provider, &u.RoleID, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	role, _ := database.GetRoleByID(u.RoleID)
	u.Role = role
	return &u, nil
}

func (s *AuthService) GetUserByID(id string) (*models.User, error) {
	user, err := database.GetUserByID(id)
	if err != nil {
		return nil, err
	}
	perms, _ := database.GetUserPermissions(user.ID)
	user.Permissions = perms
	return &user, nil
}

func (s *AuthService) generateToken(user models.User) (string, error) {
	roleName := "user"
	if user.Role != nil {
		roleName = user.Role.Name
	}

	claims := jwt.MapClaims{
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     roleName,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) ValidateToken(tokenStr string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}
