CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    reward_type VARCHAR(20) NOT NULL DEFAULT 'item',
    reward_value INTEGER NOT NULL DEFAULT 0,
    reward_qty INTEGER NOT NULL DEFAULT 1,
    max_uses INTEGER NOT NULL DEFAULT 0,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by VARCHAR(36) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_num INTEGER NOT NULL,
    user_id VARCHAR(50) DEFAULT '',
    used_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45) DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
