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

func (h *GameHandler) Reconnect(c *gin.Context) {
	var req struct {
		Host     string `json:"host" binding:"required"`
		Port     int    `json:"port"`
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}
	if req.Port == 0 {
		req.Port = 1433
	}

	if err := h.svc.Reconnect(req.Host, req.Port, req.Username, req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "เชื่อมต่อไม่สำเร็จ: " + err.Error()})
		return
	}

	info := h.svc.GetConnectionInfo()
	c.JSON(http.StatusOK, gin.H{"message": "เชื่อมต่อสำเร็จ", "info": info})
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

func (h *GameHandler) BlockPlayer(c *gin.Context) {
	usernum := c.Param("id")
	tableName := c.DefaultQuery("table", "UserInfo")

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	if err := h.svc.BlockPlayer(tableName, usernum, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ผู้เล่นถูกบล็อกแล้ว"})
}

func (h *GameHandler) UnblockPlayer(c *gin.Context) {
	usernum := c.Param("id")
	tableName := c.DefaultQuery("table", "UserInfo")

	if err := h.svc.UnblockPlayer(tableName, usernum); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ปลดบล็อกผู้เล่นแล้ว"})
}

func (h *GameHandler) UpdateCharacter(c *gin.Context) {
	chanum := c.Param("id")

	var req struct {
		Field string `json:"field" binding:"required"`
		Value string `json:"value" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if err := h.svc.UpdateCharacter(chanum, req.Field, req.Value); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "อัปเดตตัวละครสำเร็จ"})
}

func (h *GameHandler) UpdatePlayer(c *gin.Context) {
	usernum := c.Param("id")

	var req struct {
		Fields map[string]interface{} `json:"fields" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if err := h.svc.UpdatePlayer(usernum, req.Fields); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "อัปเดตข้อมูลผู้เล่นสำเร็จ"})
}

func (h *GameHandler) ListShopItems(c *gin.Context) {
	tableName := c.DefaultQuery("table", "ShopItemMap")
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

	items, total, err := h.svc.ListShopItems(tableName, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if items == nil {
		items = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"items": items, "total": total})
}

func (h *GameHandler) CreateShopItem(c *gin.Context) {
	var req struct {
		ItemName    string `json:"item_name" binding:"required"`
		ItemPrice   int    `json:"item_price"`
		ItemStock   int    `json:"item_stock"`
		ItemMain    int    `json:"item_main"`
		ItemSub     int    `json:"item_sub"`
		Category    string `json:"category"`
		ItemSection int    `json:"item_section"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if err := h.svc.CreateShopItem(req.ItemName, req.ItemPrice, req.ItemStock, req.ItemMain, req.ItemSub, req.Category, req.ItemSection); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "สร้างสินค้าสำเร็จ"})
}

func (h *GameHandler) UpdateShopItem(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		ItemName     *string `json:"ItemName"`
		ItemMoney    *int    `json:"ItemMoney"`
		ItemStock    *int    `json:"ItemStock"`
		ItemMain     *int    `json:"ItemMain"`
		ItemSub      *int    `json:"ItemSub"`
		ItemCategory *int    `json:"ItemCategory"`
		ShopType     *int    `json:"ShopType"`
		ItemPrice    *int    `json:"ItemPrice"`
		ItemSection  *int    `json:"ItemSection"`
		ItemCurrency *int    `json:"ItemCurrency"`
		Category     *string `json:"Category"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	fields := make(map[string]interface{})
	if req.ItemName != nil {
		fields["ItemName"] = *req.ItemName
	}
	if req.ItemMoney != nil {
		fields["ItemMoney"] = *req.ItemMoney
	}
	if req.ItemStock != nil {
		fields["ItemStock"] = *req.ItemStock
	}
	if req.ItemMain != nil {
		fields["ItemMain"] = *req.ItemMain
	}
	if req.ItemSub != nil {
		fields["ItemSub"] = *req.ItemSub
	}
	if req.ItemCategory != nil {
		fields["ItemCategory"] = *req.ItemCategory
	}
	if req.ShopType != nil {
		fields["ShopType"] = *req.ShopType
	}
	if req.ItemPrice != nil {
		fields["ItemPrice"] = *req.ItemPrice
	}
	if req.ItemSection != nil {
		fields["ItemSection"] = *req.ItemSection
	}
	if req.ItemCurrency != nil {
		fields["ItemCurrency"] = *req.ItemCurrency
	}
	if req.Category != nil {
		fields["Category"] = *req.Category
	}

	if err := h.svc.UpdateShopItem(id, fields); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "อัปเดตสินค้าสำเร็จ"})
}

func (h *GameHandler) DeleteShopItem(c *gin.Context) {
	id := c.Param("id")

	if err := h.svc.DeleteShopItem(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ลบสินค้าสำเร็จ"})
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

func (h *GameHandler) ListAllTables(c *gin.Context) {
	dbName := c.Param("db")
	tables, err := h.svc.ListTables(dbName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type tableInfo struct {
		Name     string `json:"name"`
		IsLog    bool   `json:"is_log"`
		IsShop   bool   `json:"is_shop"`
		IsPlayer bool   `json:"is_player"`
	}
	var result []tableInfo
	for _, t := range tables {
		ti := tableInfo{Name: t}
		if strings.HasPrefix(t, "Log") || strings.HasPrefix(t, "GM_") {
			ti.IsLog = true
		}
		if strings.Contains(t, "Shop") || strings.Contains(t, "Purchase") || strings.Contains(t, "TopUp") {
			ti.IsShop = true
		}
		if t == "UserInfo" || t == "FullUserInfo" {
			ti.IsPlayer = true
		}
		result = append(result, ti)
	}
	c.JSON(http.StatusOK, gin.H{"tables": result})
}

func (h *GameHandler) ListAllCharacters(c *gin.Context) {
	search := c.Query("search")
	classFilter := c.Query("class")
	levelMin := c.DefaultQuery("level_min", "0")
	levelMax := c.DefaultQuery("level_max", "999")
	onlineOnly := c.DefaultQuery("online", "")
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

	characters, total, err := h.svc.ListAllCharacters(search, classFilter, levelMin, levelMax, onlineOnly, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if characters == nil {
		characters = []map[string]interface{}{}
	}
	c.JSON(http.StatusOK, gin.H{"characters": characters, "total": total})
}

func (h *GameHandler) GetCharacterDetail(c *gin.Context) {
	chanum := c.Param("id")

	character, err := h.svc.GetCharacterDetail(chanum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, character)
}

func (h *GameHandler) CharacterStats(c *gin.Context) {
	stats, err := h.svc.CharacterStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *GameHandler) BanCharacter(c *gin.Context) {
	chanum := c.Param("id")

	var req struct {
		Reason string `json:"reason"`
	}
	c.ShouldBindJSON(&req)

	if err := h.svc.BanCharacter(chanum, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ระงับตัวละครสำเร็จ"})
}

func (h *GameHandler) UnbanCharacter(c *gin.Context) {
	chanum := c.Param("id")

	if err := h.svc.UnbanCharacter(chanum); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ปลดระงับตัวละครสำเร็จ"})
}
