package models

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token     string `json:"token"`
	User      User   `json:"user"`
}

type OAuthCallback struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state"`
}
