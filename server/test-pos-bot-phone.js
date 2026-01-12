const axios = require('axios');
require('dotenv').config();

// POS Bot tokenini .env faylidan olish
const POS_BOT_TOKEN = process.env.POS_TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.POS_ADMIN_CHAT_ID;

console.log('🤖 POS Bot Token:', POS_BOT_TOKEN ? 'Mavjud ✅' : 'Yo\'q ❌');
console.log('👤 Admin Chat ID:', ADMIN_CHAT_ID);

async function testPosBot() {
  if (!POS_BOT_TOKEN) {
    console.error('❌ POS_TELEGRAM_BOT_TOKEN topilmadi!');
    return;
  }

  const baseUrl = `https://api.telegram.org/bot${POS_BOT_TOKEN}`;

  try {
    // 1. Bot ma'lumotlarini olish
    console.log('\n📋 Bot ma\'lumotlarini tekshirish...');
    const botInfoResponse = await axios.get(`${baseUrl}/getMe`);
    const botInfo = botInfoResponse.data;

    if (botInfo.ok) {
      console.log('✅ Bot ishlayapti!');
      console.log(`🤖 Bot nomi: ${botInfo.result.first_name}`);
      console.log(`📝 Username: @${botInfo.result.username}`);
      console.log(`🆔 Bot ID: ${botInfo.result.id}`);
    } else {
      console.log('❌ Bot ma\'lumotlarini olishda xatolik:', botInfo);
      return;
    }

    // 2. Test xabar yuborish
    if (ADMIN_CHAT_ID) {
      console.log('\n📤 Test xabar yuborish...');
      const testMessage = `
🧪 <b>POS BOT TEST</b>

📅 <b>Vaqt:</b> ${new Date().toLocaleString('uz-UZ')}
🤖 <b>Bot:</b> ${botInfo.result.first_name}

✅ Bot to'g'ri ishlayapti!
📱 Telefon raqam yuborish uchun tayyor.

<b>Test qilish uchun:</b>
• +998901234567
• 998901234567  
• 901234567

💡 <i>Bu test xabari</i>
      `;

      const messageResponse = await axios.post(`${baseUrl}/sendMessage`, {
        chat_id: ADMIN_CHAT_ID,
        text: testMessage.trim(),
        parse_mode: 'HTML'
      });

      if (messageResponse.data.ok) {
        console.log('✅ Test xabar muvaffaqiyatli yuborildi!');
        console.log(`📨 Message ID: ${messageResponse.data.result.message_id}`);
      } else {
        console.log('❌ Xabar yuborishda xatolik:', messageResponse.data);
      }
    } else {
      console.log('⚠️ ADMIN_CHAT_ID yo\'q, xabar yuborilmadi');
    }

    // 3. Webhook ma'lumotlarini tekshirish
    console.log('\n🔗 Webhook ma\'lumotlarini tekshirish...');
    const webhookResponse = await axios.get(`${baseUrl}/getWebhookInfo`);

    if (webhookResponse.data.ok) {
      const webhookInfo = webhookResponse.data.result;
      console.log('📡 Webhook URL:', webhookInfo.url || 'O\'rnatilmagan');
      console.log('🔄 Pending updates:', webhookInfo.pending_update_count || 0);
      console.log('📅 Oxirgi xatolik:', webhookInfo.last_error_date ?
        new Date(webhookInfo.last_error_date * 1000).toLocaleString('uz-UZ') : 'Yo\'q');
    }

    // 4. Telefon raqam formatlarini test qilish
    console.log('\n📱 Telefon raqam formatlarini test qilish...');

    const testPhones = [
      '+998901234567',
      '998901234567',
      '901234567',
      '+998 90 123 45 67',
      '998 90 123 45 67',
      '90 123 45 67'
    ];

    testPhones.forEach(phone => {
      const formatted = formatPhone(phone);
      console.log(`📞 ${phone} → ${formatted}`);
    });

  } catch (error) {
    console.error('❌ Xatolik:', error.response?.data || error.message);
  }
}

// Telefon raqamni formatlash funksiyasi
function formatPhone(phone) {
  // Faqat raqamlarni qoldirish
  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('998')) {
    return '+' + cleaned;
  } else if (cleaned.length === 9) {
    return '+998' + cleaned;
  } else {
    return 'Noto\'g\'ri format';
  }
}

// Testni ishga tushirish
console.log('🚀 POS Bot telefon raqam test boshlandi...\n');
testPosBot().then(() => {
  console.log('\n✅ Test yakunlandi!');
}).catch(error => {
  console.error('\n❌ Test xatoligi:', error);
});