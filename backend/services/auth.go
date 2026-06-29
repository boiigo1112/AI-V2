package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
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
	cfg               *config.Config
	securityAuditSvc  *SecurityAuditService
}

func NewAuthService(cfg *config.Config) *AuthService {
	return &AuthService{cfg: cfg}
}

// SetSecurityAuditService sets the security audit service.
func (s *AuthService) SetSecurityAuditService(svc *SecurityAuditService) {
	s.securityAuditSvc = svc
}

// Login authenticates a user and returns tokens with device fingerprint.
func (s *AuthService) Login(req models.LoginRequest, deviceFingerprint string) (*models.LoginResponse, error) {
	user, err := database.GetUserByUsername(req.Username)
	if err != nil {
		if s.securityAuditSvc != nil {
			s.securityAuditSvc.TrackLoginAttempt("", req.Username, false)
			s.securityAuditSvc.LogSecurityEvent(EventLoginFail, SeverityLow, "", "",
				"/api/auth/login", map[string]interface{}{
					"username": req.Username,
					"reason":   "user_not_found",
				})
		}
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		if s.securityAuditSvc != nil {
			s.securityAuditSvc.TrackLoginAttempt("", req.Username, false)
			s.securityAuditSvc.LogSecurityEvent(EventLoginFail, SeverityLow, user.ID, "",
				"/api/auth/login", map[string]interface{}{
					"username": req.Username,
					"reason":   "wrong_password",
				})
		}
		return nil, errors.New("invalid username or password")
	}

	if !user.IsActive {
		if s.securityAuditSvc != nil {
			s.securityAuditSvc.LogSecurityEvent(EventLoginFail, SeverityMedium, user.ID, "",
				"/api/auth/login", map[string]interface{}{
					"username": req.Username,
					"reason":   "account_disabled",
				})
		}
		return nil, errors.New("account is disabled")
	}

	perms, err := database.GetUserPermissions(user.ID)
	if err != nil {
		return nil, err
	}
	user.Permissions = perms

	database.DB.Exec(`UPDATE users SET last_login = NOW() WHERE id = $1`, user.ID)

	// Generate JTI (JWT ID) for token tracking
	jti := generateJTI()

	accessToken, err := s.generateAccessToken(user, deviceFingerprint, jti)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	refreshToken, err := s.generateRefreshToken(user, deviceFingerprint)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Log successful login
	if s.securityAuditSvc != nil {
		s.securityAuditSvc.TrackLoginAttempt("", req.Username, true)
		s.securityAuditSvc.LogSecurityEvent(EventLoginSuccess, SeverityLow, user.ID, "",
			"/api/auth/login", map[string]interface{}{
				"username":          req.Username,
				"device_fingerprint": deviceFingerprint,
			})

		// Record session
		accessClaims, _ := s.parseToken(accessToken)
		if accessClaims != nil {
			if jtiClaim, ok := (*accessClaims)["jti"]; ok {
				if jtiStr, ok := jtiClaim.(string); ok {
					s.securityAuditSvc.RecordUserSession(user.ID, jtiStr, deviceFingerprint,
						"", "", time.Now().Add(15*time.Minute))
				}
			}
		}
	}

	return &models.LoginResponse{
		Token:        accessToken,
		RefreshToken: refreshToken,
		User:         user,
	}, nil
}

func (s *AuthService) Register(req models.RegisterRequest) (*models.LoginResponse, error) {
	if strings.TrimSpace(req.Username) == "" {
		return nil, errors.New("username is required")
	}
	if !emailRegex.MatchString(req.Email) {
		return nil, errors.New("invalid email format")
	}
	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	existing, err := database.GetUserByUsername(req.Username)
	if err == nil && existing.ID != "" {
		return nil, errors.New("username already exists")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to process password")
	}

	defaultRoleID := "00000000-0000-0000-0000-000000000003"

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
		if loginResp, loginErr := s.Login(models.LoginRequest{Username: req.Username, Password: req.Password}, ""); loginErr == nil {
			return loginResp, nil
		}
		return nil, errors.New("failed to create user")
	}

	// Add password to history
	if s.securityAuditSvc != nil {
		s.securityAuditSvc.AddPasswordHistory(u.ID, string(hash))
	}

	role, _ := database.GetRoleByID(u.RoleID)
	u.Role = role

	jti := generateJTI()
	accessToken, err := s.generateAccessToken(u, "", jti)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	refreshToken, err := s.generateRefreshToken(u, "")
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	return &models.LoginResponse{Token: accessToken, RefreshToken: refreshToken, User: u}, nil
}

