# 🚨 Deployment Issue: BusGo Showing on nexus.farefin.com

## Problem
When accessing `nexus.farefin.com`, it shows **BusGo** application instead of your CSEDU Nexus application.

## Root Cause
The subdomain `nexus.farefin.com` is currently pointing to a different application (BusGo from Team DU_VibeCoders). This means:

1. **DNS is already configured** - Good news!
2. **Wrong application is deployed** - Need to fix this
3. **Port 80 is occupied** - BusGo is using it

## Solution

### Option 1: Contact Instructor (RECOMMENDED)
**Ask your instructor to:**
1. Stop the BusGo application on nexus.farefin.com
2. OR assign you a different subdomain
3. OR give you access to deploy on nexus.farefin.com

### Option 2: Use Different Subdomain
If nexus is taken, ask for an alternative:
- `ravenclaw.farefin.com`
- `csedu-nexus.farefin.com`
- `team-ravenclaw.farefin.com`

Then update your .env files with the new subdomain.

### Option 3: Deploy on IP Address (Temporary)
You can deploy directly on the IP address while waiting for subdomain:

1. **Update environment files to use IP:**

**.env:**
```env
VITE_API_BASE_URL=http://135.171.216.245:5000/api/v1
```

**backend/.env:**
```env
CLIENT_ORIGIN=http://135.171.216.245
FRONTEND_URL=http://135.171.216.245
BACKEND_URL=http://135.171.216.245:5000
```

2. **Deploy normally:**
```bash
ssh azureuser@135.171.216.245
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
cd nexus-app
docker compose build
docker compose up -d
```

3. **Access via IP:**
- Frontend: http://135.171.216.245
- Backend: http://135.171.216.245:5000

## What to Tell Your Instructor

> "Sir/Madam, we are Team Ravenclaw assigned to Server 2 (135.171.216.245). 
> The subdomain nexus.farefin.com is currently showing BusGo application. 
> Could you please either:
> 1. Stop BusGo and allow us to deploy on nexus.farefin.com, OR
> 2. Assign us a different subdomain like ravenclaw.farefin.com
> 
> We have already dockerized our application and pushed to GitHub:
> https://github.com/puHoraira/CSEDU_Nexus"

## Checking What's Running on Server

To see what's currently running on the server:

```bash
# SSH to server
ssh azureuser@135.171.216.245

# Check running containers
docker ps

# Check what's using port 80
sudo netstat -tulpn | grep :80

# Check what's using port 5000
sudo netstat -tulpn | grep :5000
```

## If You Get Permission to Deploy

Once you get permission:

1. **Stop existing application:**
```bash
# Find the directory
ls -la ~

# If BusGo is in a directory like busgo-app
cd busgo-app  # or whatever the directory name is
docker compose down

# Or stop all containers
docker stop $(docker ps -q)
```

2. **Deploy your application:**
```bash
cd ~
git clone https://github.com/puHoraira/CSEDU_Nexus.git nexus-app
cd nexus-app
docker compose build
docker compose up -d
```

## Alternative: Use Different Ports

If you can't use port 80, modify docker-compose.yml to use different ports:

```yaml
frontend:
  ports:
    - "8080:80"  # Use port 8080 instead of 80

backend:
  ports:
    - "5001:5000"  # Use port 5001 instead of 5000
```

Then access:
- Frontend: http://nexus.farefin.com:8080
- Backend: http://nexus.farefin.com:5001

## Summary

**Current Status:**
- ✅ Code pushed to GitHub
- ✅ Docker configuration ready
- ✅ Environment files configured
- ❌ Subdomain occupied by another team
- ⏳ Waiting for instructor to resolve

**Next Steps:**
1. Contact instructor about subdomain issue
2. Get assigned subdomain or permission
3. Deploy using the deployment scripts
4. Verify deployment

**Temporary Workaround:**
- Deploy using IP address (135.171.216.245)
- Update .env files to use IP instead of domain
- Access application via IP until subdomain is resolved

---

**Don't worry! This is a common issue in shared server environments. Your instructor will resolve it quickly.**
