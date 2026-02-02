# 📱 QR Code Setup Guide

## ❗ MUHIM: QR Code VPS da ishlashi uchun

QR code VPS da deploy qilingandan keyin to'g'ri ishlashi uchun quyidagi qadamlarni bajaring:

### 1️⃣ `.env.production` faylini yaratish

Client papkasida `.env.production` fayli yarating:

```bash
cd client
nano .env.production
```

### 2️⃣ Environment variables ni o'rnatish

`.env.production` fayliga quyidagilarni kiriting:

```env
# API URL (Backend) - Production da relative path
VITE_API_URL=/api

# Uploads URL - Production da relative path
VITE_UPLOADS_URL=

# Frontend URL - QR code uchun MUHIM!
# VPS domain yoki IP manzilini kiriting
VITE_FRONTEND_URL=https://sardorbek.biznesjon.uz
```

**⚠️ DIQQAT:** `VITE_FRONTEND_URL` ni o'z domeningiz bilan almashtiring!

### 3️⃣ Deploy qilish

Deploy scriptlar avtomatik ravishda `.env.production` faylini ishlatadi:

```bash
# VPS da
./deploy-production.sh

# yoki
./deploy-vps.sh
```

### 4️⃣ Tekshirish

1. **QR code generate qilish:**
   - Admin panel → Mahsulotlar → QR tugmasi
   - Kassa → Mahsulot → QR tugmasi

2. **QR code scan qilish:**
   - Telefon kamera bilan QR code ni scan qiling
   - To'g'ri URL ochilishi kerak: `https://sardorbek.biznesjon.uz/product/[ID]`

3. **Browser console tekshirish:**
   - F12 → Console
   - `FRONTEND_URL` ni tekshiring
   - Xatolik bo'lmasligi kerak

## 🔧 Muammolarni hal qilish

### QR code ishlamayapti?

1. **`.env.production` faylini tekshiring:**
   ```bash
   cat client/.env.production
   ```

2. **Build qayta qiling:**
   ```bash
   cd client
   npm run build
   ```

3. **Server ni restart qiling:**
   ```bash
   pm2 restart sardorbek-furnitura
   ```

### QR code noto'g'ri URL ko'rsatyapti?

1. **VITE_FRONTEND_URL ni to'g'ri o'rnatganingizni tekshiring**
2. **HTTPS ishlatayotganingizni tekshiring** (HTTP emas!)
3. **Domain to'g'ri yozilganini tekshiring** (slash yo'q oxirida)

## 📝 Qo'shimcha ma'lumot

- QR code `qrcode` npm package yordamida generate qilinadi
- URL `FRONTEND_URL` dan olinadi
- Production da `window.location.host` ishlatiladi agar `.env.production` bo'lmasa

## ✅ To'g'ri konfiguratsiya namunasi

```env
# ✅ TO'G'RI
VITE_FRONTEND_URL=https://sardorbek.biznesjon.uz

# ❌ NOTO'G'RI
VITE_FRONTEND_URL=https://sardorbek.biznesjon.uz/  # Slash yo'q!
VITE_FRONTEND_URL=http://sardorbek.biznesjon.uz   # HTTPS ishlatish!
VITE_FRONTEND_URL=sardorbek.biznesjon.uz          # https:// kerak!
```

## 🚀 Deploy jarayoni

Deploy scriptlar avtomatik ravishda:
1. `.env.production` faylini tekshiradi
2. Agar fayl topilmasa - xatolik beradi
3. Faylni `.env` ga ko'chiradi
4. Build qiladi
5. Server ga deploy qiladi

**Xatolik bo'lsa:**
```
⚠️  .env.production fayli topilmadi!
❌ VITE_FRONTEND_URL o'rnatilmagan - QR code ishlamaydi!
```

Bu xatolikni ko'rsangiz - `.env.production` faylini yarating!

