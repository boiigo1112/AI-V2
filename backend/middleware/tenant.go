package middleware

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/services"
)

// TenantRequired extracts the subdomain from the Host header,
// looks up the tenant, and sets it in the gin context.
// For superadmin users, the tenant check is skipped (pass through).
func TenantRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		roleStr, _ := role.(string)
		isSuperAdmin := exists && roleStr == "superadmin"

		host := c.Request.Host
		// Remove port if present
		if idx := strings.Index(host, ":"); idx > 0 {
			host = host[:idx]
		}

		// Extract subdomain from host
		// xxx.ran-dev.duckdns.org -> "xxx"
		// localhost -> no subdomain
		ports := strings.Split(host, ".")
		if len(ports) < 2 {
			c.Next()
			return
		}

		subdomain := ports[0]

		// Skip known non-tenant hosts
		if subdomain == "www" || subdomain == "localhost" || subdomain == "" || net.ParseIP(host) != nil {
			c.Next()
			return
		}

		svc := services.NewTenantService()
		tenant, err := svc.GetTenantBySubdomain(subdomain)
		if err != nil {
			if isSuperAdmin {
				c.Next()
				return
			}
			c.AbortWithStatusJSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
			return
		}

		// Check tenant status
		if tenant.Status == "suspended" && !isSuperAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "tenant is suspended"})
			return
		}

		// Check if expired
		if tenant.ExpireAt != nil && time.Now().After(*tenant.ExpireAt) && !isSuperAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "tenant subscription has expired"})
			return
		}

		c.Set("tenant", tenant)
		c.Next()
	}
}
