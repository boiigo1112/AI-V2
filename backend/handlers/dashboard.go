package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/database"
)

type DashboardHandler struct{}

func NewDashboardHandler() *DashboardHandler {
	return &DashboardHandler{}
}

type DashboardStats struct {
	TotalUsers  int `json:"total_users"`
	ActiveUsers int `json:"active_users"`
	NewUsers    int `json:"new_users"`
	TotalRoles  int `json:"total_roles"`
	TotalAdmins int `json:"total_admins"`
}

func (h *DashboardHandler) Stats(c *gin.Context) {
	since := parseTimeRange(c.DefaultQuery("time_range", "7d"))

	var stats DashboardStats

	safeScan(database.DB.QueryRow(`SELECT COUNT(*) FROM users`).Scan, &stats.TotalUsers)
	safeScan(database.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE is_active = true`).Scan, &stats.ActiveUsers)
	safeScan(database.DB.QueryRow(`SELECT COUNT(*) FROM roles`).Scan, &stats.TotalRoles)
	safeScan(database.DB.QueryRow(`SELECT COUNT(*) FROM users WHERE created_at >= $1`, since).Scan, &stats.NewUsers)
	safeScan(database.DB.QueryRow(`
		SELECT COUNT(*) FROM users u
		JOIN roles r ON u.role_id = r.id
		WHERE r.name IN ('superadmin', 'admin')
	`).Scan, &stats.TotalAdmins)

	c.JSON(http.StatusOK, stats)
}

func parseTimeRange(s string) time.Time {
	now := time.Now()
	switch s {
	case "24h":
		return now.Add(-24 * time.Hour)
	case "7d":
		return now.Add(-7 * 24 * time.Hour)
	case "30d":
		return now.Add(-30 * 24 * time.Hour)
	default:
		return now.Add(-7 * 24 * time.Hour)
	}
}

func safeScan(scan func(dest ...any) error, dest ...any) {
	if err := scan(dest...); err != nil {
		log.Printf("query scan failed: %v", err)
	}
}
