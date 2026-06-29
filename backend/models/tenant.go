package models

import "time"

type Tenant struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Subdomain      string     `json:"subdomain"`
	Plan           string     `json:"plan"`
	Status         string     `json:"status"`
	OwnerID        string     `json:"owner_id"`
	GameDBHost     string     `json:"game_db_host"`
	GameDBPort     string     `json:"game_db_port"`
	GameDBUser     string     `json:"game_db_user"`
	GameDBPassword string     `json:"-"`
	GameDBNames    string     `json:"game_db_names"`
	CreatedAt      time.Time  `json:"created_at"`
	ExpireAt       *time.Time `json:"expire_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Plan struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Code         string    `json:"code"`
	PriceMonthly float64   `json:"price_monthly"`
	MaxPlayers   int       `json:"max_players"`
	Features     []string  `json:"features"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

type Subscription struct {
	ID          string     `json:"id"`
	TenantID    string     `json:"tenant_id"`
	PlanID      string     `json:"plan_id"`
	Status      string     `json:"status"`
	StartedAt   time.Time  `json:"started_at"`
	ExpiresAt   *time.Time `json:"expires_at"`
	CancelledAt *time.Time `json:"cancelled_at"`
	CreatedAt   time.Time  `json:"created_at"`
}
