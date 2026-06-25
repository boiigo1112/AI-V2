package handlers

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/gamedatabase"
)

type InstallHandler struct {
	mu     sync.RWMutex
	gameDB *gamedatabase.GameDB
	cfg    *installConfig
}

type installConfig struct {
	JWTSecret string
}

func NewInstallHandler(cfg ...string) *InstallHandler {
	h := &InstallHandler{}
	if len(cfg) > 0 {
		h.cfg = &installConfig{JWTSecret: cfg[0]}
	} else {
		h.cfg = &installConfig{JWTSecret: "default-secret-change-me"}
	}
	h.tryReconnect()
	return h
}

func (h *InstallHandler) tryReconnect() {
	var connID, host, username, password, dbName string
	var port int

	err := database.DB.QueryRow(`
		SELECT id, host, port, username, password, database_name
		FROM game_connections WHERE is_connected = true
		ORDER BY created_at DESC LIMIT 1
	`).Scan(&connID, &host, &port, &username, &password, &dbName)
	if err != nil {
		log.Printf("[install] no saved connection to reconnect: %v", err)
		return
	}

	decryptedPass, err := gamedatabase.DecryptPassword(password, h.cfg.JWTSecret)
	if err != nil {
		log.Printf("[install] failed to decrypt saved password: %v", err)
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
		log.Printf("[install] failed to reconnect to game DB: %v", err)
		database.DB.Exec(`UPDATE game_connections SET is_connected = false WHERE id = $1`, connID)
		return
	}

	h.gameDB = gamedb
	log.Printf("[install] reconnected to game DB: %s:%d", host, port)
}

func (h *InstallHandler) Status(c *gin.Context) {
	var installed bool
	var step int
	database.DB.QueryRow(`SELECT completed, step FROM install_status ORDER BY created_at DESC LIMIT 1`).Scan(&installed, &step)
	c.JSON(http.StatusOK, gin.H{"installed": installed, "step": step})
}

func (h *InstallHandler) PendingScan(c *gin.Context) {
	if isInstalled() {
		c.JSON(http.StatusConflict, gin.H{"error": "ระบบติดตั้งเสร็จแล้ว"})
		return
	}

	connID := h.getConnID()
	if connID == "" {
		c.JSON(http.StatusOK, gin.H{"has_connection": false})
		return
	}

	h.mu.RLock()
	gameDB := h.gameDB
	h.mu.RUnlock()

	if gameDB == nil {
		h.tryReconnect()
		h.mu.RLock()
		gameDB = h.gameDB
		h.mu.RUnlock()
	}

	if gameDB == nil {
		c.JSON(http.StatusOK, gin.H{"has_connection": false, "error": "ไม่สามารถเชื่อมต่อฐานข้อมูลเกมได้"})
		return
	}

	dbs, err := gameDB.FindGameDatabases()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"has_connection": false, "error": "ไม่สามารถค้นหา Database: " + err.Error()})
		return
	}

	results, err := gameDB.ScanAllGameDatabases()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"has_connection": false, "error": "ไม่สามารถอ่านโครงสร้าง: " + err.Error()})
		return
	}

	type tableInfo struct {
		Name    string                      `json:"name"`
		Columns []gamedatabase.GameDBColumn `json:"columns"`
	}
	type dbInfo struct {
		Found  bool        `json:"found"`
		Tables []tableInfo `json:"tables"`
	}

	allDBs := make(map[string]dbInfo)

	for _, name := range []string{"RanUser", "RanGame1", "RanLog", "RanShop"} {
		res, ok := results[name]
		if !ok {
			allDBs[name] = dbInfo{Found: false}
			continue
		}
		var tis []tableInfo
		var allCols []gamedatabase.GameDBColumn
		for _, t := range res.Tables {
			cols := res.Columns[t.Table]
			if cols == nil {
				cols = make([]gamedatabase.GameDBColumn, 0)
			}
			tis = append(tis, tableInfo{Name: t.Table, Columns: cols})
			allCols = append(allCols, cols...)
		}
		if len(tis) == 0 {
			tis = make([]tableInfo, 0)
		}
		if allCols == nil {
			allCols = make([]gamedatabase.GameDBColumn, 0)
		}
		allDBs[name] = dbInfo{Found: true, Tables: tis}
	}

	allMappings := make(map[string][]gamedatabase.ColumnMapping)
	for _, name := range []string{"RanUser", "RanGame1", "RanLog", "RanShop"} {
		autoMappings := make(map[string]gamedatabase.ColumnMapping)

		var allCols []gamedatabase.GameDBColumn
		if res, ok := results[name]; ok {
			for _, t := range res.Tables {
				allCols = append(allCols, res.Columns[t.Table]...)
			}
		}

		for _, m := range gamedatabase.AutoDetectMappings(name, allCols) {
			key := m.TableName + "." + m.StandardField
			autoMappings[key] = m
		}

		savedRows, err := database.DB.Query(`
			SELECT db_name, table_name, standard_field, actual_column, data_type, is_required
			FROM column_mappings WHERE connection_id = $1 AND db_name = $2
		`, connID, name)
		if err == nil {
			defer savedRows.Close()
			for savedRows.Next() {
				var sm gamedatabase.ColumnMapping
				if err := savedRows.Scan(&sm.DBName, &sm.TableName, &sm.StandardField, &sm.ActualColumn, &sm.DataType, &sm.IsRequired); err == nil {
					key := sm.TableName + "." + sm.StandardField
					if auto, ok := autoMappings[key]; ok {
						auto.ActualColumn = sm.ActualColumn
						autoMappings[key] = auto
					}
				}
			}
		}

		var merged []gamedatabase.ColumnMapping
		for _, m := range autoMappings {
			merged = append(merged, m)
		}
		allMappings[name] = merged
	}

	var step int
	database.DB.QueryRow(`SELECT step FROM install_status ORDER BY created_at DESC LIMIT 1`).Scan(&step)

	h.mu.RLock()
	host := ""
	port := 0
	if gameDB != nil && gameDB.Config != nil {
		host = gameDB.Config.Host
		port = gameDB.Config.Port
	}
	h.mu.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"has_connection":  true,
		"host":            host,
		"port":            port,
		"step":            step,
		"databases":       allDBs,
		"found_databases": dbs,
		"mappings":        allMappings,
	})
}

