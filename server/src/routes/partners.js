const express = require('express');
const router = express.Router();
const telegramService = require('../services/telegramService');

// Hamkorlar ro'yxati
const PARTNERS = {
  uzum: {
    name: 'Uzum Market',
    icon: '🛒',
    color: '#8B5CF6'
  },
  ishonch: {
    name: 'Ishonch',
    icon: '🤝',
    color: '#F59E0B'
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
      `\n👤 <b>Mijoz:</b> ${customer.name} (${customer.phone})` : 
      '\n👤 <b>Mijoz:</b> Tanlanmagan';

    const message = `${partnerInfo.icon} <b>${partnerInfo.name} - Yangi to'lov!</b>${customerInfo}

📦 <b>Tovar:</b> ${item.name}
🏷️ <b>Kod:</b> ${item.code}
💰 <b>Summa:</b> ${amount.toLocaleString()} so'm
📄 <b>Chek:</b> ${receiptNumber || 'N/A'}
⏰ <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}

💳 <b>To'lov turi:</b> ${partnerInfo.name} orqali`;

    // Hamkorlar botiga xabar yuborish
    let telegramSuccess = false;
    try {
      const result = await telegramService.sendPartnerMessage(message);
      telegramSuccess = !!result;
    } catch (telegramError) {
      console.error(`${partnerInfo.name} ga xabar yuborishda xatolik:`, telegramError);
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