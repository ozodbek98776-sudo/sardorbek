# Xatoni Topish va Tuzatish

## Qachon ishlatilsin
"xato", "bug", "ishlamayapti", "error", "crash", "buzildi", "tuzat"

## Qadamlar
1. Xato xabarini o'qi — qaysi fayl, qaysi qator
2. Tegishli faylni o'qi va kontekstni tushun
3. Console/network xatolarini tekshir
4. Server loglarni tekshir (`server/logs/`)
5. Root cause ni aniqlash
6. Fix qilish — minimal o'zgartirish
7. Test qilish

## Algoritm
```
XATO -> Server yoki Client?
  Server:
    -> Route ni tekshir (req.body, req.params)
    -> Model validatsiyani tekshir
    -> Middleware ni tekshir (auth, permissions)
    -> DB query ni tekshir (populate, index)
  Client:
    -> Console error o'qi
    -> Network tab — API response tekshir
    -> State boshqaruvini tekshir (useState, Zustand)
    -> Props passing ni tekshir
    -> useEffect dependency array
```

## Checklist
- [ ] Root cause topildi
- [ ] Fix minimal va aniq
- [ ] Boshqa joyga ta'sir qilmaydi
- [ ] Edge case lar ko'rib chiqildi

## TOKEN TEJASH
- Faqat xato qatorni va fix ni ko'rsat
- Butun faylni qayta yozma
