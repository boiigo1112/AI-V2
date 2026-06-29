package middleware

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/services"
)

// WAFConfig configures the Web Application Firewall.
type WAFConfig struct {
	// Sensitivity: 1=low, 2=medium, 3=high
	Sensitivity int
	// BlockXSS enables XSS pattern detection
	BlockXSS bool
	// BlockSQLI enables SQL injection pattern detection
	BlockSQLI bool
	// BlockPathTraversal enables path traversal detection
	BlockPathTraversal bool
	// BlockNullBytes enables null byte detection
	BlockNullBytes bool
	// BlockUnicodeAttacks enables unicode attack detection
	BlockUnicodeAttacks bool
	// BlockAPIAbuse blocks common API abuse patterns
	BlockAPIAbuse bool
	// SecurityAuditService for logging
	SecurityAuditService *services.SecurityAuditService
}

// DefaultWAFConfig returns a WAFConfig with sensible defaults.
func DefaultWAFConfig() *WAFConfig {
	return &WAFConfig{
		Sensitivity:          2,
		BlockXSS:             true,
		BlockSQLI:            true,
		BlockPathTraversal:   true,
		BlockNullBytes:       true,
		BlockUnicodeAttacks:  true,
		BlockAPIAbuse:        true,
	}
}

// Compiled regex patterns for security checks.
var (
	// Path traversal patterns
	pathTraversalPattern = regexp.MustCompile(`(?:\.\.(?:[/\\]|%2f|%5c|%252f|%255c))|(?:/[^/]*\.\./)`)

	// XSS patterns
	xssPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script[^>]*>`),
		regexp.MustCompile(`(?i)<[^>]*on\w+\s*=`),
		regexp.MustCompile(`(?i)javascript\s*:`),
		regexp.MustCompile(`(?i)vbscript\s*:`),
		regexp.MustCompile(`(?i)onload\s*=`),
		regexp.MustCompile(`(?i)onerror\s*=`),
		regexp.MustCompile(`(?i)onclick\s*=`),
		regexp.MustCompile(`(?i)onmouseover\s*=`),
		regexp.MustCompile(`(?i)alert\s*\(`),
		regexp.MustCompile(`(?i)document\.cookie`),
		regexp.MustCompile(`(?i)document\.write`),
		regexp.MustCompile(`(?i)fromCharCode`),
		regexp.MustCompile(`(?i)eval\s*\(`),
		regexp.MustCompile(`(?i)<\s*iframe`),
		regexp.MustCompile(`(?i)<\s*embed`),
		regexp.MustCompile(`(?i)<\s*object`),
		regexp.MustCompile(`(?i)data\s*:\s*text/html`),
		regexp.MustCompile(`(?i)&#\d+;`),           // HTML entity encoding
		regexp.MustCompile(`(?i)&#x[0-9a-f]+;`),    // Hex HTML entities
		regexp.MustCompile(`(?i)\[CDATA\[`),
		regexp.MustCompile(`(?i)src\s*=\s*[\"'][^\"']*[\"']\s*>\s*</\s*script`),
	}

	// SQL injection patterns
	sqlInjectionPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)(?:'|\\')\s*(?:OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\s`),
		regexp.MustCompile(`(?i)\bUNION\s+(?:ALL\s+)?SELECT\b`),
		regexp.MustCompile(`(?i)\bSELECT\s+.*\bFROM\s+`),
		regexp.MustCompile(`(?i)\bINSERT\s+INTO\b`),
		regexp.MustCompile(`(?i)\bDELETE\s+FROM\b`),
		regexp.MustCompile(`(?i)\bDROP\s+(?:TABLE|DATABASE|INDEX|VIEW)\b`),
		regexp.MustCompile(`(?i)\bALTER\s+(?:TABLE|DATABASE|INDEX|VIEW|COLUMN)\b`),
		regexp.MustCompile(`(?i)\bCREATE\s+(?:TABLE|DATABASE|INDEX|VIEW)\b`),
		regexp.MustCompile(`(?i)\bTRUNCATE\s+TABLE\b`),
		regexp.MustCompile(`(?i)\bEXEC(?:UTE)?\s+`),
		regexp.MustCompile(`(?i)\bWAITFOR\s+DELAY\b`),
		regexp.MustCompile(`(?i)\bBENCHMARK\s*\(`),
		regexp.MustCompile(`(?i)\bSLEEP\s*\(`),
		regexp.MustCompile(`(?i)\bLOAD_FILE\s*\(`),
		regexp.MustCompile(`(?i)\bINTO\s+(?:OUT|DUMP)FILE\b`),
		regexp.MustCompile(`(?i)\b(?:CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(`),
		regexp.MustCompile(`(?i)0x[0-9a-f]{4,}`), // Hex encoding of SQL
		regexp.MustCompile(`(?i)\bOR\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?`), // OR 1=1
		regexp.MustCompile(`(?i)\bAND\s+['\"]?\d+['\"]?\s*=\s*['\"]?\d+['\"]?`), // AND 1=1
		regexp.MustCompile(`(?i)'.*\s*--\s`),     // SQL comment injection
		regexp.MustCompile(`(?i)/\*!`),            // MySQL comment injection
		regexp.MustCompile(`(?i)information_schema`),
		regexp.MustCompile(`(?i)pg_catalog`),
		regexp.MustCompile(`(?i)sys\s*(?:\.|objects)`),
		regexp.MustCompile(`(?i)master\s*\.\s*(?:dbo|sys)`),
	}

	// Null byte patterns
	nullBytePattern = regexp.MustCompile(`\x00`)

	// Unicode attack patterns
	unicodeAttackPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)%u[0-9a-f]{4}`),        // %uXXXX unicode encoding
		regexp.MustCompile(`(?i)%[0-9a-f]{2}%[0-9a-f]{2}`), // Double encoding
		regexp.MustCompile(`(?i)%[0-9a-f]{4,}`),         // Overlong encoding
		regexp.MustCompile(`\\u[0-9a-f]{4}`),            // \uXXXX unicode
		regexp.MustCompile(`\\x[0-9a-f]{2}`),             // \xXX hex
	}

	// API abuse patterns
	apiAbusePatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)^/api/(?:v1|v2|v3)/`),       // Version enumeration
		regexp.MustCompile(`(?i)(?:wp-admin|wp-content|wp-includes)`), // WordPress paths
		regexp.MustCompile(`(?i)\.(?:env|git|svn|bak|old|swp|config|json|yml|yaml|xml)$`), // Sensitive files
		regexp.MustCompile(`(?i)(?:phpMyAdmin|phpmyadmin|pma|myadmin)`),
		regexp.MustCompile(`(?i)(?:adminer|admin/|administrator)`),
		regexp.MustCompile(`(?i)(?:\.php|\.asp|\.aspx|\.jsp|\.cgi)`), // Non-Go extensions
		regexp.MustCompile(`(?i)(?:/etc/passwd|/etc/shadow|/proc/self/environ)`), // System file paths
		regexp.MustCompile(`(?i)(?:cmd=|exec=|command=|shell=|wget |curl )`), // Command injection in params
		regexp.MustCompile(`(?i)(?:base64_decode|system\(|passthru\(|shell_exec\(|exec\()`), // PHP function calls
	}
)

// WAF returns a Gin middleware that inspects requests for malicious patterns.
func WAF(config *WAFConfig) gin.HandlerFunc {
	if config == nil {
		config = DefaultWAFConfig()
	}

	auditSvc := config.SecurityAuditService

	// Helper to check a string against all enabled patterns.
	checkString := func(value string, source string, c *gin.Context) bool {
		// Check path traversal
		if config.BlockPathTraversal && pathTraversalPattern.MatchString(value) {
			logBlock(auditSvc, "path_traversal", c, source, value)
			return true
		}

		// Check null bytes
		if config.BlockNullBytes && nullBytePattern.MatchString(value) {
			logBlock(auditSvc, "null_byte", c, source, value)
			return true
		}

		// Check XSS
		if config.BlockXSS {
			for _, pat := range xssPatterns {
				if pat.MatchString(value) {
					logBlock(auditSvc, "xss", c, source, value)
					return true
				}
			}
		}

		// Check SQL injection
		if config.BlockSQLI {
			for _, pat := range sqlInjectionPatterns {
				if pat.MatchString(value) {
					logBlock(auditSvc, "sql_injection", c, source, value)
					return true
				}
			}
		}

		// Check unicode attacks
		if config.BlockUnicodeAttacks {
			for _, pat := range unicodeAttackPatterns {
				if pat.MatchString(value) {
					logBlock(auditSvc, "unicode_attack", c, source, value)
					return true
				}
			}
		}

		// Check API abuse
		if config.BlockAPIAbuse {
			for _, pat := range apiAbusePatterns {
				if pat.MatchString(value) {
					logBlock(auditSvc, "api_abuse", c, source, value)
					return true
				}
			}
		}

		return false
	}

	return func(c *gin.Context) {
		// Skip health check endpoint
		if c.Request.URL.Path == "/api/health" {
			c.Next()
			return
		}

		// 1. Check request URI path for attacks
		if checkString(c.Request.URL.RawPath, "url_path", c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}
		if checkString(c.Request.URL.Path, "url_path", c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}
		if checkString(c.Request.URL.RawQuery, "url_query", c) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
			return
		}

		// 2. Check request headers
		for key, values := range c.Request.Header {
			for _, v := range values {
				if checkString(v, "header:"+key, c) {
					c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
					return
				}
			}
		}

		// 3. Check request body for POST/PUT/PATCH
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			contentType := c.ContentType()
			if strings.HasPrefix(contentType, "application/json") ||
				strings.HasPrefix(contentType, "application/x-www-form-urlencoded") ||
				strings.HasPrefix(contentType, "multipart/form-data") {

				body, err := io.ReadAll(c.Request.Body)
				if err == nil && len(body) > 0 {
					// Restore body for later handlers
					c.Request.Body = io.NopCloser(strings.NewReader(string(body)))

					if checkString(string(body), "request_body", c) {
						c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "blocked by security policy"})
						return
					}
				}
			}
		}

		c.Next()
	}
}

