# Chek Bot O'rnatish Yo'riqnomasi

## Bot Ma'lumotlari
- **Bot Token:** `8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA`
- **Maqsad:** Mijoz tanlanganda va chek chiqarilganda ma'lumotlarni olish

## O'rnatish Bosqichlari

### 1. Chat ID ni olish

Bot ishlashi uchun chat ID kerak. Buni olish uchun:

1. Telegram'da botni toping: `@your_bot_username`
2. Botga `/start` yuboring
3. Quyidagi URL orqali chat ID ni oling:
   ```
   https://api.telegram.org/bot8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA/getUpdates
   ```
4. Javobda `chat.id` ni toping

### 2. .env faylini yangilash

`.env` faylida quyidagi qatorni to'ldiring:

```env
TELEGRAM_RECEIPT_CHAT_ID=YOUR_CHAT_ID_HERE
```

Masalan:
```env
TELEGRAM_RECEIPT_CHAT_ID=123456789
```

### 3. Serverni qayta ishga tushirish

O'zgarishlar kuchga kirishi uchun serverni qayta ishga tushiring:

```bash
npm restart
# yoki
pm2 restart all
```

### 4. Test qilish

Bot ishlayotganini tekshirish uchun:

```bash
node test-receipt-bot.js
```

### 5. Mijozlarni ro'yxatdan o'tkazish

Mijozlar chek olish uchun botga ro'yxatdan o'tishlari kerak:

1. Mijoz botni topadi va `/start` yuboradi
2. Bot telefon raqam so'raydi
3. Mijoz telefon raqamini yuboradi (masalan: +998901234567)
4. Bot mijozni tizimda qidiradi va tasdiqlaydi
5. Endi mijoz barcha cheklar oladi

## Bot Xususiyatlari

### Qachon Xabar Yuboriladi?

Bot quyidagi hollarda xabar yuboradi:

1. **Oddiy chek yaratilganda** - mijoz tanlangan yoki tanlanmagan
2. **Kassir cheki yaratilganda** - kassir tomonidan
3. **Atomic transaction** - print muvaffaqiyatli bo'lganda

### Mijozga Chek Yuborish

Agar mijoz tanlangan bo'lsa va mijozning `telegramChatId` mavjud bo'lsa:
- Mijozga to'g'ridan-to'g'ri yangi bot orqali chek yuboriladi
- Mijoz avval botga `/start` yuborib, telefon raqamini kiritgan bo'lishi kerak

### Xabar Formatlari

**Admin/Do'kon uchun xabar:**
```
🧾 YANGI CHEK YARATILDI

👤 Mijoz: Ism Familiya
📞 Telefon: +998901234567
📅 Sana: 09.01.2026 14:30
🏪 Do'kon: Sardor Furnitura
🧾 Chek raqami: CHK-1736424600000

📦 Mahsulotlar:
1. Mahsulot nomi (PROD001)
   2 x 50,000 = 100,000 so'm

💰 Jami summa: 100,000 so'm
💳 To'lov turi: Naqd pul 💵
💵 To'langan: 100,000 so'm

💳 Mijozning umumiy qarzi: 0 so'm
```

**Mijoz uchun xabar:**
```
🧾 XARID CHEKI

📅 Sana: 09.01.2026 14:30
🏪 Do'kon: Sardor Furnitura
👤 Mijoz: Ism Familiya
🧾 Chek raqami: CHK-1736424600000

📦 Xarid qilingan mahsulotlar:
1. Mahsulot nomi - 2 x 50,000 = 100,000 so'm

💰 Jami summa: 100,000 so'm
💳 To'lov turi: Naqd pul 💵
💵 To'langan: 100,000 so'm

✅ Qarz holati: Qarz yo'q

🙏 Xaridingiz uchun rahmat!
```

### Kassir Cheki Formati

```
🧾 KASSIR CHEKI
👨‍💼 Kassir: Kassir Ismi

👤 Mijoz: Noma'lum mijoz
📅 Sana: 09.01.2026 14:30
🏪 Do'kon: Sardor Furnitura
🧾 Chek raqami: HELPER-507f1f77bcf86cd799439011

📦 Mahsulotlar:
1. Mahsulot nomi (PROD001)
   1 x 25,000 = 25,000 so'm

💰 Jami summa: 25,000 so'm
💳 To'lov turi: Naqd pul 💵
```

## Muammolarni Hal Qilish

### Bot javob bermayapti
1. Bot token to'g'riligini tekshiring
2. Chat ID to'g'riligini tekshiring
3. Server loglarini ko'ring

### Xabarlar kelmayapti
1. `.env` faylida `TELEGRAM_RECEIPT_CHAT_ID` o'rnatilganligini tekshiring
2. Serverni qayta ishga tushiring
3. Test script ishga tushiring

### Xatolik xabarlari
Server loglarida quyidagi xabarlarni qidiring:
- `Receipt bot token not configured`
- `Telegram receipt chat ID not configured`
- `Receipt notification sent to receipt bot`

## Qo'shimcha Ma'lumot

- Bot barcha chek turlarini qo'llab-quvvatlaydi
- Mijoz ma'lumotlari xavfsiz uzatiladi
- Xabarlar HTML formatida yuboriladi
- Bot xatoliklari asosiy chek yaratish jarayonini to'xtatmaydi