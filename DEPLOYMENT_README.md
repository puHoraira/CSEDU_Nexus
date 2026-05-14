# Deployment Files Overview

This directory contains all necessary files for deploying CSEDU Nexus to Server 2 (nexus.farefin.com).

## 📁 Deployment Files

### Configuration Files
- **docker-compose.yml** - Docker orchestration configuration
- **.env** - Frontend environment variables (API URL)
- **backend/.env** - Backend environment variables (MongoDB, JWT, etc.)
- **backend/Dockerfile** - Backend container build instructions
- **frontend/Dockerfile** - Frontend container build instructions
- **frontend/nginx.conf** - Nginx web server configuration

### Documentation
- **DEPLOYMENT.md** - Complete deployment guide with detailed steps
- **DEPLOY_COMMANDS.md** - Quick reference with copy-paste commands
- **DEPLOYMENT_README.md** - This file

### Scripts
- **deploy.sh** - Automated deployment script (run ON server)
- **remote-deploy.sh** - Remote deployment script (run FROM local machine)
- **verify-deployment.sh** - Post-deployment verification script

## 🚀 Quick Start

### Option 1: Manual Deployment (Recommended for first time)
1. Read **DEPLOY_COMMANDS.md** for step-by-step instructions
2. SSH to server: `ssh azureuser@135.171.216.245`
3. Follow the commands in DEPLOY_COMMANDS.md

### Option 2: Automated Deployment (From Local Machine)
```bash
# Make script executable
chmod +x remote-deploy.sh

# Run deployment
./remote-deploy.sh
```

### Option 3: Automated Deployment (On Server)
```bash
# SSH to server
ssh azureuser@135.171.216.245

# Clone repository
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
cd nexus-app

# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

## ✅ Verify Deployment

After deployment, run the verification script:
```bash
# On the server
cd ~/nexus-app
chmod +x verify-deployment.sh
./verify-deployment.sh
```

## 🔧 Configuration Summary

### Server Details
- **Server**: ip-lab-student-02
- **IP**: 135.171.216.245
- **User**: azureuser
- **Subdomain**: nexus.farefin.com
- **Team**: Team Ravenclaw

### Application URLs
- **Frontend**: http://nexus.farefin.com (port 80)
- **Backend**: http://nexus.farefin.com:5000 (port 5000)
- **Health Check**: http://nexus.farefin.com:5000/health

### Environment Configuration
All environment files are pre-configured for `nexus.farefin.com`:
- Root `.env`: Contains `VITE_API_BASE_URL`
- Backend `.env`: Contains MongoDB URI, JWT secrets, CORS settings

## 📋 Deployment Checklist

Before deploying:
- [ ] Server access confirmed (SSH works)
- [ ] Docker installed on server
- [ ] Docker Compose installed on server
- [ ] Repository cloned
- [ ] Environment files present and configured

After deploying:
- [ ] Containers running (`docker compose ps`)
- [ ] Backend health check passes
- [ ] Frontend accessible
- [ ] Firewall configured (ports 80, 5000)
- [ ] DNS configured (contact instructor)

## 🐛 Troubleshooting

### Common Issues

**1. Can't connect to server**
```bash
# Test connection
ping 135.171.216.245
ssh azureuser@135.171.216.245
```

**2. Docker not installed**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**3. Containers won't start**
```bash
# Check logs
docker compose logs -f

# Rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

**4. Backend health check fails**
```bash
# Check backend logs
docker compose logs backend

# Check MongoDB connection
docker exec -it csedu_backend sh
# Inside container: check env vars
env | grep MONGODB
```

**5. Frontend not accessible**
```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose build frontend --no-cache
docker compose up -d frontend
```

## 📚 Additional Resources

- **Full Guide**: See DEPLOYMENT.md
- **Quick Commands**: See DEPLOY_COMMANDS.md
- **GitHub Repo**: https://github.com/puHoraira/CSEDU_Nexus

## 🆘 Getting Help

1. Check logs: `docker compose logs -f`
2. Run verification: `./verify-deployment.sh`
3. Review troubleshooting section in DEPLOYMENT.md
4. Contact team members or instructor

## 📝 Notes

- **DNS Configuration**: Contact instructor to point nexus.farefin.com to 135.171.216.245
- **Environment Files**: Already configured for nexus.farefin.com
- **MongoDB**: Using cloud MongoDB Atlas (no local database needed)
- **Ports**: Frontend (80), Backend (5000)
- **SSL/HTTPS**: Not configured (using HTTP for now)

## 🔐 Security Notes

- Environment files contain sensitive data (JWT secrets, MongoDB credentials)
- Keep `.env` files secure and don't share publicly
- Change default passwords in production
- Consider setting up HTTPS with Let's Encrypt for production use

## 📊 Monitoring

Check application status:
```bash
# Container status
docker compose ps

# Resource usage
docker stats

# Logs
docker compose logs -f

# Health check
curl http://localhost:5000/health
```

---

**Team Ravenclaw** | **nexus.farefin.com** | **Server 2**
