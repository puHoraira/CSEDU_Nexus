#!/bin/bash

# Deployment script for Team Ravenclaw - nexus.farefin.com
# Server: ip-lab-student-02 (135.171.216.245)

set -e  # Exit on error

echo "=========================================="
echo "  CSEDU Nexus Deployment Script"
echo "  Team: Ravenclaw"
echo "  Subdomain: nexus.farefin.com"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    echo "Please install Docker first:"
    echo "  curl -fsSL https://get.docker.com -o get-docker.sh"
    echo "  sudo sh get-docker.sh"
    exit 1
fi
print_success "Docker is installed"

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed!"
    echo "Please install Docker Compose:"
    echo "  sudo apt install docker-compose-plugin -y"
    exit 1
fi
print_success "Docker Compose is installed"

# Check if .env files exist
if [ ! -f ".env" ]; then
    print_error "Root .env file not found!"
    exit 1
fi
print_success "Root .env file found"

if [ ! -f "backend/.env" ]; then
    print_error "Backend .env file not found!"
    exit 1
fi
print_success "Backend .env file found"

# Verify environment configuration
print_info "Checking environment configuration..."
if grep -q "nexus.farefin.com" .env && grep -q "nexus.farefin.com" backend/.env; then
    print_success "Environment files configured for nexus.farefin.com"
else
    print_error "Environment files not properly configured!"
    echo "Please ensure .env and backend/.env use nexus.farefin.com"
    exit 1
fi

# Stop existing containers if running
print_info "Stopping existing containers (if any)..."
docker compose down 2>/dev/null || true
print_success "Existing containers stopped"

# Build images
print_info "Building Docker images (this may take 5-10 minutes)..."
if docker compose build; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    exit 1
fi

# Start containers
print_info "Starting containers..."
if docker compose up -d; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi

# Wait for services to be ready
print_info "Waiting for services to be ready..."
sleep 10

# Check container status
print_info "Checking container status..."
docker compose ps

# Test backend health
print_info "Testing backend health endpoint..."
if curl -f http://localhost:5000/health &> /dev/null; then
    print_success "Backend is healthy"
else
    print_error "Backend health check failed"
    echo "Check logs with: docker compose logs backend"
fi

# Test frontend
print_info "Testing frontend..."
if curl -f http://localhost:80 &> /dev/null; then
    print_success "Frontend is accessible"
else
    print_error "Frontend is not accessible"
    echo "Check logs with: docker compose logs frontend"
fi

echo ""
echo "=========================================="
echo "  Deployment Complete!"
echo "=========================================="
echo ""
echo "Access your application:"
echo "  Frontend: http://nexus.farefin.com"
echo "  Backend:  http://nexus.farefin.com:5000"
echo "  Health:   http://nexus.farefin.com:5000/health"
echo ""
echo "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  Restart:          docker compose restart"
echo "  Stop:             docker compose down"
echo "  Check status:     docker compose ps"
echo ""
echo "Note: Ensure DNS is configured to point nexus.farefin.com to 135.171.216.245"
echo ""
