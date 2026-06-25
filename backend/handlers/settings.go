package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"github.com/blacken/admin-panel/database"
)

type SettingsHandler struct{}

func NewSettingsHandler() *SettingsHandler {
	return &SettingsHandler{}
}

type updateProfileRequest struct {
	FullName *string `json:"full_name"`
	Email    *string `json:"email"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required"`
}

func (h *SettingsHandler) UpdateProfile(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.FullName == nil && req.Email == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "nothing to update"})
		return
	}

	sets := []string{}
	args := []any{}
	idx := 1

	if req.FullName != nil {
		sets = append(sets, "full_name=$"+itoa(idx))
		args = append(args, *req.FullName)
		idx++
	}
	if req.Email != nil {
		sets = append(sets, "email=$"+itoa(idx))
		args = append(args, *req.Email)
		idx++
	}
	sets = append(sets, "updated_at=NOW()")
	args = append(args, userID)

	query := "UPDATE users SET " + strings.Join(sets, ", ") + " WHERE id=$" + itoa(idx)
	if _, err := database.DB.Exec(query, args...); err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			c.JSON(http.StatusConflict, gin.H{"error": "email already in use"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "profile updated"})
}

func (h *SettingsHandler) ChangePassword(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if len(req.NewPassword) < 6 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "new password must be at least 6 characters"})
		return
	}

	var currentHash string
	if err := database.DB.QueryRow(`SELECT password FROM users WHERE id = $1`, userID).Scan(&currentHash); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "current password is incorrect"})
		return
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to hash password"})
		return
	}

	if _, err := database.DB.Exec(`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, string(newHash), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to change password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "password changed successfully"})
}

func itoa(n int) string {
	return strconv.Itoa(n)
}
