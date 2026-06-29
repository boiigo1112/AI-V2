CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES users(id),
    plan_id UUID REFERENCES plans(id),
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'bank_transfer',
    payment_proof TEXT,
    paid_at TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    months INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(255),
    account_name VARCHAR(255),
    account_number VARCHAR(100),
    promptpay_id VARCHAR(100),
    qr_data TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO payment_configs (method, label, account_name, account_number, promptpay_id) VALUES
('promptpay', 'พร้อมเพย์ (PromptPay)', '', '', ''),
('bank_scb', 'ธ.ไทยพาณิชย์ (SCB)', '', '', ''),
('bank_kbank', 'ธ.กสิกรไทย (KBank)', '', '', ''),
('bank_bay', 'ธ.กรุงศรีอยุธยา (BAY)', '', '', '')
ON CONFLICT (method) DO NOTHING;
