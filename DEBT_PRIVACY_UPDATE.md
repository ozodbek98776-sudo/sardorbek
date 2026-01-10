# Qarz Ma'lumotlari Maxfiyligi Yangilanishi

## O'zgarishlar

Mijozlarga qarz ma'lumotlari yuborilishini to'xtatish uchun quyidagi o'zgarishlar amalga oshirildi:

### 1. TelegramService.js o'zgarishlari

**Fayl:** `server/src/services/telegramService.js`

- `sendReceiptToCustomer()` funksiyasidan qarz ma'lumotlari olib tashlandi
- `sendDebtPaymentToCustomer()` funksiyasi o'chirildi (faqat admin uchun qarz ma'lumotlari)

### 2. POS Telegram Bot o'zgarishlari

**Fayl:** `server/src/telegram.bot.js`

- `formatReceiptMessage()` funksiyasidan qarz ma'lumotlari olib tashlandi
- Mijoz ro'yxatdan o'tganda qarz ma'lumotlari ko'rsatilmaydi

### 3. Bot konfiguratsiyasi

**Fayl:** `server/.env`

Qarz xabarlari faqat quyidagi bot orqali adminga yuboriladi:
- `TELEGRAM_DEBT_BOT_TOKEN=8016326537:AAF512p_3LMD-YXNxTlLH5mVGz9EjYvhVyI`
- `TELEGRAM_DEBT_CHAT_ID=7935196609` (Admin chat ID)

## Natija

✅ **Mijozlarga endi qarz ma'lumotlari yuborilmaydi**
✅ **Qarz ma'lumotlari faqat adminga yuboriladi**
✅ **Mijozlar faqat xarid chekini oladi (qarz ma'lumotisiz)**

## Qarz ma'lumotlari qayerda ko'rinadi

### Faqat Admin uchun:
- Qarz qo'shilganda Telegram xabari
- Qarz to'langanda Telegram xabari
- Qarz tasdiqlanganda Telegram xabari
- Admin panelida barcha qarz ma'lumotlari

### Mijozlar uchun:
- Faqat xarid cheklari (qarz ma'lumotisiz)
- Umumiy xarid statistikasi
- Hech qanday qarz ma'lumoti ko'rsatilmaydi

## Xavfsizlik

Bu o'zgarish mijozlarning moliyaviy maxfiyligini ta'minlaydi va qarz ma'lumotlarini faqat admin nazoratida saqlaydi.