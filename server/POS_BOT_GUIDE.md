# 🤖 POS Telegram Bot - To'liq Yo'riqnoma

## 📋 Qisqacha Ma'lumot

Bu bot Node.js + MongoDB asosida ishlaydigan POS (kassa) tizimi uchun yaratilgan. Bot mijozlardan telefon raqamini so'raydi va chek chiqarilganda avtomatik xabar yuboradi.

## 🔧 O'rnatish

### 1. Paketlarni o'rnatish:
```bash
npm install node-telegram-bot-api
```

### 2. .env faylini sozlash:
```env
POS_TELEGRAM_BOT_TOKEN=8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA
POS_ADMIN_CHAT_ID=7935196609
```

### 3. BotFather sozlamalari:
- `/setprivacy` → `Disable` (barcha xabarlarni olish uchun)
- `/setcommands` → `start - Botni ishga tushirish`

## 📱 Bot Funksiyalari

### 1. /start Komandasi
- Foydalanuvchiga xush kelibsiz xabari
- Telefon raqam so'rash
- Oddiy keyboard (inline emas!)
- Tugma: "📞 Telefonni yuborish" (request_contact: true)

### 2. Telefon Raqam Qabul Qilish
- `bot.on('contact')` orqali
- `msg.contact.phone_number` dan telefon raqam
- `msg.chat.id` dan Telegram ID
- Avtomatik normalize qilish

### 3. DB bilan Bog'lash
- Customer modelida `phone` (unique) va `telegramChatId`
- Telefon raqam bo'yicha qidirish
- Agar topilsa: `telegramChatId` saqlash
- Agar topilmasa: xatolik xabari

### 4. Chek Yuborish
- Faqat `telegramChatId` mavjud mijozlarga
- Chek tarkibi: mijoz, mahsulotlar, summa, sana
- Xatolik bo'lsa ham asosiy jarayon davom etadi

## 🚀 Ishga Tushirish

### server/src/index.js da:
```javascript
const { createPOSBot } = require('./telegram.bot');

// MongoDB ulanishidan keyin
const posBot = createPOSBot();
```

### Chek yuborish (receipts.js da):
```javascript
const { getPOSBot } = require('../telegram.bot');

const posBot = getPOSBot();
if (posBot) {
  await posBot.sendReceiptToCustomer(receiptData);
}
```

## 🧪 Test Qilish

```bash
# Bot testini ishga tushirish
node test-pos-bot.js

# Telefon normalize testini ishga tushirish
node -e "
const bot = require('./src/telegram.bot');
console.log(bot.normalizePhoneNumber('901234567')); // +998901234567
console.log(bot.normalizePhoneNumber('+998901234567')); // +998901234567
"
```

## ⚠️ Eng Ko'p Qilinadigan Xatolar

### 1. Bot Token Xatosi
```
❌ Xato: 401 Unauthorized
✅ Yechim: .env da POS_TELEGRAM_BOT_TOKEN ni tekshiring
```

### 2. Polling Xatosi
```
❌ Xato: ETELEGRAM: 409 Conflict
✅ Yechim: Boshqa bot instance'ni to'xtating yoki webhook o'chiring
```

### 3. Database Ulanish Xatosi
```
❌ Xato: MongooseError
✅ Yechim: MongoDB ishlab turganini tekshiring
```

### 4. Telefon Raqam Formati
```
❌ Xato: Mijoz topilmadi
✅ Yechim: normalizePhoneNumber funksiyasini tekshiring
```

### 5. Chat ID Yo'q
```
❌ Xato: Customer has no Telegram chat ID
✅ Yechim: Mijoz avval /start yuborib ro'yxatdan o'tishi kerak
```

## 🔒 Xavfsizlik

1. **Inline Keyboard Ishlatilmaydi** - faqat oddiy keyboard
2. **Telegram ID Frontend'dan Olinmaydi** - faqat backend orqali
3. **Har Chek Faqat O'sha Mijozga** - telegramChatId bo'yicha filtrlash
4. **Bot Token Yashirin** - .env faylida
5. **Error Handling** - xatolik asosiy jarayonni to'xtatmaydi

## 📊 Monitoring va Logging

```javascript
// Bot holatini tekshirish
const botInfo = await posBot.getBotInfo();

// Chek yuborish natijasini kuzatish
const success = await posBot.sendReceiptToCustomer(data);
if (!success) {
  console.log('Chek yuborilmadi, lekin jarayon davom etdi');
}
```

## 🔄 Production Deployment

### PM2 bilan:
```bash
pm2 start src/index.js --name "pos-server"
pm2 logs pos-server
```

### Docker bilan:
```dockerfile
# Dockerfile ga qo'shish
RUN npm install node-telegram-bot-api
```

### Nginx bilan:
```nginx
# Webhook uchun (ixtiyoriy)
location /webhook/pos-bot {
    proxy_pass http://localhost:3003;
}
```

## 📞 Qo'llab-quvvatlash

- **Telefon Formatlar:** +998XXXXXXXXX, 998XXXXXXXXX, XXXXXXXXX
- **Keyboard Turi:** ReplyKeyboardMarkup (oddiy)
- **Bot Rejimi:** Polling (webhook emas)
- **Database:** MongoDB (Customer model)
- **Error Handling:** Try-catch har joyda

## 🎯 Maqsad

Bu bot POS tizimida mijozlarga avtomatik chek yuborish uchun mo'ljallangan. Oddiy, ishonchli va production-ready yechim.