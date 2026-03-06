#!/bin/bash
# =============================================
# SARDORBEK DEPLOY SKRIPTI
# =============================================
# Ishlatish: bash deploy.sh
#
# Workflow (doim shu tartibda):
#   1. Lokal: kod yoz → git add → git commit → git push
#   2. Keyin: bash deploy.sh
#
# QOIDALAR:
#   - Hech qachon SCP ishlatma
#   - Hech qachon lokal dist ni serverga ko'chirma
#   - VPS o'zi build qiladi (bir xil Linux muhit = bir xil hash)
#   - dist ni gitga qo'shma (.gitignore da)
# =============================================

set -e

VPS="root@207.180.195.154"
PROJECT="/var/www/sardorbek"
NVM_CMD='export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"'

echo "=== SARDORBEK DEPLOY ==="

# 1. So'nggi kodni VPS ga olish
echo "[1/3] git pull..."
ssh $VPS "cd $PROJECT && git pull origin main"

# 2. Frontend build (eski dist o'chirilib yangi build qilinadi)
echo "[2/3] Frontend build..."
ssh $VPS "bash -c '$NVM_CMD && rm -rf $PROJECT/client/dist && cd $PROJECT/client && npm run build'"

# 3. Backend restart
echo "[3/3] Backend restart..."
ssh $VPS "pm2 restart sardorbek-backend --update-env"

echo ""
echo "✅ Deploy tugadi: https://sardorbek.biznesjon.uz"
