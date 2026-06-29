package services

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

const (
	BackupBasePath = "/root/backups"
	MaxBackups     = 50
	DefaultTenant  = "default"
)

// BackupService handles SQL backups of game database tables before write operations.
type BackupService struct{}

func NewBackupService() *BackupService {
	return &BackupService{}
}

// BackupTable creates a full SQL INSERT backup of the specified table with optional WHERE clause.
// Returns the backup directory path.
func (s *BackupService) BackupTable(db *sql.DB, tableName, whereClause string) (string, error) {
	if db == nil {
		return "", fmt.Errorf("database connection is nil")
	}

	// Sanitize table name
	safeTable := sanitizeTableName(tableName)
	if safeTable == "" {
		return "", fmt.Errorf("invalid table name: %s", tableName)
	}

	// Get columns
	columns, err := getTableColumnsInfo(db, safeTable)
	if err != nil {
		return "", fmt.Errorf("failed to get columns for %s: %w", safeTable, err)
	}
	if len(columns) == 0 {
		return "", fmt.Errorf("no columns found for table %s", safeTable)
	}

	// Build SELECT query
	colNames := make([]string, len(columns))
	for i, col := range columns {
		colNames[i] = fmt.Sprintf("[%s]", col)
	}

	query := fmt.Sprintf("SELECT %s FROM [%s] %s",
		strings.Join(colNames, ", "),
		safeTable,
		whereClause,
	)

	rows, err := db.Query(query)
	if err != nil {
		return "", fmt.Errorf("backup query failed: %w", err)
	}
	defer rows.Close()

	// Prepare backup directory
	timestamp := time.Now().UTC().Format("20060102_150405_000")
	tenantID := DefaultTenant
	backupDir := filepath.Join(BackupBasePath, tenantID, safeTable, timestamp)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create backup dir: %w", err)
	}

	// Write SQL backup file
	backupFile := filepath.Join(backupDir, "backup.sql")
	f, err := os.Create(backupFile)
	if err != nil {
		return "", fmt.Errorf("failed to create backup file: %w", err)
	}
	defer f.Close()

	// Write header
	fmt.Fprintf(f, "-- Backup of [%s] created at %s\n", safeTable, time.Now().UTC().Format(time.RFC3339))
	if whereClause != "" {
		fmt.Fprintf(f, "-- WHERE: %s\n", whereClause)
	}
	fmt.Fprintf(f, "-- \n\n")

	// Prepare scan destinations
	scanArgs := make([]interface{}, len(columns))
	for i := range scanArgs {
		scanArgs[i] = new(interface{})
	}

	var rowCount int
	for rows.Next() {
		if err := rows.Scan(scanArgs...); err != nil {
			continue
		}

		var values []string
		for _, val := range scanArgs {
			ptr := val.(*interface{})
			if *ptr == nil {
				values = append(values, "NULL")
			} else {
				switch v := (*ptr).(type) {
				case []byte:
					str := strings.ReplaceAll(string(v), "'", "''")
					values = append(values, fmt.Sprintf("N'%s'", str))
				case string:
					str := strings.ReplaceAll(v, "'", "''")
					values = append(values, fmt.Sprintf("N'%s'", str))
				case int64, float64, bool:
					values = append(values, fmt.Sprintf("%v", v))
				case time.Time:
					values = append(values, fmt.Sprintf("'%s'", v.Format("2006-01-02 15:04:05.000")))
				default:
					values = append(values, fmt.Sprintf("N'%v'", v))
				}
			}
		}

		quotedCols := make([]string, len(colNames))
		for i, c := range colNames {
			quotedCols[i] = c
		}

		fmt.Fprintf(f, "INSERT INTO [%s] (%s) VALUES (%s);\n",
			safeTable,
			strings.Join(quotedCols, ", "),
			strings.Join(values, ", "),
		)
		rowCount++
	}

	if err := rows.Err(); err != nil {
		return "", fmt.Errorf("rows iteration error: %w", err)
	}

	// Write metadata
	meta := map[string]interface{}{
		"table_name":   safeTable,
		"where_clause": whereClause,
		"row_count":    rowCount,
		"created_at":   time.Now().UTC(),
		"tenant_id":    tenantID,
	}
	metaFile := filepath.Join(backupDir, "metadata.json")
	metaData, _ := json.MarshalIndent(meta, "", "  ")
	os.WriteFile(metaFile, metaData, 0644)

	// Append row count to SQL file
	f.WriteString(fmt.Sprintf("\n-- Total rows backed up: %d\n", rowCount))

	// Cleanup old backups
	s.CleanupOldBackups(tenantID, safeTable)

	return backupDir, nil
}

