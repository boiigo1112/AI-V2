package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/blacken/admin-panel/services"
)

type InventoryHandler struct {
	svc *services.GameService
}

func NewInventoryHandler(svc *services.GameService) *InventoryHandler {
	return &InventoryHandler{svc: svc}
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
	if err != nil { c.JSON(http.StatusBadRequest, gin.H{"error": "invalid slot index"}); return }
	if col != "equip" && col != "inven" { col = "equip" }

	if err := h.svc.DeleteInventoryItem(chaNum, col, slotIdx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
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
	if req.Col != "equip" && req.Col != "inven" { req.Col = "equip" }

	slotIdx, err := h.svc.AddInventoryItem(chaNum, req.Col, req.Main, req.Sub, req.Count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
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
