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

// Yangi bot uchun webhook - chek yuborish boti
router.post('/receipt-webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('Receipt bot webhook received:', JSON.stringify(update, null, 2));

    // Yangi bot webhook'ni qayta ishlash
    await telegramService.handleReceiptWebhook(update);

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Receipt bot webhook error:', error);
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

// Yangi bot uchun webhook o'rnatish
router.post('/set-receipt-webhook', auth, authorize('admin'), async (req, res) => {
  try {
    const { webhookUrl } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ message: 'Webhook URL ni kiriting' });
    }

    const result = await telegramService.setReceiptWebhook(webhookUrl);

    if (result && result.ok) {
      res.json({ message: 'Receipt bot webhook muvaffaqiyatli o\'rnatildi', result: result.result });
    } else {
      res.status(400).json({ message: 'Receipt bot webhook o\'rnatishda xatolik', result });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi bot uchun webhook ma'lumotlarini olish
router.get('/receipt-webhook-info', auth, authorize('admin'), async (req, res) => {
  try {
    const result = await telegramService.getReceiptWebhookInfo();

    if (result && result.ok) {
      res.json(result.result);
    } else {
      res.status(400).json({ message: 'Receipt bot webhook ma\'lumotlarini olishda xatolik' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Yangi bot ma'lumotlarini olish
router.get('/receipt-bot-info', auth, authorize('admin'), async (req, res) => {
  try {
    const botInfo = await telegramService.getReceiptBotInfo();
    if (botInfo && botInfo.ok) {
      res.json(botInfo.result);
    } else {
      res.status(400).json({ message: 'Receipt bot ma\'lumotlarini olishda xatolik' });
    }
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

module.exports = router;