func (s *AuthService) LoginOrCreateOAuth(provider, providerID, email, name, avatarURL string) (*models.LoginResponse, error) {
	user, err := database.GetUserByEmail(email)
	if err != nil {
		// User not found, create new
		newUser, err := s.createOAuthUser(provider, providerID, email, name, avatarURL)
		if err != nil {
			return nil, err
		}
		user = *newUser
	} else {
		database.DB.Exec(`UPDATE users SET last_login = NOW(), avatar_url = $1 WHERE id = $2`, avatarURL, user.ID)
	}

	perms, _ := database.GetUserPermissions(user.ID)
	user.Permissions = perms

	jti := generateJTI()
	accessToken, err := s.generateAccessToken(user, "", jti)
	if err != nil {
		return nil, errors.New("failed to generate token")
	}

	refreshToken, err := s.generateRefreshToken(user, "")
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	if s.securityAuditSvc != nil {
		s.securityAuditSvc.LogSecurityEvent(EventLoginSuccess, SeverityLow, user.ID, "",
			"/api/auth/oauth", map[string]interface{}{
				"provider": provider,
			})
	}

	return &models.LoginResponse{Token: accessToken, RefreshToken: refreshToken, User: user}, nil
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

// GenerateAccessToken generates a new access token for a user.
func (s *AuthService) GenerateAccessToken(userID, deviceFingerprint string) (string, string, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return "", "", err
	}

	jti := generateJTI()
	token, err := s.generateAccessToken(*user, deviceFingerprint, jti)
	if err != nil {
		return "", "", err
	}

	return token, jti, nil
}

// RefreshAccessToken validates a refresh token and returns new tokens.
func (s *AuthService) RefreshAccessToken(refreshTokenStr, deviceFingerprint string) (*models.LoginResponse, error) {
	// Parse the refresh token
	claims, err := s.parseToken(refreshTokenStr)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Verify it's a refresh token
	tokenType, ok := (*claims)["type"]
	if !ok || tokenType != "refresh" {
		return nil, errors.New("invalid token type")
	}

	userID, ok := (*claims)["user_id"]
	if !ok || userID == "" {
		return nil, errors.New("invalid refresh token claims")
	}
	userIDStr, _ := userID.(string)

	// Get the token hash from the claims
	tokenHashClaim, ok := (*claims)["token_hash"]
	if !ok {
		return nil, errors.New("invalid refresh token")
	}
	tokenHash, _ := tokenHashClaim.(string)

	// Validate against stored tokens
	if s.securityAuditSvc != nil {
		if !s.securityAuditSvc.ValidateRefreshToken(userIDStr, tokenHash) {
			return nil, errors.New("refresh token has been revoked or expired")
		}

		// Revoke old refresh token
		s.securityAuditSvc.RevokeRefreshToken(userIDStr, tokenHash)
	}

	// Get user for new token
	user, err := s.GetUserByID(userIDStr)
	if err != nil {
		return nil, errors.New("user not found")
	}

	perms, _ := database.GetUserPermissions(user.ID)
	user.Permissions = perms

	jti := generateJTI()
	newAccessToken, err := s.generateAccessToken(*user, deviceFingerprint, jti)
	if err != nil {
		return nil, errors.New("failed to generate access token")
	}

	newRefreshToken, err := s.generateRefreshToken(*user, deviceFingerprint)
	if err != nil {
		return nil, errors.New("failed to generate refresh token")
	}

	// Log token refresh
	if s.securityAuditSvc != nil {
		s.securityAuditSvc.LogSecurityEvent(EventTokenRefresh, SeverityLow, user.ID, "",
			"/api/auth/refresh", map[string]interface{}{
				"device_fingerprint": deviceFingerprint,
			})

		// Record new session
		s.securityAuditSvc.RecordUserSession(user.ID, jti, deviceFingerprint,
			"", "", time.Now().Add(15*time.Minute))
	}

	return &models.LoginResponse{
		Token:        newAccessToken,
		RefreshToken: newRefreshToken,
		User:         *user,
	}, nil
}

// Logout invalidates a token by blacklisting it.
func (s *AuthService) Logout(tokenStr string) error {
	claims, err := s.parseToken(tokenStr)
	if err != nil {
		return nil // Still consider it logged out
	}

	jti, ok := (*claims)["jti"]
	if !ok || jti == "" {
		return nil
	}
	jtiStr, _ := jti.(string)

	userID, _ := (*claims)["user_id"].(string)

	// Get expiry
	var expiresAt time.Time
	if exp, ok := (*claims)["exp"]; ok {
		if expFloat, ok := exp.(float64); ok {
			expiresAt = time.Unix(int64(expFloat), 0)
		}
	}

	if s.securityAuditSvc != nil {
		// Blacklist the token
		if !expiresAt.IsZero() {
			s.securityAuditSvc.BlacklistToken(jtiStr, "access", userID, expiresAt)
		}

		// Revoke all refresh tokens for the user
		s.securityAuditSvc.RevokeAllUserRefreshTokens(userID)

		// Log logout
		s.securityAuditSvc.LogSecurityEvent(EventLogout, SeverityLow, userID, "",
			"/api/auth/logout", map[string]interface{}{})
	}

	return nil
}

