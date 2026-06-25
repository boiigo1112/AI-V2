#!/bin/bash
# ============================================
#  Black En Admin Panel - Start
#  Run this after running setup.sh
# ============================================

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
error(){ echo -e "${RED}[✗]${NC} $1"; }

cleanup() {
  echo ""
  warn "Shutting down..."
  kill $(lsof -t -i:8080 2>/dev/null) 2>/dev/null || true
  kill $(lsof -t -i:5173 2>/dev/null) 2>/dev/null || true
  log "Stopped"
}
trap cleanup EXIT

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Black En Admin Panel${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# 1. PostgreSQL
echo "[1/3] PostgreSQL..."
docker start postgres 2>/dev/null || docker run -d --name postgres \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=blacken_admin \
  -p 5432:5432 \
  postgres:16-alpine
log "PostgreSQL ready"
echo ""

# 2. Backend
echo "[2/3] Backend (Go)..."
cd "$BACKEND"
if [ ! -d "vendor" ]; then
  go mod download 2>/dev/null
fi
go build -o /tmp/blacken-server .
setsid /tmp/blacken-server &>/tmp/blacken-server.log &
sleep 3
# Verify
curl -sf http://localhost:8080/api/health >/dev/null && log "Backend: http://localhost:8080/api" || error "Backend failed to start"
echo ""

# 3. Frontend
echo "[3/3] Frontend (React)..."
cd "$FRONTEND"
if [ ! -d "node_modules" ]; then
  npm install 2>/dev/null
fi
setsid npx vite --host &>/tmp/frontend.log &
sleep 4
curl -sf http://localhost:5173/ >/dev/null && log "Frontend: http://localhost:5173" || error "Frontend failed to start"
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  All systems running!${NC}"
echo -e "${GREEN}  Frontend: http://localhost:5173${NC}"
echo -e "${GREEN}  Backend:  http://localhost:8080/api${NC}"
echo -e "${GREEN}  Login:    admin / 123456${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Press Ctrl+C to stop all services."
wait
