# 🔍 Server Holatini Tekshirish

## MongoDB URI Haqida

Siz ko'rsatgan natija **xatolik emas**, faqat ma'lumot:

```
MONGODB_URI=mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true
```

Bu sizning MongoDB ulanish stringi. Agar server ishlamayotgan bo'lsa, quyidagi komandalar bilan tekshiring:

## 1. Server Ishga Tushirish

### Backend (Server)
```powershell
cd server
npm start
```

Yoki development mode:
```powershell
cd server
npm run dev
```

### Frontend (Client)
```powershell
cd client
npm run dev
```

## 2. MongoDB Ulanishni Tekshirish

```powershell
cd server
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true').then(() => { console.log('✅ MongoDB connected'); process.exit(0); }).catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });"
```

## 3. Port Tekshirish

Backend default port: **8000**
Frontend default port: **5173**

```powershell
# Port band bo'lganini tekshirish
netstat -ano | findstr :8000
netstat -ano | findstr :5173
```

## 4. Agar Xatolik Bo'lsa

### MongoDB Atlas Tekshirish
1. MongoDB Atlas ga kiring: https://cloud.mongodb.com
2. Network Access → IP Whitelist → `0.0.0.0/0` qo'shilganini tekshiring
3. Database Access → User parol to'g'ri ekanini tekshiring

### .env Fayl Tekshirish
```powershell
cd server
Get-Content .env
```

Kerakli o'zgaruvchilar:
- `MONGODB_URI` - MongoDB ulanish string
- `JWT_SECRET` - JWT secret key
- `PORT` - Server port (default: 8000)

## 5. Dashboard Statistika

Dashboard da endi statistika kartochkalari **2 tadan** ko'rsatiladi:

```
┌─────────────┬─────────────┐
│  Umumiy     │  Bugungi    │
│  daromad    │  savdo      │
└─────────────┴─────────────┘
┌─────────────┬─────────────┐
│  Jami       │  Eng yuqori │
│  buyurtma   │  soat       │
└─────────────┴─────────────┘
```

### Responsive Layout:
- **Mobile** (< 640px): 1 ta ustun
- **Tablet+** (≥ 640px): 2 ta ustun
- **Desktop** (≥ 1024px): 2 ta ustun (avval 4 ta edi)

## 6. Swipe Navigation

Telefonda ekranni **o'nga swipe** qilsangiz avtomatik orqaga qaytadi:

```
┌─────────────────┐
│  ←──────────    │  O'ngga swipe
│                 │  = Orqaga qaytish
│                 │
└─────────────────┘
```

Batafsil: `SWIPE_NAVIGATION_GUIDE.md`

---

**Agar muammo davom etsa:**
1. Server loglarini tekshiring
2. Browser console ni tekshiring (F12)
3. Network tab da API so'rovlarni tekshiring
