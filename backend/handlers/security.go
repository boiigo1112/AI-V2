package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/services"
)

type SecurityHandler struct {
	svc *services.SecurityAuditService
}

func NewSecurityHandler(svc *services.SecurityAuditService) *SecurityHandler {
	return &SecurityHandler{svc: svc}
}

func (h *SecurityHandler) GetStats(c *gin.Context) {
	stats, err := h.svc.GetSecurityStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get security stats"})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *SecurityHandler) GetLogs(c *gin.Context) {
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

	filters := make(map[string]interface{})
	if et := c.Query("event_type"); et != "" {
		filters["event_type"] = et
	}
	if s := c.Query("severity"); s != "" {
		filters["severity"] = s
	}

	logs, total, err := h.svc.GetSecurityLogs(limit, offset, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get security logs"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"logs": logs, "total": total})
}

func (h *SecurityHandler) GetBlockedIPs(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT ip_address, reason, blocked_by, expires_at, is_permanent, created_at 
		FROM blocked_ips 
		WHERE is_permanent = true OR expires_at > NOW() 
		ORDER BY created_at DESC
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to query blocked IPs"})
		return
	}
	defer rows.Close()

	type BlockedIP struct {
		IPAddress  string `json:"ip_address"`
		Reason     string `json:"reason"`
		BlockedBy  string `json:"blocked_by"`
		IsPermanent bool  `json:"is_permanent"`
		CreatedAt  string `json:"created_at"`
	}

	var ips []BlockedIP
	for rows.Next() {
		var ip BlockedIP
		var expiresAt interface{}
		if err := rows.Scan(&ip.IPAddress, &ip.Reason, &ip.BlockedBy, &expiresAt, &ip.IsPermanent, &ip.CreatedAt); err != nil {
			continue
		}
		ips = append(ips, ip)
	}
	c.JSON(http.StatusOK, gin.H{"ips": ips, "total": len(ips)})
}
