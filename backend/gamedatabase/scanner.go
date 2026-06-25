package gamedatabase

import (
	"fmt"
	"log"
	"strings"
)

func (gd *GameDB) ListDatabases() ([]string, error) {
	rows, err := gd.DB.Query(`SELECT name FROM sys.databases ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("failed to list databases: %w", err)
	}
	defer rows.Close()

	var dbs []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		dbs = append(dbs, name)
	}
	return dbs, nil
}

func (gd *GameDB) FindGameDatabases() ([]string, error) {
	all, err := gd.ListDatabases()
	if err != nil {
		return nil, err
	}
	targets := map[string]bool{"RanUser": true, "RanGame1": true, "RanLog": true, "RanShop": true}
	var found []string
	for _, db := range all {
		if targets[db] {
			found = append(found, db)
		}
	}
	return found, nil
}

func (gd *GameDB) SwitchDB(dbName string) error {
	safe := sanitizeDBName(dbName)
	if safe == "" {
		return fmt.Errorf("invalid database name: %s", dbName)
	}
	_, err := gd.DB.Exec("USE [" + safe + "]")
	if err != nil {
		log.Printf("[gamedb] USE [%s] failed: %v", safe, err)
	}
	return err
}

func sanitizeDBName(name string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			return r
		}
		return -1
	}, name)
}

func sanitizeTableName(name string) string {
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == ' ' {
			return r
		}
		return -1
	}, name)
}

func (gd *GameDB) ScanTablesDirect(dbName string) ([]GameDBTable, error) {
	safe := sanitizeDBName(dbName)
	query := fmt.Sprintf(`
		SELECT TABLE_CATALOG, TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
		FROM [%s].INFORMATION_SCHEMA.TABLES
		WHERE TABLE_TYPE = 'BASE TABLE'
		ORDER BY TABLE_NAME
	`, safe)

	log.Printf("[gamedb] Scanning tables in [%s]", safe)
	rows, err := gd.DB.Query(query)
	if err != nil {
		log.Printf("[gamedb] ScanTables error for %s: %v", safe, err)
		return nil, err
	}
	defer rows.Close()

	var tables []GameDBTable
	for rows.Next() {
		var t GameDBTable
		if err := rows.Scan(&t.Catalog, &t.Schema, &t.Table, &t.Type); err != nil {
			log.Printf("[gamedb] ScanTables row scan error: %v", err)
			continue
		}
		tables = append(tables, t)
	}
	log.Printf("[gamedb] Found %d tables in [%s]", len(tables), safe)
	return tables, nil
}

func (gd *GameDB) ScanColumnsDirect(dbName, tableName string) ([]GameDBColumn, error) {
	safeDB := sanitizeDBName(dbName)
	safeTable := sanitizeTableName(tableName)
	if safeDB == "" || safeTable == "" {
		return nil, fmt.Errorf("invalid db or table name: %s.%s", dbName, tableName)
	}

	query := fmt.Sprintf(`
		SELECT
			DB_NAME() AS TABLE_CATALOG,
			t.name AS TABLE_NAME,
			c.name AS COLUMN_NAME,
			ty.name AS DATA_TYPE,
			CASE WHEN c.max_length = -1 THEN 0 ELSE c.max_length END AS MAX_LENGTH,
			CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS IS_NULLABLE,
			ISNULL(dc.definition, '') AS DEFAULT_VAL
		FROM [%s].sys.columns c
		INNER JOIN [%s].sys.tables t ON c.object_id = t.object_id
		INNER JOIN [%s].sys.types ty ON c.user_type_id = ty.user_type_id
		LEFT JOIN [%s].sys.default_constraints dc ON c.default_object_id = dc.object_id
		WHERE t.name = '%s'
		ORDER BY c.column_id
	`, safeDB, safeDB, safeDB, safeDB, safeTable)

	log.Printf("[gamedb] Scanning columns: [%s]..[%s]", safeDB, safeTable)
	rows, err := gd.DB.Query(query)
	if err != nil {
		log.Printf("[gamedb] ScanColumns query error for [%s]..[%s]: %v", safeDB, safeTable, err)
		return nil, err
	}
	defer rows.Close()

	var cols []GameDBColumn
	for rows.Next() {
		var col GameDBColumn
		var maxLen int
		var nullable string
		if err := rows.Scan(
			&col.Catalog, &col.Table, &col.Column, &col.DataType,
			&maxLen, &nullable, &col.DefaultVal,
		); err != nil {
			log.Printf("[gamedb] ScanColumns row scan error for [%s]..[%s]: %v", safeDB, safeTable, err)
			continue
		}
		col.MaxLength = &maxLen
		col.IsNullable = nullable == "YES"
		cols = append(cols, col)
	}
	if err := rows.Err(); err != nil {
		log.Printf("[gamedb] ScanColumns rows iteration error for [%s]..[%s]: %v", safeDB, safeTable, err)
	}
	log.Printf("[gamedb] Found %d columns in [%s]..[%s]", len(cols), safeDB, safeTable)
	return cols, nil
}

func (gd *GameDB) ScanColumnsFallback(dbName, tableName string) ([]GameDBColumn, error) {
	safeDB := sanitizeDBName(dbName)
	safeTable := sanitizeTableName(tableName)
	if safeDB == "" || safeTable == "" {
		return nil, fmt.Errorf("invalid db or table name: %s.%s", dbName, tableName)
	}

	query := fmt.Sprintf("SELECT TOP 1 * FROM [%s].[%s]", safeDB, safeTable)
	log.Printf("[gamedb] Fallback column scan: [%s]..[%s]", safeDB, safeTable)

	rows, err := gd.DB.Query(query)
	if err != nil {
		log.Printf("[gamedb] Fallback scan error for [%s]..[%s]: %v", safeDB, safeTable, err)
		return nil, err
	}
	defer rows.Close()

	colTypes, err := rows.ColumnTypes()
	if err != nil {
		log.Printf("[gamedb] ColumnTypes error for [%s]..[%s]: %v", safeDB, safeTable, err)
		return nil, err
	}

	var cols []GameDBColumn
	for _, ct := range colTypes {
		nullable, _ := ct.Nullable()
		defaultVal := ""
		col := GameDBColumn{
			Catalog:    safeDB,
			Table:      safeTable,
			Column:     ct.Name(),
			DataType:   ct.DatabaseTypeName(),
			IsNullable: nullable,
			DefaultVal: defaultVal,
		}
		if col.DataType == "" {
			col.DataType = "unknown"
		}
		maxLen := 0
		if length, ok := ct.Length(); ok {
			maxLen = int(length)
		}
		col.MaxLength = &maxLen
		cols = append(cols, col)
	}
	log.Printf("[gamedb] Fallback found %d columns in [%s]..[%s]", len(cols), safeDB, safeTable)
	return cols, nil
}

func (gd *GameDB) TestQuery(dbName, tableName string) (int, error) {
	safeDB := sanitizeDBName(dbName)
	safeTable := sanitizeTableName(tableName)
	query := fmt.Sprintf("SELECT COUNT(*) FROM [%s].[%s]", safeDB, safeTable)

	var count int
	err := gd.DB.QueryRow(query).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

type DbScanResult struct {
	DBName  string                    `json:"db_name"`
	Tables  []GameDBTable             `json:"tables"`
	Columns map[string][]GameDBColumn `json:"columns"`
}

func (gd *GameDB) ScanAllGameDatabases() (map[string]DbScanResult, error) {
	dbs, err := gd.FindGameDatabases()
	if err != nil {
		return nil, err
	}

	log.Printf("[gamedb] Found game databases: %v", dbs)
	results := make(map[string]DbScanResult)

	for _, dbName := range dbs {
		log.Printf("[gamedb] Processing database: %s", dbName)

		tables, err := gd.ScanTablesDirect(dbName)
		if err != nil {
			log.Printf("[gamedb] Failed to scan tables in %s: %v", dbName, err)
			continue
		}

		bulkCols := ScanAllColumnsForTable(gd, dbName)

		cols := make(map[string][]GameDBColumn)
		for _, t := range tables {
			if bulkCols != nil {
				if c, ok := bulkCols[t.Table]; ok && len(c) > 0 {
					cols[t.Table] = c
					continue
				}
			}
			columns, err := gd.ScanColumnsDirect(dbName, t.Table)
			if err != nil {
				log.Printf("[gamedb] Primary scan failed for %s.%s: %v — trying fallback", dbName, t.Table, err)
				columns, err = gd.ScanColumnsFallback(dbName, t.Table)
				if err != nil {
					log.Printf("[gamedb] Fallback scan also failed for %s.%s: %v", dbName, t.Table, err)
				}
			}
			cols[t.Table] = columns
		}

		totalCols := 0
		for _, c := range cols {
			totalCols += len(c)
		}
		log.Printf("[gamedb] [%s] %d tables, %d columns total", dbName, len(tables), totalCols)

		results[dbName] = DbScanResult{
			DBName:  dbName,
			Tables:  tables,
			Columns: cols,
		}
	}

	return results, nil
}

func (gd *GameDB) TestConnection() error {
	return gd.DB.Ping()
}

func ScanColumnsWithFallback(gd *GameDB, dbName, tableName string) []GameDBColumn {
	columns, err := gd.ScanColumnsDirect(dbName, tableName)
	if err == nil && len(columns) > 0 {
		return columns
	}

	log.Printf("[gamedb] Trying fallback for %s.%s", dbName, tableName)
	columns, err = gd.ScanColumnsFallback(dbName, tableName)
	if err == nil && len(columns) > 0 {
		return columns
	}

	return []GameDBColumn{}
}

func ScanAllColumnsForTable(gd *GameDB, dbName string) map[string][]GameDBColumn {
	safeDB := sanitizeDBName(dbName)
	query := fmt.Sprintf(`
		SELECT
			DB_NAME() AS TABLE_CATALOG,
			t.name AS TABLE_NAME,
			c.name AS COLUMN_NAME,
			ty.name AS DATA_TYPE,
			CASE WHEN c.max_length = -1 THEN 0 ELSE c.max_length END AS MAX_LENGTH,
			CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS IS_NULLABLE,
			ISNULL(dc.definition, '') AS DEFAULT_VAL
		FROM [%s].sys.columns c
		INNER JOIN [%s].sys.tables t ON c.object_id = t.object_id
		INNER JOIN [%s].sys.types ty ON c.user_type_id = ty.user_type_id
		LEFT JOIN [%s].sys.default_constraints dc ON c.default_object_id = dc.object_id
		ORDER BY t.name, c.column_id
	`, safeDB, safeDB, safeDB, safeDB)

	log.Printf("[gamedb] Bulk scanning all columns in [%s]", safeDB)
	rows, err := gd.DB.Query(query)
	if err != nil {
		log.Printf("[gamedb] Bulk column scan error for [%s]: %v", safeDB, err)
		return nil
	}
	defer rows.Close()

	result := make(map[string][]GameDBColumn)
	for rows.Next() {
		var col GameDBColumn
		var maxLen int
		var nullable string
		if err := rows.Scan(
			&col.Catalog, &col.Table, &col.Column, &col.DataType,
			&maxLen, &nullable, &col.DefaultVal,
		); err != nil {
			log.Printf("[gamedb] Bulk scan row error: %v", err)
			continue
		}
		col.MaxLength = &maxLen
		col.IsNullable = nullable == "YES"
		result[col.Table] = append(result[col.Table], col)
	}

	total := 0
	for _, v := range result {
		total += len(v)
	}
	log.Printf("[gamedb] Bulk scan found %d columns across %d tables in [%s]", total, len(result), safeDB)
	return result
}
