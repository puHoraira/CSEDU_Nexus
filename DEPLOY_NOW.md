# 🚀 Deploy Your Application NOW!

## Why BusGo is Showing

**BusGo is already deployed on Server 2 using ports 80 and 5000.**

Your application is **NOT deployed yet** - you only pushed code to GitHub.

## Solution: Deploy on Different Ports

I've updated your configuration to use:
- **Frontend**: Port 8080 (instead of 80)
- **Backend**: Port 5001 (instead of 5000)

This allows both applications to run simultaneously on the same server.

---

## 🎯 Deploy Your Application Now

### Step 1: SSH to Server

```powershell
ssh azureuser@135.171.216.245
```
Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

### Step 2: Clone and Deploy

```bash
# Clone your repository
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app

# Navigate to directory
cd nexus-app

# Build Docker images (takes 5-10 minutes)
docker compose build

# Start containers
docker compose up -d

# Check status
docker compose ps

# Test backend
curl http://localhost:5001/health

# Test frontend
curl http://localhost:8080
```

### Step 3: Open Firewall Ports

```bash
# Allow your ports
sudo ufw allow 8080/tcp
sudo ufw allow 5001/tcp

# Check firewall status
sudo ufw status
```

### Step 4: Access Your Application

**Using Domain (if DNS is configured):**
- Frontend: http://nexus.farefin.com:8080
- Backend: http://nexus.farefin.com:5001/health

**Using IP Address:**
- Frontend: http://135.171.216.245:8080
- Backend: http://135.171.216.245:5001/health

---

## 📋 Quick Copy-Paste Commands

```bash
# All in one command
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app && cd nexus-app && docker compose build && docker compose up -d && docker compose ps && curl http://localhost:5001/health
```

---

## ✅ Verification

After deployment, check:

1. **Containers running:**
   ```bash
   docker compose ps
   ```
   Should show both containers "Up"

2. **Backend healthy:**
   ```bash
   curl http://localhost:5001/health
   ```
   Should return: `{"ok":true,"service":"csedu-nexus-api"}`

3. **Frontend accessible:**
   ```bash
   curl http://localhost:8080
   ```
   Should return HTML

4. **Access from browser:**
   - Open: http://135.171.216.245:8080
   - Should see your CSEDU Nexus application

---

## 🔍 Check What's Running

To see all applications on the server:

```bash
# List all containers
docker ps -a

# Check ports in use
sudo netstat -tulpn | grep -E ':(80|5000|8080|5001)'
```

You should see:
- BusGo on ports 80 and 5000
- Your app on ports 8080 and 5001

---

## 🐛 Troubleshooting

### Port Already in Use

If you get "port already allocated" error:

```bash
# Check what's using the port
sudo netstat -tulpn | grep :8080
sudo netstat -tulpn | grep :5001

# If something is using it, stop it or use different ports
```

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild
docker compose build --no-cache
docker compose up -d
```

### Can't Access from Browser

```bash
# Check firewall
sudo ufw status

# Open ports
sudo ufw allow 8080/tcp
sudo ufw allow 5001/tcp

# Check if containers are running
docker compose ps

# Check logs
docker compose logs -f
```

---

## 📊 Expected Result

After successful deployment:

| Service | Port | URL |
|---------|------|-----|
| **BusGo Frontend** | 80 | http://135.171.216.245 |
| **BusGo Backend** | 5000 | http://135.171.216.245:5000 |
| **Your Frontend** | 8080 | http://135.171.216.245:8080 |
| **Your Backend** | 5001 | http://135.171.216.245:5001 |

---

## 🎉 Success Indicators

Your deployment is successful when:

1. ✅ `docker compose ps` shows both containers "Up"
2. ✅ Backend health check returns success
3. ✅ You can access http://135.171.216.245:8080 in browser
4. ✅ Your CSEDU Nexus application loads (not BusGo)
5. ✅ You can login and use features

---

## ⚠️ Important Notes

1. **Both apps can run together** - Different ports, no conflict
2. **Your app is on port 8080** - Remember to include :8080 in URL
3. **DNS might not work** - Use IP address (135.171.216.245:8080)
4. **Firewall must allow ports** - Run the ufw commands above

---

## 📞 After Deployment

Once deployed, you can:

1. **Show it to your instructor** - Access via http://135.171.216.245:8080
2. **Request proper subdomain** - Ask for ravenclaw.farefin.com on port 80
3. **Keep both apps running** - No need to stop BusGo

---

## 🚀 Deploy NOW!

**Everything is ready. Just SSH to the server and run the commands above!**

**Estimated time: 15-20 minutes**

**Good luck, Team Ravenclaw!** 🦅
