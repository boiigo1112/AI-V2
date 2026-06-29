package services

import (
	"database/sql"
	"fmt"
	"strings"
)

// Validator provides validation and sanitization for game data operations.
type Validator struct {
	gameSvc *GameService
}

// NewValidator creates a new Validator backed by the given GameService for DB lookups.
func NewValidator(gameSvc *GameService) *Validator {
	return &Validator{gameSvc: gameSvc}
}

// ValidationError represents a validation failure.
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("validation failed for %s: %s", e.Field, e.Message)
}

// ValidateItemID checks that an item (ProductNum) exists in the shop table.
func (v *Validator) ValidateItemID(db *sql.DB, itemID string) error {
	if db == nil {
		return &ValidationError{Field: "item_id", Message: "database not connected"}
	}
	safeID := sanitizeInt(itemID)
	if safeID == "0" {
		return &ValidationError{Field: "item_id", Message: "invalid item ID"}
	}

	var exists int
	err := db.QueryRow("SELECT COUNT(*) FROM [RanShop]..[ShopItemMap] WHERE [ProductNum] = " + safeID).Scan(&exists)
	if err != nil {
		return &ValidationError{Field: "item_id", Message: fmt.Sprintf("database error: %v", err)}
	}
	if exists == 0 {
		return &ValidationError{Field: "item_id", Message: "item not found"}
	}
	return nil
}

// ValidateCharacterID checks that a character exists in ChaInfo.
func (v *Validator) ValidateCharacterID(db *sql.DB, chaNum string) error {
	if db == nil {
		return &ValidationError{Field: "character_id", Message: "database not connected"}
	}
	safeNum := sanitizeInt(chaNum)
	if safeNum == "0" {
		return &ValidationError{Field: "character_id", Message: "invalid character ID"}
	}

	var exists int
	err := db.QueryRow("SELECT COUNT(*) FROM [RanGame1]..[ChaInfo] WHERE [ChaNum] = " + safeNum).Scan(&exists)
	if err != nil {
		return &ValidationError{Field: "character_id", Message: fmt.Sprintf("database error: %v", err)}
	}
	if exists == 0 {
		return &ValidationError{Field: "character_id", Message: "character not found"}
	}
	return nil
}

// ValidatePlayerID checks that a player exists in UserInfo.
func (v *Validator) ValidatePlayerID(db *sql.DB, userNum string) error {
	if db == nil {
		return &ValidationError{Field: "player_id", Message: "database not connected"}
	}
	safeNum := sanitizeInt(userNum)
	if safeNum == "0" {
		return &ValidationError{Field: "player_id", Message: "invalid player ID"}
	}

	var exists int
	err := db.QueryRow("SELECT COUNT(*) FROM [RanUser]..[UserInfo] WHERE [UserNum] = " + safeNum).Scan(&exists)
	if err != nil {
		return &ValidationError{Field: "player_id", Message: fmt.Sprintf("database error: %v", err)}
	}
	if exists == 0 {
		return &ValidationError{Field: "player_id", Message: "player not found"}
	}
	return nil
}

// ValidateNumericRange checks that a numeric value is within the allowed range.
func (v *Validator) ValidateNumericRange(field string, value int, minVal, maxVal int) error {
	if value < minVal || value > maxVal {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("value %d is out of range [%d, %d]", value, minVal, maxVal),
		}
	}
	return nil
}

// ValidateStringLength checks that a string does not exceed the maximum length.
func (v *Validator) ValidateStringLength(field, value string, maxLen int) error {
	if len(value) > maxLen {
		return &ValidationError{
			Field:   field,
			Message: fmt.Sprintf("value length %d exceeds maximum %d", len(value), maxLen),
		}
	}
	return nil
}

// SanitizeSQLInjection removes dangerous characters for game DB context (MSSQL).
func (v *Validator) SanitizeSQLInjection(value string) string {
	// Remove SQL control characters
	value = strings.ReplaceAll(value, "'", "''")
	value = strings.ReplaceAll(value, ";", "")
	value = strings.ReplaceAll(value, "--", "")
	value = strings.ReplaceAll(value, "/*", "")
	value = strings.ReplaceAll(value, "*/", "")
	value = strings.ReplaceAll(value, "xp_", "")
	value = strings.ReplaceAll(value, "EXEC ", "")
	value = strings.ReplaceAll(value, "exec ", "")
	return value
}

