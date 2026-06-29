package models

type LoginRequest struct {
	Username          string `json:"username" binding:"required"`
	Password          string `json:"password" binding:"required"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	User         User   `json:"user"`
}

type RefreshTokenRequest struct {
	RefreshToken      string `json:"refresh_token" binding:"required"`
	DeviceFingerprint string `json:"device_fingerprint"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
}

type OAuthCallback struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state"`
}
