# Design Document

## Overview

Bu dizayn mahsulot kodlarini "000003" formatidan oddiy "3" formatiga o'tkazishni tavsiflaydi. O'zgarishlar server va client tomonlarida amalga oshiriladi.

## Architecture

O'zgarishlar quyidagi komponentlarga ta'sir qiladi:

```
┌─────────────────────────────────────────────────────────┐
│                      SERVER                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │              routes/products.js                      ││
│  │  - next-code endpoint: padStart(6,'0') olib tashlash ││
│  │  - POST /products: padStart(6,'0') olib tashlash     ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      CLIENT                              │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Products.tsx  │    │    Warehouses.tsx           │ │
│  │  - Kod ko'rsatish│    │  - Kod ko'rsatish           │ │
│  │    oddiy format │    │    oddiy format             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Scanner.tsx   │    │    Kassa.tsx                │ │
│  │  - QR kod       │    │  - Mahsulot qidirish        │ │
│  │    oddiy format │    │    oddiy format             │ │
│  └─────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Server tomonidagi o'zgarishlar

**routes/products.js:**
- `next-code` endpoint: `String(nextNum).padStart(6, '0')` o'rniga `String(nextNum)` ishlatish
- `POST /products`: Avtomatik kod generatsiyasida oddiy format ishlatish

### 2. Client tomonidagi o'zgarishlar

**Hech qanday o'zgarish kerak emas** - chunki:
- Kodlar database da oddiy raqam sifatida saqlanadi
- Frontend avtomatik ravishda oddiy formatda ko'rsatadi
- Mavjud kodlar (000001, 000002) ham oddiy ko'rinishda (1, 2) ko'rsatiladi

## Data Models

Ma'lumotlar modellarida o'zgarish yo'q. Product modelidagi `code` maydoni string sifatida qoladi, lekin qiymatlari oddiy raqamlar bo'ladi.

## Error Handling

- Mavjud mahsulotlar uchun kod formati avtomatik o'zgaradi
- Yangi mahsulotlar oddiy raqamli kod oladi
- Kod tekshirish funksiyalari oddiy formatni qabul qiladi

## Testing Strategy

### Manual Testing
1. Yangi mahsulot yaratish - oddiy raqamli kod olishi kerak
2. Mahsulotlar ro'yxatini ko'rish - barcha kodlar oddiy ko'rinishda bo'lishi kerak
3. QR kod yaratish - oddiy kod ishlatilishi kerak
4. Mahsulot qidirish - oddiy kod bilan ishlashi kerak