// validateNumericField parses and validates an interface{} value as a numeric range.
func (v *Validator) validateNumericField(field string, val interface{}, minVal, maxVal int) error {
	var intVal int
	switch tv := val.(type) {
	case float64:
		intVal = int(tv)
	case int:
		intVal = tv
	default:
		return &ValidationError{Field: field, Message: "not a valid number"}
	}
	return v.ValidateNumericRange(field, intVal, minVal, maxVal)
}

// ValidateChaInfoFields validates common character info fields.
func (v *Validator) ValidateChaInfoFields(fields map[string]interface{}) error {
	validators := map[string]struct {
		min, max int
	}{
		"ChaLevel": {1, 999},
		"ChaReborn": {0, 999},
		"ChaMoney":  {0, 999999999},
		"ChaExp":    {0, 999999999},
		"ChaPower":  {0, 99999},
		"ChaDex":    {0, 99999},
		"ChaSpirit": {0, 99999},
		"ChaStrong": {0, 99999},
		"ChaIntel":  {0, 99999},
		"ChaHP":     {0, 9999999},
		"ChaMP":     {0, 9999999},
		"ChaPK":     {0, 99999},
	}

	for field, val := range fields {
		if limits, ok := validators[field]; ok {
			if err := v.validateNumericField(field, val, limits.min, limits.max); err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidateUserInfoFields validates common user info fields.
func (v *Validator) ValidateUserInfoFields(fields map[string]interface{}) error {
	validators := map[string]struct {
		min, max int
	}{
		"UserPoint": {0, 999999999},
		"UserVIP":   {0, 999},
		"VotePoint": {0, 999999999},
		"UserAge":   {0, 999},
	}

	for field, val := range fields {
		if limits, ok := validators[field]; ok {
			if err := v.validateNumericField(field, val, limits.min, limits.max); err != nil {
				return err
			}
		}
		// Validate string lengths
		switch field {
		case "UserFullName":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("UserFullName", str, 50); err != nil {
					return err
				}
			}
		case "UserEmail":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("UserEmail", str, 100); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// ValidateShopItemFields validates shop item fields before insert/update.
func (v *Validator) ValidateShopItemFields(fields map[string]interface{}) error {
	for field, val := range fields {
		switch field {
		case "ItemName":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("ItemName", str, 100); err != nil {
					return err
				}
			}
		case "ItemPrice", "ItemStock", "ItemMain", "ItemSub", "ItemSection", "ItemMoney", "ItemCurrency":
			if err := v.validateNumericField(field, val, 0, 999999999); err != nil {
				return err
			}
		case "Category":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("Category", str, 50); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// ValidateGuildFields validates guild update fields.
func (v *Validator) ValidateGuildFields(fields map[string]interface{}) error {
	for field, val := range fields {
		switch field {
		case "GuName":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("GuName", str, 25); err != nil {
					return err
				}
			}
		case "GuNotice":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("GuNotice", str, 200); err != nil {
					return err
				}
			}
		case "GuMoney", "GuIncomeMoney":
			if err := v.validateNumericField(field, val, 0, 999999999); err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidatePetFields validates pet update fields.
func (v *Validator) ValidatePetFields(fields map[string]interface{}) error {
	for field, val := range fields {
		switch field {
		case "PetName":
			if str, ok := val.(string); ok {
				if err := v.ValidateStringLength("PetName", str, 50); err != nil {
					return err
				}
			}
		case "PetSkinScale":
			if err := v.validateNumericField(field, val, 0, 1000); err != nil {
				return err
			}
		case "PetType", "PetFull":
			if err := v.validateNumericField(field, val, 0, 999); err != nil {
				return err
			}
		}
	}
	return nil
}

// ValidateGmcPointType checks that the point type is one of the allowed values.
func (v *Validator) ValidateGmcPointType(pointType string) error {
	allowed := map[string]bool{
		"UserPoint": true, "UserVIP": true, "VotePoint": true,
		"ExchangeItemPoints": true, "UserAge": true,
	}
	if !allowed[pointType] {
		return &ValidationError{Field: "point_type", Message: fmt.Sprintf("invalid point type: %s", pointType)}
	}
	return nil
}

// ValidateGmcTargetType checks that the target type is valid.
func (v *Validator) ValidateGmcTargetType(targetType string) error {
	allowed := map[string]bool{"id": true, "online": true, "all": true}
	if !allowed[targetType] {
		return &ValidationError{Field: "target_type", Message: fmt.Sprintf("invalid target type: %s", targetType)}
	}
	return nil
}
