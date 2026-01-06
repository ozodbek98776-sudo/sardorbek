# Requirements Document

## Introduction

Saytdan ro'yxatdan o'tish (registration) funksiyasini to'liq olib tashlash kerak. Foydalanuvchilar faqat mavjud hisoblar bilan tizimga kirishi mumkin bo'ladi. Bu o'zgarish xavfsizlikni oshiradi va faqat administrator tomonidan yaratilgan foydalanuvchilar tizimga kira oladi.

## Requirements

### Requirement 1: Login sahifasidan ro'yxatdan o'tish UI elementlarini olib tashlash

**User Story:** Administrator sifatida, men login sahifasida faqat kirish formasi ko'rinishini xohlayman, shunda foydalanuvchilar o'zlari ro'yxatdan o'ta olmaydi.

#### Acceptance Criteria

1. WHEN foydalanuvchi login sahifasiga kirsa THEN tizim faqat kirish (login) formasini ko'rsatishi SHART
2. WHEN login sahifasi yuklansa THEN "Kirish" va "Ro'yxatdan o'tish" tab tugmalari ko'rinmasligi SHART
3. WHEN login sahifasi yuklansa THEN ism kiritish maydoni ko'rinmasligi SHART
4. WHEN foydalanuvchi login formasini to'ldirsa THEN faqat telefon raqam va parol maydonlari mavjud bo'lishi SHART

### Requirement 2: AuthContext dan register funksiyasini olib tashlash

**User Story:** Dasturchi sifatida, men AuthContext da faqat login va logout funksiyalari bo'lishini xohlayman, shunda kod toza va xavfsiz bo'ladi.

#### Acceptance Criteria

1. WHEN AuthContext ishlatilsa THEN register funksiyasi mavjud bo'lmasligi SHART
2. WHEN AuthContextType interface ko'rilsa THEN register metodi yo'q bo'lishi SHART

### Requirement 3: Server tomonidan register API endpointini o'chirish

**User Story:** Administrator sifatida, men server tomonida ro'yxatdan o'tish API si bo'lmasligi kerak, shunda hech kim API orqali ham ro'yxatdan o'ta olmaydi.

#### Acceptance Criteria

1. WHEN /auth/register endpointiga so'rov yuborilsa THEN tizim 404 yoki xato qaytarishi SHART
2. WHEN auth.js routes fayli ko'rilsa THEN register route mavjud bo'lmasligi SHART
