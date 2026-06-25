CREATE TABLE IF NOT EXISTS install_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    step INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    db_type VARCHAR(20) NOT NULL DEFAULT 'mssql',
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 1433,
    database_name VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password TEXT NOT NULL,
    is_connected BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS column_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES game_connections(id) ON DELETE CASCADE,
    db_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    standard_field VARCHAR(100) NOT NULL,
    actual_column VARCHAR(100) NOT NULL,
    data_type VARCHAR(50),
    is_required BOOLEAN DEFAULT false,
    UNIQUE(connection_id, db_name, table_name, standard_field)
);

CREATE TABLE IF NOT EXISTS game_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    db_name VARCHAR(100) NOT NULL,
    query_template TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Default queries for common operations
INSERT INTO game_queries (name, description, db_name, query_template) VALUES
    ('list_users', 'List all users', 'RanUser', 'SELECT * FROM RanUser..{table_name} ORDER BY {order_by} DESC'),
    ('get_user', 'Get user by UserNum', 'RanUser', 'SELECT * FROM RanUser..{table_name} WHERE {usernum_col} = @p1'),
    ('search_users', 'Search users by ID', 'RanUser', 'SELECT * FROM RanUser..{table_name} WHERE {userid_col} LIKE @p1'),
    ('block_user', 'Block/Ban user', 'RanUser', 'UPDATE RanUser..{table_name} SET {status_col} = @p1 WHERE {usernum_col} = @p2'),
    ('list_characters', 'List characters for user', 'RanGame1', 'SELECT * FROM RanGame1..{table_name} WHERE {usernum_col} = @p1'),
    ('get_character', 'Get character by ChaNum', 'RanGame1', 'SELECT * FROM RanGame1..{table_name} WHERE {chanum_col} = @p1'),
    ('update_character_level', 'Update character level', 'RanGame1', 'UPDATE RanGame1..{table_name} SET {level_col} = @p1 WHERE {chanum_col} = @p2'),
    ('update_character_money', 'Update character money', 'RanGame1', 'UPDATE RanGame1..{table_name} SET {money_col} = @p1 WHERE {chanum_col} = @p2'),
    ('send_item_mall', 'Send item from item mall', 'RanShop', 'INSERT INTO RanShop..{table_name} ({columns}) VALUES ({values})')
ON CONFLICT DO NOTHING;
