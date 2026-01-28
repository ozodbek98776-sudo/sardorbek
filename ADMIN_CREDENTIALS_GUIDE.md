# Admin Login va Parolni O'zgartirish

## ✅ Funksiya To'liq Ishlaydi

Admin o'z login va parolini o'zgartirishi va yangi ma'lumotlar bilan kirishi mumkin.

---

## 📋 Joriy Admin Ma'lumotlari

- **Login:** `admin123`
- **Parol:** `654321`
- **Role:** `admin`

---

## 🔄 Qanday Ishlaydi

### 1. Frontend (AdminSettings.tsx)

Admin sozlamalar sahifasida:
- Joriy parolni kiritadi
- Yangi login kiritadi (ixtiyoriy)
- Yangi parol kiritadi (ixtiyoriy)
- "O'zgarishlarni Saqlash" tugmasini bosadi

### 2. Backend (auth.js)

`PUT /auth/admin/credentials` endpoint:
1. Joriy parolni tekshiradi
2. Yangi login mavjudligini tekshiradi
3. Yangi parolni bcrypt bilan hash qiladi
4. MongoDB ga saqlaydi
5. Yangi JWT token qaytaradi

### 3. Ma'lumotlar Saqlanishi

- **MongoDB:** `sardor_furnitura` database, `users` collection
- **Parol:** bcrypt hash sifatida saqlanadi (hech qachon plain text emas)
- **Token:** localStorage da saqlanadi

---

## 🎯 Foydalanish

### Admin Paneldan

1. Admin panelga kiring (login: `admin123`, parol: `654321`)
2. "Sozlamalar" menyusiga o'ting
3. "Admin Sozlamalari" bo'limida:
   - Joriy parolni kiriting
   - Yangi login kiriting (masalan: `admin_yangi`)
   - Yangi parol kiriting (masalan: `123456`)
   - Yangi parolni tasdiqlang
4. "O'zgarishlarni Saqlash" tugmasini bosing
5. Muvaffaqiyatli xabar ko'rinadi
6. Chiqing va yangi login/parol bilan kiring

---

## 🔐 Xavfsizlik

### Parol Hash

```javascript
// User.js modelida
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});
```

### Parol Tekshirish

```javascript
userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};
```

---

## 📁 Fayl Tuzilishi

### Backend

```
server/src/
├── routes/
│   └── auth.js              # PUT /auth/admin/credentials
├── models/
│   └── User.js              # Parol hash va compare
└── middleware/
    └── auth.js              # JWT authentication
```

### Frontend

```
client/src/
├── pages/admin/
│   └── AdminSettings.tsx    # Admin sozlamalar sahifasi
├── context/
│   └── AuthContext.tsx      # updateUser funksiyasi
└── utils/
    └── api.ts               # API konfiguratsiya
```

---

## 🧪 Test Qilish

### 1. Joriy Ma'lumotlar Bilan Kirish

```
Login: admin123
Parol: 654321
```

### 2. Login va Parolni O'zgartirish

1. Admin panelga kiring
2. Sozlamalar → Admin Sozlamalari
3. Joriy parol: `654321`
4. Yangi login: `admin_test`
5. Yangi parol: `test123456`
6. Saqlash

### 3. Yangi Ma'lumotlar Bilan Kirish

```
Login: admin_test
Parol: test123456
```

---

## ⚠️ Muhim Eslatmalar

1. **Parolni Unutmang:** Parolni unutsangiz, MongoDB dan to'g'ridan-to'g'ri o'zgartirish kerak
2. **Xavfsiz Parol:** Kamida 6 ta belgi, harflar va raqamlar aralashmasi
3. **Token Yangilanadi:** Login/parol o'zgarganda yangi token beriladi
4. **Avtomatik Logout Yo'q:** O'zgarishdan keyin avtomatik chiqmaysiz
5. **Kassa Foydalanuvchilari:** Alohida bo'limda boshqariladi

---

## 🚀 Deploy Qilishda

### Server da .env Fayl

```env
MONGODB_URI=mongodb://...
JWT_SECRET=your-secret-key
ADMIN_LOGIN=admin123
ADMIN_PASSWORD=654321
```

### Birinchi Marta

1. Server ishga tushganda admin avtomatik yaratiladi
2. Environment variables dan login/parol olinadi
3. MongoDB ga saqlanadi
4. Keyingi safar MongoDB dan olinadi

---

## 📞 Yordam

Agar muammo bo'lsa:

1. MongoDB ulanishini tekshiring
2. JWT_SECRET o'rnatilganligini tekshiring
3. Browser console da xatolarni ko'ring
4. Server logs ni tekshiring

---

**Yaratilgan:** 2026-01-27
**Versiya:** 1.0
**Status:** ✅ To'liq Ishlaydi
