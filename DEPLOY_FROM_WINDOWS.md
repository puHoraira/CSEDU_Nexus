# 🪟 Deployment from Windows - Team Ravenclaw

## Quick Deployment Guide for Windows Users

Since you're on Windows, here's the easiest way to deploy to your Linux server.

---

## 🎯 Recommended Method: Use PowerShell + SSH

### Step 1: Open PowerShell
Press `Win + X` and select "Windows PowerShell" or "Terminal"

### Step 2: Connect to Server
```powershell
ssh azureuser@135.171.216.245
# When prompted, enter password: bqaIJ#1xUU+2QdChsNrA1zN^
```

### Step 3: Install Docker (if needed)
```bash
# Check if Docker is installed
docker --version

# If not installed, run these commands:
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version

# IMPORTANT: Log out and back in for group changes
exit
```

### Step 4: Reconnect and Deploy
```powershell
# Reconnect to server
ssh azureuser@135.171.216.245
```

```bash
# Clone repository
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
cd nexus-app

# Build and start containers
docker compose build
docker compose up -d

# Check status
docker compose ps

# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost:80
```

### Step 5: Open Firewall Ports
```bash
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp
```

### Step 6: Verify Deployment
```bash
# Make verification script executable
chmod +x verify-deployment.sh

# Run verification
./verify-deployment.sh
```

---

## 🔄 Alternative: Use PuTTY (if SSH doesn't work)

### Download PuTTY
1. Download from: https://www.putty.org/
2. Install PuTTY

### Connect with PuTTY
1. Open PuTTY
2. Enter Host Name: `135.171.216.245`
3. Port: `22`
4. Click "Open"
5. Login as: `azureuser`
6. Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

Then follow the same commands from Step 3 onwards.

---

## 🚀 One-Line Deployment (After SSH)

Once connected to the server via SSH, run this single command:

```bash
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app && cd nexus-app && docker compose build && docker compose up -d && docker compose ps
```

---

## 📋 Copy-Paste Commands (Step by Step)

### 1. Connect to Server
```powershell
ssh azureuser@135.171.216.245
```
Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

### 2. Check Docker
```bash
docker --version && docker compose version
```

### 3. If Docker Not Installed
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh && sudo usermod -aG docker $USER && sudo apt update && sudo apt install -y docker-compose-plugin
```

Then logout and login again:
```bash
exit
```

Reconnect:
```powershell
ssh azureuser@135.171.216.245
```

### 4. Clone Repository
```bash
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
```

### 5. Navigate to Directory
```bash
cd nexus-app
```

### 6. Build Docker Images
```bash
docker compose build
```
⏱️ This takes 5-10 minutes

### 7. Start Containers
```bash
docker compose up -d
```

### 8. Check Status
```bash
docker compose ps
```

### 9. Test Backend
```bash
curl http://localhost:5000/health
```
Should return: `{"ok":true,"service":"csedu-nexus-api"}`

### 10. Test Frontend
```bash
curl http://localhost:80
```
Should return HTML content

### 11. Open Firewall
```bash
sudo ufw allow 80/tcp && sudo ufw allow 5000/tcp
```

### 12. View Logs (Optional)
```bash
docker compose logs -f
```
Press `Ctrl+C` to exit

---

## 🌐 Access Your Application

### Using IP Address (Works Immediately)
- **Frontend**: http://135.171.216.245
- **Backend**: http://135.171.216.245:5000
- **Health Check**: http://135.171.216.245:5000/health

### Using Domain (After DNS Configuration)
- **Frontend**: http://nexus.farefin.com
- **Backend**: http://nexus.farefin.com:5000
- **Health Check**: http://nexus.farefin.com:5000/health

---

## 🔧 Useful Commands

### View Logs
```bash
cd ~/nexus-app
docker compose logs -f
```

### Restart Services
```bash
cd ~/nexus-app
docker compose restart
```

### Stop Services
```bash
cd ~/nexus-app
docker compose down
```

### Update Application
```bash
cd ~/nexus-app
git pull origin main
docker compose build
docker compose up -d
```

### Check Container Status
```bash
cd ~/nexus-app
docker compose ps
```

### Check Resource Usage
```bash
docker stats
```

---

## 🐛 Troubleshooting

### SSH Connection Refused
**Try:**
```powershell
# Test if server is reachable
ping 135.171.216.245

# Try with verbose output
ssh -v azureuser@135.171.216.245
```

### Docker Permission Denied
**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login again
exit
```

Then reconnect via SSH.

### Port Already in Use
**Check what's using the port:**
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :5000
```

**Stop conflicting service:**
```bash
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if Nginx is running
```

### Backend Not Starting
**Check logs:**
```bash
docker compose logs backend
```

**Common issues:**
- MongoDB connection failed → Check `backend/.env`
- Port 5000 in use → Stop other services

### Frontend Not Starting
**Check logs:**
```bash
docker compose logs frontend
```

**Rebuild:**
```bash
docker compose build frontend --no-cache
docker compose up -d frontend
```

---

## 📊 Verification Checklist

After deployment, verify:

- [ ] SSH connection works
- [ ] Docker is installed
- [ ] Repository cloned successfully
- [ ] Docker images built without errors
- [ ] Containers are running (`docker compose ps` shows "Up")
- [ ] Backend health check passes
- [ ] Frontend accessible from browser
- [ ] Firewall ports opened

---

## 💡 Pro Tips

### 1. Keep SSH Session Open
Open multiple PowerShell windows to:
- Window 1: View logs (`docker compose logs -f`)
- Window 2: Run commands

### 2. Use Windows Terminal (Recommended)
- Better than default PowerShell
- Download from Microsoft Store
- Supports tabs and better formatting

### 3. Save SSH Connection
Create a PowerShell alias:
```powershell
# Add to your PowerShell profile
function Connect-NexusServer {
    ssh azureuser@135.171.216.245
}

# Then just run:
Connect-NexusServer
```

### 4. Use VS Code Remote SSH
1. Install "Remote - SSH" extension in VS Code
2. Connect to server
3. Edit files directly on server

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Connect to server | `ssh azureuser@135.171.216.245` |
| View logs | `docker compose logs -f` |
| Restart | `docker compose restart` |
| Stop | `docker compose down` |
| Start | `docker compose up -d` |
| Status | `docker compose ps` |
| Update code | `git pull origin main` |

---

## 📞 Need Help?

1. **Check logs**: `docker compose logs -f`
2. **Run verification**: `./verify-deployment.sh`
3. **Review full guide**: See `DEPLOYMENT.md`
4. **Check commands**: See `DEPLOY_COMMANDS.md`

---

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ You can SSH to the server
2. ✅ `docker compose ps` shows both containers "Up"
3. ✅ Backend health check returns success
4. ✅ You can access http://135.171.216.245 in your browser
5. ✅ Application loads and functions correctly

---

## 🎉 You're Ready!

**Just follow the steps above and you'll have your application deployed in about 15-20 minutes!**

**Team Ravenclaw** 🦅 | **nexus.farefin.com** | **Server 2**
