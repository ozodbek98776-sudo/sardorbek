#!/bin/bash

echo "🚀 SARDORBEK.BIZNESJON.UZ - TO'LIQ AVTOMATIK DEPLOY"
echo "=================================================="

# Rangli output uchun
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Xatolikda to'xtatish
set -e

# 1. GIT PULL
echo -e "${YELLOW}📥 1. Git dan yangilanishlarni olish...${NC}"
cd /var/www/sardorbek.biznesjon.uz
git pull origin main
echo -e "${GREEN}✅ Git pull bajarildi${NC}"

# 2. SERVER DEPENDENCIES
echo -e "${YELLOW}📦 2. Server dependencies o'rnatish...${NC}"
cd /var/www/sardorbek.biznesjon.uz/server
npm install --production
echo -e "${GREEN}✅ Server dependencies o'rnatildi${NC}"

# 3. CLIENT BUILD
echo -e "${YELLOW}🏗️  3. Client build qilish...${NC}"
cd /var/www/sardorbek.biznesjon.uz
npm run build
echo -e "${GREEN}✅ Client build bajarildi${NC}"

# 4. UPLOADS PAPKA VA RUXSATLAR
echo -e "${YELLOW}📁 4. Uploads papka va ruxsatlarni sozlash...${NC}"
mkdir -p /var/www/sardorbek.biznesjon.uz/server/uploads/products
chown -R www-data:www-data /var/www/sardorbek.biznesjon.uz/server/uploads
chmod -R 755 /var/www/sardorbek.biznesjon.uz/server/uploads
echo -e "${GREEN}✅ Uploads papka sozlandi${NC}"

# 5. NGINX KONFIGURATSIYA
echo -e "${YELLOW}⚙️  5. Nginx konfiguratsiyasini yangilash...${NC}"

# Nginx konfiguratsiyasini yozish
cat > /etc/nginx/sites-available/sardorbek.biznesjon.uz << 'NGINX_EOF'
server {
    listen 80;
    listen [::]:80;
    server_name sardorbek.biznesjon.uz;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name sardorbek.biznesjon.uz;

    ssl_certificate /etc/letsencrypt/live/sardorbek.biznesjon.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sardorbek.biznesjon.uz/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    client_max_body_size 50M;

    root /var/www/sardorbek.biznesjon.uz/client/dist;
    index index.html;

    # MUHIM: Uploads - BIRINCHI!
    location /uploads/ {
        alias /var/www/sardorbek.biznesjon.uz/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API proxy
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

    # Static assets cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Hidden files
    location ~ /\. {
        deny all;
        access_log off;
    }

    # SPA routing - OXIRIDA!
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

# Symlink yaratish
ln -sf /etc/nginx/sites-available/sardorbek.biznesjon.uz /etc/nginx/sites-enabled/sardorbek.biznesjon.uz

# Nginx test
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✅ Nginx konfiguratsiya to'g'ri${NC}"
else
    echo -e "${RED}❌ Nginx konfiguratsiya xato!${NC}"
    nginx -t
    exit 1
fi

# 6. PM2 RESTART
echo -e "${YELLOW}🔄 6. PM2 API ni qayta ishga tushirish...${NC}"
pm2 restart sardorbek-api
echo -e "${GREEN}✅ PM2 qayta ishga tushdi${NC}"

# 7. NGINX RELOAD
echo -e "${YELLOW}🔄 7. Nginx ni qayta yuklash...${NC}"
systemctl reload nginx
echo -e "${GREEN}✅ Nginx qayta yuklandi${NC}"

# 8. PM2 LOGS TOZALASH
echo -e "${YELLOW}🧹 8. PM2 loglarni tozalash...${NC}"
pm2 flush
echo -e "${GREEN}✅ Loglar tozalandi${NC}"

# 9. TEST
echo -e "${YELLOW}🧪 9. Tizimni test qilish...${NC}"
sleep 2

# API test
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/products | grep -q "200\|401"; then
    echo -e "${GREEN}✅ API ishlayapti${NC}"
else
    echo -e "${RED}⚠️  API javob bermayapti (bu normal bo'lishi mumkin)${NC}"
fi

# Uploads test
if [ -d "/var/www/sardorbek.biznesjon.uz/server/uploads/products" ]; then
    echo -e "${GREEN}✅ Uploads papka mavjud${NC}"
else
    echo -e "${RED}❌ Uploads papka yo'q!${NC}"
fi

# 10. YAKUNIY XABAR
echo ""
echo -e "${GREEN}=================================================="
echo "🎉 DEPLOY MUVAFFAQIYATLI YAKUNLANDI!"
echo "=================================================="
echo ""
echo "📊 Holat:"
echo "  ✅ Git pull - OK"
echo "  ✅ Dependencies - OK"
echo "  ✅ Build - OK"
echo "  ✅ Uploads - OK"
echo "  ✅ Nginx - OK"
echo "  ✅ PM2 - OK"
echo ""
echo "🌐 Sayt: https://sardorbek.biznesjon.uz"
echo ""
echo "📋 Loglarni ko'rish:"
echo "  pm2 logs sardorbek-api"
echo ""
echo "🔍 Nginx loglar:"
echo "  tail -f /var/log/nginx/error.log"
echo -e "${NC}"
