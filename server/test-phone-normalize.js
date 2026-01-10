// Telefon raqam normalize funksiyasini test qilish
require('dotenv').config();
const mongoose = require('mongoose');
const { createPOSBot } = require('./src/telegram.bot');
const Customer = require('./src/models/Customer');

async function testPhoneNormalize() {
  try {
    console.log('📞 Telefon raqam normalize testini boshlash...\n');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Bot yaratish
    const posBot = createPOSBot();

    // Test telefon raqamlari
    const testPhones = [
      '+998 (88) 888-88-88', // Database format
      '+998888888888',       // Telegram format
      '998888888888',        // Raqamlar
      '888888888',           // 9 raqam
      '8888888888',          // 10 raqam
      '+998 88 888 88 88',   // Bo'shliqlar bilan
      '+998-88-888-88-88'    // Chiziqchalar bilan
    ];

    console.log('🧪 Telefon raqam normalize testi:\n');

    for (const phone of testPhones) {
      console.log(`📱 Test: "${phone}"`);
      const normalized = posBot.normalizePhoneNumber(phone);
      console.log(`✅ Natija: "${normalized}"`);

      // Database da qidirish
      const customer = await posBot.findCustomerByPhone(phone);
      if (customer) {
        console.log(`🎯 Mijoz topildi: ${customer.name} (${customer.phone})`);
      } else {
        console.log(`❌ Mijoz topilmadi`);
      }
      console.log('');
    }

    // Haqiqiy database dagi telefon raqamlar bilan test
    console.log('📋 Database dagi telefon raqamlar bilan test:\n');

    const customers = await Customer.find({}).select('name phone').limit(5);

    for (const customer of customers) {
      console.log(`👤 Mijoz: ${customer.name}`);
      console.log(`📞 DB format: "${customer.phone}"`);

      // Telegram formatiga o'tkazish
      const telegramFormat = customer.phone.replace(/\D/g, '');
      const testFormat = telegramFormat.startsWith('998') ? '+' + telegramFormat : '+998' + telegramFormat;

      console.log(`📱 Telegram format: "${testFormat}"`);

      // Qidirish testi
      const found = await posBot.findCustomerByPhone(testFormat);
      if (found) {
        console.log(`✅ Muvaffaqiyat: Mijoz topildi!`);
      } else {
        console.log(`❌ Xatolik: Mijoz topilmadi!`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test xatosi:', error);
  } finally {
    // Bot to'xtatish va MongoDB ulanishini yopish
    const bot = posBot;
    if (bot) {
      bot.stopBot();
    }
    await mongoose.disconnect();
    console.log('\n🔌 Test tugadi, ulanishlar yopildi');
    process.exit(0);
  }
}

// Test ishga tushirish
testPhoneNormalize();