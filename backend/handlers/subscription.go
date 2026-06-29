package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/middleware"
	"github.com/blacken/admin-panel/models"
	"github.com/blacken/admin-panel/services"
)

type SubscriptionHandler struct {
	svc *services.SubscriptionService
}

func NewSubscriptionHandler(svc *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{svc: svc}
}

// ActivateSubscription activates/starts a subscription (admin)
// POST /api/subscription/activate
func (h *SubscriptionHandler) ActivateSubscription(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id" binding:"required"`
		PlanID   string `json:"plan_id" binding:"required"`
		Months   int    `json:"months"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}
	if req.Months <= 0 {
		req.Months = 1
	}
	if req.Months > 12 {
		req.Months = 12
	}

	sub, err := h.svc.ActivateSubscription(req.TenantID, req.PlanID, req.Months)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"subscription": sub})
}

// RenewSubscription renews a subscription (admin/tenant)
// POST /api/subscription/renew
func (h *SubscriptionHandler) RenewSubscription(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id" binding:"required"`
		PlanID   string `json:"plan_id" binding:"required"`
		Months   int    `json:"months"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}
	if req.Months <= 0 {
		req.Months = 1
	}
	if req.Months > 12 {
		req.Months = 12
	}

	sub, err := h.svc.RenewSubscription(req.TenantID, req.PlanID, req.Months)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "plan not found" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"subscription": sub})
}

// GetCurrentSubscription gets current subscription info
// GET /api/subscription/current
func (h *SubscriptionHandler) GetCurrentSubscription(c *gin.Context) {
	tenantRaw, exists := c.Get("tenant")
	if exists {
		tenant, ok := tenantRaw.(*models.Tenant)
		if ok && tenant != nil {
			sub, err := h.svc.GetSubscription(tenant.ID)
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"subscription": sub})
			return
		}
	}

	// Fallback: use tenant_id from query
	tenantID := c.Query("tenant_id")
	if tenantID == "" || !middleware.IsValidUUID(tenantID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tenant_id is required"})
		return
	}

	sub, err := h.svc.GetSubscription(tenantID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"subscription": sub})
}

// ExtendTrial extends trial period (admin only)
// POST /api/subscription/extend-trial
func (h *SubscriptionHandler) ExtendTrial(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id" binding:"required"`
		Days     int    `json:"days" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}
	if req.Days <= 0 || req.Days > 365 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "days must be between 1 and 365"})
		return
	}

	if err := h.svc.ExtendTrial(req.TenantID, req.Days); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "tenant not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "trial extended"})
}

// ListExpiringSoon lists tenants expiring soon (admin only)
// GET /api/subscription/expiring
func (h *SubscriptionHandler) ListExpiringSoon(c *gin.Context) {
	daysStr := c.DefaultQuery("days", "7")
	days, err := strconv.Atoi(daysStr)
	if err != nil || days <= 0 {
		days = 7
	}

	tenants, err := h.svc.GetExpiringSoon(days)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get expiring tenants"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"tenants": tenants, "total": len(tenants)})
}

// CheckExpiry manually triggers expiry check (admin)
// POST /api/subscription/check-expiry
func (h *SubscriptionHandler) CheckExpiry(c *gin.Context) {
	var req struct {
		TenantID string `json:"tenant_id"`
	}
	c.ShouldBindJSON(&req)

	if req.TenantID != "" {
		expired, err := h.svc.CheckExpiry(req.TenantID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"expired": expired, "message": "checked"})
		return
	}

	// Run all checks
	err := h.svc.AutoExpireCheck()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "expiry check completed"})
}
