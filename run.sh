#!/bin/bash
# Black En Admin Panel - Start Script

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "================================="
echo "  Black En Admin Panel - Start"
echo "================================="
echo ""

# 1. Start PostgreSQL
echo "[1/3] Starting PostgreSQL..."
docker start postgres 2>/dev/null || docker run -d --name postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=blacken_admin \
  -p 5432:5432 \
  postgres:16-alpine
echo "      PostgreSQL: OK"
echo ""

# 2. Build and start backend
echo "[2/3] Starting Backend (Go + Gin)..."
cd "$BACKEND"
go build -o /tmp/blacken-server . && setsid /tmp/blacken-server &>/tmp/blacken-server.log &
echo "      Backend: http://localhost:8080/api"
echo ""

# 3. Start frontend
echo "[3/3] Starting Frontend (React + Vite)..."
cd "$FRONTEND"
setsid npx vite --host &>/tmp/frontend.log &
sleep 3
echo "      Frontend: http://localhost:5173"
echo ""

echo "================================="
echo "  All systems running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8080/api"
echo "  Login:    admin / 123456"
echo "================================="