// RestoreFromBackup restores data from a backup directory using the provided DB connection.
func (s *BackupService) RestoreFromBackup(db *sql.DB, backupPath string) error {
	if db == nil {
		return fmt.Errorf("database connection is nil")
	}

	sqlFile := filepath.Join(backupPath, "backup.sql")
	if _, err := os.Stat(sqlFile); os.IsNotExist(err) {
		return fmt.Errorf("backup file not found: %s", sqlFile)
	}

	data, err := os.ReadFile(sqlFile)
	if err != nil {
		return fmt.Errorf("failed to read backup file: %w", err)
	}

	// Execute each non-comment, non-empty statement
	lines := strings.Split(string(data), "\n")
	var stmtBuilder strings.Builder
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		stmtBuilder.WriteString(line + "\n")
	}

	fullSQL := stmtBuilder.String()
	statements := strings.Split(fullSQL, ";\n")

	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" {
			continue
		}
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("restore statement failed: %w\nStatement: %s...", err, stmt[:min(len(stmt), 200)])
		}
	}

	return nil
}

// VerifyBackupIntegrity checks that a backup directory contains valid files.
func (s *BackupService) VerifyBackupIntegrity(backupPath string) error {
	info, err := os.Stat(backupPath)
	if err != nil {
		return fmt.Errorf("backup path not accessible: %w", err)
	}
	if !info.IsDir() {
		return fmt.Errorf("backup path is not a directory")
	}

	sqlFile := filepath.Join(backupPath, "backup.sql")
	if _, err := os.Stat(sqlFile); os.IsNotExist(err) {
		return fmt.Errorf("backup.sql not found in %s", backupPath)
	}

	metaFile := filepath.Join(backupPath, "metadata.json")
	if _, err := os.Stat(metaFile); os.IsNotExist(err) {
		return fmt.Errorf("metadata.json not found in %s", backupPath)
	}

	data, err := os.ReadFile(sqlFile)
	if err != nil {
		return fmt.Errorf("cannot read backup.sql: %w", err)
	}
	if len(data) == 0 {
		return fmt.Errorf("backup.sql is empty")
	}

	// Verify metadata is valid JSON
	metaData, err := os.ReadFile(metaFile)
	if err != nil {
		return fmt.Errorf("cannot read metadata.json: %w", err)
	}
	var meta map[string]interface{}
	if err := json.Unmarshal(metaData, &meta); err != nil {
		return fmt.Errorf("metadata.json is invalid JSON: %w", err)
	}

	// Check row count matches if available
	if rowCount, ok := meta["row_count"]; ok {
		if rc, ok := rowCount.(float64); ok && rc > 0 {
			insertCount := strings.Count(string(data), "INSERT INTO")
			if insertCount != int(rc) {
				return fmt.Errorf("row count mismatch: metadata says %d, SQL has %d INSERTs", int(rc), insertCount)
			}
		}
	}

	return nil
}

// CleanupOldBackups removes older backups, keeping only the most recent MaxBackups.
func (s *BackupService) CleanupOldBackups(tenantID, tableName string) {
	backupDir := filepath.Join(BackupBasePath, tenantID, tableName)
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		return
	}

	// Filter only directories (each backup is a directory)
	var dirs []os.DirEntry
	for _, e := range entries {
		if e.IsDir() {
			dirs = append(dirs, e)
		}
	}

	if len(dirs) <= MaxBackups {
		return
	}

	// Get full info for sorting
	type dirInfo struct {
		name string
		mod  time.Time
	}
	var infos []dirInfo
	for _, d := range dirs {
		fi, err := d.Info()
		if err != nil {
			continue
		}
		infos = append(infos, dirInfo{name: d.Name(), mod: fi.ModTime()})
	}

	// Sort oldest first
	sort.Slice(infos, func(i, j int) bool {
		return infos[i].mod.Before(infos[j].mod)
	})

	toRemove := len(infos) - MaxBackups
	for i := 0; i < toRemove; i++ {
		fullPath := filepath.Join(backupDir, infos[i].name)
		os.RemoveAll(fullPath)
	}
}

// HealthCheck verifies the backup storage is operational.
func (s *BackupService) HealthCheck() error {
	if err := os.MkdirAll(BackupBasePath, 0755); err != nil {
		return fmt.Errorf("cannot access backup base path: %w", err)
	}

	testFile := filepath.Join(BackupBasePath, ".backup_health_check")
	if err := os.WriteFile(testFile, []byte("ok"), 0644); err != nil {
		return fmt.Errorf("backup directory not writable: %w", err)
	}
	os.Remove(testFile)

	return nil
}

// getTableColumnsInfo returns column names for a given table.
func getTableColumnsInfo(db *sql.DB, tableName string) ([]string, error) {
	query := fmt.Sprintf(`
		SELECT COLUMN_NAME
		FROM INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_NAME = '%s'
		ORDER BY ORDINAL_POSITION
	`, tableName)

	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []string
	for rows.Next() {
		var col string
		if err := rows.Scan(&col); err != nil {
			continue
		}
		cols = append(cols, col)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return cols, nil
}

// sanitizeTableName makes a table name safe for SQL queries.
func sanitizeTableName(name string) string {
	safe := strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == ' ' {
			return r
		}
		return -1
	}, name)
	return strings.TrimSpace(safe)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
