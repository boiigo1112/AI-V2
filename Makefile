.PHONY: all build backend frontend test test-backend test-frontend clean run docker-up docker-down docker-logs lint help

all: build

# =====================================================================
# BUILD
# =====================================================================

build: backend frontend

backend:
	@echo "Building Go backend..."
	cd backend && go build -o ../bin/server .

frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && npm ci
	@echo "Building React frontend..."
	cd frontend && npm run build

# =====================================================================
# TEST
# =====================================================================

test: test-backend test-frontend

test-backend:
	@echo "Running Go backend tests..."
	cd backend && go test ./... -v

test-frontend:
	@echo "Running frontend tests..."
	cd frontend && npm run test || true

# =====================================================================
# LINT
# =====================================================================

lint:
	@echo "Linting Go backend..."
	cd backend && go vet ./...
	@echo "Linting React frontend..."
	cd frontend && npm run lint || true

# =====================================================================
# CLEAN
# =====================================================================

clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/ frontend/dist/

# =====================================================================
# RUN (Local Development)
# =====================================================================

run: build
	@echo "Starting server..."
	./bin/server

# =====================================================================
# DOCKER
# =====================================================================

docker-up:
	@echo "Building and starting Docker containers..."
	docker compose up -d --build

docker-down:
	@echo "Stopping Docker containers..."
	docker compose down

docker-logs:
	@echo "Tailing Docker logs..."
	docker compose logs -f

docker-restart: docker-down docker-up

docker-ps:
	@echo "Container status:"
	docker compose ps

docker-clean:
	@echo "Stopping and removing containers, volumes, and images..."
	docker compose down -v --rmi all

# =====================================================================
# HELP
# =====================================================================

help:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════╗"
	@echo "║   Black En Admin Panel — Makefile Commands             ║"
	@echo "╚══════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "BUILD:"
	@echo "  make              - Build backend + frontend"
	@echo "  make build        - Same as above"
	@echo "  make backend      - Build Go backend only"
	@echo "  make frontend     - Build React frontend only"
	@echo ""
	@echo "TEST:"
	@echo "  make test         - Run all tests"
	@echo "  make test-backend - Run Go backend tests"
	@echo "  make test-frontend- Run frontend tests"
	@echo ""
	@echo "LINT:"
	@echo "  make lint         - Lint backend (go vet) + frontend (oxlint)"
	@echo ""
	@echo "CLEAN:"
	@echo "  make clean        - Remove build artifacts (bin/ + frontend/dist/)"
	@echo ""
	@echo "RUN:"
	@echo "  make run          - Build and run server locally"
	@echo ""
	@echo "DOCKER:"
	@echo "  make docker-up    - Build and start all services with Docker Compose"
	@echo "  make docker-down  - Stop all Docker services"
	@echo "  make docker-logs  - Tail logs from all containers"
	@echo "  make docker-ps    - Show container status"
	@echo "  make docker-clean - Full cleanup (containers + volumes + images)"
	@echo ""