// logBlock logs a blocked request to the security audit service.
func logBlock(auditSvc *services.SecurityAuditService, attackType string, c *gin.Context, source string, value string) {
	if auditSvc == nil {
		return
	}

	// Truncate value for logging
	displayValue := value
	if len(displayValue) > 200 {
		displayValue = displayValue[:200]
	}

	severity := services.SeverityMedium
	if attackType == "sql_injection" || attackType == "path_traversal" {
		severity = services.SeverityHigh
	}

	details := map[string]interface{}{
		"attack_type": attackType,
		"source":      source,
		"value":       displayValue,
		"method":      c.Request.Method,
		"path":        c.Request.URL.Path,
	}

	// Extract user ID if available
	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	auditSvc.LogSecurityEvent(services.EventWAFBlock, severity, userID, c.ClientIP(), c.Request.URL.Path, details)
}

// ValidateJSONStructure is a helper that validates JSON body structure without parsing.
func ValidateJSONStructure() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			if strings.HasPrefix(c.ContentType(), "application/json") {
				body, err := io.ReadAll(c.Request.Body)
				if err != nil {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
					return
				}
				c.Request.Body = io.NopCloser(strings.NewReader(string(body)))

				if !json.Valid(body) {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "invalid JSON in request body"})
					return
				}
			}
		}
		c.Next()
	}
}
