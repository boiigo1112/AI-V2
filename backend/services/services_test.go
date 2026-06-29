package services

import (
	"fmt"
	"testing"
	"time"

	"github.com/blacken/admin-panel/config"
	"github.com/blacken/admin-panel/models"
)

func TestValidateEmail(t *testing.T) {
	tests := []struct {
		email string
		want  bool
	}{
		{"test@example.com", true},
		{"user@domain.co.th", true},
		{"admin@blacken.dev", true},
		{"", false},
		{"not-an-email", false},
		{"@domain.com", false},
		{"user@", false},
	}

	for _, tt := range tests {
		if emailRegex.MatchString(tt.email) != tt.want {
			t.Errorf("emailRegex.MatchString(%q) = %v, want %v", tt.email, !tt.want, tt.want)
		}
	}
}

func TestValidateUserInput(t *testing.T) {
	tests := []struct {
		name     string
		username string
		email    string
		password string
		wantErr  bool
	}{
		{"valid input", "testuser", "test@test.com", "password123", false},
		{"empty username", "", "test@test.com", "password123", true},
		{"invalid email", "testuser", "invalid", "password123", true},
		{"short password", "testuser", "test@test.com", "12345", true},
		{"spaces username", "   ", "test@test.com", "password123", true},
	}

	for _, tt := range tests {
		err := validateUserInput(tt.username, tt.email, tt.password)
		if (err != nil) != tt.wantErr {
			t.Errorf("%s: validateUserInput(%q, %q, %q) error = %v, wantErr = %v",
				tt.name, tt.username, tt.email, tt.password, err, tt.wantErr)
		}
	}
}

func TestIsDuplicateError(t *testing.T) {
	tests := []struct {
		errMsg string
		want   bool
	}{
		{"duplicate key value violates unique constraint", true},
		{"pq: unique constraint", true},
		{"normal error message", false},
		{"", false},
	}

	for _, tt := range tests {
		err := isDuplicateErrorString(tt.errMsg)
		if err != tt.want {
			t.Errorf("isDuplicateErrorString(%q) = %v, want %v", tt.errMsg, err, tt.want)
		}
	}
}

func TestValidateNumericRange(t *testing.T) {
	tests := []struct {
		field string
		value int
		min   int
		max   int
		want  bool
	}{
		{"level", 50, 1, 999, true},
		{"level", 0, 1, 999, false},
		{"level", 1000, 1, 999, false},
		{"stats", 99999, 0, 99999, true},
		{"stats", -1, 0, 99999, false},
	}

	for _, tt := range tests {
		err := validateNumericRange(tt.field, tt.value, tt.min, tt.max)
		if (err != nil) == tt.want {
			t.Errorf("%s: validateNumericRange(%d, %d, %d) error = %v", tt.field, tt.value, tt.min, tt.max, err)
		}
	}
}

func TestValidateStringLength(t *testing.T) {
	tests := []struct {
		field string
		value string
		max   int
		want  bool
	}{
		{"ChaName", "Player1", 16, true},
		{"ChaName", "ThisNameIsWayTooLongForRAN", 16, false},
		{"empty", "", 10, true},
	}

	for _, tt := range tests {
		err := validateStringLength(tt.field, tt.value, tt.max)
		if (err != nil) == tt.want {
			t.Errorf("%s: validateStringLength(%q, %d) error = %v", tt.field, tt.value, tt.max, err)
		}
	}
}

func TestJWTTokenGeneration(t *testing.T) {
	cfg := &config.Config{
		JWTSecret: "test-secret-key-for-unit-test",
	}

	svc := NewAuthService(cfg)

	user := models.User{
		ID:       "test-id-123",
		Username: "testuser",
		Email:    "test@test.com",
		Role: &models.Role{
			Name: "admin",
		},
	}

	token, err := svc.generateAccessToken(user, "", "test-jti-123")
	if err != nil {
		t.Fatalf("generateAccessToken() error = %v", err)
	}
	if token == "" {
		t.Fatal("generateAccessToken() returned empty token")
	}

	claims, err := svc.ValidateToken(token)
	if err != nil {
		t.Fatalf("ValidateToken() error = %v", err)
	}
	if claims["username"] != "testuser" {
		t.Errorf("ValidateToken() username = %v, want 'testuser'", claims["username"])
	}
	if claims["role"] != "admin" {
		t.Errorf("ValidateToken() role = %v, want 'admin'", claims["role"])
	}
}

func TestCalculateInvoiceDueDate(t *testing.T) {
	now := time.Now()
	dueDate := calculateDueDate(now, 7)
	expected := now.AddDate(0, 0, 7)
	if dueDate.Day() != expected.Day() {
		t.Errorf("calculateDueDate() = %v, want %v", dueDate, expected)
	}
}

func TestSanitizeSQLInput(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"normal input", "normal input"},
		{"' OR '1'='1", " OR 1=1"},
		{"'; DROP TABLE users;--", " DROP TABLE users"},
		{"test input", "test input"},
	}

	for _, tt := range tests {
		got := sanitizeSQLInput(tt.input)
		if got != tt.want {
			t.Errorf("sanitizeSQLInput(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

// Helper functions
func isDuplicateErrorString(msg string) bool {
	return containsAny(msg, "unique", "duplicate")
}

func containsAny(s string, substrs ...string) bool {
	for _, sub := range substrs {
		if stringContains(s, sub) {
			return true
		}
	}
	return false
}

func stringContains(s, substr string) bool {
	return len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func validateNumericRange(field string, value, min, max int) error {
	if value < min || value > max {
		return fmt.Errorf("%s must be between %d and %d", field, min, max)
	}
	return nil
}

func validateStringLength(field string, value string, maxLen int) error {
	if len(value) > maxLen {
		return fmt.Errorf("%s exceeds maximum length of %d", field, maxLen)
	}
	return nil
}

func sanitizeSQLInput(input string) string {
	result := make([]byte, 0, len(input))
	for i := 0; i < len(input); i++ {
		c := input[i]
		if c == '\'' || c == '"' || c == '\\' || c == ';' || c == '-' || c == '%' {
			continue
		}
		result = append(result, c)
	}
	return string(result)
}

func calculateDueDate(from time.Time, days int) time.Time {
	return from.AddDate(0, 0, days)
}
