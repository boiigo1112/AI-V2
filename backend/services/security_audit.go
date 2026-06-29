package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/blacken/admin-panel/database"
)
// SecurityEventSeverity constants
const (
	SeverityLow     = "low"
	SeverityMedium  = "medium"
	SeverityHigh    = "high"
	SeverityCritical = "critical"
)

// SecurityEventType constants
const (
	EventWAFBlock      = "waf_block"
	EventRateLimit     = "rate_limit"
	EventCSRFFail      = "csrf_fail"
	EventUnauthorized  = "unauthorized"
	EventLoginFail     = "login_fail"
	EventLoginSuccess  = "login_success"
	EventAPIAbuse      = "api_abuse"
	EventTokenRefresh  = "token_refresh"
	EventLogout        = "logout"
	EventSessionRevoke = "session_revoke"
)

// SecurityAuditService handles security event logging and queries.
type SecurityAuditService struct {
	mu            sync.RWMutex
	loginAttempts map[string]*loginTracker
	blockedIPs    map[string]time.Time
}

type loginTracker struct {
	attempts  []time.Time
	lastBlock time.Time
}

type SecurityEvent struct {
	ID        string                 `json:"id"`
	EventType string                 `json:"event_type"`
	Severity  string                 `json:"severity"`
	UserID    string                 `json:"user_id"`
	IPAddress string                 `json:"ip_address"`
	Endpoint  string                 `json:"endpoint"`
	Details   map[string]interface{} `json:"details"`
	CreatedAt time.Time              `json:"created_at"`
}

type SecurityStats struct {
	TotalBlocked      int `json:"total_blocked"`
	WAFBlocks         int `json:"waf_blocks"`
	RateLimits        int `json:"rate_limits"`
	CSRFFailures      int `json:"csrf_failures"`
	FailedLogins      int `json:"failed_logins"`
	SuccessfulLogins  int `json:"successful_logins"`
	APIAbuse          int `json:"api_abuse"`
	UniqueIPs         int `json:"unique_ips"`
	BlockedIPsCount   int `json:"blocked_ips_count"`
	BlockedToday      int `json:"blocked_today"`
	FailedLoginsToday int `json:"failed_logins_today"`
}

// NewSecurityAuditService creates a new SecurityAuditService.
func NewSecurityAuditService() *SecurityAuditService {
	svc := &SecurityAuditService{
		loginAttempts: make(map[string]*loginTracker),
		blockedIPs:    make(map[string]time.Time),
	}
	go svc.periodicCleanup()
	return svc
}

// ensureTables creates the security tables if they don't exist.
func (s *SecurityAuditService) ensureTables() {
	queries := []string{
		`CREATE TABLE IF NOT EXISTS security_logs (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			event_type VARCHAR(50) NOT NULL,
			severity VARCHAR(20) NOT NULL DEFAULT 'medium',
			user_id VARCHAR(255) DEFAULT '',
			ip_address VARCHAR(45) NOT NULL,
			endpoint VARCHAR(500) DEFAULT '',
			details JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS blocked_ips (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			ip_address VARCHAR(45) NOT NULL,
			reason VARCHAR(255) NOT NULL,
			blocked_by VARCHAR(255) DEFAULT 'system',
			expires_at TIMESTAMPTZ,
			is_permanent BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_security_logs_event ON security_logs(event_type)`,
		`CREATE INDEX IF NOT EXISTS idx_security_logs_ip ON security_logs(ip_address)`,
		`CREATE INDEX IF NOT EXISTS idx_security_logs_created ON security_logs(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address)`,
	}

	if database.DB == nil {
		return
	}

	for _, q := range queries {
		database.DB.Exec(q)
	}
}

// LogSecurityEvent logs a security event to the database.
func (s *SecurityAuditService) LogSecurityEvent(eventType, severity, userID, ip, endpoint string, details map[string]interface{}) {
	s.ensureTables()

	if database.DB == nil {
		return
	}

	detailsJSON := []byte("{}")
	if details != nil {
		if d, err := json.Marshal(details); err == nil {
			detailsJSON = d
		}
	}

	database.DB.Exec(`
		INSERT INTO security_logs (event_type, severity, user_id, ip_address, endpoint, details, created_at)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
	`, eventType, severity, userID, ip, endpoint, string(detailsJSON))
}

