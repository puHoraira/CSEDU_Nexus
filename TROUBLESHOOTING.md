# 🔧 Troubleshooting Guide - Team Ravenclaw

Quick solutions to common deployment issues.

---

## 🔌 Connection Issues

### Can't SSH to Server

**Symptoms:**
- "Connection refused"
- "Connection timed out"
- "Host unreachable"

**Solutions:**

1. **Check internet connection**
   ```powershell
   ping 135.171.216.245
   ```

2. **Verify SSH is installed**
   ```powershell
   ssh -V
   ```
   If not installed: Settings > Apps > Optional Features > Add "OpenSSH Client"

3. **Try with verbose output**
   ```powershell
   ssh -v azureuser@135.171.216.245
   ```

4. **Use PuTTY as alternative**
   - Download: https://www.putty.org/
   - Host: 135.171.216.245
   - Port: 22

---

## 🐳 Docker Issues

### Docker Not Installed

**Symptoms:**
- "docker: command not found"
- "docker compose: command not found"

**Solution:**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt update
sudo apt install -y docker-compose-plugin

# Logout and login again
exit
```

### Docker Permission Denied

**Symptoms:**
- "permission denied while trying to connect to the Docker daemon"

**Solution:**
```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Logout and login
exit

# Reconnect
ssh azureuser@135.171.216.245
```

### Docker Build Fails

**Symptoms:**
- Build errors during `docker compose build`
- "failed to solve" errors

**Solutions:**

1. **Check disk space**
   ```bash
   df -h
   ```

2. **Clean Docker cache**
   ```bash
   docker system prune -a
   ```

3. **Rebuild without cache**
   ```bash
   docker compose build --no-cache
   ```

---

## 🌐 Network Issues

### Port Already in Use

**Symptoms:**
- "port is already allocated"
- "address already in use"

**Solution:**

1. **Check what's using the port**
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :5000
   ```

2. **Stop conflicting service**
   ```bash
   # If Apache is running
   sudo systemctl stop apache2
   sudo systemctl disable apache2

   # If Nginx is running
   sudo systemctl stop nginx
   sudo systemctl disable nginx
   ```

3. **Kill specific process**
   ```bash
   # Find process ID
   sudo lsof -i :80
   sudo lsof -i :5000

   # Kill process
   sudo kill -9 <PID>
   ```

### Firewall Blocking Access

**Symptoms:**
- Can't access from browser
- Connection timeout

**Solution:**
```bash
# Check firewall status
sudo ufw status

# Allow ports
sudo ufw allow 80/tcp
sudo ufw allow 5000/tcp

# If firewall is inactive, enable it
sudo ufw enable
```

---

## 🗄️ Database Issues

### MongoDB Connection Failed

**Symptoms:**
- "MongoServerError: Authentication failed"
- "MongoNetworkError: failed to connect"

**Solutions:**

1. **Check MongoDB URI**
   ```bash
   cat backend/.env | grep MONGODB_URI
   ```

2. **Test connection from container**
   ```bash
   docker exec -it csedu_backend sh
   ping cluster0.pvmqq7k.mongodb.net
   exit
   ```

3. **Verify internet access**
   ```bash
   curl -I https://www.google.com
   ```

4. **Check MongoDB Atlas**
   - Login to MongoDB Atlas
   - Verify cluster is running
   - Check IP whitelist (should allow all: 0.0.0.0/0)

---

## 🎨 Frontend Issues

### Frontend Not Loading

**Symptoms:**
- Blank page
- "Cannot GET /"
- 404 errors

**Solutions:**

1. **Check container status**
   ```bash
   docker compose ps
   ```

2. **Check frontend logs**
   ```bash
   docker compose logs frontend
   ```

3. **Rebuild frontend**
   ```bash
   docker compose build frontend --no-cache
   docker compose up -d frontend
   ```

4. **Check Nginx config**
   ```bash
   docker exec -it csedu_frontend cat /etc/nginx/conf.d/default.conf
   ```

### API Calls Failing

**Symptoms:**
- "Network Error"
- "Failed to fetch"
- CORS errors

**Solutions:**

1. **Check backend is running**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Verify API URL in frontend**
   ```bash
   cat .env
   # Should show: VITE_API_BASE_URL=http://nexus.farefin.com:5000/api/v1
   ```

3. **Check CORS settings**
   ```bash
   cat backend/.env | grep CLIENT_ORIGIN
   # Should show: CLIENT_ORIGIN=http://nexus.farefin.com
   ```

4. **Rebuild frontend with correct API URL**
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

---

## ⚙️ Backend Issues

### Backend Not Starting

**Symptoms:**
- Container exits immediately
- "Exited (1)" status

**Solutions:**

1. **Check backend logs**
   ```bash
   docker compose logs backend
   ```

2. **Check environment variables**
   ```bash
   docker exec -it csedu_backend env | grep -E "MONGODB|PORT|NODE_ENV"
   ```

3. **Verify backend .env file**
   ```bash
   cat backend/.env
   ```

