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
	mu       sync.RWMutex
	gameDB   *gamedatabase.GameDB
	connID   string
	connHost string
	connPort int
	connUser string
	connPass string
}

func NewInstallHandler() *InstallHandler {
	return &InstallHandler{}
}

func (h *InstallHandler) Status(c *gin.Context) {
	var installed bool
	database.DB.QueryRow(`SELECT completed FROM install_status ORDER BY created_at DESC LIMIT 1`).Scan(&installed)
	c.JSON(http.StatusOK, gin.H{"installed": installed})
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
	h.connID = connID
	h.connHost = req.Host
	h.connPort = req.Port
	h.connUser = req.Username
	h.connPass = req.Password
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

	h.mu.Lock()
	database.DB.Exec(`DELETE FROM game_connections`)
	database.DB.Exec(`INSERT INTO game_connections (id, name, db_type, host, port, database_name, username, password, is_connected)
		VALUES ($1, $2, 'mssql', $3, $4, 'master', $5, $6, true)`, connID, "RAN Game Server", req.Host, req.Port, req.Username, req.Password)
	h.mu.Unlock()

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

	connID := h.connID
	database.DB.Exec(`DELETE FROM column_mappings WHERE connection_id = $1`, connID)
	for dbName, maps := range req.Mappings {
		for _, m := range maps {
			database.DB.Exec(`INSERT INTO column_mappings (connection_id, db_name, table_name, standard_field, actual_column, data_type, is_required)
				VALUES ($1, $2, $3, $4, $5, $6, $7)`, connID, dbName, m.TableName, m.StandardField, m.ActualColumn, m.DataType, m.IsRequired)
		}
	}
	log.Printf("[install] mappings saved for connection %s", connID)

	c.JSON(http.StatusOK, gin.H{"message": "บันทึกการตั้งค่าคอลัมน์เรียบร้อย"})
}

func (h *InstallHandler) CompleteInstall(c *gin.Context) {
	if !h.guard(c) {
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

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ไม่สามารถเข้ารหัส password ได้"})
		return
	}

	_, err = database.DB.Exec(`INSERT INTO users (username, email, password, full_name, role_id)
		VALUES ($1, $2, $3, $4, '00000000-0000-0000-0000-000000000001')
		ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password, email = EXCLUDED.email`,
		req.Username, req.Email, string(hash), "Administrator")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "สร้างบัญชีผู้ดูแลไม่สำเร็จ"})
		return
	}

	if _, err := database.DB.Exec(`DELETE FROM install_status`); err != nil {
		log.Printf("[install] cleanup install_status error: %v", err)
	}
	if _, err := database.DB.Exec(`INSERT INTO install_status (step, completed) VALUES (5, true)`); err != nil {
		log.Printf("[install] insert install_status error: %v", err)
	}

	h.mu.Lock()
	if h.gameDB != nil {
		h.gameDB.DB.Close()
		h.gameDB = nil
	}
	h.mu.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "ติดตั้งระบบเสร็จสมบูรณ์"})
}

func (h *InstallHandler) ResetInstall(c *gin.Context) {
	database.DB.Exec(`DELETE FROM install_status`)
	database.DB.Exec(`DELETE FROM column_mappings`)
	database.DB.Exec(`DELETE FROM game_connections`)
	database.DB.Exec(`DELETE FROM users WHERE username IN ('admin') AND provider = 'local'`)

	h.mu.Lock()
	if h.gameDB != nil {
		h.gameDB.DB.Close()
		h.gameDB = nil
	}
	h.connID = ""
	h.mu.Unlock()

	c.JSON(http.StatusOK, gin.H{"message": "รีเซ็ตระบบติดตั้งเรียบร้อย"})
}
