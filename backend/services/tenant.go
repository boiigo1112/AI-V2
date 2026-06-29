package services

import (
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/models"
)

type TenantService struct{}

func NewTenantService() *TenantService {
	return &TenantService{}
}

func scanTenant(scanner interface{ Scan(dest ...any) error }) (*models.Tenant, error) {
	var t models.Tenant
	var expireAt sql.NullTime
	var gameDBHost, gameDBPort, gameDBUser, gameDBPassword, gameDBNames sql.NullString

	err := scanner.Scan(
		&t.ID, &t.Name, &t.Subdomain, &t.Plan, &t.Status, &t.OwnerID,
		&gameDBHost, &gameDBPort, &gameDBUser, &gameDBPassword, &gameDBNames,
		&t.CreatedAt, &expireAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if gameDBHost.Valid {
		t.GameDBHost = gameDBHost.String
	}
	if gameDBPort.Valid {
		t.GameDBPort = gameDBPort.String
	}
	if gameDBUser.Valid {
		t.GameDBUser = gameDBUser.String
	}
	if gameDBPassword.Valid {
		t.GameDBPassword = gameDBPassword.String
	}
	if gameDBNames.Valid {
		t.GameDBNames = gameDBNames.String
	}
	if expireAt.Valid {
		t.ExpireAt = &expireAt.Time
	}

	return &t, nil
}

func scanPlan(scanner interface{ Scan(dest ...any) error }) (*models.Plan, error) {
	var p models.Plan
	var featuresBytes []byte

	err := scanner.Scan(
		&p.ID, &p.Name, &p.Code, &p.PriceMonthly, &p.MaxPlayers,
		&featuresBytes, &p.IsActive, &p.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	if featuresBytes != nil && len(featuresBytes) > 0 {
		json.Unmarshal(featuresBytes, &p.Features)
	}

	return &p, nil
}

func scanPlans(rows *sql.Rows) ([]*models.Plan, error) {
	var plans []*models.Plan
	for rows.Next() {
		p, err := scanPlan(rows)
		if err != nil {
			return nil, err
		}
		plans = append(plans, p)
	}
	return plans, nil
}

func (s *TenantService) CreateTenant(name, subdomain, planID, ownerID string) (*models.Tenant, error) {
	if name == "" || subdomain == "" {
		return nil, errors.New("name and subdomain are required")
	}

	// Check if subdomain is already taken
	existing, _ := s.GetTenantBySubdomain(subdomain)
	if existing != nil {
		return nil, errors.New("subdomain already in use")
	}

	var t models.Tenant
	err := database.DB.QueryRow(`
		INSERT INTO tenants (name, subdomain, owner_id)
		VALUES ($1, $2, $3)
		RETURNING id, name, subdomain, plan, status, owner_id,
		          game_db_host, game_db_port, game_db_user, game_db_password, game_db_names,
		          created_at, expire_at, updated_at
	`, name, subdomain, ownerID).Scan(
		&t.ID, &t.Name, &t.Subdomain, &t.Plan, &t.Status, &t.OwnerID,
		&t.GameDBHost, &t.GameDBPort, &t.GameDBUser, &t.GameDBPassword, &t.GameDBNames,
		&t.CreatedAt, &t.ExpireAt, &t.UpdatedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			return nil, errors.New("subdomain already in use")
		}
		return nil, err
	}

	// Create subscription if planID is provided
	if planID != "" {
		plan, err := s.GetPlanByID(planID)
		if err != nil {
			return nil, errors.New("plan not found")
		}

		expiresAt := time.Now().AddDate(0, 1, 0)
		_, err = database.DB.Exec(`
			INSERT INTO subscriptions (tenant_id, plan_id, expires_at)
			VALUES ($1, $2, $3)
		`, t.ID, planID, expiresAt)
		if err != nil {
			return nil, err
		}

		t.Plan = plan.Code
		t.ExpireAt = &expiresAt
		database.DB.Exec(`UPDATE tenants SET plan = $1, expire_at = $2 WHERE id = $3`, plan.Code, expiresAt, t.ID)
	}

	return &t, nil
}

func (s *TenantService) GetTenantBySubdomain(subdomain string) (*models.Tenant, error) {
	row := database.DB.QueryRow(`
		SELECT id, name, subdomain, plan, status, owner_id,
		       game_db_host, game_db_port, game_db_user, game_db_password, game_db_names,
		       created_at, expire_at, updated_at
		FROM tenants WHERE subdomain = $1
	`, subdomain)
	return scanTenant(row)
}

func (s *TenantService) GetTenantByID(id string) (*models.Tenant, error) {
	row := database.DB.QueryRow(`
		SELECT id, name, subdomain, plan, status, owner_id,
		       game_db_host, game_db_port, game_db_user, game_db_password, game_db_names,
		       created_at, expire_at, updated_at
		FROM tenants WHERE id = $1
	`, id)
	return scanTenant(row)
}

func (s *TenantService) ListTenants(offset, limit int) ([]*models.Tenant, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	rows, err := database.DB.Query(`
		SELECT id, name, subdomain, plan, status, owner_id,
		       game_db_host, game_db_port, game_db_user, game_db_password, game_db_names,
		       created_at, expire_at, updated_at
		FROM tenants ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenants []*models.Tenant
	for rows.Next() {
		t, err := scanTenant(rows)
		if err != nil {
			return nil, err
		}
		tenants = append(tenants, t)
	}
	return tenants, nil
}

func (s *TenantService) UpdateTenantStatus(id, status string) error {
	validStatuses := map[string]bool{"active": true, "suspended": true, "expired": true}
	if !validStatuses[status] {
		return errors.New("invalid status value")
	}

	result, err := database.DB.Exec(`UPDATE tenants SET status = $1, updated_at = NOW() WHERE id = $2`, status, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("tenant not found")
	}
	return nil
}

func (s *TenantService) UpdateTenant(id, name, gameDBHost, gameDBPort, gameDBUser, gameDBPassword, gameDBNames string) (*models.Tenant, error) {
	// Build dynamic update
	var sets []string
	var args []interface{}
	argIdx := 1

	if name != "" {
		sets = append(sets, "name = $"+itoa(argIdx))
		args = append(args, name)
		argIdx++
	}
	if gameDBHost != "" {
		sets = append(sets, "game_db_host = $"+itoa(argIdx))
		args = append(args, gameDBHost)
		argIdx++
	}
	if gameDBPort != "" {
		sets = append(sets, "game_db_port = $"+itoa(argIdx))
		args = append(args, gameDBPort)
		argIdx++
	}
	if gameDBUser != "" {
		sets = append(sets, "game_db_user = $"+itoa(argIdx))
		args = append(args, gameDBUser)
		argIdx++
	}
	if gameDBPassword != "" {
		sets = append(sets, "game_db_password = $"+itoa(argIdx))
		args = append(args, gameDBPassword)
		argIdx++
	}
	if gameDBNames != "" {
		sets = append(sets, "game_db_names = $"+itoa(argIdx))
		args = append(args, gameDBNames)
		argIdx++
	}

	if len(sets) == 0 {
		return nil, errors.New("no fields to update")
	}

	sets = append(sets, "updated_at = NOW()")
	args = append(args, id)

	query := "UPDATE tenants SET " + strings.Join(sets, ", ") + " WHERE id = $"
	query += itoa(argIdx) + " RETURNING id, name, subdomain, plan, status, owner_id, game_db_host, game_db_port, game_db_user, game_db_password, game_db_names, created_at, expire_at, updated_at"

	row := database.DB.QueryRow(query, args...)
	return scanTenant(row)
}

func (s *TenantService) DeleteTenant(id string) error {
	return s.UpdateTenantStatus(id, "suspended")
}

func (s *TenantService) CreatePlan(name, code string, price float64, maxPlayers int, features []string) (*models.Plan, error) {
	if name == "" || code == "" {
		return nil, errors.New("name and code are required")
	}

	featuresJSON, err := json.Marshal(features)
	if err != nil {
		return nil, errors.New("invalid features")
	}

	row := database.DB.QueryRow(`
		INSERT INTO plans (name, code, price_monthly, max_players, features)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, code, price_monthly, max_players, features, is_active, created_at
	`, name, code, price, maxPlayers, string(featuresJSON))

	return scanPlan(row)
}

func (s *TenantService) GetPlanByID(id string) (*models.Plan, error) {
	row := database.DB.QueryRow(`
		SELECT id, name, code, price_monthly, max_players, features, is_active, created_at
		FROM plans WHERE id = $1
	`, id)
	return scanPlan(row)
}

func (s *TenantService) ListPlans() ([]*models.Plan, error) {
	rows, err := database.DB.Query(`
		SELECT id, name, code, price_monthly, max_players, features, is_active, created_at
		FROM plans ORDER BY price_monthly ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPlans(rows)
}

func (s *TenantService) DeletePlan(id string) error {
	result, err := database.DB.Exec(`DELETE FROM plans WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("plan not found")
	}
	return nil
}

// itoa is a simple int-to-string converter avoiding strconv import
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
