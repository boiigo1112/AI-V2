package handlers

import (
	"net/http"
	"strconv"
	"sync"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/gamedatabase"
)

type GameHandler struct {
	mu      sync.RWMutex
	service *gamedatabase.GameUserService
}

func NewGameHandler() *GameHandler {
	return &GameHandler{}
}

func (h *GameHandler) ensureService() error {
	h.mu.RLock()
	if h.service != nil {
		h.mu.RUnlock()
		return nil
	}
	h.mu.RUnlock()

	h.mu.Lock()
	defer h.mu.Unlock()

	svc, err := gamedatabase.NewGameUserService()
	if err != nil {
		return err
	}
	h.service = svc
	return nil
}

func (h *GameHandler) ListUsers(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "ไม่ได้เชื่อมต่อเกม: " + err.Error()})
		return
	}

	search := c.DefaultQuery("search", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 20 }

	users, total, err := h.service.ListUsers(search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users, "total": total, "page": page, "limit": limit})
}

func (h *GameHandler) GetUser(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	userNum, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := h.service.GetUser(userNum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (h *GameHandler) ListCharacters(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	search := c.DefaultQuery("search", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 { page = 1 }
	if limit < 1 || limit > 100 { limit = 20 }

	chars, total, err := h.service.ListCharacters(search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"characters": chars, "total": total, "page": page, "limit": limit})
}

func (h *GameHandler) GetCharacter(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	chaNum, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid character id"})
		return
	}

	ch, err := h.service.GetCharacter(chaNum)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "character not found"})
		return
	}
	c.JSON(http.StatusOK, ch)
}

func (h *GameHandler) ListCharactersByUser(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	userNum, err := strconv.Atoi(c.Param("userNum"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user num"})
		return
	}

	chars, err := h.service.ListCharactersByUser(userNum)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"characters": chars})
}

func (h *GameHandler) UpdateLevel(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	chaNum, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Level int `json:"level" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Level < 1 || req.Level > 999 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "level must be 1-999"})
		return
	}

	if err := h.service.UpdateCharacterLevel(chaNum, req.Level); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "level updated"})
}

func (h *GameHandler) UpdateMoney(c *gin.Context) {
	if err := h.ensureService(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
		return
	}

	chaNum, _ := strconv.Atoi(c.Param("id"))
	var req struct {
		Money float64 `json:"money" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if err := h.service.UpdateCharacterMoney(chaNum, req.Money); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "money updated"})
}
