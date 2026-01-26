#!/bin/bash

set -e

DOMAIN="sardorbek.biznesjon.uz"
APP_DIR="/var/www/$DOMAIN"
APP_NAME="sardorbek-furnitura"
PORT=8000

echo "=========================================="
echo "SARDORBEK DEPLOY - 0 DAN BOSHLANMOQDA"
echo "=========================================="
echo ""

# 1. NGINX KONFIGURATSIYASINI TO'G'IRISH
echo "1. NGINX konfiguratsiyasini to'g'irmoqda..."
sudo rm -f /etc/nginx/sites-available/$DOMAIN
sudo rm -f /etc/nginx/sites-enabled/$DOMAIN

sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << 'EOF'
server {
    listen 80;
    server_name sardorbek.biznesjon.uz;
    client_max_body_size 50M;

    location / {
        root /var/www/sardorbek.biznesjon.uz/server/public;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, max-age=3600";
    }

    location /api {
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

    location /uploads {
        alias /var/www/sardorbek.biznesjon.uz/server/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

echo "Nginx konfiguratsiyasini tekshirmoqda..."
if ! sudo nginx -t; then
    echo "XATO: Nginx konfiguratsiya xatosi!"
    exit 1
fi

echo "Nginx qayta yuklanyapti..."
sudo systemctl reload nginx
echo "✓ NGINX to'g'irildi"
echo ""

# 2. LOYIHANI YANGILASH
echo "2. Loyihani yangilanyapti..."
mkdir -p $APP_DIR
cd $APP_DIR

if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    git clone https://github.com/ozodbek98776-sudo/sardorbek.git . --depth 1
fi
echo "✓ Loyiha yangilandi"
echo ""

# 3. BACKEND DEPENDENCIES
echo "3. Backend dependencies o'rnatilmoqda..."
cd $APP_DIR/server
npm install --production
echo "✓ Backend dependencies o'rnatildi"
echo ""

# 4. ENVIRONMENT VARIABLES
echo "4. Environment variables sozlanmoqda..."
if [ ! -f ".env" ]; then
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
    echo "✓ .env fayli yaratildi"
else
    echo "✓ .env fayli mavjud"
fi
echo ""

# 5. FRONTEND BUILD
echo "5. Frontend build qilinmoqda..."
cd $APP_DIR/client
npm install
npm run build
echo "✓ Frontend build qilindi"
echo ""

# 6. BUILD NI SERVER GA KO'CHIRISH
echo "6. Build fayllar ko'chirilmoqda..."
cd $APP_DIR
rm -rf server/public
mkdir -p server/public
cp -r client/dist/* server/public/
echo "✓ Build fayllar ko'chirildi"
echo ""

# 7. PM2 BILAN BACKEND ISHGA TUSHIRISH
echo "7. Backend PM2 bilan ishga tushirilmoqda..."
cd $APP_DIR/server

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

if pm2 describe $APP_NAME > /dev/null 2>&1; then
    pm2 delete $APP_NAME
fi

pm2 start src/index.js --name "$APP_NAME"
pm2 save
echo "✓ Backend ishga tushirildi"
echo ""

# 8. SSL SERTIFIKAT
echo "8. SSL sertifikat tekshirilmoqda..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
fi

sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
echo "✓ SSL sertifikat tekshirildi"
echo ""

# 9. TEKSHIRISH
echo "9. Tekshirish boshlanmoqda..."
echo ""
echo "PM2 status:"
pm2 status
echo ""

sleep 2

echo "API test qilinmoqda..."
if curl -s http://localhost:8000/api/health | grep -q "ok"; then
    echo "✓ API to'g'ri ishlayapti"
else
    echo "⚠ API javob bermayapti, loglarni tekshiring:"
    pm2 logs $APP_NAME --lines 20
fi

echo ""
echo "=========================================="
echo "✓ DEPLOY MUVAFFAQIYATLI YAKUNLANDI!"
echo "=========================================="
echo ""
echo "Sayt: https://$DOMAIN"
echo "Loglar: pm2 logs $APP_NAME"
echo "Status: pm2 status"
echo ""
