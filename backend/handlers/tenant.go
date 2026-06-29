package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/middleware"
	"github.com/blacken/admin-panel/services"
)

type TenantHandler struct {
	svc *services.TenantService
}

func NewTenantHandler(svc *services.TenantService) *TenantHandler {
	return &TenantHandler{svc: svc}
}

func (h *TenantHandler) CreateTenant(c *gin.Context) {
	var req struct {
		Name      string `json:"name" binding:"required"`
		Subdomain string `json:"subdomain" binding:"required"`
		PlanID    string `json:"plan_id"`
		OwnerID   string `json:"owner_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	ownerID := req.OwnerID
	if ownerID == "" {
		uid, err := getUserID(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		ownerID = uid
	}

	tenant, err := h.svc.CreateTenant(req.Name, req.Subdomain, req.PlanID, ownerID)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "subdomain already in use" {
			status = http.StatusConflict
		} else if err.Error() == "plan not found" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"tenant_id": tenant.ID,
		"tenant":    tenant,
	})
}

func (h *TenantHandler) ListTenants(c *gin.Context) {
	offset := 0
	limit := 20

	tenants, err := h.svc.ListTenants(offset, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tenants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tenants": tenants, "total": len(tenants)})
}

func (h *TenantHandler) GetTenant(c *gin.Context) {
	id := c.Param("id")
	if !middleware.IsValidUUID(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id format"})
		return
	}

	tenant, err := h.svc.GetTenantByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	c.JSON(http.StatusOK, tenant)
}

func (h *TenantHandler) UpdateTenant(c *gin.Context) {
	id := c.Param("id")
	if !middleware.IsValidUUID(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id format"})
		return
	}

	var req struct {
		Name           string `json:"name"`
		GameDBHost     string `json:"game_db_host"`
		GameDBPort     string `json:"game_db_port"`
		GameDBUser     string `json:"game_db_user"`
		GameDBPassword string `json:"game_db_password"`
		GameDBNames    string `json:"game_db_names"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	tenant, err := h.svc.UpdateTenant(id, req.Name, req.GameDBHost, req.GameDBPort, req.GameDBUser, req.GameDBPassword, req.GameDBNames)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "tenant not found" {
			status = http.StatusNotFound
		} else if err.Error() == "no fields to update" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, tenant)
}

func (h *TenantHandler) DeleteTenant(c *gin.Context) {
	id := c.Param("id")
	if !middleware.IsValidUUID(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id format"})
		return
	}

	if err := h.svc.DeleteTenant(id); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "tenant not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "tenant suspended"})
}

func (h *TenantHandler) ListPlans(c *gin.Context) {
	plans, err := h.svc.ListPlans()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list plans"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"plans": plans})
}

func (h *TenantHandler) CreatePlan(c *gin.Context) {
	var req struct {
		Name       string   `json:"name" binding:"required"`
		Code       string   `json:"code" binding:"required"`
		Price      float64  `json:"price_monthly"`
		MaxPlayers int      `json:"max_players"`
		Features   []string `json:"features"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	plan, err := h.svc.CreatePlan(req.Name, req.Code, req.Price, req.MaxPlayers, req.Features)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "name and code are required" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, plan)
}

func (h *TenantHandler) GetTenantStats(c *gin.Context) {
	id := c.Param("id")
	if !middleware.IsValidUUID(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid tenant id format"})
		return
	}

	tenant, err := h.svc.GetTenantByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	// Return basic stats for the tenant
	c.JSON(http.StatusOK, gin.H{
		"tenant_id":  tenant.ID,
		"name":       tenant.Name,
		"subdomain":  tenant.Subdomain,
		"plan":       tenant.Plan,
		"status":     tenant.Status,
		"expire_at":  tenant.ExpireAt,
		"created_at": tenant.CreatedAt,
	})
}
