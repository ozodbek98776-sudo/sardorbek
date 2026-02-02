#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     SARDORBEK FURNITURA - PRODUCTION DEPLOYMENT           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running on VPS
if [ ! -d "/var/www/sardorbek.biznesjon.uz" ]; then
  echo -e "${RED}✗ Error: Not on VPS or wrong directory${NC}"
  echo "This script must be run on VPS at /var/www/sardorbek.biznesjon.uz"
  exit 1
fi

# Navigate to project
cd /var/www/sardorbek.biznesjon.uz
echo -e "${GREEN}✓ Navigated to project directory${NC}"

# Step 1: Create backup
echo ""
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
BACKUP_DIR="backups/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r server "$BACKUP_DIR/server"
cp -r client "$BACKUP_DIR/client"
echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"

# Step 2: Pull latest code
echo ""
echo -e "${YELLOW}Step 2: Pulling latest code...${NC}"
git pull origin main
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Code pulled successfully${NC}"
  echo -e "${GREEN}  Latest commit: $(git log --oneline -1)${NC}"
else
  echo -e "${RED}✗ Failed to pull code${NC}"
  exit 1
fi

# Step 3: Install backend dependencies
echo ""
echo -e "${YELLOW}Step 3: Installing backend dependencies...${NC}"
cd server
npm install --production
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
  echo -e "${RED}✗ Failed to install backend dependencies${NC}"
  exit 1
fi

# Step 4: Install frontend dependencies
echo ""
echo -e "${YELLOW}Step 4: Installing frontend dependencies...${NC}"
cd ../client
npm install
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
  echo -e "${RED}✗ Failed to install frontend dependencies${NC}"
  exit 1
fi

# Step 5: Build frontend
echo ""
echo -e "${YELLOW}Step 5: Building frontend...${NC}"

# Production environment variables ni o'rnatish
if [ -f .env.production ]; then
  echo -e "${GREEN}✓ .env.production fayli topildi${NC}"
  # .env.production faylini .env ga ko'chirish (Vite uchun)
  cp .env.production .env
  echo -e "${GREEN}  VITE_FRONTEND_URL: $(grep VITE_FRONTEND_URL .env.production | cut -d= -f2)${NC}"
else
  echo -e "${RED}✗ .env.production fayli topilmadi!${NC}"
  echo -e "${RED}  QR code ishlamaydi - VITE_FRONTEND_URL o'rnatilmagan${NC}"
  exit 1
fi

npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Frontend built successfully${NC}"
  echo -e "${GREEN}  Build size: $(du -sh dist | cut -f1)${NC}"
else
  echo -e "${RED}✗ Failed to build frontend${NC}"
  exit 1
fi

# Step 6: Copy frontend to server
echo ""
echo -e "${YELLOW}Step 6: Copying frontend to server...${NC}"
cp -r dist/* ../server/public/
echo -e "${GREEN}✓ Frontend copied to server/public${NC}"

# Step 7: Verify backend configuration
echo ""
echo -e "${YELLOW}Step 7: Verifying backend configuration...${NC}"
cd ../server
if [ -f .env ]; then
  echo -e "${GREEN}✓ .env file exists${NC}"
  echo -e "${GREEN}  PORT: $(grep PORT .env | cut -d= -f2)${NC}"
  echo -e "${GREEN}  NODE_ENV: $(grep NODE_ENV .env | cut -d= -f2)${NC}"
else
  echo -e "${RED}✗ .env file missing!${NC}"
  exit 1
fi

# Step 8: Restart backend
echo ""
echo -e "${YELLOW}Step 8: Restarting backend...${NC}"
pm2 restart sardorbek-furnitura
sleep 3

# Check if backend is running
if pm2 describe sardorbek-furnitura | grep -q "online"; then
  echo -e "${GREEN}✓ Backend restarted successfully${NC}"
else
  echo -e "${RED}✗ Backend failed to start${NC}"
  exit 1
fi

# Step 9: Test backend health
echo ""
echo -e "${YELLOW}Step 9: Testing backend health...${NC}"
HEALTH=$(curl -s http://localhost:8000/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo -e "${GREEN}✓ Backend health check passed${NC}"
  echo -e "${GREEN}  Response: $HEALTH${NC}"
else
  echo -e "${RED}✗ Backend health check failed${NC}"
  exit 1
fi

# Step 10: Test Nginx configuration
echo ""
echo -e "${YELLOW}Step 10: Testing Nginx configuration...${NC}"
if sudo nginx -t 2>&1 | grep -q "successful"; then
  echo -e "${GREEN}✓ Nginx configuration valid${NC}"
else
  echo -e "${RED}✗ Nginx configuration invalid${NC}"
  exit 1
fi

# Step 11: Reload Nginx
echo ""
echo -e "${YELLOW}Step 11: Reloading Nginx...${NC}"
sudo systemctl reload nginx
sleep 2

if sudo systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✓ Nginx reloaded successfully${NC}"
else
  echo -e "${RED}✗ Nginx failed to reload${NC}"
  exit 1
fi

# Step 12: Verify website
echo ""
echo -e "${YELLOW}Step 12: Verifying website...${NC}"
WEBSITE=$(curl -s -I https://sardorbek.biznesjon.uz | head -1)
if echo "$WEBSITE" | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✓ Website is accessible${NC}"
  echo -e "${GREEN}  Response: $WEBSITE${NC}"
else
  echo -e "${RED}✗ Website is not accessible${NC}"
  exit 1
fi

# Final verification
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  DEPLOYMENT VERIFICATION                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check all services
echo -e "${YELLOW}Checking services...${NC}"

# Backend
if pm2 describe sardorbek-furnitura | grep -q "online"; then
  echo -e "${GREEN}✓ Backend: Running${NC}"
else
  echo -e "${RED}✗ Backend: Not running${NC}"
fi

# Nginx
if sudo systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✓ Nginx: Running${NC}"
else
  echo -e "${RED}✗ Nginx: Not running${NC}"
fi

# Database
if mongo "mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat" --eval "db.adminCommand('ping')" 2>/dev/null | grep -q "ok"; then
  echo -e "${GREEN}✓ Database: Connected${NC}"
else
  echo -e "${YELLOW}⚠ Database: Could not verify (may be normal)${NC}"
fi

# API Response time
echo ""
echo -e "${YELLOW}Testing API performance...${NC}"
START=$(date +%s%N)
curl -s http://localhost:8000/api/health > /dev/null
END=$(date +%s%N)
RESPONSE_TIME=$(( (END - START) / 1000000 ))
echo -e "${GREEN}✓ API Response time: ${RESPONSE_TIME}ms${NC}"

# Frontend size
echo ""
echo -e "${YELLOW}Frontend build info...${NC}"
FRONTEND_SIZE=$(du -sh server/public | cut -f1)
echo -e "${GREEN}✓ Frontend size: $FRONTEND_SIZE${NC}"

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                  DEPLOYMENT COMPLETE! ✅                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Website URL: https://sardorbek.biznesjon.uz${NC}"
echo -e "${GREEN}Backup location: $BACKUP_DIR${NC}"
echo -e "${GREEN}Deployment time: $(date)${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Open https://sardorbek.biznesjon.uz in browser"
echo "2. Test all features (login, products, kassa, etc.)"
echo "3. Check browser console for errors (F12)"
echo "4. Monitor logs: pm2 logs sardorbek-furnitura"
echo ""
echo -e "${GREEN}Deployment successful! 🚀${NC}"
