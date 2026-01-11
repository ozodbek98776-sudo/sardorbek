const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');

const router = express.Router();

// Telegram webhook - bot xabarlarini qabul qilish
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2));
    
    // Webhook'ni qayta ishlash
    await telegramService.handleWebhook(update);
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    res.status(200).json({ ok: true }); // Telegram har doim 200 kutadi
  }
});

// Xodim kelish/ketish xabari
router.post('/attendance', auth, async (req, res) => {
  try {
    const { type } = req.body;
    if (!['arrived', 'left'].includes(type)) {
      return res.status(400).json({ message: 'Noto‘g‘ri tur: arrived yoki left bo‘lishi kerak' });
    }
    await telegramService.sendPresenceNotification(req.user, type);
    res.json({ message: 'Xabar yuborildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun kelish/ketish xabari (token talab qilmaydi)
router.post('/attendance/kassa', async (req, res) => {
  try {
    const { type, username } = req.body;
    if (!['arrived', 'left'].includes(type)) {
      return res.status(400).json({ message: 'Noto‘g‘ri tur: arrived yoki left bo‘lishi kerak' });
    }
    if (!username) {
      return res.status(400).json({ message: 'Username talab qilinadi' });
    }
    
    // Kassa uchun alohida xabar yuborish
    const emoji = type === 'arrived' ? '🟢' : '🔴';
    const verb = type === 'arrived' ? 'Ishga KELDI' : 'Ishdan KETDI';
    const message = `
${emoji} <b>${verb}</b>

👤 <b>Xodim:</b> ${username}
🎭 <b>Rol:</b> Kassir
📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
    `;
    await telegramService.sendMessage(message.trim());
    res.json({ message: 'Xabar yuborildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Webhook o'rnatish
router.post('/set-webhook', auth, authorize('admin'), async (req, res) => {
  try {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL ni kiriting' });
    }

    const result = await telegramService.setWebhook(webhookUrl);
    
    if (result && result.ok) {
      res.json({ message: 'Webhook muvaffaqiyatli o\'rnatildi', result: result.result });
    } else {
      res.status(400).json({ message: 'Webhook o\'rnatishda xatolik', result });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Webhook ma'lumotlarini olish
router.get('/webhook-info', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await telegramService.getWebhookInfo();
    
    if (result && result.ok) {
      res.json(result.result);
    } else {
      res.status(400).json({ message: 'Webhook ma\'lumotlarini olishda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Telegram sozlamalarini olish
router.get('/settings', auth, authorize('admin'), async (req, res) => {
  try {
    const settings = {
      botToken: process.env.TELEGRAM_BOT_TOKEN ? '***' + process.env.TELEGRAM_BOT_TOKEN.slice(-10) : '',
      chatId: process.env.TELEGRAM_CHAT_ID || '',
      isEnabled: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Telegram sozlamalarini saqlash
router.post('/settings', auth, authorize('admin'), async (req, res) => {
  try {
    const { botToken, chatId, isEnabled } = req.body;
    
    // Bu yerda .env faylini yangilash kerak
    // Hozircha faqat javob qaytaramiz
    // Amalda .env faylini yangilash yoki database da saqlash kerak
    
    res.json({ 
      message: 'Sozlamalar saqlandi. Serverni qayta ishga tushiring.',
      note: 'Bot token va Chat ID ni .env faylida qo\'lda yangilang'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Bot ma'lumotlarini olish
router.get('/bot-info', auth, authorize('admin'), async (req, res) => {
  try {
    const botInfo = await telegramService.getBotInfo();
    if (botInfo && botInfo.ok) {
      res.json(botInfo.result);
    } else {
      res.status(400).json({ message: 'Bot ma\'lumotlarini olishda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Test xabar yuborish
router.post('/test', auth, authorize('admin'), async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Xabar matnini kiriting' });
    }

    const testMessage = `🧪 <b>TEST XABAR</b>\n\n${message}\n\n📅 ${new Date().toLocaleString('uz-UZ')}`;
    
    const result = await telegramService.sendMessage(testMessage);
    
    if (result) {
      res.json({ message: 'Test xabari muvaffaqiyatli yuborildi' });
    } else {
      res.status(400).json({ message: 'Xabar yuborishda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi xabarlarni olish (Chat ID topish uchun)
router.get('/updates', auth, authorize('admin'), async (req, res) => {
  try {
    const updates = await telegramService.getUpdates();
    if (updates && updates.ok) {
      res.json(updates.result);
    } else {
      res.status(400).json({ message: 'Yangilanishlarni olishda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Hamkor to'lovi xabari yuborish
router.post('/send-partner-payment', async (req, res) => {
  try {
    const { message, partner, amount, customer, item } = req.body;
    
    if (!partner || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Majburiy maydonlar to\'ldirilmagan' 
      });
    }

    // Mijoz ma'lumotini qo'shish
    const customerInfo = customer ? `\n👤 Mijoz: ${customer.name} (${customer.phone})` : '\n👤 Mijoz: Tanlanmagan';
    
    // Xabar tayyorlash
    const partnerName = partner === 'uzum' ? 'Uzum Market' : partner === 'ishonch' ? 'Ishonch' : 'Yandex Market';
    const partnerIcon = partner === 'uzum' ? '🛒' : partner === 'ishonch' ? '🤝' : '🚚';
    
    const formattedMessage = `${partnerIcon} <b>${partnerName} - Yangi to'lov!</b>${customerInfo}

📦 <b>Tovar:</b> ${item?.name || 'Noma\'lum'}
🏷️ <b>Kod:</b> ${item?.code || '-'}
💰 <b>Summa:</b> ${amount.toLocaleString()} so'm
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

💳 <b>To'lov turi:</b> ${partnerName} orqali`;

    // Hamkorlar botiga xabar yuborish
    const result = await telegramService.sendPartnerMessage(formattedMessage);
    
    if (result) {
      res.json({ 
        success: true, 
        message: 'Hamkor to\'lovi xabari muvaffaqiyatli yuborildi' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Xabar yuborishda xatolik - bot token yoki chat ID tekshiring' 
      });
    }
  } catch (error) {
    console.error('Hamkor to\'lovi xabari yuborishda xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

module.exports = router;
