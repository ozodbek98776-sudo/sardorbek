#!/bin/bash

# =============================================
# SARDORBEK.BIZNESJON.UZ - QUICK DEPLOY SCRIPT
# Tezkor deploy uchun
# =============================================

set -e

DOMAIN="sardorbek.biznesjon.uz"
APP_DIR="/var/www/$DOMAIN"
APP_NAME="sardorbek-furnitura"
PORT=8000

echo "🚀 $DOMAIN ga tezkor deploy boshlanmoqda..."

# 1. Papka yaratish
echo "📁 Papka tekshirilmoqda..."
mkdir -p $APP_DIR
cd $APP_DIR

# 2. Repository yangilanishi
echo "📥 Repository yangilanmoqda..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    echo "📥 Loyiha yuklab olinmoqda..."
    git clone https://github.com/ozodbek98776-sudo/sardorbek.git . --depth 1
fi

# 3. Server dependencies
echo "📦 Server dependencies o'rnatilmoqda..."
cd server
npm install --production

# 4. .env faylini tekshirish
if [ ! -f ".env" ]; then
    echo "⚙️ .env fayli yaratilmoqda..."
    cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=8000
MONGODB_URI=mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true
JWT_SECRET=CHANGE_THIS_TO_SECURE_RANDOM_STRING_IN_PRODUCTION
ADMIN_LOGIN=Admin321
ADMIN_PASSWORD=CHANGE_THIS_PASSWORD_IN_PRODUCTION
CLIENT_URL=https://sardorbek.biznesjon.uz
CLIENT_URL_PROD=https://sardorbek.biznesjon.uz
TELEGRAM_BOT_TOKEN=8427884507:AAFv6sTuqshvA9tfU8Nph1z86SnOzd6gc84
TELEGRAM_CHAT_ID=6491844834
TELEGRAM_DEBT_BOT_TOKEN=8016326537:AAF512p_3LMD-YXNxTlLH5mVGz9EjYvhVyI
TELEGRAM_DEBT_CHAT_ID=7935196609
POS_TELEGRAM_BOT_TOKEN=7772438201:AAFrJ2m1oooTCWIIOiX11MikJhF2g2F8iag
POS_ADMIN_CHAT_ID=7857091741
PARTNER_BOT_TOKEN=8575994675:AAGb58rC7mwhbnElaNIS_m5cNVEgK19cTVQ
PARTNER_CHAT_ID=7857091741
UZUM_CHAT_ID=7857091741
ISHONCH_CHAT_ID=7857091741
YANDEX_CHAT_ID=7857091741
ENVEOF
else
    echo "✓ .env fayli mavjud"
fi

# 5. Client build
echo "🔨 Client build qilinmoqda..."
cd ../client
npm install
npm run build

# 6. Build ni server ga ko'chirish
echo "📁 Build fayllar ko'chirilmoqda..."
cd ..
rm -rf server/public
mkdir -p server/public
cp -r client/dist/* server/public/

# 7. PM2 bilan ishga tushirish
echo "🔄 PM2 bilan ishga tushirilmoqda..."
cd server

# PM2 o'rnatilganligini tekshirish
if ! command -v pm2 &> /dev/null; then
    echo "PM2 o'rnatilmoqda..."
    npm install -g pm2
fi

# Agar allaqachon ishga tushgan bo'lsa restart, aks holda start
if pm2 describe $APP_NAME > /dev/null 2>&1; then
    echo "♻️ Mavjud process qayta ishga tushirilmoqda..."
    pm2 restart $APP_NAME
else
    echo "🆕 Yangi process ishga tushirilmoqda..."
    pm2 start src/index.js --name "$APP_NAME"
fi
pm2 save

# 8. Nginx konfiguratsiya
echo "🌐 Nginx sozlanmoqda..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name sardorbek.biznesjon.uz;
    client_max_body_size 50M;

    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sardorbek.biznesjon.uz;
    client_max_body_size 50M;

    ssl_certificate /etc/letsencrypt/live/sardorbek.biznesjon.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sardorbek.biznesjon.uz/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        root /var/www/sardorbek.biznesjon.uz/server/public;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /uploads {
        alias /var/www/sardorbek.biznesjon.uz/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

# Nginx symlink
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Nginx test
if ! sudo nginx -t; then
    echo "❌ Nginx konfiguratsiya xatosi!"
    exit 1
fi

# Nginx reload
sudo systemctl reload nginx

echo ""
echo "✅ =================================="
echo "✅ DEPLOY MUVAFFAQIYATLI YAKUNLANDI!"
echo "✅ =================================="
echo ""
echo "🌐 Sayt: https://$DOMAIN"
echo "📊 PM2 status: pm2 status"
echo "📝 Loglar: pm2 logs $APP_NAME"
echo ""
echo "🔍 Backend tekshirish:"
echo "   curl http://localhost:8000/api/health"
echo ""
