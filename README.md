# 🏪 Sardor Furnitura - Biznes Boshqaruv Tizimi

Modern biznes boshqaruv tizimi - savdo, ombor, moliya va xodimlarni boshqarish uchun.

## 🚀 Texnologiyalar

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS
- React Router
- Socket.IO Client
- PWA Support

### Backend
- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT Authentication
- Multer (file uploads)

## 📋 Talablar

- Node.js 18+
- MongoDB 6+
- npm yoki yarn

## 🔧 O'rnatish

### 1. Repository'ni Clone qilish

```bash
git clone <repository-url>
cd sardorbek.biznesjon.uz
```

### 2. Backend O'rnatish

```bash
cd server
npm install
```

**Environment o'rnatish:**

`server/.env` fayl yarating:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sardor-furnitura
JWT_SECRET=your-secret-key-here
NODE_ENV=production
```

### 3. Frontend O'rnatish

```bash
cd client
npm install
```

**Environment o'rnatish:**

`client/.env.production` fayl yarating:

```env
VITE_API_URL=http://your-domain.com/api
VITE_SOCKET_URL=http://your-domain.com
```

## 🏗️ Build

### Backend

```bash
cd server
npm run build
```

### Frontend

```bash
cd client
npm run build
```

Build natijasi `client/dist` papkasida bo'ladi.

## 🚀 Ishga Tushirish

### Development

```bash
# Backend (Terminal 1)
cd server
npm run dev

# Frontend (Terminal 2)
cd client
npm run dev
```

### Production

```bash
# Backend
cd server
npm start

# Frontend (Nginx orqali serve qilish)
# client/dist papkasini Nginx'ga ko'rsating
```

## 🌐 Nginx Konfiguratsiyasi

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📱 Funksiyalar

### Admin Panel
- 📊 Dashboard - Statistika va hisobotlar
- 🛒 Kassa (POS) - Savdo tizimi
- 📦 Mahsulotlar - CRUD operatsiyalari
- 📂 Kategoriyalar - Mahsulot kategoriyalari
- 👥 Mijozlar - Mijozlar bazasi
- 💰 Xarajatlar - Xarajatlar hisobi
- 📋 Qarzdorlar - Qarz boshqaruvi
- 🏭 Omborlar - Ombor boshqaruvi
- 👷 HR Moduli - Xodimlar boshqaruvi
- ⚙️ Sozlamalar - Tizim sozlamalari

### Xususiyatlar
- ✅ Real-time yangilanishlar (Socket.IO)
- ✅ PWA - Offline ishlash
- ✅ QR Code generator
- ✅ Responsive design
- ✅ Role-based access control
- ✅ Telegram integratsiyasi
- ✅ Excel export/import
- ✅ Chek chop etish

## 🔐 Default Login

```
Username: admin
Password: admin123
```

**⚠️ MUHIM:** Production'da parolni o'zgartiring!

## 📊 Database Backup

```bash
# Backup
mongodump --db sardor-furnitura --out ./backups/$(date +%Y%m%d)

# Restore
mongorestore --db sardor-furnitura ./backups/20240101
```

## 🛠️ Troubleshooting

### Port band bo'lsa

```bash
# Linux/Mac
lsof -ti:5000 | xargs kill -9

# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### MongoDB ulanmasa

```bash
# MongoDB statusini tekshirish
sudo systemctl status mongod

# MongoDB'ni ishga tushirish
sudo systemctl start mongod
```

## 📝 License

Private - Faqat ichki foydalanish uchun

## 👨‍💻 Developer

Sardorbek Biznesjon

---

**Production Ready** ✅
