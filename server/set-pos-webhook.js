const axios = require('axios');
require('dotenv').config();

const POS_BOT_TOKEN = process.env.POS_TELEGRAM_BOT_TOKEN;

async function setPOSWebhook() {
  if (!POS_BOT_TOKEN) {
    console.error('❌ POS_TELEGRAM_BOT_TOKEN topilmadi!');
    return;
  }

  // Webhook URL - bu yerda sizning server URL ingizni kiriting
  const WEBHOOK_URL = 'https://your-domain.com/api/telegram/pos-webhook';

  console.log('🔗 POS Bot uchun webhook o\'rnatilmoqda...');
  console.log('📡 Webhook URL:', WEBHOOK_URL);

  try {
    const response = await axios.post(`https://api.telegram.org/bot${POS_BOT_TOKEN}/setWebhook`, {
      url: WEBHOOK_URL
    });

    if (response.data.ok) {
      console.log('✅ POS Bot webhook muvaffaqiyatli o\'rnatildi!');
      console.log('📋 Javob:', response.data.description);
    } else {
      console.log('❌ Webhook o\'rnatishda xatolik:', response.data);
    }

    // Webhook ma'lumotlarini tekshirish
    console.log('\n🔍 Webhook ma\'lumotlarini tekshirish...');
    const infoResponse = await axios.get(`https://api.telegram.org/bot${POS_BOT_TOKEN}/getWebhookInfo`);

    if (infoResponse.data.ok) {
      const info = infoResponse.data.result;
      console.log('📡 Webhook URL:', info.url);
      console.log('🔄 Pending updates:', info.pending_update_count);
      console.log('📅 Oxirgi xatolik:', info.last_error_date ?
        new Date(info.last_error_date * 1000).toLocaleString('uz-UZ') : 'Yo\'q');
      console.log('🔧 Max connections:', info.max_connections);
    }

  } catch (error) {
    console.error('❌ Xatolik:', error.response?.data || error.message);
  }
}

// Webhook o'chirish funksiyasi (test uchun)
async function deletePOSWebhook() {
  if (!POS_BOT_TOKEN) {
    console.error('❌ POS_TELEGRAM_BOT_TOKEN topilmadi!');
    return;
  }

  console.log('🗑️ POS Bot webhook o\'chirilmoqda...');

  try {
    const response = await axios.post(`https://api.telegram.org/bot${POS_BOT_TOKEN}/deleteWebhook`);

    if (response.data.ok) {
      console.log('✅ POS Bot webhook muvaffaqiyatli o\'chirildi!');
    } else {
      console.log('❌ Webhook o\'chirishda xatolik:', response.data);
    }
  } catch (error) {
    console.error('❌ Xatolik:', error.response?.data || error.message);
  }
}

// Argumentlarga qarab funksiya chaqirish
const action = process.argv[2];

if (action === 'delete') {
  deletePOSWebhook();
} else {
  setPOSWebhook();
}

console.log('\n💡 Eslatma:');
console.log('- Webhook o\'rnatish uchun: node set-pos-webhook.js');
console.log('- Webhook o\'chirish uchun: node set-pos-webhook.js delete');
console.log('- WEBHOOK_URL ni o\'zingizning server URL ingizga o\'zgartiring!');