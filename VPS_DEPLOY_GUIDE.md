# 🚀 VPS Deploy Qo'llanmasi - Sardor Furnitura

## 📋 Talablar

- Ubuntu 20.04+ yoki CentOS 7+
- Node.js 18+
- npm 9+
- MongoDB Atlas yoki local MongoDB
- PM2 (process manager)

## 🔧 VPS da o'rnatish

### 1. Node.js o'rnatish

```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Versiyani tekshirish
node -v
npm -v
```

### 2. PM2 o'rnatish

```bash
sudo npm install -g pm2
```

### 3. Loyihani VPS ga ko'chirish

```bash
# Git orqali
git clone https://github.com/YOUR_USERNAME/Sardor_furnitura.git
cd Sardor_furnitura

# Yoki SCP orqali
scp -r ./Sardor_furnitura user@YOUR_VPS_IP:/home/user/
```

### 4. Environment sozlash

```bash
cd server
cp .env.production.example .env
nano .env  # Qiymatlarni to'g'ri o'rnating
```

**MUHIM:** `.env` faylida quyidagilarni to'g'ri o'rnating:
- `NODE_ENV=production`
- `JWT_SECRET` - kuchli va unikal parol
- `MONGODB_URI` - MongoDB ulanish string
- Telegram bot tokenlari

### 5. Deploy qilish

```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

Yoki qo'lda:

```bash
# Server dependencies
cd server
npm install --production

# Client build
cd ../client
npm install
npm run build

# Client build ni server ga ko'chirish
cd ..
rm -rf server/public
mkdir -p server/public
cp -r client/dist/* server/public/

# PM2 bilan ishga tushirish
cd server
pm2 start src/index.js --name "sardor-furnitura" --env production
pm2 save
pm2 startup
```

## 🌐 Nginx sozlash (ixtiyoriy)

Agar 80 portda ishlatmoqchi bo'lsangiz:

```bash
sudo apt install nginx
sudo nano /etc/nginx/sites-available/sardor-furnitura
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sardor-furnitura /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 SSL sertifikat (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 Foydali buyruqlar

```bash
# Server holatini ko'rish
pm2 status

# Loglarni ko'rish
pm2 logs sardor-furnitura

# Serverni qayta ishga tushirish
pm2 restart sardor-furnitura

# Serverni to'xtatish
pm2 stop sardor-furnitura

# Serverni o'chirish
pm2 delete sardor-furnitura
```

## ⚠️ Muammolarni hal qilish

### Login sahifasiga qaytib ketadi

1. `.env` da `JWT_SECRET` to'g'ri o'rnatilganligini tekshiring
2. Token muddati tugagan bo'lishi mumkin - qayta login qiling
3. Server loglarini tekshiring: `pm2 logs sardor-furnitura`

### Telegram bot ishlamayapti

1. Bot tokeni to'g'riligini tekshiring
2. Faqat bitta server da bot ishlashi kerak (polling conflict)
3. VPS firewall Telegram API ga ruxsat berganligini tekshiring

### MongoDB ulanish xatosi

1. MongoDB Atlas da IP whitelist ga VPS IP ni qo'shing
2. Connection string to'g'riligini tekshiring
3. Network access sozlamalarini tekshiring

## 📞 Yordam

Muammolar bo'lsa, server loglarini tekshiring:
```bash
pm2 logs sardor-furnitura --lines 100
```
