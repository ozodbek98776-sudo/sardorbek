#!/bin/bash

# =============================================
# VPS DEPLOY SCRIPT - Sardor Furnitura
# =============================================

echo "🚀 Sardor Furnitura VPS Deploy boshlanmoqda..."

# 1. Server dependencies o'rnatish
echo "📦 Server dependencies o'rnatilmoqda..."
cd server
npm install --production
cd ..

# 2. Client build qilish
echo "🔨 Client build qilinmoqda..."
cd client
npm install
npm run build
cd ..

# 3. Client build ni server ga ko'chirish
echo "📁 Client build server ga ko'chirilmoqda..."
rm -rf server/public
mkdir -p server/public
cp -r client/dist/* server/public/

# 4. PM2 bilan serverni ishga tushirish
echo "🔄 Server PM2 bilan ishga tushirilmoqda..."
cd server

# PM2 o'rnatilganligini tekshirish
if ! command -v pm2 &> /dev/null; then
    echo "PM2 o'rnatilmoqda..."
    npm install -g pm2
fi

# Eski processni to'xtatish
pm2 delete sardor-furnitura 2>/dev/null || true

# Yangi processni ishga tushirish
pm2 start src/index.js --name "sardor-furnitura" --env production

# PM2 ni startup ga qo'shish
pm2 save
pm2 startup

echo "✅ Deploy muvaffaqiyatli yakunlandi!"
echo ""
echo "📊 Server holati:"
pm2 status

echo ""
echo "🌐 Server manzili: http://YOUR_VPS_IP:8000"
echo "📝 Loglarni ko'rish: pm2 logs sardor-furnitura"
