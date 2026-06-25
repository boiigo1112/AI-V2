package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/blacken/admin-panel/services"
)

type GameHandler struct {
	svc *services.GameService
}

func NewGameHandler(svc *services.GameService) *GameHandler {
	return &GameHandler{svc: svc}
}

func (h *GameHandler) Status(c *gin.Context) {
	info := h.svc.GetConnectionInfo()
	connected := h.svc.IsConnected()
	c.JSON(http.StatusOK, gin.H{
		"connected": connected,
		"info":      info,
	})
}

func (h *GameHandler) ListDatabases(c *gin.Context) {
	databases := []string{"RanUser", "RanGame1", "RanLog", "RanShop"}
	dbLabels := map[string]string{
		"RanUser":  "บัญชีผู้เล่น",
		"RanGame1": "ข้อมูลตัวละคร",
		"RanLog":   "บันทึกการกระทำ",
		"RanShop":  "ร้านค้า / เติมเงิน",
	}

	type dbInfo struct {
		Name  string `json:"name"`
		Label string `json:"label"`
	}
	var result []dbInfo
	for _, db := range databases {
		result = append(result, dbInfo{Name: db, Label: dbLabels[db]})
	}
	c.JSON(http.StatusOK, gin.H{"databases": result})
}

func (h *GameHandler) ListTables(c *gin.Context) {
	dbName := c.Param("db")
	tables, err := h.svc.ListTables(dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"tables": tables})
}

func (h *GameHandler) GetTableColumns(c *gin.Context) {
	dbName := c.Param("db")
	tableName := c.Param("table")
	cols, err := h.svc.GetTableColumns(dbName, tableName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"columns": cols})
}

func (h *GameHandler) ListPlayers(c *gin.Context) {
	tableName := c.DefaultQuery("table", "UserInfo")
	search := c.Query("search")
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	players, total, err := h.svc.ListPlayers(tableName, "", search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if players == nil {
		players = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"players": players, "total": total})
}

func (h *GameHandler) GetPlayer(c *gin.Context) {
	tableName := c.DefaultQuery("table", "UserInfo")
	usernum := c.Param("id")

	player, err := h.svc.GetPlayer(tableName, usernum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, player)
}

func (h *GameHandler) GetPlayerCharacters(c *gin.Context) {
	usernum := c.Param("id")

	characters, err := h.svc.ListCharacters(usernum)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if characters == nil {
		characters = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"characters": characters})
}

func (h *GameHandler) ListLogs(c *gin.Context) {
	dbName := c.Param("db")
	tableName := c.Query("table")
	limitStr := c.DefaultQuery("limit", "100")
	offsetStr := c.DefaultQuery("offset", "0")

	if tableName == "" {
		tables, err := h.svc.ListTables(dbName)
		if err != nil || len(tables) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "table parameter required"})
			return
		}
		for _, t := range tables {
			if strings.HasPrefix(t, "Log") || strings.HasPrefix(t, "GM_") {
				tableName = t
				break
			}
		}
		if tableName == "" {
			tableName = tables[0]
		}
	}

	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	logs, total, err := h.svc.ListLogs(dbName, tableName, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if logs == nil {
		logs = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total, "table": tableName})
}
