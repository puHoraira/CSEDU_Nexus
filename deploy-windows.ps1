# PowerShell Deployment Script for Windows
# Team Ravenclaw - nexus.farefin.com
# Run this from Windows PowerShell

$SERVER_IP = "135.171.216.245"
$SERVER_USER = "azureuser"
$SERVER_PASSWORD = "bqaIJ#1xUU+2QdChsNrA1zN^"
$APP_DIR = "nexus-app"
$GITHUB_REPO = "https://github.com/puHoraira/CSEDU_Nexus.git"
$SUBDOMAIN = "nexus.farefin.com"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CSEDU Nexus Deployment from Windows" -ForegroundColor Cyan
Write-Host "  Team: Ravenclaw" -ForegroundColor Cyan
Write-Host "  Server: $SERVER_IP" -ForegroundColor Cyan
Write-Host "  Subdomain: $SUBDOMAIN" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

function Write-Success {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

function Write-Step {
    param($Message)
    Write-Host "▶ $Message" -ForegroundColor Blue
}

# Check if SSH is available
Write-Step "Checking SSH availability..."
$sshAvailable = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $sshAvailable) {
    Write-Error-Custom "SSH is not available on your system"
    Write-Host ""
    Write-Host "Please install OpenSSH Client:"
    Write-Host "1. Open Settings"
    Write-Host "2. Go to Apps > Optional Features"
    Write-Host "3. Click 'Add a feature'"
    Write-Host "4. Find and install 'OpenSSH Client'"
    Write-Host ""
    Write-Host "Or use PuTTY: https://www.putty.org/"
    exit 1
}
Write-Success "SSH is available"

Write-Host ""
Write-Info "This script will guide you through the deployment process."
Write-Info "You'll need to enter the server password when prompted."
Write-Host ""
Write-Host "Server Password: $SERVER_PASSWORD" -ForegroundColor Yellow
Write-Host ""

# Test SSH connection
Write-Step "Testing server connection..."
Write-Info "Attempting to connect to $SERVER_IP..."
Write-Host ""

$testConnection = "echo 'Connection successful'"
$result = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" $testConnection 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Success "Connected to server successfully"
} else {
    Write-Error-Custom "Failed to connect to server"
    Write-Host ""
    Write-Host "Please verify:"
    Write-Host "  - Server IP: $SERVER_IP"
    Write-Host "  - Username: $SERVER_USER"
    Write-Host "  - Password: $SERVER_PASSWORD"
    Write-Host "  - Your internet connection"
    Write-Host ""
    Write-Host "Try connecting manually:"
    Write-Host "  ssh $SERVER_USER@$SERVER_IP" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Step "Checking Docker installation on server..."
$dockerCheck = ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "command -v docker" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker is installed"
} else {
    Write-Info "Docker not found. Installing Docker..."
    Write-Host ""
    Write-Host "Running Docker installation commands on server..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    Write-Host ""
    
    $installDocker = @"
curl -fsSL https://get.docker.com -o get-docker.sh && 
sudo sh get-docker.sh && 
sudo usermod -aG docker $SERVER_USER &&
sudo apt update && 
sudo apt install -y docker-compose-plugin
"@
    
    ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" $installDocker
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Docker installed successfully"
        Write-Info "You may need to reconnect for group changes to take effect"
    } else {
        Write-Error-Custom "Failed to install Docker"
        exit 1
    }
}

Write-Host ""
Write-Step "Checking if repository exists..."
$repoCheck = ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "[ -d $APP_DIR ] && echo 'exists' || echo 'not found'" 2>&1

if ($repoCheck -match "exists") {
    Write-Info "Repository exists. Updating..."
    ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $APP_DIR && git pull origin main"
    Write-Success "Repository updated"
} else {
    Write-Info "Cloning repository..."
    ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "git clone $GITHUB_REPO $APP_DIR"
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Repository cloned"
    } else {
        Write-Error-Custom "Failed to clone repository"
        exit 1
    }
}

Write-Host ""
Write-Step "Stopping existing containers..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $APP_DIR && docker compose down 2>/dev/null || true"
Write-Success "Existing containers stopped"

Write-Host ""
Write-Step "Building Docker images..."
Write-Info "This may take 5-10 minutes. Please be patient..."
Write-Host ""

ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $APP_DIR && docker compose build"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Docker images built successfully"
} else {
    Write-Error-Custom "Failed to build Docker images"
    Write-Host ""
    Write-Host "Check logs with:"
    Write-Host "  ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs'" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Step "Starting containers..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $APP_DIR && docker compose up -d"

if ($LASTEXITCODE -eq 0) {
    Write-Success "Containers started successfully"
} else {
    Write-Error-Custom "Failed to start containers"
    exit 1
}

Write-Host ""
Write-Step "Waiting for services to initialize..."
Start-Sleep -Seconds 15
Write-Success "Services should be ready"

Write-Host ""
Write-Step "Checking container status..."
Write-Host ""
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "cd $APP_DIR && docker compose ps"
Write-Host ""

Write-Step "Testing backend health..."
$healthCheck = ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "curl -s http://localhost:5000/health" 2>&1

if ($healthCheck -match "ok") {
    Write-Success "Backend is healthy"
    Write-Host "Response: $healthCheck" -ForegroundColor Gray
} else {
    Write-Error-Custom "Backend health check failed"
    Write-Host "Check logs with:"
    Write-Host "  ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs backend'" -ForegroundColor Cyan
}

Write-Host ""
Write-Step "Testing frontend..."
$frontendCheck = ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "curl -s -o /dev/null -w '%{http_code}' http://localhost:80" 2>&1

if ($frontendCheck -eq "200") {
    Write-Success "Frontend is accessible (HTTP $frontendCheck)"
} else {
    Write-Error-Custom "Frontend returned HTTP $frontendCheck"
    Write-Host "Check logs with:"
    Write-Host "  ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs frontend'" -ForegroundColor Cyan
}

Write-Host ""
Write-Step "Configuring firewall..."
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "sudo ufw allow 80/tcp 2>/dev/null || true"
ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "sudo ufw allow 5000/tcp 2>/dev/null || true"
Write-Success "Firewall configured"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your application is deployed at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://$SUBDOMAIN" -ForegroundColor White
Write-Host "  Backend:  http://${SUBDOMAIN}:5000" -ForegroundColor White
Write-Host "  Health:   http://${SUBDOMAIN}:5000/health" -ForegroundColor White
Write-Host ""
Write-Host "Or access via IP:" -ForegroundColor Cyan
Write-Host "  Frontend: http://$SERVER_IP" -ForegroundColor White
Write-Host "  Backend:  http://${SERVER_IP}:5000" -ForegroundColor White
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Yellow
Write-Host "  SSH to server:    ssh $SERVER_USER@$SERVER_IP" -ForegroundColor Gray
Write-Host "  View logs:        ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose logs -f'" -ForegroundColor Gray
Write-Host "  Restart:          ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose restart'" -ForegroundColor Gray
Write-Host "  Stop:             ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose down'" -ForegroundColor Gray
Write-Host "  Check status:     ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && docker compose ps'" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT: Contact your instructor to configure DNS" -ForegroundColor Yellow
Write-Host "    Point $SUBDOMAIN to $SERVER_IP" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
