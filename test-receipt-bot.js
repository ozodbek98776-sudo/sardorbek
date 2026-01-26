const axios = require('axios');

// Yangi bot tokenini test qilish
const RECEIPT_BOT_TOKEN = '8423453680:AAHJdFdL6wcK9tLKOTlnkWNBBlmsQ27KubA';
const baseUrl = `https://api.telegram.org/bot${RECEIPT_BOT_TOKEN}`;

async function testReceiptBot() {
  try {
    console.log('🤖 Yangi chek botini test qilish...\n');

    // 1. Bot ma'lumotlarini olish
    console.log('1. Bot ma\'lumotlarini tekshirish...');
    const botInfo = await axios.get(`${baseUrl}/getMe`);
    console.log('✅ Bot topildi:', botInfo.data.result.username);
    console.log('📝 Bot nomi:', botInfo.data.result.first_name);
    console.log('🆔 Bot ID:', botInfo.data.result.id);
    console.log('');

    // 2. Webhook ma'lumotlarini olish
    console.log('2. Webhook holatini tekshirish...');
    const webhookInfo = await axios.get(`${baseUrl}/getWebhookInfo`);
    console.log('🔗 Webhook URL:', webhookInfo.data.result.url || 'O\'rnatilmagan');
    console.log('📊 Pending updates:', webhookInfo.data.result.pending_update_count);
    console.log('');

    // 3. Test xabar yuborish (agar chat ID mavjud bo'lsa)
    const testChatId = process.env.TELEGRAM_RECEIPT_CHAT_ID;
    if (testChatId) {
      console.log('3. Test xabar yuborish...');
      const testMessage = `
🧾 <b>TEST CHEK</b>

📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}
🏪 <b>Do'kon:</b> Sardor Furnitura
🧾 <b>Chek raqami:</b> TEST-${Date.now()}

📦 <b>Mahsulotlar:</b>
1. Test mahsulot - 1 x 10,000 = 10,000 so'm

💰 <b>Jami summa:</b> 10,000 so'm
💳 <b>To'lov turi:</b> Naqd pul 💵

✅ Bot muvaffaqiyatli ishlayapti!
      `;

      const response = await axios.post(`${baseUrl}/sendMessage`, {
        chat_id: testChatId,
        text: testMessage.trim(),
        parse_mode: 'HTML'
      });

      console.log('✅ Test xabar yuborildi!');
      console.log('📨 Message ID:', response.data.result.message_id);
    } else {
      console.log('⚠️ TELEGRAM_RECEIPT_CHAT_ID o\'rnatilmagan - test xabar yuborilmadi');
    }

    // 4. Mijozga test chek yuborish (agar mijoz chat ID mavjud bo'lsa)
    console.log('\n4. Mijozga test chek yuborish...');
    const customerTestMessage = `
🧾 <b>XARID CHEKI</b>

📅 <b>Sana:</b> ${new Date().toLocaleString('uz-UZ')}
🏪 <b>Do'kon:</b> Sardor Furnitura
👤 <b>Mijoz:</b> Test Mijoz
🧾 <b>Chek raqami:</b> CHK-${Date.now()}

📦 <b>Xarid qilingan mahsulotlar:</b>
1. Test mahsulot - 2 x 25,000 = 50,000 so'm
2. Boshqa mahsulot - 1 x 15,000 = 15,000 so'm

💰 <b>Jami summa:</b> 65,000 so'm
💳 <b>To'lov turi:</b> Naqd pul 💵
💵 <b>To'langan:</b> 65,000 so'm

✅ <b>Qarz holati:</b> Qarz yo'q

🙏 Xaridingiz uchun rahmat!
    `;

    if (testChatId) {
      const customerResponse = await axios.post(`${baseUrl}/sendMessage`, {
        chat_id: testChatId,
        text: customerTestMessage.trim(),
        parse_mode: 'HTML'
      });

      console.log('✅ Mijoz test cheki yuborildi!');
      console.log('📨 Message ID:', customerResponse.data.result.message_id);
    }

    console.log('\n🎉 Bot test muvaffaqiyatli tugadi!');
    console.log('\n📋 Keyingi qadamlar:');
    console.log('1. .env faylida TELEGRAM_RECEIPT_CHAT_ID ni o\'rnating');
    console.log('2. Serverni qayta ishga tushiring');
    console.log('3. Mijozlar botga /start yuborib ro\'yxatdan o\'tsinlar');

  } catch (error) {
    console.error('❌ Bot test xatosi:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log('🔑 Bot token noto\'g\'ri yoki yaroqsiz');
    } else if (error.response?.status === 400) {
      console.log('📝 So\'rov formati noto\'g\'ri');
    }
  }
}

// Test ishga tushirish
testReceiptBot();