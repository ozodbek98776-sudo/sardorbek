#!/bin/bash

# Install Sharp with proper build tools
echo "🔧 Installing Sharp image processing library..."

cd /var/www/sardorbek.biznesjon.uz/server

# Remove old node_modules if they exist
echo "🗑️  Cleaning old node_modules..."
rm -rf node_modules package-lock.json

# Install dependencies fresh
echo "📦 Installing dependencies..."
npm install

# Verify sharp is installed
echo "✅ Checking if sharp is installed..."
npm list sharp

# Restart the API
echo "🔄 Restarting API..."
pm2 restart sardorbek-api

# Show logs
echo "📋 Showing API logs..."
pm2 logs sardorbek-api --lines 20

echo "✅ Done! Sharp should now be installed and working."
