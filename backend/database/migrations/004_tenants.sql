CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    owner_id UUID REFERENCES users(id),
    game_db_host VARCHAR(255),
    game_db_port VARCHAR(10) DEFAULT '1433',
    game_db_user VARCHAR(255),
    game_db_password VARCHAR(255),
    game_db_names TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expire_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_players INT DEFAULT 100,
    features JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    plan_id UUID REFERENCES plans(id),
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO plans (name, code, price_monthly, max_players, features) VALUES
    ('Trial', 'trial', 0, 50, '["basic_support"]'),
    ('Starter', 'starter', 29.99, 100, '["basic_support", "email_support"]'),
    ('Pro', 'pro', 99.99, 500, '["priority_support", "api_access", "custom_branding"]'),
    ('Enterprise', 'enterprise', 299.99, 2000, '["priority_support", "api_access", "custom_branding", "dedicated_server", "sla"]')
ON CONFLICT (code) DO NOTHING;
