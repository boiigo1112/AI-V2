package models

import "time"

type User struct {
	ID         string     `json:"id"`
	Username   string     `json:"username"`
	Email      string     `json:"email"`
	Password   string     `json:"-"`
	FullName   string     `json:"full_name"`
	AvatarURL  string     `json:"avatar_url,omitempty"`
	Provider   string     `json:"provider"`
	ProviderID string     `json:"provider_id,omitempty"`
	RoleID     string     `json:"role_id"`
	IsActive   bool       `json:"is_active"`
	LastLogin  *time.Time `json:"last_login,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`

	Role           *Role          `json:"role,omitempty"`
	Permissions    []string       `json:"permissions,omitempty"`
}
