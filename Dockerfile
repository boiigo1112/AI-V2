# ============================================================
# Stage 1: Build Go backend
# ============================================================
FROM golang:1.22-alpine AS backend-build

RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Copy dependency files first for layer caching
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy the rest of the backend source
COPY backend/ .

# Build the server binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server .

# ============================================================
# Stage 2: Build React frontend
# ============================================================
FROM node:20-alpine AS frontend-build

WORKDIR /build

# Copy dependency files first
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy the rest of the frontend source
COPY frontend/ .

# Build the static assets
RUN npm run build

# ============================================================
# Stage 3: Runtime image
# ============================================================
FROM alpine:3.18 AS runtime

# Install runtime dependencies: Caddy, PostgreSQL client, bash, ca-certificates
RUN apk add --no-cache \
    caddy \
    ca-certificates \
    bash \
    tzdata \
    curl

# Create necessary directories
RUN mkdir -p /app/frontend/dist /app/data /etc/caddy /var/lib/postgresql/data

# Copy built artifacts from earlier stages
COPY --from=backend-build /app/server /app/server
COPY --from=frontend-build /build/dist /app/frontend/dist

# Copy Caddyfile configuration
COPY Caddyfile /etc/caddy/Caddyfile

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose ports: 80 (HTTP), 443 (HTTPS), 8080 (API), 8888 (Alt HTTP), 8443 (Alt HTTPS)
EXPOSE 80 443 8080 8888 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Set working directory
WORKDIR /app

# Entrypoint
ENTRYPOINT ["docker-entrypoint.sh"]
