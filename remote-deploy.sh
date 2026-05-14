#!/bin/bash

# Remote Deployment Script for Team Ravenclaw
# This script deploys CSEDU Nexus to Server 2 (nexus.farefin.com)
# Run this from your LOCAL machine

set -e

# Server Configuration
SERVER_IP="135.171.216.245"
SERVER_USER="azureuser"
SERVER_PASSWORD="bqaIJ#1xUU+2QdChsNrA1zN^"
APP_DIR="nexus-app"
GITHUB_REPO="https://github.com/puHoraira/CSEDU_Nexus.git"
SUBDOMAIN="nexus.farefin.com"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_step() { echo -e "${BLUE}▶ $1${NC}"; }

echo "=========================================="
echo "  CSEDU Nexus Remote Deployment"
echo "  Team: Ravenclaw"
echo "  Server: $SERVER_IP"
echo "  Subdomain: $SUBDOMAIN"
echo "=========================================="
echo ""

# Check if sshpass is installed (for automated SSH)
if ! command -v sshpass &> /dev/null; then
    print_info "sshpass not found. You'll need to enter password manually for each SSH command."
    SSH_CMD="ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP"
    SCP_CMD="scp -o StrictHostKeyChecking=no"
else
    print_success "sshpass is available for automated deployment"
    SSH_CMD="sshpass -p '$SERVER_PASSWORD' ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP"
    SCP_CMD="sshpass -p '$SERVER_PASSWORD' scp -o StrictHostKeyChecking=no"
fi

# Function to execute remote command
remote_exec() {
    if command -v sshpass &> /dev/null; then
        sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
    else
        ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP "$1"
    fi
}

print_step "Step 1: Testing server connection..."
if remote_exec "echo 'Connection successful'" &> /dev/null; then
    print_success "Connected to server successfully"
else
    print_error "Failed to connect to server"
    echo "Please check:"
    echo "  - Server IP: $SERVER_IP"
    echo "  - Username: $SERVER_USER"
    echo "  - Password is correct"
    exit 1
fi

print_step "Step 2: Checking Docker installation..."
if remote_exec "command -v docker" &> /dev/null; then
    print_success "Docker is installed"
else
    print_info "Docker not found. Installing Docker..."
    remote_exec "curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $SERVER_USER"
    print_success "Docker installed. You may need to log out and back in for group changes to take effect."
fi

print_step "Step 3: Checking Docker Compose installation..."
if remote_exec "docker compose version" &> /dev/null; then
    print_success "Docker Compose is installed"
else
    print_info "Docker Compose not found. Installing..."
    remote_exec "sudo apt update && sudo apt install -y docker-compose-plugin"
    print_success "Docker Compose installed"
fi

print_step "Step 4: Cloning/Updating repository..."
if remote_exec "[ -d $APP_DIR ]"; then
    print_info "Directory exists. Pulling latest changes..."
    remote_exec "cd $APP_DIR && git pull origin main"
    print_success "Repository updated"
else
    print_info "Cloning repository..."
    remote_exec "git clone $GITHUB_REPO $APP_DIR"
    print_success "Repository cloned"
fi

print_step "Step 5: Verifying environment files..."
ENV_CHECK=$(remote_exec "cd $APP_DIR && [ -f .env ] && [ -f backend/.env ] && echo 'exists' || echo 'missing'")
if [ "$ENV_CHECK" = "exists" ]; then
    print_success "Environment files exist"
else
    print_error "Environment files missing!"
    echo "The .env files should be in your repository."
    echo "Please ensure .env and backend/.env are committed (if safe) or create them manually on the server."
    exit 1
fi

print_step "Step 6: Stopping existing containers..."
remote_exec "cd $APP_DIR && docker compose down 2>/dev/null || true"
print_success "Existing containers stopped"

print_step "Step 7: Building Docker images (this may take 5-10 minutes)..."
print_info "Building backend and frontend images..."
if remote_exec "cd $APP_DIR && docker compose build"; then
    print_success "Docker images built successfully"
else
    print_error "Failed to build Docker images"
    echo "Check logs on server with: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs'"
    exit 1
fi

print_step "Step 8: Starting containers..."
if remote_exec "cd $APP_DIR && docker compose up -d"; then
    print_success "Containers started successfully"
else
    print_error "Failed to start containers"
    exit 1
fi

print_step "Step 9: Waiting for services to initialize..."
sleep 15
print_success "Services should be ready"

print_step "Step 10: Checking container status..."
echo ""
remote_exec "cd $APP_DIR && docker compose ps"
echo ""

print_step "Step 11: Testing backend health..."
HEALTH_CHECK=$(remote_exec "curl -s http://localhost:5000/health" || echo "failed")
if [[ $HEALTH_CHECK == *"ok"* ]]; then
    print_success "Backend is healthy"
    echo "Response: $HEALTH_CHECK"
else
    print_error "Backend health check failed"
    echo "Check logs with: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs backend'"
fi

print_step "Step 12: Testing frontend..."
FRONTEND_CHECK=$(remote_exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:80")
if [ "$FRONTEND_CHECK" = "200" ]; then
    print_success "Frontend is accessible (HTTP $FRONTEND_CHECK)"
else
    print_error "Frontend returned HTTP $FRONTEND_CHECK"
    echo "Check logs with: ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs frontend'"
fi

print_step "Step 13: Configuring firewall..."
print_info "Opening ports 80 and 5000..."
remote_exec "sudo ufw allow 80/tcp 2>/dev/null || true"
remote_exec "sudo ufw allow 5000/tcp 2>/dev/null || true"
print_success "Firewall configured"

echo ""
echo "=========================================="
echo "  🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "Your application is deployed at:"
echo "  Frontend: http://$SUBDOMAIN"
echo "  Backend:  http://$SUBDOMAIN:5000"
echo "  Health:   http://$SUBDOMAIN:5000/health"
echo ""
echo "Or access via IP:"
echo "  Frontend: http://$SERVER_IP"
echo "  Backend:  http://$SERVER_IP:5000"
echo ""
echo "Useful commands:"
echo "  SSH to server:    ssh $SERVER_USER@$SERVER_IP"
echo "  View logs:        ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs -f'"
echo "  Restart:          ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose restart'"
echo "  Stop:             ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose down'"
echo "  Check status:     ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose ps'"
echo ""
echo "⚠️  IMPORTANT: Contact your instructor to configure DNS"
echo "    Point $SUBDOMAIN to $SERVER_IP"
echo ""
