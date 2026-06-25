package models

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
	FullName string `json:"full_name"`
	RoleID   string `json:"role_id" binding:"required"`
}

type UpdateUserRequest struct {
	Username *string `json:"username"`
	Email    *string `json:"email"`
	FullName *string `json:"full_name"`
	RoleID   *string `json:"role_id"`
}

type UserListResponse struct {
	Users []User `json:"users"`
	Total int    `json:"total"`
}
