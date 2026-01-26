#!/bin/bash

# =============================================
# SARDORBEK.BIZNESJON.UZ DEPLOY SCRIPT
# Bu skriptni VPS da ishga tushiring
# =============================================

set -e

DOMAIN="sardorbek.biznesjon.uz"
APP_DIR="/var/www/$DOMAIN"
APP_NAME="sardorbek-furnitura"
PORT=3001

echo "🚀 $DOMAIN ga deploy boshlanmoqda..."

# 1. Papka yaratish
echo "📁 Papka yaratilmoqda..."
mkdir -p $APP_DIR
cd $APP_DIR

# 2. Eski fayllarni tozalash (agar mavjud bo'lsa)
if [ -d ".git" ]; then
    echo "📥 Mavjud loyiha yangilanmoqda..."
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

# 4. .env faylini yaratish
echo "⚙️ Environment sozlanmoqda..."
cat > .env << 'ENVEOF'
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true
JWT_SECRET=sardor_furnitura_jwt_secret_key_2024_production_secure
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
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINXEOF'
server {
    listen 80;
    server_name sardorbek.biznesjon.uz;

    client_max_body_size 50M;

    location / {
        root /var/www/sardorbek.biznesjon.uz/server/public;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
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
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Nginx test
if ! nginx -t; then
    echo "❌ Nginx konfiguratsiya xatosi!"
    exit 1
fi

# Nginx reload
systemctl reload nginx

# 9. SSL sertifikat o'rnatish (Let's Encrypt)
echo "🔒 SSL sertifikat o'rnatilmoqda..."
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
fi

# Certbot bilan SSL o'rnatish (without --redirect first time)
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# SSL auto-renewal
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "✅ =================================="
echo "✅ DEPLOY MUVAFFAQIYATLI YAKUNLANDI!"
echo "✅ =================================="
echo ""
echo "🌐 Sayt: https://$DOMAIN"
echo "📊 PM2 status: pm2 status"
echo "📝 Loglar: pm2 logs $APP_NAME"
echo ""
