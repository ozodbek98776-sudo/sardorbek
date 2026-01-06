# Implementation Plan

- [x] 1. Login.tsx dan ro'yxatdan o'tish UI elementlarini olib tashlash




  - [ ] 1.1 isLogin state va name state ni olib tashlash
    - `isLogin` va `name` state larini o'chirish
    - `setIsLogin` va `setName` funksiyalarini o'chirish

    - `User` iconini importdan olib tashlash
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Tab tugmalarini olib tashlash

    - "Kirish" va "Ro'yxatdan o'tish" tab tugmalarini o'chirish
    - Tab uchun ishlatilgan div ni olib tashlash
    - _Requirements: 1.2_

  - [ ] 1.3 Ism input maydonini olib tashlash
    - `!isLogin &&` shartli render qismini o'chirish
    - Ism kiritish maydonini to'liq olib tashlash
    - _Requirements: 1.3_

  - [ ] 1.4 handleSubmit funksiyasini soddalashtirish
    - `isLogin` shartini olib tashlash




    - Faqat `login` funksiyasini chaqirish

    - `register` chaqiruvini olib tashlash
    - _Requirements: 1.4_
  - [x] 1.5 Submit tugmasi matnini soddalashtirish





    - Shartli matn o'rniga faqat "Kirish" yozish
    - _Requirements: 1.1_

- [ ] 2. AuthContext.tsx dan register funksiyasini olib tashlash
  - [ ] 2.1 AuthContextType interface ni yangilash
    - `register` metodini interface dan olib tashlash
    - _Requirements: 2.2_
  - [ ] 2.2 register funksiyasini olib tashlash
    - `register` funksiya tanasini o'chirish
    - Provider value dan `register` ni olib tashlash
    - _Requirements: 2.1_

- [ ] 3. Server tomonidan register endpointini olib tashlash
  - [ ] 3.1 auth.js dan register route ni o'chirish
    - `router.post('/register', ...)` ni to'liq olib tashlash
    - _Requirements: 3.1, 3.2_
