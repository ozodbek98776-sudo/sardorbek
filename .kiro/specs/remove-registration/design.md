# Design Document

## Overview

Bu dizayn ro'yxatdan o'tish funksiyasini saytdan to'liq olib tashlashni tavsiflaydi. O'zgarishlar client (React) va server (Express) tomonlarida amalga oshiriladi.

**Loyiha haqida:** Universal.uz - biznes boshqaruv tizimi (kassa, mahsulotlar, mijozlar, qarzlar, buyurtmalar). Foydalanuvchilar admin, cashier yoki helper rollarida bo'lishi mumkin.

## Architecture

O'zgarishlar quyidagi komponentlarga ta'sir qiladi:

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT                              │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   Login.tsx     │    │    AuthContext.tsx          │ │
│  │  - Tab olib     │    │  - register funksiyasi      │ │
│  │    tashlanadi   │    │    olib tashlanadi          │ │
│  │  - Ism maydoni  │    │  - AuthContextType          │ │
│  │    olib         │    │    yangilanadi              │ │
│  │    tashlanadi   │    └─────────────────────────────┘ │
│  │  - isLogin      │                                    │
│  │    state olib   │                                    │
│  │    tashlanadi   │                                    │
│  │  - User icon    │                                    │
│  │    import olib  │                                    │
│  │    tashlanadi   │                                    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      SERVER                              │
│  ┌─────────────────────────────────────────────────────┐│
│  │              routes/auth.js                          ││
│  │  - /register endpoint olib tashlanadi               ││
│  │  - /login va /me endpointlari saqlanadi             ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Login.tsx (Client)

**Olib tashlanadigan elementlar:**
- `isLogin` state va unga bog'liq logika
- Tab tugmalari (Kirish/Ro'yxatdan o'tish)
- `name` state va input maydoni
- `register` funksiyasi chaqiruvi

**Yangilangan forma:**
- Faqat telefon raqam va parol maydonlari
- Faqat "Kirish" tugmasi

### 2. AuthContext.tsx (Client)

**Olib tashlanadigan elementlar:**
- `register` funksiyasi
- `AuthContextType` dan `register` metodi

**Yangilangan interface:**
```typescript
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### 3. routes/auth.js (Server)

**Olib tashlanadigan elementlar:**
- `router.post('/register', ...)` endpoint

**Saqlanadigan endpointlar:**
- `POST /login` - foydalanuvchi kirishi
- `GET /me` - joriy foydalanuvchi ma'lumotlari

## Data Models

Ma'lumotlar modellarida o'zgarish yo'q. User modeli avvalgidek qoladi.

## Error Handling

- Agar kimdir `/auth/register` ga so'rov yuborsa, Express avtomatik 404 qaytaradi
- Login xatoliklari avvalgidek ishlaydi

## Testing Strategy

### Manual Testing
1. Login sahifasini ochish - faqat kirish formasi ko'rinishi kerak
2. Telefon va parol bilan kirish - ishlashi kerak
3. `/auth/register` ga POST so'rov yuborish - 404 qaytishi kerak
