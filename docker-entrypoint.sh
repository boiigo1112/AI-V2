#!/bin/bash
set -e

echo "=== Black En Admin Panel Entrypoint ==="

# ------------------------------------------------------------------
# If POSTGRES variables are set, wait for it and optionally init
# (used when running standalone; in docker-compose, postgres is a
# separate service with its own healthcheck)
# ------------------------------------------------------------------
if [ -n "${DB_HOST:-}" ] && [ "${STANDALONE:-}" = "true" ]; then
    echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."
    until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER:-admin}" -d "${DB_NAME:-blacken_admin}" 2>/dev/null; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    echo "PostgreSQL is ready!"
fi

# ------------------------------------------------------------------
# Start Caddy reverse proxy in the background
# ------------------------------------------------------------------
echo "Starting Caddy..."
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 &
CADDY_PID=$!
echo "Caddy started (PID: ${CADDY_PID})"

# ------------------------------------------------------------------
# Start Go backend
# ------------------------------------------------------------------
echo "Starting Black En backend server..."
/app/server &
BACKEND_PID=$!
echo "Backend started (PID: ${BACKEND_PID})"

# ------------------------------------------------------------------
# Trap signals and forward them
# ------------------------------------------------------------------
cleanup() {
    echo "Shutting down services..."
    kill -TERM "${BACKEND_PID}" 2>/dev/null || true
    kill -TERM "${CADDY_PID}" 2>/dev/null || true
    wait "${BACKEND_PID}" 2>/dev/null || true
    wait "${CADDY_PID}" 2>/dev/null || true
    echo "All services stopped."
    exit 0
}

trap cleanup SIGINT SIGTERM

# ------------------------------------------------------------------
# Wait for any process to exit
# ------------------------------------------------------------------
wait -n
