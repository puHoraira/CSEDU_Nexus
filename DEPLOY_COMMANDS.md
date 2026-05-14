# Quick Deployment Commands - Team Ravenclaw

## Server Info
- **IP**: 135.171.216.245
- **User**: azureuser
- **Password**: bqaIJ#1xUU+2QdChsNrA1zN^
- **Subdomain**: nexus.farefin.com

---

## Step-by-Step Deployment

### 1. Connect to Server
```bash
ssh azureuser@135.171.216.245
# Enter password: bqaIJ#1xUU+2QdChsNrA1zN^
```

### 2. Install Docker (if needed)
```bash
# Check if Docker is installed
docker --version

# If not installed, run:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Log out and back in for group changes to take effect
exit
# Then SSH back in
ssh azureuser@135.171.216.245
```

### 3. Clone Repository
```bash
# Clone the repository
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app

# Navigate to project directory
cd nexus-app

# Verify files
ls -la
```

### 4. Check Environment Files
```bash
# Check if .env files exist
cat .env
cat backend/.env

# They should contain nexus.farefin.com URLs
# If not, you need to update them
```

### 5. Build and Deploy
```bash
# Stop any existing containers
docker compose down

# Build images (takes 5-10 minutes)
docker compose build

# Start containers
docker compose up -d

# Check status
docker compose ps
```

### 6. Verify Deployment
```bash
# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost:80

# View logs
docker compose logs -f
# Press Ctrl+C to exit logs
```

### 7. Open Firewall Ports
```bash
# Allow HTTP traffic
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp

# Check firewall status
sudo ufw status
```

### 8. Test from Browser
Open your browser and visit:
- Frontend: http://135.171.216.245
- Backend Health: http://135.171.216.245:5000/health

Once DNS is configured:
- Frontend: http://nexus.farefin.com
- Backend: http://nexus.farefin.com:5000

---

## Common Commands

### View Logs
```bash
cd ~/nexus-app

# All logs
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend

# Last 50 lines
docker compose logs --tail=50
```

### Restart Services
```bash
cd ~/nexus-app

# Restart all
docker compose restart

# Restart backend only
docker compose restart backend
```

### Stop Services
```bash
cd ~/nexus-app
docker compose down
```

### Update Application
```bash
cd ~/nexus-app

# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### Check Container Status
```bash
cd ~/nexus-app

# List containers
docker compose ps

# Check resource usage
docker stats

# Check specific container
docker logs csedu_backend
docker logs csedu_frontend
```

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
docker compose logs backend

# Check if MongoDB is accessible
docker exec -it csedu_backend sh
# Inside container:
ping cluster0.pvmqq7k.mongodb.net
exit
```

### Frontend Not Starting
```bash
# Check logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend --no-cache
docker compose up -d frontend
```

### Port Already in Use
```bash
# Check what's using port 5000
sudo netstat -tulpn | grep 5000

# Check what's using port 80
sudo netstat -tulpn | grep :80

# Kill process if needed
sudo kill -9 <PID>
```

### Can't Access from Browser
```bash
# Check if containers are running
docker compose ps

# Check if ports are listening
sudo netstat -tulpn | grep -E ':(80|5000)'

# Test locally on server
curl http://localhost:5000/health
curl http://localhost:80
```

### Clear Everything and Start Fresh
```bash
cd ~/nexus-app

# Stop and remove everything
docker compose down -v

# Remove images
docker rmi csedu_backend csedu_frontend

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

---

## Quick Health Check Script

Create a monitoring script:
```bash
cat > ~/check-nexus.sh << 'EOF'
#!/bin/bash
echo "=== Container Status ==="
cd ~/nexus-app && docker compose ps

echo -e "\n=== Backend Health ==="
curl -s http://localhost:5000/health

echo -e "\n=== Frontend Status ==="
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80

echo -e "\n=== Resource Usage ==="
docker stats --no-stream
EOF

chmod +x ~/check-nexus.sh
```

Run it anytime:
```bash
~/check-nexus.sh
```

---

## Environment File Contents

### Root `.env`
```env
VITE_API_BASE_URL=http://nexus.farefin.com:5000/api/v1
```

### Backend `backend/.env`
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://horairajdev_db_user:1L9Q7lvQfdWrsZeP@cluster0.pvmqq7k.mongodb.net/csedu_nexus?retryWrites=true&w=majority
JWT_ACCESS_SECRET=d52993aed60193cea576f8bb311275772c447d5a7eebcbdfae1140116b73c2488427fcaa73a7a07417dad550eb5cead40bb14acea544c8ed81e390dbf1f3ec6b
JWT_REFRESH_SECRET=3865b91bc56f8a4890f07565183e82222cfbf56bd2b3297a43471c9e7725ddddd01c926a96d3bc37cbee19e10a29fd473f0989c321b32a17a94655928b3eaadf
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CLIENT_ORIGIN=http://nexus.farefin.com
FRONTEND_URL=http://nexus.farefin.com
BACKEND_URL=http://nexus.farefin.com:5000

BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_CALLBACK_URL=http://nexus.farefin.com:5000/api/v1/payments/bkash/callback

SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_SUCCESS_URL=http://nexus.farefin.com:5000/api/v1/workshops/payment/success
SSLCOMMERZ_FAIL_URL=http://nexus.farefin.com:5000/api/v1/workshops/payment/fail
SSLCOMMERZ_CANCEL_URL=http://nexus.farefin.com:5000/api/v1/workshops/payment/cancel
SSLCOMMERZ_IPN_URL=http://nexus.farefin.com:5000/api/v1/workshops/payment/ipn
```

---

## DNS Configuration

Contact your instructor to configure DNS:
- **Domain**: nexus.farefin.com
- **Type**: A Record
- **Value**: 135.171.216.245
- **TTL**: 300 (or default)

Test DNS after configuration:
```bash
nslookup nexus.farefin.com
ping nexus.farefin.com
```

---

## Success Checklist

- [ ] Connected to server via SSH
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] Environment files verified
- [ ] Docker images built successfully
- [ ] Containers running (`docker compose ps` shows "Up")
- [ ] Backend health check passes
- [ ] Frontend accessible via browser
- [ ] Firewall ports opened (80, 5000)
- [ ] DNS configured (contact instructor)
- [ ] Application tested end-to-end

---

## Need Help?

1. Check logs: `docker compose logs -f`
2. Check container status: `docker compose ps`
3. Test locally: `curl http://localhost:5000/health`
4. Review troubleshooting section above
5. Contact team members or instructor
