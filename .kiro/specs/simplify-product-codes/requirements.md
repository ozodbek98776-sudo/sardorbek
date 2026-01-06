# Requirements Document

## Introduction

Mahsulot kodlarini soddalashtirish - "000003" o'rniga oddiy "3" ko'rinishida ko'rsatish. Bu foydalanuvchilar uchun qulayroq va tushunarliroq bo'ladi.

## Glossary

- **Product_Code**: Mahsulotning noyob identifikatori
- **System**: Universal.uz biznes boshqaruv tizimi

## Requirements

### Requirement 1: Server tomonida mahsulot kod generatsiyasini soddalashtirish

**User Story:** Administrator sifatida, men yangi mahsulot yaratganda oddiy raqamli kod (1, 2, 3...) olishni xohlayman, shunda kod qisqa va tushunarli bo'ladi.

#### Acceptance Criteria

1. WHEN yangi mahsulot yaratilsa THEN System oddiy raqamli kod (1, 2, 3...) berishi SHART
2. WHEN keyingi kod so'ralsa THEN System eng katta mavjud koddan 1 ga ko'p raqam qaytarishi SHART
3. WHEN mahsulot kodi tekshirilsa THEN System oddiy raqamli formatni qabul qilishi SHART

### Requirement 2: Client tomonida mahsulot kodlarini oddiy ko'rsatish

**User Story:** Foydalanuvchi sifatida, men mahsulot kodlarini oddiy raqam ko'rinishida (3, 15, 100) ko'rishni xohlayman, shunda ular oson o'qiladi.

#### Acceptance Criteria

1. WHEN mahsulotlar ro'yxati ko'rsatilsa THEN System kodlarni oddiy raqam formatida ko'rsatishi SHART
2. WHEN mahsulot qo'shish formasi ochilsa THEN System keyingi oddiy raqamni taklif qilishi SHART
3. WHEN QR kod yaratilsa THEN System oddiy kod formatini ishlatishi SHART
4. WHEN mahsulot qidirilsa THEN System oddiy kod formatini qabul qilishi SHART