package database

import (
	"database/sql"

	"github.com/blacken/admin-panel/models"
)

const (
	userJoinRoleQuery = `
		SELECT u.id, u.username, u.email, u.full_name, u.avatar_url,
		       u.provider, u.role_id, u.is_active, u.last_login,
		       u.created_at, u.updated_at,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id`

	userJoinRoleQueryWithPassword = `
		SELECT u.id, u.username, u.email, u.password,
		       u.full_name, u.avatar_url, u.provider, u.role_id,
		       u.is_active, u.last_login,
		       r.id, r.name, r.description
		FROM users u
		JOIN roles r ON u.role_id = r.id`
)

type userScanner func(dest ...any) error

func scanUser(s userScanner) (models.User, error) {
	var (
		u models.User
		r models.Role

		lastLogin              sql.NullTime
		fullName, avatarURL    sql.NullString
	)

	if err := s(
		&u.ID, &u.Username, &u.Email, &fullName, &avatarURL,
		&u.Provider, &u.RoleID, &u.IsActive, &lastLogin,
		&u.CreatedAt, &u.UpdatedAt,
		&r.ID, &r.Name, &r.Description,
	); err != nil {
		return u, err
	}

	if fullName.Valid {
		u.FullName = fullName.String
	}
	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}
	if lastLogin.Valid {
		u.LastLogin = &lastLogin.Time
	}
	u.Role = &r
	return u, nil
}

func scanUserWithPassword(s userScanner) (models.User, error) {
	var (
		u models.User
		r models.Role

		lastLogin              sql.NullTime
		fullName, avatarURL    sql.NullString
	)

	if err := s(
		&u.ID, &u.Username, &u.Email, &u.Password,
		&fullName, &avatarURL, &u.Provider, &u.RoleID,
		&u.IsActive, &lastLogin,
		&r.ID, &r.Name, &r.Description,
	); err != nil {
		return u, err
	}

	if fullName.Valid {
		u.FullName = fullName.String
	}
	if avatarURL.Valid {
		u.AvatarURL = avatarURL.String
	}
	if lastLogin.Valid {
		u.LastLogin = &lastLogin.Time
	}
	u.Role = &r
	return u, nil
}

func GetUserByUsername(username string) (models.User, error) {
	query := userJoinRoleQueryWithPassword + " WHERE u.username = $1 AND u.is_active = true"
	return scanUserWithPassword(DB.QueryRow(query, username).Scan)
}

func GetUserByID(id string) (models.User, error) {
	query := userJoinRoleQuery + " WHERE u.id = $1"
	return scanUser(DB.QueryRow(query, id).Scan)
}

func GetUserByEmail(email string) (models.User, error) {
	query := userJoinRoleQuery + " WHERE u.email = $1"
	return scanUser(DB.QueryRow(query, email).Scan)
}

func ListUsers() ([]models.User, error) {
	rows, err := DB.Query(userJoinRoleQuery + " ORDER BY u.created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		u, err := scanUser(rows.Scan)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, nil
}

func GetUserPermissions(userID string) ([]string, error) {
	rows, err := DB.Query(`
		SELECT p.name
		FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		JOIN users u ON u.role_id = rp.role_id
		WHERE u.id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

func CheckPermission(userID, resource, action string) (bool, error) {
	var count int
	err := DB.QueryRow(`
		SELECT COUNT(*)
		FROM permissions p
		JOIN role_permissions rp ON p.id = rp.permission_id
		JOIN users u ON u.role_id = rp.role_id
		WHERE u.id = $1 AND p.resource = $2 AND p.action = $3
	`, userID, resource, action).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func GetRoles() ([]models.Role, error) {
	rows, err := DB.Query(`SELECT id, name, description FROM roles ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []models.Role
	for rows.Next() {
		var r models.Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Description); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, nil
}

func GetRoleByID(id string) (*models.Role, error) {
	var r models.Role
	if err := DB.QueryRow(`SELECT id, name, description FROM roles WHERE id = $1`, id).
		Scan(&r.ID, &r.Name, &r.Description); err != nil {
		return nil, err
	}
	return &r, nil
}
