package models

import "time"

type Invoice struct {
	ID              string     `json:"id"`
	TenantID        string     `json:"tenant_id"`
	UserID          string     `json:"user_id"`
	PlanID          string     `json:"plan_id"`
	Amount          float64    `json:"amount"`
	Status          string     `json:"status"`
	PaymentMethod   string     `json:"payment_method"`
	PaymentProof    string     `json:"payment_proof,omitempty"`
	PaidAt          *time.Time `json:"paid_at,omitempty"`
	DueDate         *time.Time `json:"due_date"`
	Months          int        `json:"months"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	PlanName        string     `json:"plan_name,omitempty"`
	TenantName      string     `json:"tenant_name,omitempty"`
	TenantSubdomain string     `json:"tenant_subdomain,omitempty"`
}

type PaymentConfig struct {
	ID            string    `json:"id"`
	Method        string    `json:"method"`
	Label         string    `json:"label"`
	AccountName   string    `json:"account_name"`
	AccountNumber string    `json:"account_number"`
	PromptpayID   string    `json:"promptpay_id"`
	QRData        string    `json:"qr_data,omitempty"`
	IsActive      bool      `json:"is_active"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
