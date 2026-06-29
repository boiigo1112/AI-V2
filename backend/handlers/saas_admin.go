package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/database"
)

type SaasAdminHandler struct{}

func NewSaasAdminHandler() *SaasAdminHandler {
	return &SaasAdminHandler{}
}

// Stats returns SaaS admin dashboard statistics.
// GET /api/saas/stats
func (h *SaasAdminHandler) Stats(c *gin.Context) {
	var totalTenants, activeTenants, expiringSoon int
	var revenueThisMonth float64

	database.DB.QueryRow(`SELECT COUNT(*) FROM tenants`).Scan(&totalTenants)
	database.DB.QueryRow(`SELECT COUNT(*) FROM tenants WHERE status = 'active'`).Scan(&activeTenants)

	// Tenants expiring within the next 7 days
	database.DB.QueryRow(`
		SELECT COUNT(*) FROM tenants
		WHERE expire_at IS NOT NULL
		  AND expire_at > NOW()
		  AND expire_at <= NOW() + INTERVAL '7 days'
	`).Scan(&expiringSoon)

	// Approximate revenue this month from active subscriptions
	database.DB.QueryRow(`
		SELECT COALESCE(SUM(p.price_monthly), 0)
		FROM subscriptions s
		JOIN plans p ON s.plan_id = p.id
		WHERE s.status = 'active'
		  AND s.created_at >= DATE_TRUNC('month', NOW())
	`).Scan(&revenueThisMonth)

	c.JSON(http.StatusOK, gin.H{
		"total_tenants":    totalTenants,
		"active_tenants":   activeTenants,
		"revenue_this_month": revenueThisMonth,
		"expiring_soon":    expiringSoon,
	})
}

// ListTenants returns all tenants with pagination.
// GET /api/saas/tenants
func (h *SaasAdminHandler) ListTenants(c *gin.Context) {
	offset := 0
	limit := 20

	type tenantRow struct {
		ID        string     `json:"id"`
		Name      string     `json:"name"`
		Subdomain string     `json:"subdomain"`
		Plan      string     `json:"plan"`
		Status    string     `json:"status"`
		OwnerID   string     `json:"owner_id"`
		ExpireAt  *time.Time `json:"expire_at"`
		CreatedAt time.Time  `json:"created_at"`
	}

	rows, err := database.DB.Query(`
		SELECT id, name, subdomain, plan, status, owner_id, expire_at, created_at
		FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tenants"})
		return
	}
	defer rows.Close()

	var tenants []tenantRow
	var total int
	database.DB.QueryRow(`SELECT COUNT(*) FROM tenants`).Scan(&total)

	for rows.Next() {
		var t tenantRow
		var expireAt *time.Time
		if err := rows.Scan(&t.ID, &t.Name, &t.Subdomain, &t.Plan, &t.Status, &t.OwnerID, &expireAt, &t.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to scan tenant"})
			return
		}
		t.ExpireAt = expireAt
		tenants = append(tenants, t)
	}

	c.JSON(http.StatusOK, gin.H{
		"tenants": tenants,
		"total":   total,
	})
}

// UpdateTenantStatus suspends or activates a tenant.
// PUT /api/saas/tenants/:id/status
func (h *SaasAdminHandler) UpdateTenantStatus(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	validStatuses := map[string]bool{"active": true, "suspended": true}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be 'active' or 'suspended'"})
		return
	}

	result, err := database.DB.Exec(`UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2`, req.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update tenant status"})
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "tenant status updated to " + req.Status})
}

// ExtendTenantExpiry extends the expiration date of a tenant.
// POST /api/saas/tenants/:id/extend
func (h *SaasAdminHandler) ExtendTenantExpiry(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Days int `json:"days" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.Days <= 0 || req.Days > 365 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "days must be between 1 and 365"})
		return
	}

	// Get current expire_at or set from now
	var currentExpireAt *time.Time
	database.DB.QueryRow(`SELECT expire_at FROM tenants WHERE id = $1`, id).Scan(&currentExpireAt)

	var newExpireAt time.Time
	if currentExpireAt != nil && currentExpireAt.After(time.Now()) {
		newExpireAt = currentExpireAt.AddDate(0, 0, req.Days)
	} else {
		newExpireAt = time.Now().AddDate(0, 0, req.Days)
	}

	result, err := database.DB.Exec(`UPDATE tenants SET expire_at = $1, status = 'active', updated_at = NOW() WHERE id = $2`, newExpireAt, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to extend tenant expiry"})
		return
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
		return
	}

	// Also update subscription if exists
	database.DB.Exec(`UPDATE subscriptions SET expires_at = $1, status = 'active' WHERE tenant_id = $2 AND status = 'active'`, newExpireAt, id)

	c.JSON(http.StatusOK, gin.H{
		"message":        "tenant expiry extended",
		"new_expire_at": newExpireAt,
	})
}
