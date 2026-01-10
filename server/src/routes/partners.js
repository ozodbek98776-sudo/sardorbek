const express = require('express');
const router = express.Router();
const { sendTelegramMessage } = require('../services/telegramService');

// Hamkorlar ro'yxati
const PARTNERS = {
  uzum: {
    name: 'Uzum Market',
    chatId: process.env.UZUM_CHAT_ID || '',
    icon: '🛒',
    color: '#8B5CF6'
  },
  ishonch: {
    name: 'Ishonch',
    chatId: process.env.ISHONCH_CHAT_ID || '',
    icon: '🤝',
    color: '#F59E0B'
  },
  yandex: {
    name: 'Yandex Market',
    chatId: process.env.YANDEX_CHAT_ID || '',
    icon: '🚚',
    color: '#EF4444'
  }
};

// Hamkorlar ro'yxatini olish
router.get('/', (req, res) => {
  try {
    const partnersList = Object.keys(PARTNERS).map(key => ({
      id: key,
      ...PARTNERS[key]
    }));
    
    res.json({
      success: true,
      partners: partnersList
    });
  } catch (error) {
    console.error('Hamkorlar ro\'yxatini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    });
  }
});

// Hamkor to'lovini yuborish
router.post('/payment', async (req, res) => {
  try {
    const { 
      partner, 
      amount, 
      item, 
      customer, 
      receiptNumber 
    } = req.body;

    if (!partner || !amount || !item) {
      return res.status(400).json({
        success: false,
        message: 'Majburiy maydonlar to\'ldirilmagan'
      });
    }

    const partnerInfo = PARTNERS[partner];
    if (!partnerInfo) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri hamkor'
      });
    }

    // Telegram xabarini tayyorlash
    const customerInfo = customer ? 
      `\n👤 Mijoz: ${customer.name} (${customer.phone})` : 
      '\n👤 Mijoz: Tanlanmagan';

    const message = `${partnerInfo.icon} ${partnerInfo.name} - Yangi to'lov!${customerInfo}

📦 Tovar: ${item.name}
🏷️ Kod: ${item.code}
💰 Summa: ${amount.toLocaleString()} so'm
📄 Chek: ${receiptNumber || 'N/A'}
⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}

💳 To'lov turi: ${partnerInfo.name} orqali`;

    // Telegram xabarini yuborish
    let telegramSuccess = false;
    if (partnerInfo.chatId) {
      try {
        await sendTelegramMessage(partnerInfo.chatId, message);
        telegramSuccess = true;
      } catch (telegramError) {
        console.error(`${partnerInfo.name} ga xabar yuborishda xatolik:`, telegramError);
      }
    }

    // Umumiy admin chatga ham yuborish
    if (process.env.TELEGRAM_CHAT_ID) {
      try {
        const adminMessage = `🤝 Hamkor to'lovi qabul qilindi!

${partnerInfo.icon} Hamkor: ${partnerInfo.name}
📦 Tovar: ${item.name}
💰 Summa: ${amount.toLocaleString()} so'm${customerInfo}
⏰ Vaqt: ${new Date().toLocaleString('uz-UZ')}`;

        await sendTelegramMessage(process.env.TELEGRAM_CHAT_ID, adminMessage);
      } catch (adminError) {
        console.error('Admin chatga xabar yuborishda xatolik:', adminError);
      }
    }

    res.json({
      success: true,
      message: `${partnerInfo.name} orqali to'lov muvaffaqiyatli yuborildi`,
      telegramSent: telegramSuccess,
      partner: partnerInfo
    });

  } catch (error) {
    console.error('Hamkor to\'lovi yuborishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    });
  }
});

// Hamkor statistikasini olish
router.get('/stats', async (req, res) => {
  try {
    // Bu yerda hamkorlar bo'yicha statistika olish logikasi bo'lishi kerak
    // Hozircha mock data qaytaramiz
    const stats = Object.keys(PARTNERS).map(key => ({
      id: key,
      name: PARTNERS[key].name,
      icon: PARTNERS[key].icon,
      totalPayments: 0,
      totalAmount: 0,
      lastPayment: null
    }));

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Hamkor statistikasini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatoligi'
    });
  }
});

module.exports = router;