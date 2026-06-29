package middleware

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/services"
)

// RateLimitConfig holds rate limiter configuration.
type RateLimitConfig struct {
	// GlobalLimit is the default requests per window for all endpoints
	GlobalLimit int
	// GlobalWindow is the default time window
	GlobalWindow time.Duration
	// LoginLimit is the max login requests per window per IP
	LoginLimit int
	// LoginWindow is the login rate limit window
	LoginWindow time.Duration
	// APILimit is the max API requests per window per authenticated user
	APILimit int
	// APIWindow is the API rate limit window
	APIWindow time.Duration
	// BruteForceThreshold is failed logins before IP block
	BruteForceThreshold int
	// BruteForceBlockDuration is how long to block the IP
	BruteForceBlockDuration time.Duration
	// SecurityAuditService for logging
	SecurityAuditService *services.SecurityAuditService
}

// DefaultRateLimitConfig returns sensible default rate limits.
func DefaultRateLimitConfig() *RateLimitConfig {
	return &RateLimitConfig{
		GlobalLimit:              120,
		GlobalWindow:             time.Minute,
		LoginLimit:               5,
		LoginWindow:              time.Minute,
		APILimit:                 60,
		APIWindow:                time.Minute,
		BruteForceThreshold:      5,
		BruteForceBlockDuration:  15 * time.Minute,
	}
}

// slidingWindowEntry holds request timestamps for a key.
type slidingWindowEntry struct {
	timestamps []time.Time
}

// RateLimiter implements sliding window rate limiting.
type RateLimiter struct {
	mu       sync.RWMutex
	entries  map[string]*slidingWindowEntry
	config   *RateLimitConfig
	auditSvc *services.SecurityAuditService
}

// NewRateLimiter creates a new RateLimiter.
func NewRateLimiter(cfg *RateLimitConfig) *RateLimiter {
	if cfg == nil {
		cfg = DefaultRateLimitConfig()
	}

	rl := &RateLimiter{
		entries:  make(map[string]*slidingWindowEntry),
		config:   cfg,
	}

	go rl.periodicCleanup()
	return rl
}

// SetAuditService sets the security audit service for logging.
func (rl *RateLimiter) SetAuditService(svc *services.SecurityAuditService) {
	rl.auditSvc = svc
}

// allow checks if a request should be allowed based on the sliding window.
// key is the rate limit key (e.g., "ip:1.2.3.4" or "login:1.2.3.4")
// limit is max requests in the window
// window is the time window duration
func (rl *RateLimiter) allow(key string, limit int, window time.Duration) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	entry, exists := rl.entries[key]

	if !exists {
		rl.entries[key] = &slidingWindowEntry{
			timestamps: []time.Time{now},
		}
		return true
	}

	// Remove timestamps outside the window
	cutoff := now.Add(-window)
	var valid []time.Time
	for _, t := range entry.timestamps {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	entry.timestamps = valid

	if len(entry.timestamps) >= limit {
		return false
	}

	entry.timestamps = append(entry.timestamps, now)
	return true
}

// logRateLimitBlock logs a rate limit event.
func (rl *RateLimiter) logRateLimitBlock(c *gin.Context, reason string) {
	if rl.auditSvc == nil {
		return
	}

	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	rl.auditSvc.LogSecurityEvent(services.EventRateLimit, services.SeverityMedium,
		userID, c.ClientIP(), c.Request.URL.Path,
		map[string]interface{}{
			"reason": reason,
			"method": c.Request.Method,
		})

	// Also track as a failed login attempt if it's a login endpoint
	if strings.Contains(c.Request.URL.Path, "/auth/login") {
		rl.auditSvc.TrackLoginAttempt(c.ClientIP(), "", false)
	}
}

// RateLimitMiddleware returns a Gin middleware that applies rate limiting.
// It uses different limits for different endpoint types.
func RateLimitMiddleware(rl *RateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		path := c.Request.URL.Path

		// Skip health check
		if path == "/api/health" {
			c.Next()
			return
		}

		// Check if IP is blocked (brute force protection)
		if rl.auditSvc != nil && rl.auditSvc.IsIPBlocked(ip) {
			retryAfter := int(rl.config.BruteForceBlockDuration.Seconds())
			c.Header("Retry-After", string(rune(retryAfter)))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please try again later",
			})
			return
		}

		// Determine rate limit based on endpoint
		var limit int
		var window time.Duration
		var key string

		if strings.Contains(path, "/auth/login") {
			// Login endpoint: strict rate limiting
			limit = rl.config.LoginLimit
			window = rl.config.LoginWindow
			key = "login:" + ip
		} else if strings.Contains(path, "/api/") {
			// Authenticated API endpoint: moderate rate limit
			limit = rl.config.APILimit
			window = rl.config.APIWindow
			// Use user_id as key if authenticated, otherwise IP
			if uid, exists := c.Get("user_id"); exists {
				if uidStr, ok := uid.(string); ok && uidStr != "" {
					key = "api:" + uidStr
				} else {
					key = "api:" + ip
				}
			} else {
				key = "api:" + ip
			}
		} else {
			// General endpoint: default rate limit
			limit = rl.config.GlobalLimit
			window = rl.config.GlobalWindow
			key = "general:" + ip
		}

		if !rl.allow(key, limit, window) {
			rl.logRateLimitBlock(c, "rate_limit_exceeded")

			retryAfter := int(window.Seconds())
			c.Header("Retry-After", string(rune(retryAfter)))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "too many requests, please try again later",
			})
			return
		}

		c.Next()
	}
}

// periodicCleanup removes expired entries from the rate limiter.
func (rl *RateLimiter) periodicCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for key, entry := range rl.entries {
			cutoff := now.Add(-rl.config.GlobalWindow * 2)
			var valid []time.Time
			for _, t := range entry.timestamps {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			if len(valid) == 0 {
				delete(rl.entries, key)
			} else {
				entry.timestamps = valid
			}
		}
		rl.mu.Unlock()
	}
}