// GetSecurityLogs retrieves paginated security logs with optional filters.
func (s *SecurityAuditService) GetSecurityLogs(limit, offset int, filters map[string]interface{}) ([]SecurityEvent, int, error) {
	s.ensureTables()

	if database.DB == nil {
		return nil, 0, fmt.Errorf("database not connected")
	}

	where := []string{}
	args := []interface{}{}
	argIdx := 1

	if filters != nil {
		if et, ok := filters["event_type"]; ok && et != "" {
			where = append(where, fmt.Sprintf("event_type = $%d", argIdx))
			args = append(args, et)
			argIdx++
		}
		if sev, ok := filters["severity"]; ok && sev != "" {
			where = append(where, fmt.Sprintf("severity = $%d", argIdx))
			args = append(args, sev)
			argIdx++
		}
		if uid, ok := filters["user_id"]; ok && uid != "" {
			where = append(where, fmt.Sprintf("user_id = $%d", argIdx))
			args = append(args, uid)
			argIdx++
		}
		if ip, ok := filters["ip_address"]; ok && ip != "" {
			where = append(where, fmt.Sprintf("ip_address = $%d", argIdx))
			args = append(args, ip)
			argIdx++
		}
		if dateFrom, ok := filters["date_from"]; ok && dateFrom != "" {
			where = append(where, fmt.Sprintf("created_at >= $%d", argIdx))
			args = append(args, dateFrom)
			argIdx++
		}
		if dateTo, ok := filters["date_to"]; ok && dateTo != "" {
			where = append(where, fmt.Sprintf("created_at <= $%d", argIdx))
			args = append(args, dateTo)
			argIdx++
		}
	}

	whereStr := ""
	if len(where) > 0 {
		whereStr = "WHERE " + strings.Join(where, " AND ")
	}

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM security_logs %s", whereStr)
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	database.DB.QueryRow(countQuery, countArgs...).Scan(&total)

	dataQuery := fmt.Sprintf(`
		SELECT id, event_type, severity, COALESCE(user_id,''), ip_address, COALESCE(endpoint,''), COALESCE(details::text,'{}'), created_at
		FROM security_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d
	`, whereStr, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := database.DB.Query(dataQuery, args...)
	if err != nil {
		return []SecurityEvent{}, total, nil
	}
	defer rows.Close()

	var results []SecurityEvent
	for rows.Next() {
		var ev SecurityEvent
		var detailsStr string
		if err := rows.Scan(&ev.ID, &ev.EventType, &ev.Severity, &ev.UserID, &ev.IPAddress, &ev.Endpoint, &detailsStr, &ev.CreatedAt); err != nil {
			continue
		}
		details := make(map[string]interface{})
		json.Unmarshal([]byte(detailsStr), &details)
		ev.Details = details
		results = append(results, ev)
	}

	if results == nil {
		results = []SecurityEvent{}
	}
	return results, total, nil
}

// GetSecurityStats returns dashboard statistics for security events.
func (s *SecurityAuditService) GetSecurityStats() (*SecurityStats, error) {
	s.ensureTables()

	stats := &SecurityStats{}

	if database.DB == nil {
		return stats, nil
	}

	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type IN ('waf_block','rate_limit','csrf_fail','unauthorized','login_fail','api_abuse')").Scan(&stats.TotalBlocked)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'waf_block'").Scan(&stats.WAFBlocks)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'rate_limit'").Scan(&stats.RateLimits)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'csrf_fail'").Scan(&stats.CSRFFailures)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'login_fail'").Scan(&stats.FailedLogins)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'login_success'").Scan(&stats.SuccessfulLogins)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE event_type = 'api_abuse'").Scan(&stats.APIAbuse)
	database.DB.QueryRow("SELECT COUNT(DISTINCT ip_address) FROM security_logs").Scan(&stats.UniqueIPs)
	database.DB.QueryRow("SELECT COUNT(*) FROM blocked_ips WHERE is_permanent = true OR expires_at > NOW()").Scan(&stats.BlockedIPsCount)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE created_at >= CURRENT_DATE AND event_type IN ('waf_block','rate_limit','csrf_fail','unauthorized','login_fail','api_abuse')").Scan(&stats.BlockedToday)
	database.DB.QueryRow("SELECT COUNT(*) FROM security_logs WHERE created_at >= CURRENT_DATE AND event_type = 'login_fail'").Scan(&stats.FailedLoginsToday)

	return stats, nil
}

