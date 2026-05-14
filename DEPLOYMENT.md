# Deployment Guide - Team Ravenclaw (nexus.farefin.com)

## Server Details
- **Server**: ip-lab-student-02
- **Public IP**: 135.171.216.245
- **Username**: azureuser
- **Subdomain**: nexus.farefin.com
- **Team**: Team Ravenclaw

## Prerequisites on Server
1. Docker installed
2. Docker Compose installed
3. Git installed
4. Ports 80 and 5000 open

## Deployment Steps

### 1. Connect to Server
```bash
ssh azureuser@135.171.216.245
# Password: bqaIJ#1xUU+2QdChsNrA1zN^
```

### 2. Install Docker (if not installed)
```bash
# Update package list
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 3. Clone Your Repository
```bash
# Navigate to home directory
cd ~

# Clone your repository
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
cd nexus-app
```

### 4. Verify Environment Files
The environment files should already be configured for nexus.farefin.com:

**Root `.env`:**
```
VITE_API_BASE_URL=http://nexus.farefin.com:5000/api/v1
```

**Backend `.env`:**
```
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://horairajdev_db_user:1L9Q7lvQfdWrsZeP@cluster0.pvmqq7k.mongodb.net/csedu_nexus?retryWrites=true&w=majority
CLIENT_ORIGIN=http://nexus.farefin.com
FRONTEND_URL=http://nexus.farefin.com
BACKEND_URL=http://nexus.farefin.com:5000
# ... other configs
```

### 5. Build and Start Containers
```bash
# Build images (this may take 5-10 minutes)
docker compose build

# Start containers in detached mode
docker compose up -d

# Check if containers are running
docker compose ps
```

### 6. Verify Deployment
```bash
# Check backend health
curl http://localhost:5000/health

# Check frontend
curl http://localhost:80

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### 7. Configure DNS/Subdomain
Contact your instructor or DNS administrator to point `nexus.farefin.com` to `135.171.216.245`.

Once DNS is configured, test:
```bash
curl http://nexus.farefin.com:5000/health
```

## Useful Commands

### View Logs
```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Frontend only
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart backend only
docker compose restart backend

# Restart frontend only
docker compose restart frontend
```

### Stop Services
```bash
# Stop all containers
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### Update Application
```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker compose down
docker compose build
docker compose up -d
```

### Check Container Status
```bash
# List running containers
docker compose ps

# Check resource usage
docker stats

# Inspect a container
docker inspect csedu_backend
docker inspect csedu_frontend
```

### Access Container Shell
```bash
# Backend container
docker exec -it csedu_backend sh

# Frontend container
docker exec -it csedu_frontend sh
```

## Troubleshooting

### Backend Won't Start
```bash
# Check logs
docker compose logs backend

# Common issues:
# - MongoDB connection failed: Check MONGODB_URI in backend/.env
# - Port already in use: Check if port 5000 is available
sudo netstat -tulpn | grep 5000
```

### Frontend Won't Start
```bash
# Check logs
docker compose logs frontend

# Rebuild frontend with correct API URL
docker compose build frontend --no-cache
docker compose up -d frontend
```

### Can't Access from Browser
1. Check if containers are running: `docker compose ps`
2. Check if ports are open: `sudo ufw status`
3. Open ports if needed:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp
```

### DNS Not Working
```bash
# Test DNS resolution
nslookup nexus.farefin.com

# If not resolved, use IP temporarily
# Update .env files to use 135.171.216.245 instead of nexus.farefin.com
```

### Clear Everything and Start Fresh
```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Remove all images
docker rmi $(docker images -q)

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## Security Recommendations

1. **Change default passwords** in environment files
2. **Use HTTPS** - Consider setting up Let's Encrypt SSL
3. **Firewall**: Only open necessary ports
4. **Regular updates**: Keep Docker and system packages updated
5. **Backup**: Regularly backup your MongoDB database

## Monitoring

### Check Application Health
```bash
# Create a simple monitoring script
cat > ~/check_health.sh << 'EOF'
#!/bin/bash
echo "=== Container Status ==="
docker compose ps

echo -e "\n=== Backend Health ==="
curl -s http://localhost:5000/health | jq .

echo -e "\n=== Frontend Status ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:80
echo ""
EOF

chmod +x ~/check_health.sh
./check_health.sh
```

## Production Checklist

- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] Environment files configured with nexus.farefin.com
- [ ] Containers built successfully
- [ ] Containers running (docker compose ps)
- [ ] Backend health check passes
- [ ] Frontend accessible
- [ ] DNS configured for nexus.farefin.com
- [ ] Firewall rules configured
- [ ] MongoDB connection working
- [ ] Application tested end-to-end

## Support

If you encounter issues:
1. Check logs: `docker compose logs -f`
2. Verify environment variables
3. Check network connectivity
4. Review this guide's troubleshooting section
