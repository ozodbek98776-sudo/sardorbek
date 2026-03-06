#!/bin/bash
# =============================================
# SARDORBEK DEPLOY SKRIPTI
# =============================================
# QOIDALAR:
#   1. Lokal: kod yoz → npm run build → commit → push
#   2. VPS: git pull → pm2 restart (rebuild YO'Q)
#
# SABAB: Windows va Linux Vite turli hash nomlar
# chiqaradi. Dist lokal build dan kelishi shart.
# =============================================

set -e

VPS="root@207.180.195.154"
PROJECT="/var/www/sardorbek"

echo "🚀 Deploy boshlandi..."

# 1. VPS dan so'nggi commit olish
echo "📥 git pull..."
ssh $VPS "cd $PROJECT && git pull origin main"

# 2. Backend restart (server fayllari o'zgargan bo'lsa)
echo "🔄 Backend restart..."
ssh $VPS "cd $PROJECT && pm2 restart sardorbek-backend --update-env"

echo "✅ Deploy tugadi!"
echo "🌐 https://sardorbek.biznesjon.uz"
