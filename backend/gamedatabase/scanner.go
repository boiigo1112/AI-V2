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
	query := fmt.Sprintf(`
		SELECT
			c.TABLE_CATALOG,
			c.TABLE_NAME,
			c.COLUMN_NAME,
			c.DATA_TYPE,
			ISNULL(c.CHARACTER_MAXIMUM_LENGTH, 0),
			c.IS_NULLABLE,
			ISNULL(c.COLUMN_DEFAULT, '')
		FROM [%s].INFORMATION_SCHEMA.COLUMNS c
		WHERE c.TABLE_NAME = @p1
		ORDER BY c.ORDINAL_POSITION
	`, safeDB)

	log.Printf("[gamedb] Scanning columns: [%s]..[%s]", safeDB, tableName)
	rows, err := gd.DB.Query(query, tableName)
	if err != nil {
		log.Printf("[gamedb] ScanColumns error: %v", err)
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
			log.Printf("[gamedb] ScanColumns row error: %v", err)
			continue
		}
		col.MaxLength = &maxLen
		col.IsNullable = nullable == "YES"
		cols = append(cols, col)
	}
	log.Printf("[gamedb] Found %d columns in [%s]..[%s]", len(cols), safeDB, tableName)
	return cols, nil
}

type DbScanResult struct {
	DBName  string                     `json:"db_name"`
	Tables  []GameDBTable              `json:"tables"`
	Columns map[string][]GameDBColumn  `json:"columns"`
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

		cols := make(map[string][]GameDBColumn)
		for _, t := range tables {
			columns, err := gd.ScanColumnsDirect(dbName, t.Table)
			if err != nil {
				log.Printf("[gamedb] Failed to scan columns for %s.%s: %v", dbName, t.Table, err)
				continue
			}
			if len(columns) == 0 {
				log.Printf("[gamedb] WARNING: 0 columns for %s.%s", dbName, t.Table)
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
