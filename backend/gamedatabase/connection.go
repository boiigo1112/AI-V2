package gamedatabase

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/denisenkom/go-mssqldb"
)

type GameDB struct {
	Config *GameDBConnection
	DB     *sql.DB
}

var connections = make(map[string]*GameDB)

func Connect(cfg GameDBConnection) (*GameDB, error) {
	dsn := fmt.Sprintf(
		"server=%s;port=%d;database=%s;user id=%s;password=%s;encrypt=disable;TrustServerCertificate=true",
		cfg.Host, cfg.Port, cfg.Database, cfg.Username, cfg.Password,
	)

	db, err := sql.Open("mssql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping: %w", err)
	}

	gd := &GameDB{Config: &cfg, DB: db}
	connections[cfg.ID] = gd
	return gd, nil
}

func GetConnection(id string) *GameDB {
	return connections[id]
}

func CloseConnection(id string) {
	if gd, ok := connections[id]; ok && gd.DB != nil {
		gd.DB.Close()
		delete(connections, id)
	}
}

func CloseAll() {
	for id, gd := range connections {
		if gd.DB != nil {
			gd.DB.Close()
		}
		delete(connections, id)
	}
	log.Println("all game database connections closed")
}