// TrackLoginAttempt tracks login attempts for brute force detection.
func (s *SecurityAuditService) TrackLoginAttempt(ip, username string, success bool) {
	s.mu.Lock()
	defer s.mu.Unlock()

	tracker, exists := s.loginAttempts[ip]
	if !exists {
		tracker = &loginTracker{}
		s.loginAttempts[ip] = tracker
	}

	now := time.Now()

	if success {
		// Reset attempts on successful login
		tracker.attempts = nil
		tracker.lastBlock = time.Time{}
		return
	}

	tracker.attempts = append(tracker.attempts, now)

	// Clean old attempts (keep last 15 min)
	cutoff := now.Add(-15 * time.Minute)
	var valid []time.Time
	for _, t := range tracker.attempts {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	tracker.attempts = valid

	// After 5 failed attempts in 15 min, block for 15 min
	if len(tracker.attempts) >= 5 && tracker.lastBlock.IsZero() {
		tracker.lastBlock = now
		s.blockedIPs[ip] = now.Add(15 * time.Minute)

		// Log the block
		s.LogSecurityEvent(EventRateLimit, SeverityHigh, "", ip, "", map[string]interface{}{
			"reason":   "brute_force_protection",
			"attempts": len(tracker.attempts),
			"username": username,
		})

		// Also store in blocked_ips table
		if database.DB != nil {
			database.DB.Exec(`
				INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at)
				VALUES ($1, $2, $3, $4)
			`, ip, "brute_force_protection: 5 failed login attempts in 15 minutes", "system", now.Add(15*time.Minute))
		}
	}
}

// IsIPBlocked checks if an IP is currently blocked.
func (s *SecurityAuditService) IsIPBlocked(ip string) bool {
	s.mu.RLock()

	// Check in-memory blocked IPs
	if expiresAt, ok := s.blockedIPs[ip]; ok {
		if time.Now().Before(expiresAt) {
			s.mu.RUnlock()
			return true
		}
		// Expired, clean up
		s.mu.RUnlock()
		s.mu.Lock()
		delete(s.blockedIPs, ip)
		s.mu.Unlock()
		return false
	}
	s.mu.RUnlock()

	// Also check database
	s.ensureTables()
	if database.DB != nil {
		var count int
		database.DB.QueryRow(`
			SELECT COUNT(*) FROM blocked_ips
			WHERE ip_address = $1 AND (is_permanent = true OR expires_at > NOW())
		`, ip).Scan(&count)
		if count > 0 {
			return true
		}
	}

	return false
}

// GetActiveSessions returns active sessions for a user.
func (s *SecurityAuditService) GetActiveSessions(userID string) ([]map[string]interface{}, error) {
	s.ensureTables()
	if database.DB == nil {
		return nil, fmt.Errorf("database not connected")
	}

	rows, err := database.DB.Query(`
		SELECT id, device_fingerprint, ip_address, user_agent, last_activity, created_at
		FROM user_sessions
		WHERE user_id = $1 AND revoked = false AND expires_at > NOW()
		ORDER BY last_activity DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []map[string]interface{}
	for rows.Next() {
		var id, df, ip, ua string
		var lastActivity, createdAt time.Time
		if err := rows.Scan(&id, &df, &ip, &ua, &lastActivity, &createdAt); err != nil {
			continue
		}
		sessions = append(sessions, map[string]interface{}{
			"id":                id,
			"device_fingerprint": df,
			"ip_address":        ip,
			"user_agent":        ua,
			"last_activity":     lastActivity,
			"created_at":        createdAt,
		})
	}

	if sessions == nil {
		sessions = []map[string]interface{}{}
	}
	return sessions, nil
}

// RevokeSession revokes a user session.
func (s *SecurityAuditService) RevokeSession(sessionID, userID string) error {
	s.ensureTables()
	if database.DB == nil {
		return fmt.Errorf("database not connected")
	}

	result, err := database.DB.Exec(`
		UPDATE user_sessions SET revoked = true WHERE id = $1 AND user_id = $2
	`, sessionID, userID)
	if err != nil {
		return err
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("session not found or already revoked")
	}

	// Also blacklist the associated token JTI
	database.DB.Exec(`
		INSERT INTO token_blacklist (token_jti, token_type, user_id, expires_at)
		SELECT token_jti, 'access', user_id, expires_at
		FROM user_sessions WHERE id = $1
		ON CONFLICT (token_jti) DO NOTHING
	`, sessionID)

	return nil
}

// TrackAPIAccess tracks API usage.
func (s *SecurityAuditService) TrackAPIAccess(userID, endpoint, method, ip string) {
	// Lightweight tracking - just log for now
	if userID == "" {
		return
	}

	s.ensureTables()

	// We use a lightweight insert; for heavy traffic this could be sampled
	if database.DB != nil {
		database.DB.Exec(`
			INSERT INTO security_logs (event_type, severity, user_id, ip_address, endpoint, details, created_at)
			VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
		`, "api_access", SeverityLow, userID, ip, endpoint,
			fmt.Sprintf(`{"method": "%s"}`, method))
	}
}

// RecordUserSession records a new user session.
func (s *SecurityAuditService) RecordUserSession(userID, tokenJTI, deviceFingerprint, ipAddress, userAgent string, expiresAt time.Time) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`
		INSERT INTO user_sessions (user_id, token_jti, device_fingerprint, ip_address, user_agent, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (token_jti) DO UPDATE SET
			last_activity = NOW(),
			ip_address = $4,
			user_agent = $5
	`, userID, tokenJTI, deviceFingerprint, ipAddress, userAgent, expiresAt)
}

// RecordRefreshToken stores a refresh token.
func (s *SecurityAuditService) RecordRefreshToken(userID, tokenHash, deviceFingerprint, ipAddress string, expiresAt time.Time) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`
		INSERT INTO refresh_tokens (user_id, token_hash, device_fingerprint, ip_address, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, userID, tokenHash, deviceFingerprint, ipAddress, expiresAt)
}

// ValidateRefreshToken checks if a refresh token is valid.
func (s *SecurityAuditService) ValidateRefreshToken(userID, tokenHash string) bool {
	s.ensureTables()
	if database.DB == nil {
		return false
	}

	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM refresh_tokens
		WHERE user_id = $1 AND token_hash = $2 AND revoked = false AND expires_at > NOW()
	`, userID, tokenHash).Scan(&count)
	return err == nil && count > 0
}

// RevokeRefreshToken marks a refresh token as revoked.
func (s *SecurityAuditService) RevokeRefreshToken(userID, tokenHash string) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1 AND token_hash = $2`, userID, tokenHash)
}

// RevokeAllUserRefreshTokens revokes all refresh tokens for a user.
func (s *SecurityAuditService) RevokeAllUserRefreshTokens(userID string) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`UPDATE refresh_tokens SET revoked = true WHERE user_id = $1`, userID)
}

