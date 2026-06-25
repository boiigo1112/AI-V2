CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255),
    full_name VARCHAR(255),
    avatar_url TEXT,
    provider VARCHAR(50) DEFAULT 'local',
    provider_id VARCHAR(255),
    role_id UUID REFERENCES roles(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (id, name, description) VALUES
    ('00000000-0000-0000-0000-000000000001', 'superadmin', 'Full access to all resources'),
    ('00000000-0000-0000-0000-000000000002', 'admin', 'Administrative access'),
    ('00000000-0000-0000-0000-000000000003', 'user', 'Basic user access')
ON CONFLICT (name) DO NOTHING;

-- Seed default permissions
INSERT INTO permissions (id, name, description, resource, action) VALUES
    ('00000000-0000-0000-0000-000000000101', 'users.read', 'View users', 'users', 'read'),
    ('00000000-0000-0000-0000-000000000102', 'users.create', 'Create users', 'users', 'create'),
    ('00000000-0000-0000-0000-000000000103', 'users.update', 'Update users', 'users', 'update'),
    ('00000000-0000-0000-0000-000000000104', 'users.delete', 'Delete users', 'users', 'delete'),
    ('00000000-0000-0000-0000-000000000201', 'roles.read', 'View roles', 'roles', 'read'),
    ('00000000-0000-0000-0000-000000000202', 'roles.create', 'Create roles', 'roles', 'create'),
    ('00000000-0000-0000-0000-000000000203', 'roles.update', 'Update roles', 'roles', 'update'),
    ('00000000-0000-0000-0000-000000000204', 'roles.delete', 'Delete roles', 'roles', 'delete'),
    ('00000000-0000-0000-0000-000000000301', 'dashboard.read', 'View dashboard', 'dashboard', 'read'),
    ('00000000-0000-0000-0000-000000000401', 'settings.read', 'View settings', 'settings', 'read'),
    ('00000000-0000-0000-0000-000000000402', 'settings.update', 'Update settings', 'settings', 'update')
ON CONFLICT (name) DO NOTHING;

-- Assign all permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT DO NOTHING;

-- Assign read + basic permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN ('users.read', 'users.create', 'users.update', 'roles.read', 'dashboard.read', 'settings.read', 'settings.update')
ON CONFLICT DO NOTHING;

-- Assign read-only to user
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE name IN ('dashboard.read', 'settings.read')
ON CONFLICT DO NOTHING;

-- Seed default superadmin user (password: admin123)
INSERT INTO users (id, username, email, password, full_name, role_id) VALUES
    ('00000000-0000-0000-0000-000000000001', 'superadmin', 'superadmin@blacken.dev',
     '$2a$10$3QluK7xYZn7stvuGhjQx4up1LjrhIRSyIK9loC5XhRcSfVj9CkXdm',
     'Super Admin', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (username) DO NOTHING;
