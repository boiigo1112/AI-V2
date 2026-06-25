package services

import (
	"database/sql"
	"fmt"
	"log"
	"strings"
	"sync"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/gamedatabase"
)

type GameService struct {
	mu     sync.RWMutex
	gameDB *gamedatabase.GameDB
	cfg    *gameServiceConfig
}

type gameServiceConfig struct {
	JWTSecret string
}

func NewGameService(jwtSecret string) *GameService {
	svc := &GameService{
		cfg: &gameServiceConfig{JWTSecret: jwtSecret},
	}
	svc.reconnect()
	return svc
}

func (s *GameService) reconnect() {
	var connID, host, username, password, dbName string
	var port int

	err := database.DB.QueryRow(`
		SELECT id, host, port, username, password, database_name
		FROM game_connections WHERE is_connected = true
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&connID, &host, &port, &username, &password, &dbName)
	if err != nil {
		log.Printf("[game] no saved connection: %v", err)
		return
	}

	decryptedPass, err := gamedatabase.DecryptPassword(password, s.cfg.JWTSecret)
	if err != nil {
		log.Printf("[game] failed to decrypt password: %v", err)
		return
	}

	gamedb, err := gamedatabase.Connect(gamedatabase.GameDBConnection{
		ID:       connID,
		Host:     host,
		Port:     port,
		Database: dbName,
		Username: username,
		Password: decryptedPass,
	})
	if err != nil {
		log.Printf("[game] reconnect failed: %v", err)
		database.DB.Exec(`UPDATE game_connections SET is_connected = false WHERE id = $1`, connID)
		return
	}

	s.mu.Lock()
	s.gameDB = gamedb
	s.mu.Unlock()
	log.Printf("[game] reconnected to %s:%d", host, port)
}

func (s *GameService) GetDB() *gamedatabase.GameDB {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.gameDB
}

func (s *GameService) IsConnected() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.gameDB == nil {
		return false
	}
	return s.gameDB.DB.Ping() == nil
}

func (s *GameService) GetConnectionInfo() map[string]interface{} {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.gameDB == nil || s.gameDB.Config == nil {
		return nil
	}
	return map[string]interface{}{
		"host":     s.gameDB.Config.Host,
		"port":     s.gameDB.Config.Port,
		"database": s.gameDB.Config.Database,
		"username": s.gameDB.Config.Username,
		"connected": s.IsConnected(),
	}
}

type ColumnInfo struct {
	StandardField string `json:"standard_field"`
	ActualColumn  string `json:"actual_column"`
	DataType      string `json:"data_type"`
	TableName     string `json:"table_name"`
	IsRequired    bool   `json:"is_required"`
}

func (s *GameService) GetColumnMappings(dbName string) (map[string][]ColumnInfo, error) {
	s.mu.RLock()
	connID := ""
	if s.gameDB != nil && s.gameDB.Config != nil {
		connID = s.gameDB.Config.ID
	}
	s.mu.RUnlock()

	if connID == "" {
		return nil, fmt.Errorf("no game connection")
	}

	rows, err := database.DB.Query(`
		SELECT table_name, standard_field, actual_column, data_type, is_required
		FROM column_mappings WHERE connection_id = $1 AND db_name = $2
		ORDER BY table_name, standard_field
	`, connID, dbName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]ColumnInfo)
	for rows.Next() {
		var c ColumnInfo
		if err := rows.Scan(&c.TableName, &c.StandardField, &c.ActualColumn, &c.DataType, &c.IsRequired); err != nil {
			continue
		}
		result[c.TableName] = append(result[c.TableName], c)
	}
	return result, nil
}

func (s *GameService) GetActualColumn(tableName, standardField string) (string, error) {
	mappings, err := s.GetColumnMappings("RanUser")
	if err != nil {
		return "", err
	}
	if cols, ok := mappings[tableName]; ok {
		for _, c := range cols {
			if c.StandardField == standardField {
				return c.ActualColumn, nil
			}
		}
	}

	mappings, err = s.GetColumnMappings("RanGame1")
	if err == nil {
		if cols, ok := mappings[tableName]; ok {
			for _, c := range cols {
				if c.StandardField == standardField {
					return c.ActualColumn, nil
				}
			}
		}
	}

	return "", fmt.Errorf("column mapping not found: %s.%s", tableName, standardField)
}

func (s *GameService) Query(dbName, query string, args ...interface{}) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	fullQuery := fmt.Sprintf("USE [%s]; %s", safeDB, query)

	rows, err := gdb.DB.Query(fullQuery, args...)
	if err != nil {
		return nil, fmt.Errorf("query error: %w", err)
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (s *GameService) ListPlayers(tableName, searchCol, search string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	userIDCol, _ := s.GetActualColumn(tableName, "UserID")

	if userNumCol == "" {
		userNumCol = "UserNum"
	}
	if userIDCol == "" {
		userIDCol = "UserID"
	}

	var total int
	var rows *sql.Rows
	var err error

	tableRef := fmt.Sprintf("[RanUser]..[%s]", tableName)

	if search != "" {
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s WHERE [%s] LIKE '%%"+search+"%%'", tableRef, userIDCol)
		if e := gdb.DB.QueryRow(countQuery).Scan(&total); e != nil {
			return nil, 0, e
		}
		dataQuery := fmt.Sprintf("SELECT * FROM %s WHERE [%s] LIKE '%%"+search+"%%' ORDER BY [%s] DESC", tableRef, userIDCol, userNumCol)
		rows, err = gdb.DB.Query(dataQuery)
	} else {
		countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
		if e := gdb.DB.QueryRow(countQuery).Scan(&total); e != nil {
			return nil, 0, e
		}
		dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY [%s] DESC", tableRef, userNumCol)
		rows, err = gdb.DB.Query(dataQuery)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	count := 0
	for rows.Next() && count < offset+limit {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		if count >= offset {
			row := make(map[string]interface{})
			for i, col := range columns {
				val := values[i]
				if b, ok := val.([]byte); ok {
					row[col] = string(b)
				} else {
					row[col] = val
				}
			}
			results = append(results, row)
		}
		count++
	}
	return results, total, nil
}

func (s *GameService) GetPlayer(tableName string, usernum interface{}) (map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT * FROM [RanUser]..[%s] WHERE [%s] = '%v'", tableName, userNumCol, usernum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, fmt.Errorf("player not found")
	}

	columns, _ := rows.Columns()
	values := make([]interface{}, len(columns))
	valuePtrs := make([]interface{}, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}
	if err := rows.Scan(valuePtrs...); err != nil {
		return nil, err
	}

	row := make(map[string]interface{})
	for i, col := range columns {
		val := values[i]
		if b, ok := val.([]byte); ok {
			row[col] = string(b)
		} else {
			row[col] = val
		}
	}
	return row, nil
}

func (s *GameService) ListCharacters(usernum interface{}) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn("ChaInfo", "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT * FROM [RanGame1]..[ChaInfo] WHERE [%s] = '%v' ORDER BY ChaLevel DESC", userNumCol, usernum)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, nil
}

func (s *GameService) ListLogs(dbName, tableName string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	safeTable := gamedatabase.SanitizeTableName(tableName)

	dateCol := "LogDate"
	for _, c := range []string{"LogDate", "ActionDate", "Date", "SessionDate", "PayDate", "GiftedAt", "CreatedDate"} {
		cols, _ := s.getColumnNames(gdb, safeDB, safeTable)
		for _, col := range cols {
			if strings.EqualFold(col, c) {
				dateCol = col
				break
			}
		}
	}

	var total int
	tableRef := fmt.Sprintf("[%s]..[%s]", safeDB, safeTable)
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY [%s] DESC", tableRef, dateCol)
	rows, err := gdb.DB.Query(dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) getColumnNames(gdb *gamedatabase.GameDB, dbName, tableName string) ([]string, error) {
	query := fmt.Sprintf("SELECT TOP 1 * FROM [%s]..[%s]", dbName, tableName)
	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return rows.Columns()
}

func (s *GameService) ListTables(dbName string) ([]string, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	query := fmt.Sprintf("SELECT TABLE_NAME FROM [%s].INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME", safeDB)

	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			continue
		}
		tables = append(tables, name)
	}
	return tables, nil
}

func (s *GameService) GetTableColumns(dbName, tableName string) ([]map[string]interface{}, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, fmt.Errorf("game database not connected")
	}

	safeDB := gamedatabase.SanitizeDBName(dbName)
	safeTable := gamedatabase.SanitizeTableName(tableName)
	query := fmt.Sprintf(`
		SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
		FROM [%s].INFORMATION_SCHEMA.COLUMNS
		WHERE TABLE_NAME = '%s'
		ORDER BY ORDINAL_POSITION
	`, safeDB, safeTable)

	rows, err := gdb.DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cols []map[string]interface{}
	for rows.Next() {
		var name, dataType string
		var maxLen sql.NullInt64
		var nullable string
		if err := rows.Scan(&name, &dataType, &maxLen, &nullable); err != nil {
			continue
		}
		col := map[string]interface{}{
			"name":       name,
			"data_type":  dataType,
			"is_nullable": nullable == "YES",
		}
		if maxLen.Valid {
			col["max_length"] = maxLen.Int64
		}
		cols = append(cols, col)
	}
	return cols, nil
}

func (s *GameService) BlockPlayer(tableName, usernum, reason string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT TOP 1 [%s] FROM [RanUser]..[%s] WHERE [%s] = '%v'", userNumCol, tableName, userNumCol, usernum)
	var checkVal string
	if err := gdb.DB.QueryRow(query).Scan(&checkVal); err != nil {
		return fmt.Errorf("player not found")
	}

	insertQuery := fmt.Sprintf("INSERT INTO [RanUser]..[BlockAddress] ([BlockAddress], [BlockReason], [BlockDate]) VALUES ('%s', '%s', GETDATE())", usernum, reason)
	_, err := gdb.DB.Exec(insertQuery)
	return err
}

func (s *GameService) UnblockPlayer(tableName, usernum string) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	userNumCol, _ := s.GetActualColumn(tableName, "UserNum")
	if userNumCol == "" {
		userNumCol = "UserNum"
	}

	query := fmt.Sprintf("SELECT TOP 1 [%s] FROM [RanUser]..[%s] WHERE [%s] = '%v'", userNumCol, tableName, userNumCol, usernum)
	var checkVal string
	if err := gdb.DB.QueryRow(query).Scan(&checkVal); err != nil {
		return fmt.Errorf("player not found")
	}

	return nil
}

func (s *GameService) UpdateCharacter(chanum string, field string, value interface{}) error {
	gdb := s.GetDB()
	if gdb == nil {
		return fmt.Errorf("game database not connected")
	}

	allowedFields := map[string]bool{
		"ChaLevel": true, "ChaMoney": true, "ChaExp": true,
		"ChaPower": true, "ChaDex": true, "ChaSpirit": true,
		"ChaStrong": true, "ChaIntel": true, "ChaReborn": true,
	}
	if !allowedFields[field] {
		return fmt.Errorf("field '%s' is not editable", field)
	}

	query := fmt.Sprintf("UPDATE [RanGame1]..[ChaInfo] SET [%s] = '%v' WHERE ChaNum = '%s'", field, value, chanum)
	result, err := gdb.DB.Exec(query)
	if err != nil {
		return err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return fmt.Errorf("character not found")
	}
	return nil
}

func (s *GameService) ListShopItems(tableName string, limit, offset int) ([]map[string]interface{}, int, error) {
	gdb := s.GetDB()
	if gdb == nil {
		return nil, 0, fmt.Errorf("game database not connected")
	}

	tableRef := fmt.Sprintf("[RanShop]..[%s]", tableName)

	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM %s", tableRef)
	if err := gdb.DB.QueryRow(countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataQuery := fmt.Sprintf("SELECT * FROM %s ORDER BY 1 OFFSET %d ROWS FETCH NEXT %d ROWS ONLY", tableRef, offset, limit)
	rows, err := gdb.DB.Query(dataQuery)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}
		if err := rows.Scan(valuePtrs...); err != nil {
			continue
		}
		row := make(map[string]interface{})
		for i, col := range columns {
			val := values[i]
			if b, ok := val.([]byte); ok {
				row[col] = string(b)
			} else {
				row[col] = val
			}
		}
		results = append(results, row)
	}
	return results, total, nil
}

func (s *GameService) Reconnect(host string, port int, username, password string) error {
	gdb, err := gamedatabase.Connect(gamedatabase.GameDBConnection{
		ID:       "reconnect-" + host,
		Host:     host,
		Port:     port,
		Database: "master",
		Username: username,
		Password: password,
	})
	if err != nil {
		return err
	}

	s.mu.Lock()
	if s.gameDB != nil {
		s.gameDB.DB.Close()
	}
	s.gameDB = gdb
	s.mu.Unlock()

	database.DB.Exec(`UPDATE game_connections SET is_connected = true, host = $1, port = $2, username = $3 WHERE is_connected = true`, host, port, username)

	encryptedPass, encErr := gamedatabase.EncryptPassword(password, s.cfg.JWTSecret)
	if encErr == nil {
		database.DB.Exec(`UPDATE game_connections SET password = $1 WHERE is_connected = true`, encryptedPass)
	}

	return nil
}
