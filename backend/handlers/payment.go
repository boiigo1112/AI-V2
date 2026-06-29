package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/middleware"
	"github.com/blacken/admin-panel/models"
	"github.com/blacken/admin-panel/services"
)

type PaymentHandler struct {
	svc *services.PaymentService
}

func NewPaymentHandler(svc *services.PaymentService) *PaymentHandler {
	return &PaymentHandler{svc: svc}
}

// CreateInvoice creates a new invoice for a tenant
// POST /api/payment/create-invoice
func (h *PaymentHandler) CreateInvoice(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

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

	inv, err := h.svc.CreateInvoice(req.TenantID, userID, req.PlanID, req.Months)
	if err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "plan not found" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"invoice": inv})
}

// ConfirmPayment confirms payment with proof (admin only)
// POST /api/payment/confirm
func (h *PaymentHandler) ConfirmPayment(c *gin.Context) {
	var req struct {
		InvoiceID    string `json:"invoice_id" binding:"required"`
		PaymentProof string `json:"payment_proof"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := h.svc.ConfirmPayment(req.InvoiceID, req.PaymentProof); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "invoice not found" {
			status = http.StatusNotFound
		} else if err.Error() == "invoice is not in pending status" {
			status = http.StatusBadRequest
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "payment confirmed"})
}

// ListInvoices lists invoices
// GET /api/payment/invoices
func (h *PaymentHandler) ListInvoices(c *gin.Context) {
	role, _ := c.Get("role")
	roleStr, _ := role.(string)

	if roleStr == "superadmin" || roleStr == "admin" {
		// Admin sees all
		invoices, err := h.svc.GetAllInvoices()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list invoices"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"invoices": invoices, "total": len(invoices)})
		return
	}

	// Regular user: try to get tenant from context or query param
	tenantRaw, exists := c.Get("tenant")
	if exists {
		tenant, ok := tenantRaw.(*models.Tenant)
		if ok && tenant != nil {
			invoices, err := h.svc.GetInvoices(tenant.ID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list invoices"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"invoices": invoices, "total": len(invoices)})
			return
		}
	}

	// Fallback: user can see invoices linked to their user_id
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	invoices, err := h.svc.GetInvoicesByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list invoices"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invoices": invoices, "total": len(invoices)})
}

// GetInvoiceByID gets invoice detail
// GET /api/payment/invoices/:id
func (h *PaymentHandler) GetInvoiceByID(c *gin.Context) {
	id := c.Param("id")
	if !middleware.IsValidUUID(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid invoice id format"})
		return
	}

	inv, err := h.svc.GetInvoiceByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invoice not found"})
		return
	}

	c.JSON(http.StatusOK, inv)
}

// GetPaymentConfigs gets payment configurations
// GET /api/payment/configs
func (h *PaymentHandler) GetPaymentConfigs(c *gin.Context) {
	configs, err := h.svc.GetPaymentConfigs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get payment configs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"configs": configs})
}

// UpdatePaymentConfig updates payment config (admin only)
// PUT /api/payment/configs
func (h *PaymentHandler) UpdatePaymentConfig(c *gin.Context) {
	var req struct {
		Method        string `json:"method" binding:"required"`
		Label         string `json:"label"`
		AccountName   string `json:"account_name"`
		AccountNumber string `json:"account_number"`
		PromptpayID   string `json:"promptpay_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body: " + err.Error()})
		return
	}

	if err := h.svc.UpdatePaymentConfig(req.Method, req.Label, req.AccountName, req.AccountNumber, req.PromptpayID); err != nil {
		status := http.StatusInternalServerError
		if err.Error() == "payment config not found" {
			status = http.StatusNotFound
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "payment config updated"})
}

// GetRevenueStats returns revenue stats (admin only)
// GET /api/payment/stats
func (h *PaymentHandler) GetRevenueStats(c *gin.Context) {
	startDate := c.DefaultQuery("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDate := c.DefaultQuery("end_date", time.Now().Format("2006-01-02"))

	stats, err := h.svc.GetRevenueStats(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get revenue stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// GetBillingHistory gets current user's billing history
// GET /api/payment/billing
func (h *PaymentHandler) GetBillingHistory(c *gin.Context) {
	// Try tenant from context first
	tenantRaw, exists := c.Get("tenant")
	if exists {
		tenant, ok := tenantRaw.(*models.Tenant)
		if ok && tenant != nil {
			invoices, err := h.svc.GetBillingHistory(tenant.ID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get billing history"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"invoices": invoices})
			return
		}
	}

	// Fallback: use user_id
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	invoices, err := h.svc.GetInvoicesByUserID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get billing history"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"invoices": invoices})
}
