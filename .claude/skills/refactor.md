# Kodni Refactor Qilish

## Qachon ishlatilsin
"refactor", "optimallashtir", "tozala", "qayta yoz", "tuzilmani o'zgartir"

## Qadamlar
1. Hozirgi kodni o'qi va tushun
2. Muammoni aniqlash (duplikatsiya, murakkablik, noto'g'ri pattern)
3. Yangi tuzilmani rejalashtir
4. O'zgartirish — funksionallikni buzmasdan
5. Import/export larni yangilash
6. Test o'tkazish

## Checklist
- [ ] Funksionallik o'zgarmagan
- [ ] Import lar yangilangan
- [ ] TypeScript xatolik yo'q
- [ ] Boshqa fayllar buzilmagan
- [ ] Duplikatsiya kamaygan

## Umumiy patternlar
- Katta komponent -> kichik komponentlarga ajrat
- Takrorlanuvchi logika -> custom hook ga chiqar
- Inline style -> Tailwind class
- Callback hell -> async/await
- Nested ternary -> early return yoki alohida funksiya

## TOKEN TEJASH
- Faqat o'zgargan qismlarni ko'rsat
- Agar ko'p fayl o'zgarsa, diff formatda ko'rsat
