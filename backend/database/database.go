package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"runtime"
	"sort"

	_ "github.com/lib/pq"

	"github.com/blacken/admin-panel/config"
)

var DB *sql.DB

func Connect(cfg *config.Config) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	var err error
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	if err = DB.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}

	log.Println("database connected")
}

func RunMigrations() {
	_, filename, _, _ := runtime.Caller(0)
	migrationsDir := filepath.Join(filepath.Dir(filename), "migrations")

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("failed to read migrations directory: %v", err)
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].Name() < files[j].Name()
	})

	for _, f := range files {
		if filepath.Ext(f.Name()) != ".sql" {
			continue
		}
		path := filepath.Join(migrationsDir, f.Name())
		sqlBytes, err := os.ReadFile(path)
		if err != nil {
			log.Fatalf("failed to read migration %s: %v", f.Name(), err)
		}

		if _, err := DB.Exec(string(sqlBytes)); err != nil {
			log.Fatalf("failed to run migration %s: %v", f.Name(), err)
		}
		log.Printf("migration applied: %s", f.Name())
	}
}

func Close() {
	if DB != nil {
		DB.Close()
	}
}
