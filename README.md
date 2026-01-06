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
│       └── routes/
└── .env             # Sozlamalar
```
