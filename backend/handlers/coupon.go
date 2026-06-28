package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/blacken/admin-panel/services"
)

type CouponHandler struct {
	svc *services.CouponService
}

func NewCouponHandler(svc *services.CouponService) *CouponHandler {
	return &CouponHandler{svc: svc}
}

func (h *CouponHandler) ListCoupons(c *gin.Context) {
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

	coupons, total, err := h.svc.List(search, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if coupons == nil {
		coupons = []services.Coupon{}
	}
	c.JSON(http.StatusOK, gin.H{"coupons": coupons, "total": total})
}

func (h *CouponHandler) GetCoupon(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	coupon, err := h.svc.Get(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "ไม่พบโค้ด"})
		return
	}
	c.JSON(http.StatusOK, coupon)
}

func (h *CouponHandler) CreateCoupon(c *gin.Context) {
	var req struct {
		Code        string     `json:"code"`
		Description string     `json:"description"`
		RewardType  string     `json:"reward_type" binding:"required"`
		RewardValue int        `json:"reward_value" binding:"required"`
		RewardQty   int        `json:"reward_qty"`
		MaxUses     int        `json:"max_uses"`
		ExpiresAt   *time.Time `json:"expires_at"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	userID, _ := c.Get("user_id")
	createdBy, _ := userID.(string)

	coupon, err := h.svc.Create(req.Code, req.Description, req.RewardType, req.RewardValue, req.RewardQty, req.MaxUses, req.ExpiresAt, createdBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, coupon)
}

func (h *CouponHandler) UpdateCoupon(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var fields map[string]interface{}
	if err := c.ShouldBindJSON(&fields); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if err := h.svc.Update(id, fields); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "อัปเดตโค้ดสำเร็จ"})
}

func (h *CouponHandler) DeleteCoupon(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.svc.Delete(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ลบโค้ดสำเร็จ"})
}

func (h *CouponHandler) GetCouponUsage(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")
	limit, _ := strconv.Atoi(limitStr)
	offset, _ := strconv.Atoi(offsetStr)

	usage, total, err := h.svc.GetUsage(id, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if usage == nil {
		usage = []services.CouponUsage{}
	}
	c.JSON(http.StatusOK, gin.H{"usage": usage, "total": total})
}

func (h *CouponHandler) RedeemCoupon(c *gin.Context) {
	var req struct {
		Code    string `json:"code" binding:"required"`
		UserNum int    `json:"user_num"`
		UserID  string `json:"user_id"`
		IPAddr  string `json:"ip_address"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ข้อมูลไม่ถูกต้อง"})
		return
	}

	if err := h.svc.Redeem(req.Code, req.UserID, req.UserNum, req.IPAddr); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "ใช้โค้ดสำเร็จ"})
}