// GetActiveSessions returns active sessions for a user.
func (s *AuthService) GetActiveSessions(userID string) ([]map[string]interface{}, error) {
	if s.securityAuditSvc == nil {
		return []map[string]interface{}{}, nil
	}
	return s.securityAuditSvc.GetActiveSessions(userID)
}

// RevokeSession revokes a specific session.
func (s *AuthService) RevokeSession(sessionID, userID string) error {
	if s.securityAuditSvc == nil {
		return errors.New("security audit service not available")
	}

	if s.securityAuditSvc != nil {
		s.securityAuditSvc.LogSecurityEvent(EventSessionRevoke, SeverityMedium, userID, "",
			"/api/auth/sessions/revoke", map[string]interface{}{
				"session_id": sessionID,
			})
	}

	return s.securityAuditSvc.RevokeSession(sessionID, userID)
}

// ValidateToken validates an access token and checks blacklist.
func (s *AuthService) ValidateToken(tokenStr string) (jwt.MapClaims, error) {
	claims, err := s.parseToken(tokenStr)
	if err != nil {
		return nil, errors.New("invalid or expired token")
	}

	// Check token type
	tokenType, ok := (*claims)["type"]
	if !ok || tokenType != "access" {
		return nil, errors.New("invalid token type")
	}

	// Check blacklist
	jti, ok := (*claims)["jti"]
	if ok && jti != "" {
		if jtiStr, ok := jti.(string); ok {
			if s.securityAuditSvc != nil && s.securityAuditSvc.IsTokenBlacklisted(jtiStr) {
				return nil, errors.New("token has been revoked")
			}
		}
	}

	return *claims, nil
}

// ChangePassword changes a user's password with history check.
func (s *AuthService) ChangePassword(userID, oldPassword, newPassword string) error {
	user, err := database.GetUserByIDWithPassword(userID)
	if err != nil {
		return errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(oldPassword)); err != nil {
		return errors.New("current password is incorrect")
	}

	if len(newPassword) < 6 {
		return errors.New("new password must be at least 6 characters")
	}

	// Check password history
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return errors.New("failed to process password")
	}

	if s.securityAuditSvc != nil && s.securityAuditSvc.CheckPasswordHistory(userID, string(newHash)) {
		return errors.New("password has been used recently, please choose a different one")
	}

	// Update password
	_, err = database.DB.Exec(`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, string(newHash), userID)
	if err != nil {
		return errors.New("failed to update password")
	}

	// Add to password history
	if s.securityAuditSvc != nil {
		s.securityAuditSvc.AddPasswordHistory(userID, string(newHash))
	}

	return nil
}

// generateAccessToken creates a JWT access token with device fingerprint.
func (s *AuthService) generateAccessToken(user models.User, deviceFingerprint string, jti string) (string, error) {
	roleName := "user"
	if user.Role != nil {
		roleName = user.Role.Name
	}

	claims := jwt.MapClaims{
		"type":     "access",
		"jti":      jti,
		"user_id":  user.ID,
		"username": user.Username,
		"email":    user.Email,
		"role":     roleName,
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
		"iat":      time.Now().Unix(),
	}

	if deviceFingerprint != "" {
		// Store a hash of the fingerprint to avoid storing raw data in JWT
		fpHash := sha256.Sum256([]byte(deviceFingerprint))
		claims["fp"] = hex.EncodeToString(fpHash[:8])
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

// generateRefreshToken creates a JWT refresh token (long-lived).
func (s *AuthService) generateRefreshToken(user models.User, deviceFingerprint string) (string, error) {
	// Generate a unique token hash for storage
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	tokenHash := sha256.Sum256(tokenBytes)
	tokenHashStr := hex.EncodeToString(tokenHash[:])

	claims := jwt.MapClaims{
		"type":       "refresh",
		"token_hash": tokenHashStr,
		"user_id":    user.ID,
		"username":   user.Username,
		"exp":        time.Now().Add(7 * 24 * time.Hour).Unix(), // 7 days
		"iat":        time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", err
	}

	// Store refresh token
	if s.securityAuditSvc != nil {
		s.securityAuditSvc.RecordRefreshToken(user.ID, tokenHashStr, deviceFingerprint,
			"", time.Now().Add(7*24*time.Hour))
	}

	return tokenStr, nil
}

// parseToken parses a JWT token without validating type.
func (s *AuthService) parseToken(tokenStr string) (*jwt.MapClaims, error) {
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

	return &claims, nil
}

// generateJTI generates a random JWT ID.
func generateJTI() string {
	bytes := make([]byte, 16)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
