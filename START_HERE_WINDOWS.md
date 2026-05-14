# 🚀 START HERE - Windows Deployment Guide

## Team Ravenclaw | nexus.farefin.com | Server 2

---

## ✅ Everything is Ready!

All configuration files have been updated for **nexus.farefin.com**. You just need to deploy!

---

## 🎯 Choose Your Deployment Method

### Method 1: PowerShell Script (Easiest) ⭐ RECOMMENDED

1. **Open PowerShell**
   - Press `Win + X`
   - Select "Windows PowerShell" or "Terminal"

2. **Navigate to your project**
   ```powershell
   cd path\to\CSEDU_Nexus
   ```

3. **Run the deployment script**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\deploy-windows.ps1
   ```

4. **Enter password when prompted**
   - Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

That's it! The script will handle everything automatically.

---

### Method 2: Manual SSH (More Control)

1. **Open PowerShell**
   - Press `Win + X`
   - Select "Windows PowerShell" or "Terminal"

2. **Connect to server**
   ```powershell
   ssh azureuser@135.171.216.245
   ```
   Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

3. **Run these commands one by one:**

   ```bash
   # Clone repository
   git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
   cd nexus-app
   
   # Build and start
   docker compose build
   docker compose up -d
   
   # Check status
   docker compose ps
   
   # Test
   curl http://localhost:5000/health
   ```

4. **Open firewall ports**
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 5000/tcp
   ```

---

### Method 3: Use PuTTY (If SSH doesn't work)

1. **Download PuTTY**
   - Go to: https://www.putty.org/
   - Download and install

2. **Connect**
   - Host Name: `135.171.216.245`
   - Port: `22`
   - Click "Open"
   - Login as: `azureuser`
   - Password: `bqaIJ#1xUU+2QdChsNrA1zN^`

3. **Follow the same commands from Method 2**

---

## 🌐 Access Your Application

### Immediately (Using IP)
Open your browser and go to:
- **Frontend**: http://135.171.216.245
- **Backend**: http://135.171.216.245:5000/health

### After DNS Setup (Using Domain)
- **Frontend**: http://nexus.farefin.com
- **Backend**: http://nexus.farefin.com:5000/health

---

## 📋 Quick Troubleshooting

### SSH Not Found?
**Install OpenSSH Client:**
1. Open Settings
2. Apps > Optional Features
3. Add a feature
4. Install "OpenSSH Client"

### Can't Connect?
**Check:**
- Internet connection working?
- Server IP correct: `135.171.216.245`
- Password correct: `bqaIJ#1xUU+2QdChsNrA1zN^`

### Containers Not Starting?
**Check logs:**
```bash
docker compose logs -f
```

### Port Already in Use?
**Stop conflicting services:**
```bash
sudo systemctl stop apache2
sudo systemctl stop nginx
```

---

## 📚 Documentation Files

| File | What It Does |
|------|--------------|
| **START_HERE_WINDOWS.md** | This file - quick start guide |
| **DEPLOY_FROM_WINDOWS.md** | Detailed Windows deployment guide |
| **deploy-windows.ps1** | Automated PowerShell deployment script |
| **DEPLOYMENT_SUMMARY.md** | Complete deployment summary |
| **DEPLOY_COMMANDS.md** | Copy-paste command reference |
| **DEPLOYMENT.md** | Full deployment documentation |

---

## ✅ Success Checklist

After deployment, verify:

- [ ] Can SSH to server
- [ ] Repository cloned
- [ ] Docker containers running
- [ ] Backend health check passes: http://135.171.216.245:5000/health
- [ ] Frontend loads: http://135.171.216.245
- [ ] Can login and use the application

---

## 🆘 Need Help?

1. **Read the detailed guide**: `DEPLOY_FROM_WINDOWS.md`
2. **Check all commands**: `DEPLOY_COMMANDS.md`
3. **View full documentation**: `DEPLOYMENT.md`
4. **Contact team members or instructor**

---

## 🎯 Server Information

| Item | Value |
|------|-------|
| **Server Name** | ip-lab-student-02 |
| **IP Address** | 135.171.216.245 |
| **Username** | azureuser |
| **Password** | bqaIJ#1xUU+2QdChsNrA1zN^ |
| **Subdomain** | nexus.farefin.com |
| **Team** | Team Ravenclaw |
| **GitHub** | https://github.com/puHoraira/CSEDU_Nexus |

---

## 🔥 One-Command Deployment

If you want to do everything in one shot, SSH to the server and run:

```bash
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app && cd nexus-app && docker compose build && docker compose up -d && docker compose ps && curl http://localhost:5000/health
```

---

## 📞 DNS Configuration

**After deployment**, contact your instructor to configure DNS:

- **Domain**: nexus.farefin.com
- **Type**: A Record  
- **Points to**: 135.171.216.245

---

## 🎉 You're All Set!

**Choose Method 1 (PowerShell Script) for the easiest deployment!**

Just run:
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy-windows.ps1
```

**Good luck, Team Ravenclaw! 🦅**

---

## 💡 Pro Tips

1. **Use Windows Terminal** (better than PowerShell)
   - Download from Microsoft Store
   - Supports tabs and better colors

2. **Keep SSH session open** to view logs:
   ```bash
   docker compose logs -f
   ```

3. **Bookmark these URLs** after deployment:
   - http://135.171.216.245
   - http://135.171.216.245:5000/health

4. **Test thoroughly** before presenting:
   - Login/Logout
   - Create events
   - Register for events
   - All major features

---

**Ready? Let's deploy! 🚀**
