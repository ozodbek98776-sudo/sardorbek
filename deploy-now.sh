#!/bin/bash

# VPS Deploy Script
# sardorbek.biznesjon.uz ga deploy qilish

DOMAIN="sardorbek.biznesjon.uz"
APP_DIR="/var/www/$DOMAIN"
APP_NAME="sardorbek-furnitura"
BACKEND_PORT=8000

echo "🚀 $DOMAIN ga deploy boshlanmoqda..."

# SSH orqali VPS ga kirish va deploy qilish
ssh root@45.67.216.61 << 'DEPLOY_SCRIPT'

set -e

DOMAIN="sardorbek.biznesjon.uz"
APP_DIR="/var/www/$DOMAIN"
APP_NAME="sardorbek-furnitura"
BACKEND_PORT=8000

echo "📁 Papka tekshirilmoqda..."
cd $APP_DIR

echo "📥 Repository yangilanmoqda..."
git fetch origin
git reset --hard origin/main

echo "📦 Backend dependencies o'rnatilmoqda..."
cd server
npm install --production

echo "🔨 Client build qilinmoqda..."
cd ../client
npm install
npm run build

echo "📁 Build fayllar ko'chirilmoqda..."
cd ..
rm -rf server/public
mkdir -p server/public
cp -r client/dist/* server/public/

echo "🔄 PM2 bilan qayta ishga tushirilmoqda..."
cd server
pm2 restart $APP_NAME || pm2 start src/index.js --name "$APP_NAME"
pm2 save

echo "✅ Deploy muvaffaqiyatli yakunlandi!"
echo "📊 PM2 status: pm2 status"
echo "📝 Loglar: pm2 logs $APP_NAME"

DEPLOY_SCRIPT

echo "✅ Deploy tugadi!"
