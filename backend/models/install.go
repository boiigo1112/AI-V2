package models

import "time"

type InstallStatus struct {
	ID        string    `json:"id"`
	Step      int       `json:"step"`
	Completed bool      `json:"completed"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
