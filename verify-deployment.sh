#!/bin/bash

# Deployment Verification Script
# Run this ON THE SERVER after deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✓ $1${NC}"; }
print_error() { echo -e "${RED}✗ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ $1${NC}"; }
print_header() { echo -e "${BLUE}=== $1 ===${NC}"; }

echo ""
print_header "CSEDU Nexus Deployment Verification"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found!"
    echo "Please run this script from the nexus-app directory"
    echo "cd ~/nexus-app && ./verify-deployment.sh"
    exit 1
fi

# 1. Check Docker
print_header "1. Docker Installation"
if command -v docker &> /dev/null; then
    VERSION=$(docker --version)
    print_success "Docker installed: $VERSION"
else
    print_error "Docker not installed"
    exit 1
fi

if docker compose version &> /dev/null; then
    VERSION=$(docker compose version)
    print_success "Docker Compose installed: $VERSION"
else
    print_error "Docker Compose not installed"
    exit 1
fi

# 2. Check Environment Files
print_header "2. Environment Files"
if [ -f ".env" ]; then
    print_success "Root .env file exists"
    if grep -q "nexus.farefin.com" .env; then
        print_success "Root .env configured for nexus.farefin.com"
    else
        print_error "Root .env not configured for nexus.farefin.com"
    fi
else
    print_error "Root .env file missing"
fi

if [ -f "backend/.env" ]; then
    print_success "Backend .env file exists"
    if grep -q "nexus.farefin.com" backend/.env; then
        print_success "Backend .env configured for nexus.farefin.com"
    else
        print_error "Backend .env not configured for nexus.farefin.com"
    fi
else
    print_error "Backend .env file missing"
fi

# 3. Check Containers
print_header "3. Container Status"
if docker compose ps | grep -q "Up"; then
    print_success "Containers are running"
    docker compose ps
else
    print_error "Containers are not running"
    echo "Start them with: docker compose up -d"
    exit 1
fi

# 4. Check Backend
print_header "4. Backend Health"
sleep 2
BACKEND_HEALTH=$(curl -s http://localhost:5000/health 2>/dev/null || echo "failed")
if [[ $BACKEND_HEALTH == *"ok"* ]]; then
    print_success "Backend is healthy"
    echo "Response: $BACKEND_HEALTH"
else
    print_error "Backend health check failed"
    echo "Check logs: docker compose logs backend"
fi

# 5. Check Frontend
print_header "5. Frontend Status"
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null || echo "000")
if [ "$FRONTEND_STATUS" = "200" ]; then
    print_success "Frontend is accessible (HTTP $FRONTEND_STATUS)"
else
    print_error "Frontend returned HTTP $FRONTEND_STATUS"
    echo "Check logs: docker compose logs frontend"
fi

# 6. Check Ports
print_header "6. Port Availability"
if netstat -tuln 2>/dev/null | grep -q ":5000"; then
    print_success "Port 5000 is listening (Backend)"
else
    print_error "Port 5000 is not listening"
fi

if netstat -tuln 2>/dev/null | grep -q ":80"; then
    print_success "Port 80 is listening (Frontend)"
else
    print_error "Port 80 is not listening"
fi

# 7. Check Firewall
print_header "7. Firewall Configuration"
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null || echo "inactive")
    if [[ $UFW_STATUS == *"80"* ]] && [[ $UFW_STATUS == *"5000"* ]]; then
        print_success "Firewall allows ports 80 and 5000"
    else
        print_info "Firewall may need configuration"
        echo "Run: sudo ufw allow 80/tcp && sudo ufw allow 5000/tcp"
    fi
else
    print_info "UFW not installed (firewall check skipped)"
fi

# 8. Check DNS
print_header "8. DNS Configuration"
DNS_CHECK=$(nslookup nexus.farefin.com 2>/dev/null | grep -A1 "Name:" | grep "Address" || echo "not configured")
if [[ $DNS_CHECK == *"135.171.216.245"* ]]; then
    print_success "DNS configured correctly for nexus.farefin.com"
else
    print_info "DNS not yet configured or propagating"
    echo "Contact instructor to configure DNS"
    echo "Expected: nexus.farefin.com -> 135.171.216.245"
fi

# 9. Check MongoDB Connection
print_header "9. MongoDB Connection"
MONGO_TEST=$(docker exec csedu_backend sh -c 'node -e "const mongoose = require(\"mongoose\"); mongoose.connect(process.env.MONGODB_URI).then(() => { console.log(\"connected\"); process.exit(0); }).catch(() => { console.log(\"failed\"); process.exit(1); });"' 2>/dev/null || echo "failed")
if [[ $MONGO_TEST == *"connected"* ]]; then
    print_success "MongoDB connection successful"
else
    print_error "MongoDB connection failed"
    echo "Check MONGODB_URI in backend/.env"
fi

# 10. Resource Usage
print_header "10. Resource Usage"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Summary
echo ""
print_header "Deployment Summary"
echo ""

# Count checks
TOTAL_CHECKS=10
PASSED_CHECKS=0

# Recount passed checks
command -v docker &> /dev/null && ((PASSED_CHECKS++))
docker compose version &> /dev/null && ((PASSED_CHECKS++))
[ -f ".env" ] && ((PASSED_CHECKS++))
[ -f "backend/.env" ] && ((PASSED_CHECKS++))
docker compose ps | grep -q "Up" && ((PASSED_CHECKS++))
[[ $BACKEND_HEALTH == *"ok"* ]] && ((PASSED_CHECKS++))
[ "$FRONTEND_STATUS" = "200" ] && ((PASSED_CHECKS++))
netstat -tuln 2>/dev/null | grep -q ":5000" && ((PASSED_CHECKS++))
netstat -tuln 2>/dev/null | grep -q ":80" && ((PASSED_CHECKS++))
[[ $MONGO_TEST == *"connected"* ]] && ((PASSED_CHECKS++))

if [ $PASSED_CHECKS -eq $TOTAL_CHECKS ]; then
    print_success "All checks passed! ($PASSED_CHECKS/$TOTAL_CHECKS)"
    echo ""
    echo "Your application is ready:"
    echo "  Frontend: http://nexus.farefin.com (or http://135.171.216.245)"
    echo "  Backend:  http://nexus.farefin.com:5000 (or http://135.171.216.245:5000)"
    echo ""
else
    print_info "Some checks need attention ($PASSED_CHECKS/$TOTAL_CHECKS passed)"
    echo ""
    echo "Review the output above and fix any issues"
    echo ""
fi

echo "Useful commands:"
echo "  View logs:    docker compose logs -f"
echo "  Restart:      docker compose restart"
echo "  Stop:         docker compose down"
echo "  Rebuild:      docker compose build && docker compose up -d"
echo ""
