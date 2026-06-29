package services

import (
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/blacken/admin-panel/database"
	"github.com/blacken/admin-panel/models"
)

type PaymentService struct {
	tenantSvc *TenantService
}

func NewPaymentService(tenantSvc *TenantService) *PaymentService {
	return &PaymentService{tenantSvc: tenantSvc}
}

func scanInvoice(scanner interface{ Scan(dest ...any) error }) (*models.Invoice, error) {
	var inv models.Invoice
	var paymentProof sql.NullString
	var paidAt, dueDate sql.NullTime
	var planName, tenantName, tenantSubdomain sql.NullString

	err := scanner.Scan(
		&inv.ID, &inv.TenantID, &inv.UserID, &inv.PlanID,
		&inv.Amount, &inv.Status, &inv.PaymentMethod,
		&paymentProof, &paidAt, &dueDate, &inv.Months,
		&inv.CreatedAt, &inv.UpdatedAt,
		&planName, &tenantName, &tenantSubdomain,
	)
	if err != nil {
		return nil, err
	}
	if paymentProof.Valid {
		inv.PaymentProof = paymentProof.String
	}
	if paidAt.Valid {
		inv.PaidAt = &paidAt.Time
	}
	if dueDate.Valid {
		inv.DueDate = &dueDate.Time
	}
	if planName.Valid {
		inv.PlanName = planName.String
	}
	if tenantName.Valid {
		inv.TenantName = tenantName.String
	}
	if tenantSubdomain.Valid {
		inv.TenantSubdomain = tenantSubdomain.String
	}
	return &inv, nil
}

