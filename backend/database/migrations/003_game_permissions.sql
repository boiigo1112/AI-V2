-- Game data permissions
INSERT INTO permissions (id, name, description, resource, action) VALUES
    ('00000000-0000-0000-0000-000000000501', 'game.read', 'View game data', 'game', 'read'),
    ('00000000-0000-0000-0000-000000000502', 'game.players', 'Manage game players', 'game', 'players'),
    ('00000000-0000-0000-0000-000000000503', 'game.characters', 'Manage game characters', 'game', 'characters'),
    ('00000000-0000-0000-0000-000000000504', 'game.logs', 'View game logs', 'game', 'logs')
ON CONFLICT (name) DO NOTHING;

-- Assign game permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE name IN ('game.read', 'game.players', 'game.characters', 'game.logs')
ON CONFLICT DO NOTHING;

-- Assign game read permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE name IN ('game.read', 'game.players', 'game.characters', 'game.logs')
ON CONFLICT DO NOTHING;