// BlacklistToken adds a JWT to the blacklist.
func (s *SecurityAuditService) BlacklistToken(jti, tokenType, userID string, expiresAt time.Time) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`
		INSERT INTO token_blacklist (token_jti, token_type, user_id, expires_at)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (token_jti) DO NOTHING
	`, jti, tokenType, userID, expiresAt)
}

// IsTokenBlacklisted checks if a token JTI is in the blacklist.
func (s *SecurityAuditService) IsTokenBlacklisted(jti string) bool {
	s.ensureTables()
	if database.DB == nil {
		return false
	}

	var count int
	err := database.DB.QueryRow(`
		SELECT COUNT(*) FROM token_blacklist WHERE token_jti = $1 AND expires_at > NOW()
	`, jti).Scan(&count)
	return err == nil && count > 0
}

// CheckPasswordHistory checks if a password was used before (last 5).
func (s *SecurityAuditService) CheckPasswordHistory(userID, newHash string) bool {
	s.ensureTables()
	if database.DB == nil {
		return false
	}

	rows, err := database.DB.Query(`
		SELECT password_hash FROM password_history
		WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5
	`, userID)
	if err != nil {
		return false
	}
	defer rows.Close()

	for rows.Next() {
		var hash string
		if err := rows.Scan(&hash); err != nil {
			continue
		}
		if hash == newHash {
			return true // Password was used before
		}
	}
	return false
}

// AddPasswordHistory adds a password hash to the history.
func (s *SecurityAuditService) AddPasswordHistory(userID, passwordHash string) {
	s.ensureTables()
	if database.DB == nil {
		return
	}

	database.DB.Exec(`
		INSERT INTO password_history (user_id, password_hash) VALUES ($1, $2)
	`, userID, passwordHash)

	// Keep only last 5
	database.DB.Exec(`
		DELETE FROM password_history WHERE id IN (
			SELECT id FROM password_history WHERE user_id = $1
			ORDER BY created_at DESC OFFSET 5
		)
	`, userID)
}

// periodicCleanup cleans up expired data from memory.
func (s *SecurityAuditService) periodicCleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		s.mu.Lock()
		now := time.Now()

		// Clean up blocked IPs
		for ip, expiresAt := range s.blockedIPs {
			if now.After(expiresAt) {
				delete(s.blockedIPs, ip)
			}
		}

		// Clean up login attempt trackers
		for ip, tracker := range s.loginAttempts {
			if !tracker.lastBlock.IsZero() && now.After(tracker.lastBlock.Add(15*time.Minute)) {
				delete(s.loginAttempts, ip)
				continue
			}
			// Clean old attempts
			cutoff := now.Add(-15 * time.Minute)
			var valid []time.Time
			for _, t := range tracker.attempts {
				if t.After(cutoff) {
					valid = append(valid, t)
				}
			}
			tracker.attempts = valid
			if len(tracker.attempts) == 0 && tracker.lastBlock.IsZero() {
				delete(s.loginAttempts, ip)
			}
		}

		// Clean expired blacklisted tokens from DB
		if database.DB != nil {
			database.DB.Exec(`DELETE FROM token_blacklist WHERE expires_at < NOW()`)
			database.DB.Exec(`DELETE FROM refresh_tokens WHERE expires_at < NOW()`)
			database.DB.Exec(`DELETE FROM user_sessions WHERE expires_at < NOW()`)
		}

		s.mu.Unlock()
	}
}