func (h *InstallHandler) SaveStep(step int) {
	database.DB.Exec(`DELETE FROM install_status`)
	database.DB.Exec(`INSERT INTO install_status (step, completed) VALUES ($1, false)`, step)
}

func isInstalled() bool {
	var done bool
	database.DB.QueryRow(`SELECT completed FROM install_status ORDER BY created_at DESC LIMIT 1`).Scan(&done)
	return done
}

func (h *InstallHandler) guard(c *gin.Context) bool {
	if isInstalled() {
		c.JSON(http.StatusConflict, gin.H{"error": "ระบบติดตั้งเสร็จแล้ว"})
		return false
	}
	return true
}

func (h *InstallHandler) getConnID() string {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.gameDB != nil && h.gameDB.Config != nil {
		return h.gameDB.Config.ID
	}

	var connID string
	database.DB.QueryRow(`SELECT id FROM game_connections WHERE is_connected = true ORDER BY created_at DESC LIMIT 1`).Scan(&connID)
	return connID
}

func generateID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

func (h *InstallHandler) ConnectGameDB(c *gin.Context) {
	if !h.guard(c) {
		return
	}

	var req struct {
		Host     string `json:"host" binding:"required"`
		Port     int    `json:"port"`
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}
	if req.Port == 0 {
		req.Port = 1433
	}

	h.mu.Lock()
	if h.gameDB != nil {
		h.gameDB.DB.Close()
		h.gameDB = nil
	}

	connID := generateID()
	tmpDB, err := gamedatabase.Connect(gamedatabase.GameDBConnection{
		ID:       connID,
		Host:     req.Host,
		Port:     req.Port,
		Database: "master",
		Username: req.Username,
		Password: req.Password,
	})
	if err != nil {
		h.mu.Unlock()
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่สามารถเชื่อมต่อ MSSQL: " + err.Error()})
		return
	}
	h.gameDB = tmpDB
	h.mu.Unlock()

	dbs, err := tmpDB.FindGameDatabases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถค้นหา Database: " + err.Error()})
		return
	}

	log.Printf("[install] Found game databases: %v", dbs)
	results, err := tmpDB.ScanAllGameDatabases()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถอ่านโครงสร้าง: " + err.Error()})
		return
	}

	type tableInfo struct {
		Name    string                     `json:"name"`
		Columns []gamedatabase.GameDBColumn `json:"columns"`
	}
	type dbInfo struct {
		Found  bool        `json:"found"`
		Tables []tableInfo `json:"tables"`
	}

	allDBs := make(map[string]dbInfo)
	allMappings := make(map[string][]gamedatabase.ColumnMapping)

	for _, name := range []string{"RanUser", "RanGame1", "RanLog", "RanShop"} {
		res, ok := results[name]
		if !ok {
			allDBs[name] = dbInfo{Found: false}
			continue
		}

		var tis []tableInfo
		var allCols []gamedatabase.GameDBColumn
		for _, t := range res.Tables {
			cols := res.Columns[t.Table]
			if cols == nil {
				cols = make([]gamedatabase.GameDBColumn, 0)
			}
			tis = append(tis, tableInfo{Name: t.Table, Columns: cols})
			allCols = append(allCols, cols...)
		}
		if len(tis) == 0 {
			tis = make([]tableInfo, 0)
		}
		if allCols == nil {
			allCols = make([]gamedatabase.GameDBColumn, 0)
		}
		allDBs[name] = dbInfo{Found: true, Tables: tis}
		allMappings[name] = gamedatabase.AutoDetectMappings(name, allCols)
		log.Printf("[install] [%s] %d tables, %d cols, %d mappings", name, len(tis), len(allCols), len(allMappings[name]))
	}

	encryptedPass, err := gamedatabase.EncryptPassword(req.Password, h.cfg.JWTSecret)
	if err != nil {
		log.Printf("[install] warning: failed to encrypt password, storing plaintext: %v", err)
		encryptedPass = req.Password
	}

	database.DB.Exec(`DELETE FROM game_connections`)
	database.DB.Exec(`INSERT INTO game_connections (id, name, db_type, host, port, database_name, username, password, is_connected)
		VALUES ($1, $2, 'mssql', $3, $4, 'master', $5, $6, true)`, connID, "RAN Game Server", req.Host, req.Port, req.Username, encryptedPass)

	log.Printf("[install] game DB connection saved: %s", connID)

	h.SaveStep(2)

	c.JSON(http.StatusOK, gin.H{
		"databases":       allDBs,
		"found_databases": dbs,
		"mappings":        allMappings,
	})
}

