#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Sardorbek Furnitura - Nginx Fix & Deploy ===${NC}"

# Step 1: Remove old Nginx configurations
echo -e "${YELLOW}Step 1: Removing old Nginx configurations...${NC}"
sudo rm -f /etc/nginx/sites-available/*
sudo rm -f /etc/nginx/sites-enabled/*
echo -e "${GREEN}✓ Old configurations removed${NC}"

# Step 2: Create fresh Nginx configuration
echo -e "${YELLOW}Step 2: Creating fresh Nginx configuration...${NC}"
sudo tee /etc/nginx/sites-available/sardorbek.biznesjon.uz > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name sardorbek.biznesjon.uz;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sardorbek.biznesjon.uz;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/sardorbek.biznesjon.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sardorbek.biznesjon.uz/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # Client upload size
    client_max_body_size 50M;

    # Serve static files from /server/public
    location / {
        root /var/www/sardorbek.biznesjon.uz/server/public;
        try_files $uri $uri/ /index.html;
    }

    # API proxy to backend on port 8000
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/sardorbek.biznesjon.uz/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF
echo -e "${GREEN}✓ Fresh Nginx configuration created${NC}"

# Step 3: Create symlink
echo -e "${YELLOW}Step 3: Creating symlink...${NC}"
sudo ln -sf /etc/nginx/sites-available/sardorbek.biznesjon.uz /etc/nginx/sites-enabled/sardorbek.biznesjon.uz
echo -e "${GREEN}✓ Symlink created${NC}"

# Step 4: Test Nginx configuration
echo -e "${YELLOW}Step 4: Testing Nginx configuration...${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

# Step 5: Reload Nginx
echo -e "${YELLOW}Step 5: Reloading Nginx...${NC}"
sudo systemctl reload nginx
echo -e "${GREEN}✓ Nginx reloaded${NC}"

# Step 6: Check backend status
echo -e "${YELLOW}Step 6: Checking backend status...${NC}"
if curl -s http://localhost:8000/api/health > /dev/null; then
    echo -e "${GREEN}✓ Backend is running on port 8000${NC}"
else
    echo -e "${RED}✗ Backend is not responding on port 8000${NC}"
    echo -e "${YELLOW}Checking PM2 status...${NC}"
    pm2 status
fi

# Step 7: Verify SSL certificate
echo -e "${YELLOW}Step 7: Checking SSL certificate...${NC}"
if [ -f /etc/letsencrypt/live/sardorbek.biznesjon.uz/fullchain.pem ]; then
    echo -e "${GREEN}✓ SSL certificate found${NC}"
    sudo certbot certificates | grep sardorbek.biznesjon.uz
else
    echo -e "${YELLOW}⚠ SSL certificate not found. Installing with Certbot...${NC}"
    sudo certbot --nginx -d sardorbek.biznesjon.uz --non-interactive --agree-tos -m admin@sardorbek.biznesjon.uz
fi

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo -e "${YELLOW}Website URL: https://sardorbek.biznesjon.uz${NC}"
echo -e "${YELLOW}API Health: curl http://localhost:8000/api/health${NC}"
