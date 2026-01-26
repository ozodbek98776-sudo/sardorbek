# Implementation Plan

- [-] 1. Server tomonida mahsulot kod generatsiyasini soddalashtirish
  - [ ] 1.1 next-code endpoint ni yangilash
    - `String(nextNum).padStart(6, '0')` o'rniga `String(nextNum)` ishlatish
    - _Requirements: 1.1, 1.2_
  - [ ] 1.2 POST /products endpoint ni yangilash
    - Avtomatik kod generatsiyasida padStart ni olib tashlash
    - _Requirements: 1.1, 1.3_