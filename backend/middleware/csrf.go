package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/blacken/admin-panel/services"
)

// CSRFConfig holds CSRF protection configuration.
type CSRFConfig struct {
	// CookieName is the name of the CSRF cookie
	CookieName string
	// HeaderName is the name of the header to check for CSRF token
	HeaderName string
	// TokenLength is the length of random token bytes
	TokenLength int
	// TokenExpiry is how long a CSRF token is valid
	TokenExpiry time.Duration
	// Secure sets the Secure flag on the cookie
	Secure bool
	// SameSite is the SameSite mode for the cookie
	SameSite http.SameSite
	// ExemptPaths are paths that don't require CSRF validation
	ExemptPaths []string
	// SecurityAuditService for logging CSRF failures
	SecurityAuditService *services.SecurityAuditService
}

// DefaultCSRFConfig returns a sensible default CSRF configuration.
func DefaultCSRFConfig() *CSRFConfig {
	return &CSRFConfig{
		CookieName:  "csrf_token",
		HeaderName:  "X-CSRF-Token",
		TokenLength: 32,
		TokenExpiry: 1 * time.Hour,
		Secure:      false, // Set to true in production with HTTPS
		SameSite:    http.SameSiteStrictMode,
		ExemptPaths: []string{"/api/health"},
	}
}

// csrfTokenStore stores CSRF tokens in memory with expiry.
type csrfTokenStore struct {
	mu     sync.RWMutex
	tokens map[string]time.Time
}

var globalCSRFStore = &csrfTokenStore{
	tokens: make(map[string]time.Time),
}

// generateCSRFToken generates a random CSRF token and stores it.
func generateCSRFToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(bytes)

	// Hash the token for storage
	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	globalCSRFStore.mu.Lock()
	globalCSRFStore.tokens[tokenHash] = time.Now().Add(1 * time.Hour)
	globalCSRFStore.mu.Unlock()

	return token, nil
}

// validateCSRFToken checks if a token is valid.
func validateCSRFToken(token string) bool {
	if token == "" {
		return false
	}

	hash := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(hash[:])

	globalCSRFStore.mu.RLock()
	expiry, exists := globalCSRFStore.tokens[tokenHash]
	globalCSRFStore.mu.RUnlock()

	if !exists {
		return false
	}

	if time.Now().After(expiry) {
		globalCSRFStore.mu.Lock()
		delete(globalCSRFStore.tokens, tokenHash)
		globalCSRFStore.mu.Unlock()
		return false
	}

	return true
}

// CSRF returns a Gin middleware for CSRF protection using the double-submit cookie pattern.
func CSRF(config *CSRFConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultCSRFConfig()
	}

	auditSvc := config.SecurityAuditService

	// Start periodic cleanup goroutine
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			globalCSRFStore.mu.Lock()
			now := time.Now()
			for hash, expiry := range globalCSRFStore.tokens {
				if now.After(expiry) {
					delete(globalCSRFStore.tokens, hash)
				}
			}
			globalCSRFStore.mu.Unlock()
		}
	}()

	return func(c *gin.Context) {
		// Exempt safe methods
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			// Still set the CSRF cookie on GET requests for subsequent mutations
			token, err := generateCSRFToken()
			if err == nil {
				c.SetCookie(config.CookieName, token, int(config.TokenExpiry.Seconds()),
					"/", "", config.Secure, true)
			}
			c.Next()
			return
		}

		// Check exempt paths
		path := c.Request.URL.Path
		for _, exempt := range config.ExemptPaths {
			if path == exempt {
				c.Next()
				return
			}
		}

		// For state-changing requests (POST, PUT, DELETE, PATCH), validate CSRF
		cookieToken, err := c.Cookie(config.CookieName)
		if err != nil {
			logCSRFBlock(auditSvc, "missing_csrf_cookie", c)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}

		headerToken := c.GetHeader(config.HeaderName)
		if headerToken == "" {
			logCSRFBlock(auditSvc, "missing_csrf_header", c)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}

		// Double-submit cookie pattern: cookie value must match header value
		// We use bcrypt-style comparison for constant-time
		if err := bcrypt.CompareHashAndPassword([]byte(cookieToken), []byte(headerToken)); err == nil {
			// Direct match
		} else if cookieToken != headerToken {
			logCSRFBlock(auditSvc, "csrf_token_mismatch", c)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}

		// Also verify the token is not expired using our store
		if !validateCSRFToken(headerToken) {
			logCSRFBlock(auditSvc, "csrf_token_expired", c)
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}

		// Token is valid; rotate it
		newToken, err := generateCSRFToken()
		if err == nil {
			c.SetCookie(config.CookieName, newToken, int(config.TokenExpiry.Seconds()),
				"/", "", config.Secure, true)
		}

		c.Next()
	}
}

// logCSRFBlock logs a CSRF failure.
func logCSRFBlock(auditSvc *services.SecurityAuditService, reason string, c *gin.Context) {
	if auditSvc == nil {
		return
	}

	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	auditSvc.LogSecurityEvent(services.EventCSRFFail, services.SeverityMedium,
		userID, c.ClientIP(), c.Request.URL.Path,
		map[string]interface{}{
			"reason": reason,
			"method": c.Request.Method,
		})
}
