package services

import (
	"database/sql"
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/blacken/admin-panel/database"
)

type CouponService struct{}

func NewCouponService() *CouponService {
	return &CouponService{}
}

type Coupon struct {
	ID          int        `json:"id"`
	Code        string     `json:"code"`
	Description string     `json:"description"`
	RewardType  string     `json:"reward_type"`
	RewardValue int        `json:"reward_value"`
	RewardQty   int        `json:"reward_qty"`
	MaxUses     int        `json:"max_uses"`
	UsedCount   int        `json:"used_count"`
	ExpiresAt   *time.Time `json:"expires_at"`
	IsActive    bool       `json:"is_active"`
	CreatedBy   string     `json:"created_by,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CouponUsage struct {
	ID       int       `json:"id"`
	CouponID int       `json:"coupon_id"`
	UserNum  int       `json:"user_num"`
	UserID   string    `json:"user_id"`
	UsedAt   time.Time `json:"used_at"`
	IPAddr   string    `json:"ip_address"`
}

func (s *CouponService) List(search string, limit, offset int) ([]Coupon, int, error) {
	var total int
	var where string
	var countArgs, dataArgs []interface{}

	if search != "" {
		where = "WHERE (code ILIKE $1 OR description ILIKE $1)"
		like := "%" + search + "%"
		countArgs = append(countArgs, like)
		dataArgs = append(dataArgs, like)
	}

	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM coupons %s", where)
	if err := database.DB.QueryRow(countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	dataArgs = append(dataArgs, limit, offset)
	argOffset := len(dataArgs) - 1
	dataQuery := fmt.Sprintf("SELECT id, code, description, reward_type, reward_value, reward_qty, max_uses, used_count, expires_at, is_active, created_by, created_at, updated_at FROM coupons %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d", where, argOffset, argOffset+1)
	rows, err := database.DB.Query(dataQuery, dataArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []Coupon
	for rows.Next() {
		var c Coupon
		var cb sql.NullString
		if err := rows.Scan(&c.ID, &c.Code, &c.Description, &c.RewardType, &c.RewardValue, &c.RewardQty, &c.MaxUses, &c.UsedCount, &c.ExpiresAt, &c.IsActive, &cb, &c.CreatedAt, &c.UpdatedAt); err != nil {
			continue
		}
		c.CreatedBy = cb.String
		results = append(results, c)
	}
	return results, total, nil
}

func (s *CouponService) Get(id int) (*Coupon, error) {
	var c Coupon
	var cb sql.NullString
	err := database.DB.QueryRow(`SELECT id, code, description, reward_type, reward_value, reward_qty, max_uses, used_count, expires_at, is_active, created_by, created_at, updated_at FROM coupons WHERE id = $1`, id).
		Scan(&c.ID, &c.Code, &c.Description, &c.RewardType, &c.RewardValue, &c.RewardQty, &c.MaxUses, &c.UsedCount, &c.ExpiresAt, &c.IsActive, &cb, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.CreatedBy = cb.String
	return &c, nil
}

func (s *CouponService) Create(code, description, rewardType string, rewardValue, rewardQty, maxUses int, expiresAt *time.Time, createdBy string) (*Coupon, error) {
	if code == "" {
		for i := 0; i < 10; i++ {
			code = generateCouponCode()
			var exists int
			database.DB.QueryRow("SELECT COUNT(*) FROM coupons WHERE code = $1", code).Scan(&exists)
			if exists == 0 {
				break
			}
			code = ""
		}
		if code == "" {
			return nil, fmt.Errorf("ไม่สามารถสร้างโค้ดที่ไม่ซ้ำได้ กรุณาลองอีกครั้ง")
		}
	} else {
		code = strings.ToUpper(strings.TrimSpace(code))
	}
	if rewardQty <= 0 {
		rewardQty = 1
	}
	rewardType = strings.ToLower(strings.TrimSpace(rewardType))
	if rewardType != "item" && rewardType != "point" && rewardType != "vip" {
		rewardType = "item"
	}

	var c Coupon
	var cb sql.NullString
	var createdByVal interface{} = nil
	if createdBy != "" {
		createdByVal = createdBy
	}
	err := database.DB.QueryRow(`INSERT INTO coupons (code, description, reward_type, reward_value, reward_qty, max_uses, created_by, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, code, description, reward_type, reward_value, reward_qty, max_uses, used_count, expires_at, is_active, created_by, created_at, updated_at`,
		code, description, rewardType, rewardValue, rewardQty, maxUses, createdByVal, expiresAt).
		Scan(&c.ID, &c.Code, &c.Description, &c.RewardType, &c.RewardValue, &c.RewardQty, &c.MaxUses, &c.UsedCount, &c.ExpiresAt, &c.IsActive, &cb, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	c.CreatedBy = cb.String
	return &c, nil
}

func (s *CouponService) Update(id int, fields map[string]interface{}) error {
	allowed := map[string]bool{"description": true, "reward_type": true, "reward_value": true, "reward_qty": true, "max_uses": true, "expires_at": true, "is_active": true}
	var setClauses []string
	var args []interface{}
	argIdx := 1

	for key, val := range fields {
		if !allowed[key] {
			continue
		}
		if key == "reward_type" {
			rt, ok := val.(string)
			if !ok || (rt != "item" && rt != "point" && rt != "vip") {
				continue
			}
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}
	if len(setClauses) == 0 {
		return fmt.Errorf("no valid fields to update")
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	args = append(args, id)
	query := fmt.Sprintf("UPDATE coupons SET %s WHERE id = $%d", strings.Join(setClauses, ", "), argIdx)
	_, err := database.DB.Exec(query, args...)
	return err
}

func (s *CouponService) Delete(id int) error {
	_, err := database.DB.Exec("DELETE FROM coupons WHERE id = $1", id)
	return err
}

func (s *CouponService) GetUsage(couponID int, limit, offset int) ([]CouponUsage, int, error) {
	var total int
	database.DB.QueryRow("SELECT COUNT(*) FROM coupon_usage WHERE coupon_id = $1", couponID).Scan(&total)

	rows, err := database.DB.Query("SELECT id, coupon_id, user_num, user_id, used_at, ip_address FROM coupon_usage WHERE coupon_id = $1 ORDER BY used_at DESC LIMIT $2 OFFSET $3", couponID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []CouponUsage
	for rows.Next() {
		var u CouponUsage
		if err := rows.Scan(&u.ID, &u.CouponID, &u.UserNum, &u.UserID, &u.UsedAt, &u.IPAddr); err != nil {
			continue
		}
		results = append(results, u)
	}
	return results, total, nil
}

func (s *CouponService) Redeem(code, userID string, userNum int, ipAddr string) error {
	code = strings.ToUpper(strings.TrimSpace(code))

	var c Coupon
	err := database.DB.QueryRow(`SELECT id, code, reward_type, reward_value, reward_qty, max_uses, used_count, expires_at, is_active FROM coupons WHERE code = $1`, code).
		Scan(&c.ID, &c.Code, &c.RewardType, &c.RewardValue, &c.RewardQty, &c.MaxUses, &c.UsedCount, &c.ExpiresAt, &c.IsActive)
	if err != nil {
		return fmt.Errorf("ไม่พบโค้ดนี้")
	}
	if !c.IsActive {
		return fmt.Errorf("โค้ดนี้ถูกปิดใช้งานแล้ว")
	}
	if c.ExpiresAt != nil && c.ExpiresAt.Before(time.Now()) {
		return fmt.Errorf("โค้ดหมดอายุแล้ว")
	}
	if c.MaxUses > 0 && c.UsedCount >= c.MaxUses {
		return fmt.Errorf("โค้ดนี้ใช้ครบจำนวนแล้ว")
	}

	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("UPDATE coupons SET used_count = used_count + 1 WHERE id = $1", c.ID)
	if err != nil {
		return err
	}

	_, err = tx.Exec("INSERT INTO coupon_usage (coupon_id, user_num, user_id, ip_address) VALUES ($1, $2, $3, $4)", c.ID, userNum, userID, ipAddr)
	if err != nil {
		return err
	}

	return tx.Commit()
}

func generateCouponCode() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	b := make([]byte, 12)
	for i := range b {
		b[i] = charset[rng.Intn(len(charset))]
	}
	return string(b)
}
