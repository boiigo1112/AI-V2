package gamedatabase

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/denisenkom/go-mssqldb"
)

const connectionTimeout = 10 * time.Second

type GameDB struct {
	Config *GameDBConnection
	DB     *sql.DB
}

var connections = make(map[string]*GameDB)

func Connect(cfg GameDBConnection) (*GameDB, error) {
	dsn := fmt.Sprintf(
		"server=%s;port=%d;database=%s;user id=%s;password=%s;encrypt=disable;TrustServerCertificate=true;connection timeout=%d",
		cfg.Host, cfg.Port, cfg.Database, cfg.Username, cfg.Password, int(connectionTimeout.Seconds()),
	)

	db, err := sql.Open("mssql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open connection: %w", err)
	}

	db.SetConnMaxLifetime(5 * time.Minute)
	db.SetMaxOpenConns(5)

	pingCtx, cancel := context.WithTimeout(context.Background(), connectionTimeout)
	defer cancel()

	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping: %w", err)
	}

	gd := &GameDB{Config: &cfg, DB: db}
	connections[cfg.ID] = gd
	log.Printf("[gamedb] connected to %s:%d (db=%s)", cfg.Host, cfg.Port, cfg.Database)
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
