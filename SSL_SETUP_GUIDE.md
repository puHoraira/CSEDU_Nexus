# 🔒 SSL Certificate Setup Guide - Team Ravenclaw

## Current Status

✅ **Application deployed** on port 8080
✅ **Accessible** at http://135.171.216.245:8080
⏳ **SSL needed** for HTTPS (nexus.farefin.com)

---

## Prerequisites

Before setting up SSL, you need:

1. ✅ **Domain configured** - nexus.farefin.com pointing to 135.171.216.245
2. ✅ **Application running** on port 8080
3. ⏳ **Nginx reverse proxy** - Need to set up
4. ⏳ **Let's Encrypt certificate** - Need to install

---

## Step 1: Install Certbot (Let's Encrypt Client)

SSH to your server and run:

```bash
# Update package list
sudo apt update

# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

---

## Step 2: Install Nginx (Reverse Proxy)

We need Nginx on the host to handle SSL and proxy to your Docker containers:

```bash
# Install Nginx
sudo apt install -y nginx

# Check if Nginx is running
sudo systemctl status nginx

# If not running, start it
sudo systemctl start nginx
sudo systemctl enable nginx
```

---

## Step 3: Configure Nginx Reverse Proxy

Create Nginx configuration for your application:

```bash
# Create configuration file
sudo nano /etc/nginx/sites-available/nexus.farefin.com
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name nexus.farefin.com;

    # Frontend proxy
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Save and exit (Ctrl+X, then Y, then Enter)

---

## Step 4: Enable the Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/nexus.farefin.com /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 5: Obtain SSL Certificate

Now that Nginx is configured, get the SSL certificate:

```bash
# Obtain and install SSL certificate
sudo certbot --nginx -d nexus.farefin.com

# Follow the prompts:
# 1. Enter your email address
# 2. Agree to terms of service (Y)
# 3. Choose whether to share email (Y or N)
# 4. Choose redirect option (2 - Redirect HTTP to HTTPS)
```

Certbot will automatically:
- Obtain the certificate
- Modify your Nginx configuration
- Set up automatic renewal

---

## Step 6: Verify SSL Certificate

```bash
# Check certificate status
sudo certbot certificates

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## Step 7: Update Environment Files

After SSL is set up, update your environment files to use HTTPS:

### Update `.env`:
```env
VITE_API_BASE_URL=https://nexus.farefin.com/api/v1
```

### Update `backend/.env`:
```env
CLIENT_ORIGIN=https://nexus.farefin.com
FRONTEND_URL=https://nexus.farefin.com
BACKEND_URL=https://nexus.farefin.com
```

### Rebuild and restart:
```bash
cd ~/nexus-app
git pull origin main
docker compose down
docker compose build
docker compose up -d
```

---

## Step 8: Open Port 443 (HTTPS)

```bash
# Allow HTTPS traffic
sudo ufw allow 443/tcp

# Allow HTTP (for redirect)
sudo ufw allow 80/tcp

# Check firewall status
sudo ufw status
```

---

## Step 9: Test Your Application

Access your application:
- **HTTPS**: https://nexus.farefin.com (✅ Secure)
- **HTTP**: http://nexus.farefin.com (→ Redirects to HTTPS)

---

## Automatic Certificate Renewal

Let's Encrypt certificates expire after 90 days, but Certbot sets up automatic renewal:

```bash
# Check renewal timer
sudo systemctl status certbot.timer

# Manual renewal (if needed)
sudo certbot renew

# Test renewal process
sudo certbot renew --dry-run
```

---

## Complete Nginx Configuration (After Certbot)

After running Certbot, your Nginx config will look like this:

```nginx
server {
    server_name nexus.farefin.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/nexus.farefin.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/nexus.farefin.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = nexus.farefin.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name nexus.farefin.com;
    return 404; # managed by Certbot
}
```

---

## Troubleshooting

### Issue: DNS not configured

**Error:** Certbot can't verify domain ownership

**Solution:**
1. Contact instructor to configure DNS
2. Verify with: `nslookup nexus.farefin.com`
3. Wait for DNS propagation (5-60 minutes)

### Issue: Port 80 already in use

**Error:** Nginx can't start on port 80

**Solution:**
```bash
# Check what's using port 80
sudo netstat -tulpn | grep :80

# If it's another Nginx or Apache
sudo systemctl stop apache2
sudo systemctl stop nginx
sudo systemctl start nginx
```

### Issue: Certificate renewal fails

**Solution:**
```bash
# Check Certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Manually renew
sudo certbot renew --force-renewal
```

---

## Summary

**Before SSL:**
- ❌ http://135.171.216.245:8080 (Insecure, with port)

**After SSL:**
- ✅ https://nexus.farefin.com (Secure, no port needed)
- ✅ Automatic HTTPS redirect
- ✅ Certificate auto-renewal
- ✅ Professional deployment

---

## Quick Commands Reference

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/nexus.farefin.com

# Enable site
sudo ln -s /etc/nginx/sites-available/nexus.farefin.com /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d nexus.farefin.com

# Open HTTPS port
sudo ufw allow 443/tcp

# Check certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run
```

---

## Next Steps

1. **Wait for DNS** - Instructor needs to configure nexus.farefin.com
2. **Install Nginx** - Set up reverse proxy
3. **Get SSL certificate** - Run Certbot
4. **Update environment files** - Use HTTPS URLs
5. **Test application** - Access via https://nexus.farefin.com

---

**Team Ravenclaw - Almost there! Just need DNS configuration and SSL setup!** 🦅🔒