4. **Restart backend**
   ```bash
   docker compose restart backend
   ```

### Health Check Failing

**Symptoms:**
- Health check returns error
- Backend marked as unhealthy

**Solutions:**

1. **Test health endpoint**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check if backend is listening**
   ```bash
   sudo netstat -tulpn | grep :5000
   ```

3. **Check backend logs**
   ```bash
   docker compose logs backend --tail=50
   ```

4. **Restart backend**
   ```bash
   docker compose restart backend
   ```

---

## 🔄 Container Issues

### Containers Keep Restarting

**Symptoms:**
- Container status shows "Restarting"
- Containers exit and restart repeatedly

**Solutions:**

1. **Check logs for errors**
   ```bash
   docker compose logs -f
   ```

2. **Check resource usage**
   ```bash
   docker stats
   free -h
   df -h
   ```

3. **Stop and remove containers**
   ```bash
   docker compose down
   docker compose up -d
   ```

### Can't Remove Containers

**Symptoms:**
- "container is in use"
- "device or resource busy"

**Solutions:**

1. **Force stop**
   ```bash
   docker compose down --remove-orphans
   ```

2. **Force remove**
   ```bash
   docker rm -f csedu_backend csedu_frontend
   ```

3. **Restart Docker**
   ```bash
   sudo systemctl restart docker
   ```

---

## 🌍 DNS Issues

### Domain Not Resolving

**Symptoms:**
- "nexus.farefin.com" doesn't work
- DNS lookup fails

**Solutions:**

1. **Check DNS configuration**
   ```bash
   nslookup nexus.farefin.com
   ```

2. **Use IP address temporarily**
   - Frontend: http://135.171.216.245
   - Backend: http://135.171.216.245:5000

3. **Contact instructor**
   - Request DNS configuration
   - Domain: nexus.farefin.com
   - Points to: 135.171.216.245

4. **Wait for DNS propagation**
   - Can take 5-60 minutes
   - Check with: `nslookup nexus.farefin.com`

---

## 🔍 Debugging Commands

### Check Everything

```bash
# Container status
docker compose ps

# View all logs
docker compose logs -f

# Check resource usage
docker stats

# Check disk space
df -h

# Check memory
free -h

# Check network
sudo netstat -tulpn | grep -E ':(80|5000)'

# Test backend
curl http://localhost:5000/health

# Test frontend
curl http://localhost:80
```

### Get Container Shell

```bash
# Backend container
docker exec -it csedu_backend sh

# Frontend container
docker exec -it csedu_frontend sh

# Inside container, check:
env                    # Environment variables
ps aux                 # Running processes
netstat -tulpn         # Network connections
```

---

## 🆘 Nuclear Option (Start Fresh)

If nothing works, start completely fresh:

```bash
# Stop everything
docker compose down -v

# Remove all containers
docker rm -f $(docker ps -aq)

# Remove all images
docker rmi -f $(docker images -q)

# Remove all volumes
docker volume prune -f

# Remove all networks
docker network prune -f

# Clean system
docker system prune -a -f

# Start fresh
cd ~/nexus-app
git pull origin main
docker compose build --no-cache
docker compose up -d
```

---

## 📞 Getting Help

### Before Asking for Help

1. **Check logs**
   ```bash
   docker compose logs -f
   ```

2. **Run verification script**
   ```bash
   chmod +x verify-deployment.sh
   ./verify-deployment.sh
   ```

3. **Document the error**
   - What command did you run?
   - What error message did you get?
   - What have you tried?

### Where to Get Help

1. **Check documentation**
   - START_HERE_WINDOWS.md
   - DEPLOY_FROM_WINDOWS.md
   - DEPLOYMENT.md

2. **Contact team members**
   - Share error messages
   - Share logs

3. **Ask instructor**
   - Provide detailed error information
   - Show what you've tried

---

## ✅ Verification Checklist

Use this to verify everything is working:

```bash
# 1. Containers running
docker compose ps
# Both should show "Up"

# 2. Backend healthy
curl http://localhost:5000/health
# Should return: {"ok":true,"service":"csedu-nexus-api"}

# 3. Frontend accessible
curl -I http://localhost:80
# Should return: HTTP/1.1 200 OK

# 4. Ports listening
sudo netstat -tulpn | grep -E ':(80|5000)'
# Should show both ports

# 5. No errors in logs
docker compose logs --tail=50
# Check for errors

# 6. Resource usage normal
docker stats --no-stream
# CPU and memory should be reasonable
```

---

## 💡 Pro Tips

1. **Always check logs first**
   ```bash
   docker compose logs -f
   ```

2. **Use verbose output for debugging**
   ```bash
   docker compose up --verbose
   ```

3. **Keep a terminal open with logs**
   - Window 1: View logs
   - Window 2: Run commands

4. **Document what works**
   - Keep notes of solutions
   - Share with team

5. **Don't panic**
   - Most issues are simple
   - Check logs
   - Read error messages carefully

---

**Remember: Most issues can be solved by checking logs and restarting containers!**

**Good luck! 🍀**
