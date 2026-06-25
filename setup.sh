#!/bin/bash
# ============================================
#  Black En Admin Panel - Auto Setup
#  One command to install everything needed
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

log()   { echo -e "${GREEN}[✓]${NC} $1"; }
warn()  { echo -e "${YELLOW}[!]${NC} $1"; }
error() { echo -e "${RED}[✗]${NC} $1"; }
info()  { echo -e "${CYAN}[i]${NC} $1"; }

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  Black En Admin Panel - Auto Setup${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# ----- OS Detection -----
OS="$(uname -s)"
ARCH="$(uname -m)"
info "Detected: $OS $ARCH"

# ----- Check / Install Docker -----
check_docker() {
  if command -v docker &>/dev/null; then
    log "Docker: $(docker --version)"
    return 0
  fi
  warn "Docker not found. Attempting install..."
  if [[ "$OS" == "Linux" ]]; then
    if command -v apt-get &>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y -qq docker.io
      sudo systemctl enable --now docker 2>/dev/null || true
    elif command -v yum &>/dev/null; then
      sudo yum install -y docker
      sudo systemctl enable --now docker 2>/dev/null || true
    else
      error "Cannot install Docker automatically. Install manually: https://docs.docker.com/engine/install/"
      exit 1
    fi
    # Add user to docker group
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    warn "You may need to log out and back in for Docker group changes to take effect."
  elif [[ "$OS" == "Darwin" ]]; then
    error "Docker Desktop required. Install from: https://docs.docker.com/desktop/"
    exit 1
  fi
  log "Docker installed"
}

if command -v docker &>/dev/null; then
  log "Docker: $(docker --version 2>&1)"
else
  check_docker
fi

# ----- Check / Install Go -----
check_go() {
  local required="1.21"
  if command -v go &>/dev/null; then
    local ver=$(go version | grep -oP 'go\K[0-9]+\.[0-9]+')
    if [[ $(echo -e "$ver\n$required" | sort -V | head -1) == "$required" ]] || [[ "$ver" == "$required" ]]; then
      log "Go: $(go version)"
      return 0
    fi
    warn "Go $ver found, but $required+ required."
  fi
  warn "Installing Go $required..."
  local tarball="go1.21.13.${OS,,}-${ARCH}.tar.gz"
  if [[ "$ARCH" == "x86_64" ]]; then tarball="go1.21.13.${OS,,}-amd64.tar.gz"; fi
  curl -sLO "https://go.dev/dl/$tarball"
  sudo rm -rf /usr/local/go
  sudo tar -C /usr/local -xzf "$tarball"
  rm "$tarball"
  export PATH=$PATH:/usr/local/go/bin
  if ! grep -q '/usr/local/go/bin' ~/.bashrc 2>/dev/null; then
    echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
  fi
  log "Go installed: $(/usr/local/go/bin/go version)"
}

if command -v go &>/dev/null; then
  log "Go: $(go version)"
else
  check_go
fi

# ----- Check / Install Node.js -----
check_node() {
  if command -v node &>/dev/null; then
    local ver=$(node -v | sed 's/v//')
    log "Node.js: v$ver"
    return 0
  fi
  warn "Node.js not found. Attempting install..."
  if [[ "$OS" == "Linux" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs 2>/dev/null || sudo yum install -y nodejs 2>/dev/null
  elif [[ "$OS" == "Darwin" ]]; then
    error "Install Node.js from: https://nodejs.org/"
    exit 1
  fi
  log "Node.js: $(node -v)"
}

if command -v node &>/dev/null; then
  log "Node.js: $(node -v)"
  log "npm: $(npm -v)"
else
  check_node
fi

echo ""
info "All prerequisites satisfied!"
echo ""

# ----- Install Backend Dependencies -----
info "Installing backend dependencies..."
cd "$BACKEND"
go mod download 2>&1 | tail -1
log "Backend dependencies ready"

# ----- Install Frontend Dependencies -----
info "Installing frontend dependencies..."
cd "$FRONTEND"
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
  log ".env created from .env.example"
fi
npm install 2>&1 | tail -1
log "Frontend dependencies ready"

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}  Run './run.sh' to start the system${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
