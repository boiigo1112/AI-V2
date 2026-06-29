package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/blacken/admin-panel/database"
)

// AuditService handles logging of game DB write operations to the PostgreSQL audit_logs table.
type AuditService struct{}

func NewAuditService() *AuditService {
	return &AuditService{}
}

// ensureAuditTable creates the audit_logs table if it does not exist.
func (a *AuditService) ensureAuditTable() error {
	query := `
		CREATE TABLE IF NOT EXISTS audit_logs (
			id SERIAL PRIMARY KEY,
			user_id VARCHAR(255) NOT NULL,
			action VARCHAR(100) NOT NULL,
			target_table VARCHAR(255) NOT NULL DEFAULT '',
			target_id VARCHAR(255) NOT NULL DEFAULT '',
			before_data JSONB,
			after_data JSONB,
			ip_address VARCHAR(45) NOT NULL DEFAULT '',
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`
	if _, err := database.DB.Exec(query); err != nil {
		return fmt.Errorf("failed to ensure audit_logs table: %w", err)
	}

	// Create indexes if they don't exist
	indexes := []string{
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_target_table ON audit_logs(target_table)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)`,
		`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`,
	}
	for _, idx := range indexes {
		database.DB.Exec(idx)
	}

	return nil
}

// LogAction records a game DB write operation in the audit log.
// ctx: request context, userID: admin's user ID, action: operation name,
// table: target game table, targetID: primary key value of the affected row,
// before: data before the change (nil for inserts), after: data after the change (nil for deletes),
// ip: client IP address.
func (a *AuditService) LogAction(ctx context.Context, userID, action, table, targetID string, before, after interface{}, ip string) error {
	if database.DB == nil {
		return fmt.Errorf("database not connected")
	}

	// Ensure table exists
	if err := a.ensureAuditTable(); err != nil {
		return err
	}

	var beforeJSON, afterJSON sql.NullString
	if before != nil {
		b, err := json.Marshal(before)
		if err == nil {
			beforeJSON = sql.NullString{String: string(b), Valid: true}
		}
	}
	if after != nil {
		b, err := json.Marshal(after)
		if err == nil {
			afterJSON = sql.NullString{String: string(b), Valid: true}
		}
	}

	query := `
		INSERT INTO audit_logs (user_id, action, target_table, target_id, before_data, after_data, ip_address, created_at)
		VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, NOW())
	`
	_, err := database.DB.ExecContext(ctx, query,
		userID, action, table, targetID,
		beforeJSON, afterJSON, ip,
	)
	if err != nil {
		return fmt.Errorf("failed to insert audit log: %w", err)
	}
	return nil
}

// GetAuditLogs retrieves paginated audit logs with optional filters.
// filters can include: user_id, action, target_table, date_from, date_to.
func (a *AuditService) GetAuditLogs(limit, offset int, filters map[string]interface{}) ([]map[string]interface{}, int, error) {
	if database.DB == nil {
		return nil, 0, fmt.Errorf("database not connected")
	}

	// Ensure table exists
	a.ensureAuditTable()

	where := []string{}
	args := []interface{}{}
	argIdx := 1

	if filters != nil {
		if uid, ok := filters["user_id"]; ok && uid != "" {
			where = append(where, fmt.Sprintf("user_id = $%d", argIdx))
			args = append(args, uid)
			argIdx++
		}
		if action, ok := filters["action"]; ok && action != "" {
			where = append(where, fmt.Sprintf("action = $%d", argIdx))
			args = append(args, action)
			argIdx++
		}
		if table, ok := filters["target_table"]; ok && table != "" {
			where = append(where, fmt.Sprintf("target_table = $%d", argIdx))
			args = append(args, table)
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

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM audit_logs %s", whereStr)
	var total int
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	if err := database.DB.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		total = 0
	}

	// Query data
	dataQuery := fmt.Sprintf("SELECT id, user_id, action, target_table, target_id, COALESCE(before_data::text, ''), COALESCE(after_data::text, ''), ip_address, created_at FROM audit_logs %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		whereStr, argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := database.DB.Query(dataQuery, args...)
	if err != nil {
		return []map[string]interface{}{}, total, nil
	}
	defer rows.Close()

	var results []map[string]interface{}
	for rows.Next() {
		var id int
		var userID, action, table, targetID, beforeStr, afterStr, ip string
		var createdAt time.Time

		if err := rows.Scan(&id, &userID, &action, &table, &targetID, &beforeStr, &afterStr, &ip, &createdAt); err != nil {
			continue
		}

		row := map[string]interface{}{
			"id":           id,
			"user_id":      userID,
			"action":       action,
			"target_table": table,
			"target_id":    targetID,
			"before_data":  beforeStr,
			"after_data":   afterStr,
			"ip_address":   ip,
			"created_at":   createdAt,
		}
		results = append(results, row)
	}

	if results == nil {
		results = []map[string]interface{}{}
	}
	return results, total, nil
}

// GetAuditStats returns summary statistics from the audit logs.
func (a *AuditService) GetAuditStats() (map[string]interface{}, error) {
	if database.DB == nil {
		return nil, fmt.Errorf("database not connected")
	}

	a.ensureAuditTable()

	stats := map[string]interface{}{
		"total_logs":      0,
		"unique_users":    0,
		"unique_actions":  0,
		"unique_tables":   0,
		"logs_today":      0,
		"logs_this_week":  0,
		"logs_this_month": 0,
		"top_users":       []map[string]interface{}{},
		"top_actions":     []map[string]interface{}{},
		"top_tables":      []map[string]interface{}{},
	}

	// Total logs
	var totalLogs int
	database.DB.QueryRow("SELECT COUNT(*) FROM audit_logs").Scan(&totalLogs)
	stats["total_logs"] = totalLogs

	// Unique users
	var uniqueUsers int
	database.DB.QueryRow("SELECT COUNT(DISTINCT user_id) FROM audit_logs").Scan(&uniqueUsers)
	stats["unique_users"] = uniqueUsers

	// Unique actions
	var uniqueActions int
	database.DB.QueryRow("SELECT COUNT(DISTINCT action) FROM audit_logs").Scan(&uniqueActions)
	stats["unique_actions"] = uniqueActions

	// Unique tables
	var uniqueTables int
	database.DB.QueryRow("SELECT COUNT(DISTINCT target_table) FROM audit_logs").Scan(&uniqueTables)
	stats["unique_tables"] = uniqueTables

	// Today
	var logsToday int
	database.DB.QueryRow("SELECT COUNT(*) FROM audit_logs WHERE created_at >= CURRENT_DATE").Scan(&logsToday)
	stats["logs_today"] = logsToday

	// This week
	var logsThisWeek int
	database.DB.QueryRow("SELECT COUNT(*) FROM audit_logs WHERE created_at >= date_trunc('week', CURRENT_DATE)").Scan(&logsThisWeek)
	stats["logs_this_week"] = logsThisWeek

	// This month
	var logsThisMonth int
	database.DB.QueryRow("SELECT COUNT(*) FROM audit_logs WHERE created_at >= date_trunc('month', CURRENT_DATE)").Scan(&logsThisMonth)
	stats["logs_this_month"] = logsThisMonth

	// Top users
	if rows, err := database.DB.Query("SELECT user_id, COUNT(*) as cnt FROM audit_logs GROUP BY user_id ORDER BY cnt DESC LIMIT 10"); err == nil {
		defer rows.Close()
		var topUsers []map[string]interface{}
		for rows.Next() {
			var uid string
			var cnt int
			if err := rows.Scan(&uid, &cnt); err == nil {
				topUsers = append(topUsers, map[string]interface{}{"user_id": uid, "count": cnt})
			}
		}
		stats["top_users"] = topUsers
	}

	// Top actions
	if rows, err := database.DB.Query("SELECT action, COUNT(*) as cnt FROM audit_logs GROUP BY action ORDER BY cnt DESC LIMIT 10"); err == nil {
		defer rows.Close()
		var topActions []map[string]interface{}
		for rows.Next() {
			var act string
			var cnt int
			if err := rows.Scan(&act, &cnt); err == nil {
				topActions = append(topActions, map[string]interface{}{"action": act, "count": cnt})
			}
		}
		stats["top_actions"] = topActions
	}

	// Top tables
	if rows, err := database.DB.Query("SELECT target_table, COUNT(*) as cnt FROM audit_logs GROUP BY target_table ORDER BY cnt DESC LIMIT 10"); err == nil {
		defer rows.Close()
		var topTables []map[string]interface{}
		for rows.Next() {
			var tbl string
			var cnt int
			if err := rows.Scan(&tbl, &cnt); err == nil {
				topTables = append(topTables, map[string]interface{}{"table": tbl, "count": cnt})
			}
		}
		stats["top_tables"] = topTables
	}

	return stats, nil
}
