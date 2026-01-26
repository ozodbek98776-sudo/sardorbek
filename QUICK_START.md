# Sardor Furnitura - Quick Start Guide

## 🎯 What's Ready

✅ **QR Code Generation** - Automatic for all new products  
✅ **Mobile Responsive** - Works on 320px to 1920px screens  
✅ **VPS Deployment** - Ready to deploy to sardorbek.biznesjon.uz  
✅ **SSL/HTTPS** - Secure connection configured  
✅ **Backend API** - All endpoints optimized and ready  

---

## 🚀 Deploy to VPS (5 minutes)

### Option 1: Automated Deploy (Recommended)

```bash
# 1. SSH into VPS
ssh root@45.67.216.61

# 2. Run quick deploy script
cd /var/www/sardorbek.biznesjon.uz
bash quick-deploy.sh
```

### Option 2: Manual Deploy

```bash
# 1. SSH into VPS
ssh root@45.67.216.61

# 2. Navigate to project
cd /var/www/sardorbek.biznesjon.uz

# 3. Update code
git pull origin main

# 4. Install & build
cd server && npm install --production
cd ../client && npm install && npm run build

# 5. Copy build
cd .. && rm -rf server/public && mkdir -p server/public && cp -r client/dist/* server/public/

# 6. Start backend
cd server && pm2 start src/index.js --name "sardorbek-furnitura"

# 7. Verify
curl http://localhost:3001/api/health
```

---

## ✅ Verify Deployment

```bash
# Check backend is running
curl https://sardorbek.biznesjon.uz/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs sardorbek-furnitura
```

Expected response:
```json
{"status":"ok","timestamp":"2026-01-19T..."}
```

---

## 🔄 Update Deployment

After making code changes:

```bash
# SSH into VPS
ssh root@45.67.216.61

# Navigate to project
cd /var/www/sardorbek.biznesjon.uz

# Pull latest changes
git pull origin main

# Rebuild and restart
cd server && npm install --production
cd ../client && npm install && npm run build
cd .. && rm -rf server/public && mkdir -p server/public && cp -r client/dist/* server/public/
cd server && pm2 restart sardorbek-furnitura
```

---

## 🎨 Features Implemented

### QR Code Generation
- ✅ Automatic QR code for every product
- ✅ QR code links to product page
- ✅ Stored in database
- ✅ Can be regenerated with script

**To regenerate QR codes:**
```bash
cd /var/www/sardorbek.biznesjon.uz/server
node regenerate-qr-codes.js
```

### Mobile Responsive Design
- ✅ Works on 320px phones (iPhone SE, etc.)
- ✅ Works on 360px phones (most Android)
- ✅ Works on tablets (768px+)
- ✅ Works on laptops (1024px+)
- ✅ Works on large screens (1920px+)

**Breakpoints:**
- 2xs: 320px
- xs: 360px
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

### API Optimization
- ✅ Timeout increased to 30s (60s for products)
- ✅ Database queries optimized
- ✅ Indexes added for fast queries
- ✅ Lean queries for better performance

---

## 🔧 Troubleshooting

### Backend Not Running
```bash
# Check logs
pm2 logs sardorbek-furnitura

# Restart
pm2 restart sardorbek-furnitura

# Check if port 3001 is listening
netstat -tlnp | grep 3001
```

### QR Codes Not Showing
```bash
# Regenerate QR codes
cd /var/www/sardorbek.biznesjon.uz/server
node regenerate-qr-codes.js
```

### Mobile Display Issues
- Test on actual device (not browser dev tools)
- Check browser console for errors
- Clear browser cache
- Verify Tailwind CSS is loading

### Nginx Errors
```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📊 Useful Commands

```bash
# SSH into VPS
ssh root@45.67.216.61

# PM2 commands
pm2 status                          # Check status
pm2 logs sardorbek-furnitura        # View logs
pm2 restart sardorbek-furnitura     # Restart
pm2 stop sardorbek-furnitura        # Stop
pm2 start sardorbek-furnitura       # Start

# Nginx commands
sudo systemctl status nginx         # Check status
sudo systemctl restart nginx        # Restart
sudo nginx -t                       # Test config

# File operations
cd /var/www/sardorbek.biznesjon.uz  # Navigate to project
git status                          # Check git status
git pull origin main                # Pull latest changes
```

---

## 📱 Testing on Mobile

### Local Testing
1. Run `npm run dev` in client directory
2. Get your computer's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Open `http://YOUR_IP:5173` on mobile device
4. Test all pages and features

### Production Testing
1. Visit https://sardorbek.biznesjon.uz on mobile
2. Test product creation
3. Verify QR codes appear
4. Test all navigation
5. Check responsive layout

---

## 🎯 Next Steps

1. **Deploy to VPS** - Use quick-deploy.sh
2. **Test website** - Visit https://sardorbek.biznesjon.uz
3. **Create test product** - Verify QR code generates
4. **Test on mobile** - Check responsive design
5. **Monitor logs** - Watch for errors

---

## 📚 Documentation

- **Deployment Steps:** See `DEPLOYMENT_STEPS.md`
- **Troubleshooting:** See `DEPLOYMENT_TROUBLESHOOTING.md`
- **Current Status:** See `CURRENT_STATUS.md`
- **VPS Guide:** See `VPS_DEPLOY_GUIDE.md`

---

## ⚡ Performance Tips

### Frontend
- Mobile-first design loads faster
- Tailwind CSS is optimized
- Images are lazy-loaded
- API calls are cached

### Backend
- Database queries use indexes
- Lean queries reduce memory
- QR codes generated once and cached
- PM2 auto-restarts on crash

### Infrastructure
- Nginx caches static files
- SSL/HTTPS enabled
- Gzip compression enabled
- CDN ready

---

## 🔐 Security

- ✅ HTTPS/SSL enabled
- ✅ JWT authentication
- ✅ Environment variables protected
- ✅ Database credentials secured
- ✅ Telegram tokens secured

**Never share:**
- SSH credentials
- Database passwords
- JWT secrets
- Telegram bot tokens

---

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs sardorbek-furnitura`
2. Test API: `curl https://sardorbek.biznesjon.uz/api/health`
3. Check Nginx: `sudo nginx -t`
4. Review documentation in this folder

---

## ✨ Summary

Everything is ready to deploy! The system includes:
- ✅ Automatic QR code generation
- ✅ Full mobile responsiveness
- ✅ Optimized API performance
- ✅ Production-ready deployment
- ✅ SSL/HTTPS security

**To deploy:** Run `bash quick-deploy.sh` on VPS

**To test:** Visit https://sardorbek.biznesjon.uz

**To troubleshoot:** Check logs with `pm2 logs sardorbek-furnitura`