func scanPaymentConfig(scanner interface{ Scan(dest ...any) error }) (*models.PaymentConfig, error) {
	var pc models.PaymentConfig
	var qrData sql.NullString
	err := scanner.Scan(
		&pc.ID, &pc.Method, &pc.Label,
		&pc.AccountName, &pc.AccountNumber,
		&pc.PromptpayID, &qrData, &pc.IsActive,
		&pc.CreatedAt, &pc.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	if qrData.Valid {
		pc.QRData = qrData.String
	}
	return &pc, nil
}

func (s *PaymentService) CreateInvoice(tenantID, userID, planID string, months int) (*models.Invoice, error) {
	plan, err := s.tenantSvc.GetPlanByID(planID)
	if err != nil {
		return nil, errors.New("plan not found")
	}

	amount := plan.PriceMonthly * float64(months)
	dueDate := time.Now().AddDate(0, 0, 7)

	row := database.DB.QueryRow(`
		SELECT i.id, i.tenant_id, i.user_id, i.plan_id,
		       i.amount, i.status, i.payment_method,
		       i.payment_proof, i.paid_at, i.due_date, i.months,
		       i.created_at, i.updated_at,
		       COALESCE(p.name, '') as plan_name,
		       COALESCE(t.name, '') as tenant_name,
		       COALESCE(t.subdomain, '') as tenant_subdomain
		FROM invoices i
		JOIN plans p ON i.plan_id = p.id
		JOIN tenants t ON i.tenant_id = t.id
		WHERE i.id = (
			INSERT INTO invoices (tenant_id, user_id, plan_id, amount, due_date, months)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		)
	`, tenantID, userID, planID, amount, dueDate, months)

	inv, err := scanInvoice(row)
	if err != nil {
		// Fallback: insert and then select
		var invID string
		err2 := database.DB.QueryRow(`
			INSERT INTO invoices (tenant_id, user_id, plan_id, amount, due_date, months)
			VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id
		`, tenantID, userID, planID, amount, dueDate, months).Scan(&invID)
		if err2 != nil {
			return nil, err2
		}
		return s.GetInvoiceByID(invID)
	}
	return inv, nil
}

func (s *PaymentService) ConfirmPayment(invoiceID, paymentProof string) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Get invoice details
	var tenantID, planID, status string
	var months int
	err = tx.QueryRow(`SELECT tenant_id, plan_id, status, months FROM invoices WHERE id = $1 FOR UPDATE`, invoiceID).
		Scan(&tenantID, &planID, &status, &months)
	if err != nil {
		return errors.New("invoice not found")
	}
	if status != "pending" {
		return errors.New("invoice is not in pending status")
	}

	// Update invoice
	now := time.Now()
	_, err = tx.Exec(`
		UPDATE invoices SET status = 'paid', payment_proof = $1, paid_at = $2, updated_at = $2
		WHERE id = $3
	`, paymentProof, now, invoiceID)
	if err != nil {
		return err
	}

	// Activate subscription
	expiresAt := now.AddDate(0, months, 0)
	_, err = tx.Exec(`
		INSERT INTO subscriptions (tenant_id, plan_id, status, started_at, expires_at)
		VALUES ($1, $2, 'active', $3, $4)
		ON CONFLICT (tenant_id) WHERE status = 'active'
		DO UPDATE SET plan_id = $2, started_at = $3, expires_at = $4, status = 'active'
	`, tenantID, planID, now, expiresAt)
	if err != nil {
		return err
	}

	// Update tenant status and expiry
	var planCode string
	_ = tx.QueryRow(`SELECT code FROM plans WHERE id = $1`, planID).Scan(&planCode)
	_, err = tx.Exec(`
		UPDATE tenants SET status = 'active', expire_at = $1, plan = $2, updated_at = NOW()
		WHERE id = $3
	`, expiresAt, planCode, tenantID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func (s *PaymentService) GetInvoices(tenantID string) ([]*models.Invoice, error) {
	rows, err := database.DB.Query(`
		SELECT i.id, i.tenant_id, i.user_id, i.plan_id,
		       i.amount, i.status, i.payment_method,
		       i.payment_proof, i.paid_at, i.due_date, i.months,
		       i.created_at, i.updated_at,
		       COALESCE(p.name, '') as plan_name,
		       COALESCE(t.name, '') as tenant_name,
		       COALESCE(t.subdomain, '') as tenant_subdomain
		FROM invoices i
		JOIN plans p ON i.plan_id = p.id
		JOIN tenants t ON i.tenant_id = t.id
		WHERE i.tenant_id = $1
		ORDER BY i.created_at DESC
	`, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []*models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			continue
		}
		invoices = append(invoices, inv)
	}
	return invoices, nil
}

func (s *PaymentService) GetAllInvoices() ([]*models.Invoice, error) {
	rows, err := database.DB.Query(`
		SELECT i.id, i.tenant_id, i.user_id, i.plan_id,
		       i.amount, i.status, i.payment_method,
		       i.payment_proof, i.paid_at, i.due_date, i.months,
		       i.created_at, i.updated_at,
		       COALESCE(p.name, '') as plan_name,
		       COALESCE(t.name, '') as tenant_name,
		       COALESCE(t.subdomain, '') as tenant_subdomain
		FROM invoices i
		JOIN plans p ON i.plan_id = p.id
		JOIN tenants t ON i.tenant_id = t.id
		ORDER BY i.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []*models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			continue
		}
		invoices = append(invoices, inv)
	}
	return invoices, nil
}

func (s *PaymentService) GetInvoiceByID(invoiceID string) (*models.Invoice, error) {
	row := database.DB.QueryRow(`
		SELECT i.id, i.tenant_id, i.user_id, i.plan_id,
		       i.amount, i.status, i.payment_method,
		       i.payment_proof, i.paid_at, i.due_date, i.months,
		       i.created_at, i.updated_at,
		       COALESCE(p.name, '') as plan_name,
		       COALESCE(t.name, '') as tenant_name,
		       COALESCE(t.subdomain, '') as tenant_subdomain
		FROM invoices i
		JOIN plans p ON i.plan_id = p.id
		JOIN tenants t ON i.tenant_id = t.id
		WHERE i.id = $1
	`, invoiceID)
	return scanInvoice(row)
}

func (s *PaymentService) CancelInvoice(invoiceID string) error {
	result, err := database.DB.Exec(`
		UPDATE invoices SET status = 'cancelled', updated_at = NOW()
		WHERE id = $1 AND status = 'pending'
	`, invoiceID)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("invoice not found or already processed")
	}
	return nil
}

func (s *PaymentService) GetPaymentConfigs() ([]*models.PaymentConfig, error) {
	rows, err := database.DB.Query(`
		SELECT id, method, label, account_name, account_number,
		       promptpay_id, qr_data, is_active, created_at, updated_at
		FROM payment_configs
		ORDER BY method
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var configs []*models.PaymentConfig
	for rows.Next() {
		pc, err := scanPaymentConfig(rows)
		if err != nil {
			continue
		}
		configs = append(configs, pc)
	}
	return configs, nil
}

func (s *PaymentService) UpdatePaymentConfig(method, label, accountName, accountNumber, promptpayID string) error {
	result, err := database.DB.Exec(`
		UPDATE payment_configs
		SET label = $1, account_name = $2, account_number = $3,
		    promptpay_id = $4, updated_at = NOW()
		WHERE method = $5
	`, label, accountName, accountNumber, promptpayID, method)
	if err != nil {
		return err
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return errors.New("payment config not found")
	}
	return nil
}

type RevenueStats struct {
	TotalRevenue float64 `json:"total_revenue"`
	Period       string  `json:"period"`
	StartDate    string  `json:"start_date"`
	EndDate      string  `json:"end_date"`
	Count        int     `json:"count"`
}

func (s *PaymentService) GetRevenueStats(startDate, endDate string) (*RevenueStats, error) {
	var total float64
	var count int

	query := `SELECT COALESCE(SUM(amount), 0), COUNT(*) FROM invoices
		WHERE status = 'paid' AND paid_at >= $1 AND paid_at <= $2`

	err := database.DB.QueryRow(query, startDate, endDate).Scan(&total, &count)
	if err != nil {
		return nil, err
	}

	return &RevenueStats{
		TotalRevenue: total,
		Period:       fmt.Sprintf("%s to %s", startDate, endDate),
		StartDate:    startDate,
		EndDate:      endDate,
		Count:        count,
	}, nil
}

func (s *PaymentService) GeneratePromptPayQR(promptpayID string, amount float64) (string, error) {
	if promptpayID == "" {
		return "", errors.New("promptpay ID is required")
	}
	if amount <= 0 {
		return "", errors.New("amount must be positive")
	}

	payload := buildPromptPayPayload(promptpayID, amount)
	encoded := base64.StdEncoding.EncodeToString([]byte(payload))
	return "data:image/png;base64," + encoded, nil
}

// buildPromptPayPayload creates a minimal PromptPay QR payload string
func buildPromptPayPayload(promptpayID string, amount float64) string {
	var sb strings.Builder

	// Payload format indicator
	sb.WriteString("000201") // Version 2
	// Point of Initiation Method
	sb.WriteString("010212") // 12 = dynamic QR

	// Merchant account info
	// AID for PromptPay
	ppID := strings.ReplaceAll(promptpayID, "-", "")
	if len(ppID) == 13 || len(ppID) == 15 {
		// ID with checksum - use AID "30 00"
		sb.WriteString(fmt.Sprintf("29370016A00000067701011101130066%02d%s", len(ppID), ppID))
	} else {
		// Fallback: any length with static QR
		sb.WriteString(fmt.Sprintf("29370016A000000677010111%02d%02d%s",
			13, len(ppID), ppID))
	}

	// Transaction currency (THB - 764)
	sb.WriteString("5303764")

	// Transaction amount
	amtStr := fmt.Sprintf("%.2f", amount)
	sb.WriteString(fmt.Sprintf("54%02d%s", len(amtStr), amtStr))

	// Country code (TH)
	sb.WriteString("5802TH")

	// CRC placeholder (4 chars)
	sb.WriteString("6304")

	return sb.String()
}

func (s *PaymentService) GetBillingHistory(tenantID string) ([]*models.Invoice, error) {
	return s.GetInvoices(tenantID)
}

func (s *PaymentService) GetInvoicesByUserID(userID string) ([]*models.Invoice, error) {
	rows, err := database.DB.Query(`
		SELECT i.id, i.tenant_id, i.user_id, i.plan_id,
		       i.amount, i.status, i.payment_method,
		       i.payment_proof, i.paid_at, i.due_date, i.months,
		       i.created_at, i.updated_at,
		       COALESCE(p.name, '') as plan_name,
		       COALESCE(t.name, '') as tenant_name,
		       COALESCE(t.subdomain, '') as tenant_subdomain
		FROM invoices i
		JOIN plans p ON i.plan_id = p.id
		JOIN tenants t ON i.tenant_id = t.id
		WHERE i.user_id = $1
		ORDER BY i.created_at DESC
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []*models.Invoice
	for rows.Next() {
		inv, err := scanInvoice(rows)
		if err != nil {
			continue
		}
		invoices = append(invoices, inv)
	}
	return invoices, nil
}
