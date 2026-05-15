#!/bin/bash

# Nginx Reverse Proxy Setup for nexus.farefin.com
# This script sets up Nginx to proxy requests to Docker containers

echo "Setting up Nginx reverse proxy for nexus.farefin.com..."

# Install Nginx if not installed
sudo apt update
sudo apt install -y nginx

# Create Nginx configuration for nexus.farefin.com
sudo tee /etc/nginx/sites-available/nexus.farefin.com > /dev/null <<'EOF'
server {
    listen 80;
    server_name nexus.farefin.com;

    # Frontend - proxy to port 8080
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

    # Backend API - proxy to port 8081
    location /api/ {
        proxy_pass http://localhost:8081/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8081/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/nexus.farefin.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx

echo "✓ Nginx reverse proxy configured successfully!"
echo ""
echo "Your application is now accessible at:"
echo "  http://nexus.farefin.com"
echo ""
echo "Next step: Install SSL certificate with:"
echo "  sudo certbot --nginx -d nexus.farefin.com"
