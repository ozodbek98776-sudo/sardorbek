# Sardorbek Furnitura - Kassa Tizimi

Modern va professional kassa boshqaruv tizimi. React, Node.js, Express va MongoDB texnologiyalari asosida qurilgan.

## 🚀 Xususiyatlar

### 📊 Boshqaruv Paneli
- Real-time statistika va hisobotlar
- Bugungi, haftalik va oylik savdo ko'rsatkichlari
- Eng ko'p sotiladigan mahsulotlar
- Moliyaviy tarix va tranzaksiyalar

### 🛒 Kassa Tizimi
- Tez va oson mahsulot qidirish
- QR kod skanerlash
- Savdo savatini boshqarish
- Naqd va karta to'lovlari
- Chekni saqlash va yuklash
- Offline rejimda ishlash

### 📦 Mahsulotlar
- Mahsulotlarni qo'shish, tahrirlash va o'chirish
- Kategoriyalar bo'yicha filtrlash
- Narx tarixi va o'zgarishlar
- Ombor boshqaruvi
- QR kod generatsiyasi
- Batch QR kod chop etish

### 💰 Qarzlar
- Mijozlar qarzlarini boshqarish
- Qarz to'lovlari tarixi
- Qarzlarni arxivlash
- Telegram orqali bildirishnomalar

### 💵 Xarajatlar
- Xarajatlarni kategoriyalar bo'yicha boshqarish
- Statistika va hisobotlar
- Sana bo'yicha filtrlash

### 👥 Foydalanuvchilar
- Rol asosida kirish huquqlari (Admin, Kassa, Yordamchi)
- Xavfsiz autentifikatsiya
- Foydalanuvchilarni boshqarish

## 🛠️ Texnologiyalar

### Frontend
- **React 18** - UI kutubxonasi
- **TypeScript** - Tip xavfsizligi
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Lucide React** - Ikonlar
- **Axios** - HTTP client
- **Zustand** - State management

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **JWT** - Autentifikatsiya
- **Bcrypt** - Parol shifrlash
- **Multer** - Fayl yuklash

## 📋 O'rnatish

### Talablar
- Node.js 18+
- MongoDB 6+
- npm yoki yarn

### 1. Repositoriyani klonlash
```bash
git clone https://github.com/ozodbek98776-sudo/sardorbek.git
cd sardorbek
```

### 2. Server o'rnatish
```bash
cd server
npm install
```

`.env` faylini yarating va quyidagi o'zgaruvchilarni to'ldiring:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
PORT=8002
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Client o'rnatish
```bash
cd client
npm install
```

`.env` faylini yarating:
```env
VITE_API_URL=http://localhost:8002/api
```

### 4. Ishga tushirish

**Development rejimda:**

Terminal 1 - Server:
```bash
cd server
npm run dev
```

Terminal 2 - Client:
```bash
cd client
npm run dev
```

**Production rejimda:**

```bash
# Client build
cd client
npm run build

# Server ishga tushirish
cd server
npm start
```

## 🔐 Standart Foydalanuvchi

Tizimga kirish uchun admin foydalanuvchi yarating:

```bash
cd server
node src/scripts/create-hardcoded-admin.js
```

Standart login ma'lumotlari:
- **Username:** admin
- **Password:** admin123

⚠️ **Muhim:** Production muhitida parolni o'zgartiring!

## 📱 PWA Xususiyatlari

- Offline rejimda ishlash
- Mobil qurilmalarga o'rnatish
- Push bildirishnomalar
- Service Worker keshi

## 🔒 Xavfsizlik

- JWT token autentifikatsiyasi
- Bcrypt parol shifrlash
- CORS himoyasi
- Rate limiting
- Input validatsiya
- XSS himoyasi

## 📊 Database Indekslar

Tezkor ishlash uchun quyidagi indekslarni yarating:

```bash
cd server
node src/scripts/add-performance-indexes.js
node src/scripts/add-kassa-performance-indexes.js
node src/scripts/add-expense-indexes.js
```

## 🤝 Hissa qo'shish

1. Fork qiling
2. Feature branch yarating (`git checkout -b feature/AmazingFeature`)
3. O'zgarishlarni commit qiling (`git commit -m 'Add some AmazingFeature'`)
4. Branch ga push qiling (`git push origin feature/AmazingFeature`)
5. Pull Request oching

## 📝 Litsenziya

Bu loyiha shaxsiy foydalanish uchun mo'ljallangan.

## 👨‍💻 Muallif

**Ozodbek**
- GitHub: [@ozodbek98776-sudo](https://github.com/ozodbek98776-sudo)

## 🙏 Minnatdorchilik

- React jamoasi
- MongoDB jamoasi
- Barcha open-source hissa qo'shuvchilarga

---

**Sardorbek Furnitura** - Professional kassa tizimi 🚀
