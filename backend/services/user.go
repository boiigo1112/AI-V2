package services

import (
	"errors"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/models"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

type UserService struct{}

func NewUserService() *UserService {
	return &UserService{}
}

func (s *UserService) List() ([]models.User, error) {
	return database.ListUsers()
}

func (s *UserService) GetByID(id string) (*models.User, error) {
	u, err := database.GetUserByID(id)
	if err != nil {
		return nil, errors.New("user not found")
	}
	return &u, nil
}

func (s *UserService) Create(req models.CreateUserRequest) (*models.User, error) {
	if err := validateUserInput(req.Username, req.Email, req.Password); err != nil {
		return nil, err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("failed to process password")
	}

	var u models.User
	err = database.DB.QueryRow(`
		INSERT INTO users (username, email, password, full_name, role_id)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, username, email, full_name, avatar_url, provider, role_id, is_active, created_at, updated_at
	`, req.Username, req.Email, string(hash), req.FullName, req.RoleID).Scan(
		&u.ID, &u.Username, &u.Email, &u.FullName, &u.AvatarURL,
		&u.Provider, &u.RoleID, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if err != nil {
		if isDuplicateError(err) {
			return nil, errors.New("username or email already exists")
		}
		return nil, errors.New("failed to create user")
	}

	role, _ := database.GetRoleByID(req.RoleID)
	u.Role = role
	return &u, nil
}

func (s *UserService) Update(id string, req models.UpdateUserRequest) (*models.User, error) {
	u, err := s.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.Username != nil {
		u.Username = *req.Username
	}
	if req.Email != nil {
		if !emailRegex.MatchString(*req.Email) {
			return nil, errors.New("invalid email format")
		}
		u.Email = *req.Email
	}
	if req.FullName != nil {
		u.FullName = *req.FullName
	}
	if req.RoleID != nil {
		u.RoleID = *req.RoleID
	}

	_, err = database.DB.Exec(`
		UPDATE users SET username=$1, email=$2, full_name=$3, role_id=$4, updated_at=NOW()
		WHERE id=$5
	`, u.Username, u.Email, u.FullName, u.RoleID, id)
	if err != nil {
		if isDuplicateError(err) {
			return nil, errors.New("username or email already exists")
		}
		return nil, errors.New("failed to update user")
	}

	return s.GetByID(id)
}

func (s *UserService) Delete(id string) error {
	result, err := database.DB.Exec(`DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return errors.New("failed to delete user")
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("user not found")
	}
	return nil
}

func (s *UserService) ListRoles() ([]models.Role, error) {
	return database.GetRoles()
}

func validateUserInput(username, email, password string) error {
	if strings.TrimSpace(username) == "" {
		return errors.New("username is required")
	}
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	return nil
}

func isDuplicateError(err error) bool {
	msg := err.Error()
	return strings.Contains(msg, "unique") || strings.Contains(msg, "duplicate")
}
