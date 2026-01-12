# POS Bot O'rnatish Qo'llanmasi

## 1. Bot Konfiguratsiyasi

Bot token va admin chat ID `.env` faylida to'g'ri o'rnatilgan:

```env
POS_TELEGRAM_BOT_TOKEN=8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA
POS_ADMIN_CHAT_ID=7935196609
```

## 2. Bot Ma'lumotlari

- **Bot nomi:** sardorbek_savdo_bot
- **Username:** @sardor_savdo_bot
- **Bot ID:** 8423453680

## 3. Webhook O'rnatish

### Mahalliy test uchun (ngrok bilan):

1. Ngrok ishga tushiring:
```bash
ngrok http 8000
```

2. Webhook o'rnating:
```bash
cd server
node set-pos-webhook.js
```

3. `set-pos-webhook.js` faylida WEBHOOK_URL ni o'zgartiring:
```javascript
const WEBHOOK_URL = 'https://your-ngrok-url.ngrok.io/api/telegram/pos-webhook';
```

### Production uchun:

```javascript
const WEBHOOK_URL = 'https://your-domain.com/api/telegram/pos-webhook';
```

## 4. Bot Xususiyatlari

### /start komandasi:
- Foydalanuvchini kutib oladi
- Telefon raqam yuborish tugmasini ko'rsatadi
- `request_contact: true` bilan telefon raqamni avtomatik oladi

### Telefon raqam qabul qilish:
- Contact orqali (tugma bosish)
- Matn sifatida yozish (+998901234567, 998901234567, 901234567)
- Avtomatik formatlash: +998901234567

### Mijoz ro'yxatdan o'tkazish:
- Telefon raqam bo'yicha Customer modelidan qidiradi
- Topilsa: telegramChatId ni yangilaydi
- Topilmasa: xatolik xabari yuboradi

## 5. Test Qilish

### Bot ishlashini tekshirish:
```bash
cd server
node test-pos-bot-phone.js
```

### Webhook ma'lumotlarini ko'rish:
```bash
curl https://api.telegram.org/bot8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA/getWebhookInfo
```

## 6. Xatoliklarni Tuzatish

### Webhook ishlamasa:
1. Server ishlab turganini tekshiring
2. URL to'g'ri ekanini tekshiring
3. HTTPS ishlatilganini tekshiring
4. Firewall sozlamalarini tekshiring

### Bot javob bermasa:
1. Token to'g'ri ekanini tekshiring
2. Bot @BotFather da faol ekanini tekshiring
3. Server loglarini tekshiring

## 7. Endpoint lar

- **POS Webhook:** `/api/telegram/pos-webhook`
- **Admin Webhook:** `/api/telegram/webhook`
- **Webhook o'rnatish:** `/api/telegram/set-webhook`
- **Webhook ma'lumotlari:** `/api/telegram/webhook-info`

## 8. Foydalanish

1. Botni @sardor_savdo_bot orqali toping
2. `/start` ni bosing
3. "📱 Telefon raqamni yuborish" tugmasini bosing
4. Yoki telefon raqamni matn sifatida yuboring
5. Muvaffaqiyatli ro'yxatdan o'tgandan keyin cheklar avtomatik keladi

## 9. Xavfsizlik

- Bot tokenlarini `.env` faylida saqlang
- `.env` faylini git ga qo'shmang
- Webhook URL ni HTTPS bilan ishlating
- Admin chat ID ni maxfiy saqlang