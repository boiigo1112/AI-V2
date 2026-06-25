package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/blacken/admin-panel/database"
)

func RequirePermission(resource, action string) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get("user_id")
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
			return
		}

		userID, ok := raw.(string)
		if !ok || userID == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid user identity"})
			return
		}

		allowed, err := database.CheckPermission(userID, resource, action)
		if err != nil || !allowed {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}

		c.Next()
	}
}
