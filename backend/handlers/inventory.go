package handlers

import (
	"database/sql"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/blacken/admin-panel/services"
)

type InventoryHandler struct {
	svc       *services.GameService
	backup    *services.BackupService
	validator *services.Validator
	audit     *services.AuditService
}

func NewInventoryHandler(svc *services.GameService, backup *services.BackupService, validator *services.Validator, audit *services.AuditService) *InventoryHandler {
	return &InventoryHandler{
		svc:       svc,
		backup:    backup,
		validator: validator,
		audit:     audit,
	}
}

// getGameDB returns the MSSQL *sql.DB from the game service, or sends error and returns nil.
func (h *InventoryHandler) getGameDB(c *gin.Context) *sql.DB {
	gameDB := h.svc.GetDB()
	if gameDB == nil || gameDB.DB == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "game database not connected"})
		return nil
	}
	return gameDB.DB
}

func (h *InventoryHandler) GetInventory(c *gin.Context) {
	chaNum := c.Param("chaNum")
	inventory, err := h.svc.GetInventory(chaNum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, inventory)
}

func (h *InventoryHandler) DeleteInventoryItem(c *gin.Context) {
	chaNum := c.Param("chaNum")
	col := c.Query("col")
	slotIdx, err := strconv.Atoi(c.Param("slotIdx"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid slot index"})
		return
	}
	if col != "equip" && col != "inven" {
		col = "equip"
	}

	db := h.getGameDB(c)
	if db == nil {
		return
	}

	// 1. Validate character exists
	if err := h.validator.ValidateCharacterID(db, chaNum); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. Backup before write
	h.backup.BackupTable(db, "ChaInfo", "WHERE [ChaNum] = "+chaNum)

	// 3. Execute write
	if err := h.svc.DeleteInventoryItem(chaNum, col, slotIdx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 4. Audit after write
	userID, _ := getUserID(c)
	ip := c.ClientIP()
	h.audit.LogAction(c.Request.Context(), userID, "delete_inventory_item", "ChaInfo", chaNum, nil, gin.H{"col": col, "slot": slotIdx}, ip)

	c.JSON(http.StatusOK, gin.H{"message": "ลบไอเทมสำเร็จ"})
}

func (h *InventoryHandler) AddInventoryItem(c *gin.Context) {
	chaNum := c.Param("chaNum")
	var req struct {
		Col   string `json:"col"`
		Main  int    `json:"main" binding:"required"`
		Sub   int    `json:"sub" binding:"required"`
		Count int    `json:"count"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}
	if req.Col != "equip" && req.Col != "inven" {
		req.Col = "equip"
	}

	db := h.getGameDB(c)
	if db == nil {
		return
	}

	// 1. Validate character exists
	if err := h.validator.ValidateCharacterID(db, chaNum); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 2. Validate item IDs
	if err := h.validator.ValidateNumericRange("ItemMain", req.Main, 1, 9999); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.validator.ValidateNumericRange("ItemSub", req.Sub, 1, 9999); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 3. Backup before write
	h.backup.BackupTable(db, "ChaInfo", "WHERE [ChaNum] = "+chaNum)

	// 4. Execute write
	slotIdx, err := h.svc.AddInventoryItem(chaNum, req.Col, req.Main, req.Sub, req.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 5. Audit after write
	userID, _ := getUserID(c)
	ip := c.ClientIP()
	h.audit.LogAction(c.Request.Context(), userID, "add_inventory_item", "ChaInfo", chaNum, nil, gin.H{"col": req.Col, "main": req.Main, "sub": req.Sub, "count": req.Count, "slot": slotIdx}, ip)

	c.JSON(http.StatusOK, gin.H{"message": "เพิ่มไอเทมสำเร็จ", "slot": slotIdx})
}

func (h *InventoryHandler) SearchItems(c *gin.Context) {
	q := c.DefaultQuery("q", "swo")
	limitStr := c.DefaultQuery("limit", "50")
	limit, _ := strconv.Atoi(limitStr)
	items := services.SearchItems(q, limit)
	if items == nil { items = []map[string]string{} }
	c.JSON(http.StatusOK, gin.H{"items": items})
}
