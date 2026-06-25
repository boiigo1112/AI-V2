package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
)

func getUserID(c *gin.Context) (string, error) {
	raw, exists := c.Get("user_id")
	if !exists {
		return "", errors.New("not authenticated")
	}
	id, ok := raw.(string)
	if !ok || id == "" {
		return "", errors.New("invalid user identity")
	}
	return id, nil
}
