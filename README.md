# Sardorbek.Furnetura - Biznes Boshqaruv Tizimi

Zamonaviy furnetura biznes boshqaruv tizimi: kassa, ombor, mijozlar, qarzlar va buyurtmalar.

## Xususiyatlar

- 📊 **Statistika** - Sotuvlar, daromad, top mahsulotlar
- 🛒 **Kassa (POS)** - Tez va qulay savdo
- 📦 **Tovarlar** - Mahsulotlarni boshqarish
- 🏭 **Omborlar** - Ombor hisobi
- 👥 **Mijozlar** - Mijozlar bazasi
- 💳 **Qarz daftarcha** - Qarzlarni kuzatish
- 📋 **Buyurtmalar** - Marketplace buyurtmalari
- 👷 **Yordamchilar** - Xodimlarni boshqarish
- 🤖 **Telegram Bot** - Avtomatik chek va qarz xabarlari

## Yangi Funksiya: Avtomatik Qarz Yaratish

### To'lov Modal Oynasida Qoldiq Qarz
Agar to'lov turi tanlash modal oynasida mahsulot narxini to'liq kiritilmasa:
- ✅ Qoldiq summa avtomatik qarz sifatida yaratiladi
- 📱 Telegram botga darhol xabar yuboriladi
- 💳 Mijozning umumiy qarziga qo'shiladi
- 📝 Batafsil ma'lumot bilan saqlash

### Ishlash tartibi:
1. **To'lov turini tanlash** - Naqd, Click, Karta
2. **Qoldiq hisoblash** - Agar kam pul kiritilsa
3. **Qarz yaratish** - Avtomatik qarz daftariga qo'shish
4. **Bot xabari** - Mijozga va adminga xabar
5. **Chek chiqarish** - Qarz ma'lumoti bilan

## Rollar

| Rol | Huquqlar |
|-----|----------|
| Admin | Barcha funksiyalar |
| Kassir | Kassa, Qarzlar, Xodimlar cheklari |
| Yordamchi | QR skaner, Tovar qidirish, Kassaga yuborish |

## O'rnatish

```bash
# Barcha paketlarni o'rnatish
npm run install:all

# .env faylini sozlash
# MONGODB_URI ni o'zgartiring

# Ishga tushirish
npm run dev
```

## Texnologiyalar

- **Frontend:** React, TypeScript, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, MongoDB, JWT
- **QR Scanner:** html5-qrcode
- **Telegram Bot:** node-telegram-bot-api

## Loyiha tuzilishi

```
universal-uz/
├── client/          # React frontend
│   └── src/
│       ├── components/
│       ├── context/
│       ├── layouts/
│       ├── pages/
│       ├── types/
│       └── utils/
├── server/          # Node.js backend
│   └── src/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       └── services/
└── .env             # Sozlamalar
```
