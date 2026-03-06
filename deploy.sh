#!/bin/bash
# =============================================
# SARDORBEK DEPLOY SKRIPTI
# =============================================
# Workflow:
#   Lokal: kod yoz → git push
#   VPS:   git pull → npm run build → pm2 restart
#
# VPS da build qilinadi - bu standart va to'g'ri.
# index.html va barcha fayllar bir xil muhitdan
# chiqadi → hash mos keladi → muammo yo'q.
# =============================================

set -e

VPS="root@207.180.195.154"
PROJECT="/var/www/sardorbek"
NVM="export NVM_DIR=\"\$HOME/.nvm\" && [ -s \"\$NVM_DIR/nvm.sh\" ] && \\. \"\$NVM_DIR/nvm.sh\""

echo "🚀 Deploy boshlandi..."

# 1. So'nggi kodlarni olish
echo "📥 git pull..."
ssh $VPS "cd $PROJECT && git pull origin main"

# 2. Frontend build (VPS da - standart)
echo "🔨 Frontend build..."
ssh $VPS "$NVM && cd $PROJECT/client && npm run build"

# 3. Backend restart
echo "🔄 Backend restart..."
ssh $VPS "pm2 restart sardorbek-backend --update-env"

echo "✅ Deploy tugadi!"
echo "🌐 https://sardorbek.biznesjon.uz"
