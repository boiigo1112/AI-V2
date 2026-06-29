package services

import (
	"database/sql"
	"errors"
	"time"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/models"
)

type SubscriptionService struct {
	tenantSvc *TenantService
}

func NewSubscriptionService() *SubscriptionService {
	return &SubscriptionService{
		tenantSvc: NewTenantService(),
	}
}

func scanSubscription(scanner interface{ Scan(dest ...any) error }) (*models.Subscription, error) {
	var s models.Subscription
	var expiresAt, cancelledAt sql.NullTime
	err := scanner.Scan(
		&s.ID, &s.TenantID, &s.PlanID, &s.Status,
		&s.StartedAt, &expiresAt, &cancelledAt, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if expiresAt.Valid {
		s.ExpiresAt = &expiresAt.Time
	}
	if cancelledAt.Valid {
		s.CancelledAt = &cancelledAt.Time
	}
	return &s, nil
}

func (s *SubscriptionService) ActivateSubscription(tenantID, planID string, months int) (*models.Subscription, error) {
	now := time.Now()
	expiresAt := now.AddDate(0, months, 0)

	var sub models.Subscription
	var exp, cancelled sql.NullTime
	err := database.DB.QueryRow(`
		INSERT INTO subscriptions (tenant_id, plan_id, status, started_at, expires_at)
		VALUES ($1, $2, 'active', $3, $4)
		ON CONFLICT (tenant_id) WHERE status = 'active'
		DO UPDATE SET plan_id = $2, started_at = $3, expires_at = $4, status = 'active'
		RETURNING id, tenant_id, plan_id, status, started_at, expires_at, cancelled_at, created_at
	`, tenantID, planID, now, expiresAt).Scan(
		&sub.ID, &sub.TenantID, &sub.PlanID, &sub.Status,
		&sub.StartedAt, &exp, &cancelled, &sub.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if exp.Valid {
		sub.ExpiresAt = &exp.Time
	}
	if cancelled.Valid {
		sub.CancelledAt = &cancelled.Time
	}

	// Update tenant
	var planCode string
	_ = database.DB.QueryRow(`SELECT code FROM plans WHERE id = $1`, planID).Scan(&planCode)
	database.DB.Exec(`UPDATE tenants SET status = 'active', plan = $1, expire_at = $2, updated_at = NOW() WHERE id = $3`,
		planCode, expiresAt, tenantID)

	return &sub, nil
}

func (s *SubscriptionService) CheckExpiry(tenantID string) (bool, error) {
	tenant, err := s.tenantSvc.GetTenantByID(tenantID)
	if err != nil {
		return false, errors.New("tenant not found")
	}

	if tenant.ExpireAt == nil {
		return false, nil
	}

	if time.Now().After(*tenant.ExpireAt) {
		// Suspend the tenant
		_ = s.tenantSvc.UpdateTenantStatus(tenantID, "expired")
		// Update subscription
		database.DB.Exec(`UPDATE subscriptions SET status = 'expired' WHERE tenant_id = $1 AND status = 'active'`, tenantID)
		return true, nil
	}

	return false, nil
}

func (s *SubscriptionService) RenewSubscription(tenantID, planID string, months int) (*models.Subscription, error) {
	plan, err := s.tenantSvc.GetPlanByID(planID)
	if err != nil {
		return nil, errors.New("plan not found")
	}

	now := time.Now()

	// Get current expiry to extend from
	var currentExpiry *time.Time
	var currentStatus string
	_ = database.DB.QueryRow(`SELECT expires_at, status FROM subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`, tenantID).
		Scan(&currentExpiry, &currentStatus)

	var expiresAt time.Time
	if currentExpiry != nil && currentExpiry.After(now) {
		expiresAt = currentExpiry.AddDate(0, months, 0)
	} else {
		expiresAt = now.AddDate(0, months, 0)
	}

	var sub models.Subscription
	var exp, cancelled sql.NullTime
	err = database.DB.QueryRow(`
		INSERT INTO subscriptions (tenant_id, plan_id, status, started_at, expires_at)
		VALUES ($1, $2, 'active', $3, $4)
		ON CONFLICT (tenant_id) WHERE status = 'active'
		DO UPDATE SET plan_id = $2, started_at = $3, expires_at = $4, status = 'active'
		RETURNING id, tenant_id, plan_id, status, started_at, expires_at, cancelled_at, created_at
	`, tenantID, planID, now, expiresAt).Scan(
		&sub.ID, &sub.TenantID, &sub.PlanID, &sub.Status,
		&sub.StartedAt, &exp, &cancelled, &sub.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if exp.Valid {
		sub.ExpiresAt = &exp.Time
	}
	if cancelled.Valid {
		sub.CancelledAt = &cancelled.Time
	}

	// Update tenant
	database.DB.Exec(`UPDATE tenants SET status = 'active', plan = $1, expire_at = $2, updated_at = NOW() WHERE id = $3`,
		plan.Code, expiresAt, tenantID)

	return &sub, nil
}

func (s *SubscriptionService) GetSubscription(tenantID string) (*models.Subscription, error) {
	row := database.DB.QueryRow(`
		SELECT id, tenant_id, plan_id, status, started_at, expires_at, cancelled_at, created_at
		FROM subscriptions
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`, tenantID)
	return scanSubscription(row)
}

func (s *SubscriptionService) CancelSubscription(tenantID string) error {
	now := time.Now()
	result, err := database.DB.Exec(`
		UPDATE subscriptions SET status = 'cancelled', cancelled_at = $1
		WHERE tenant_id = $2 AND status = 'active'
	`, now, tenantID)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("no active subscription found")
	}
	return nil
}

func (s *SubscriptionService) GetExpiringSoon(days int) ([]*models.Tenant, error) {
	rows, err := database.DB.Query(`
		SELECT id, name, subdomain, plan, status, owner_id,
		       game_db_host, game_db_port, game_db_user, game_db_password, game_db_names,
		       created_at, expire_at, updated_at
		FROM tenants
		WHERE expire_at IS NOT NULL
		  AND expire_at > NOW()
		  AND expire_at <= NOW() + INTERVAL '1 day' * $1
		ORDER BY expire_at ASC
	`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tenants []*models.Tenant
	for rows.Next() {
		t, err := scanTenant(rows)
		if err != nil {
			continue
		}
		tenants = append(tenants, t)
	}
	return tenants, nil
}

func (s *SubscriptionService) AutoExpireCheck() error {
	rows, err := database.DB.Query(`
		SELECT id FROM tenants
		WHERE expire_at IS NOT NULL
		  AND expire_at <= NOW()
		  AND status != 'expired'
		  AND status != 'suspended'
	`)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			continue
		}
		s.CheckExpiry(id)
	}
	return nil
}

func (s *SubscriptionService) ExtendTrial(tenantID string, days int) error {
	now := time.Now()
	newExpiry := now.AddDate(0, 0, days)

	// Check current expiry
	var currentExpireAt *time.Time
	_ = database.DB.QueryRow(`SELECT expire_at FROM tenants WHERE id = $1`, tenantID).Scan(&currentExpireAt)
	if currentExpireAt != nil && currentExpireAt.After(now) {
		newExpiry = currentExpireAt.AddDate(0, 0, days)
	}

	result, err := database.DB.Exec(`
		UPDATE tenants SET expire_at = $1, status = 'active', updated_at = NOW()
		WHERE id = $2
	`, newExpiry, tenantID)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("tenant not found")
	}

	// Update subscription if exists
	database.DB.Exec(`
		UPDATE subscriptions SET expires_at = $1, status = 'active'
		WHERE tenant_id = $2 AND status = 'active'
	`, newExpiry, tenantID)

	return nil
}

func (s *SubscriptionService) GetBillingHistory(tenantID string) ([]*models.Invoice, error) {
	paySvc := NewPaymentService(s.tenantSvc)
	return paySvc.GetInvoices(tenantID)
}