func (h *InstallHandler) SaveMappings(c *gin.Context) {
	if !h.guard(c) {
		return
	}

	connID := h.getConnID()
	if connID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาเชื่อมต่อฐานข้อมูลก่อน"})
		return
	}

	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ไม่สามารถอ่านข้อมูลได้"})
		return
	}

	var req struct {
		Mappings map[string][]gamedatabase.ColumnMapping `json:"mappings"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		log.Printf("[install] saveMappings parse error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง: " + err.Error()})
		return
	}

	log.Printf("[install] saveMappings: %d databases", len(req.Mappings))
	for dbName, maps := range req.Mappings {
		log.Printf("[install] [%s] %d mappings", dbName, len(maps))
		for _, m := range maps {
			if m.IsRequired && m.ActualColumn == "" {
				log.Printf("[install] MISSING: [%s] %s", dbName, m.StandardField)
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "กรุณาจับคู่ '" + m.StandardField + "' ใน " + dbName,
				})
				return
			}
		}
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	database.DB.Exec(`DELETE FROM column_mappings WHERE connection_id = $1`, connID)
	for dbName, maps := range req.Mappings {
		for _, m := range maps {
			database.DB.Exec(`INSERT INTO column_mappings (connection_id, db_name, table_name, standard_field, actual_column, data_type, is_required)
				VALUES ($1, $2, $3, $4, $5, $6, $7)`, connID, dbName, m.TableName, m.StandardField, m.ActualColumn, m.DataType, m.IsRequired)
		}
	}
	log.Printf("[install] mappings saved for connection %s", connID)

	h.SaveStep(3)

	c.JSON(http.StatusOK, gin.H{"message": "บันทึกการตั้งค่าคอลัมน์เรียบร้อย"})
}

func (h *InstallHandler) CompleteInstall(c *gin.Context) {
	if !h.guard(c) {
		return
	}

	connID := h.getConnID()
	if connID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "กรุณาเชื่อมต่อฐานข้อมูลก่อน"})
		return
	}

	var req struct {
		Username string `json:"username" binding:"required"`
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}
	if len(req.Password) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร"})
		return
	}

	var existingID string
	err := database.DB.QueryRow(`SELECT id FROM users WHERE username = $1`, req.Username).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "ชื่อผู้ใช้นี้มีในระบบแล้ว"})
		return
	}

	var existingEmail string
	err = database.DB.QueryRow(`SELECT id FROM users WHERE email = $1`, req.Email).Scan(&existingEmail)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "อีเมลนี้มีในระบบแล้ว"})
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเข้ารหัส password ได้"})
		return
	}

	_, err = database.DB.Exec(`INSERT INTO users (username, email, password, full_name, role_id)
		VALUES ($1, $2, $3, $4, '00000000-0000-0000-0000-000000000001')`,
		req.Username, req.Email, string(hash), "Administrator")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างบัญชีผู้ดูแลไม่สำเร็จ: " + err.Error()})
		return
	}

	database.DB.Exec(`DELETE FROM install_status`)
	database.DB.Exec(`INSERT INTO install_status (step, completed) VALUES (5, true)`)

	h.mu.Lock()
	if h.gameDB != nil {
		h.gameDB.DB.Close()
		h.gameDB = nil
	}
	h.mu.Unlock()

	log.Printf("[install] installation completed by user: %s", req.Username)

	c.JSON(http.StatusOK, gin.H{"message": "ติดตั้งระบบเสร็จสมบูรณ์"})
}

func (h *InstallHandler) ResetInstall(c *gin.Context) {
	database.DB.Exec(`DELETE FROM install_status`)
	database.DB.Exec(`DELETE FROM column_mappings`)
	database.DB.Exec(`DELETE FROM game_connections`)

	h.mu.Lock()
	if h.gameDB != nil {
		h.gameDB.DB.Close()
		h.gameDB = nil
	}
	h.mu.Unlock()

	log.Printf("[install] system reset completed")

	c.JSON(http.StatusOK, gin.H{"message": "รีเซ็ตระบบติดตั้งเรียบร้อย"})
}
