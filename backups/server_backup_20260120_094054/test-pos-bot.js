// POS Telegram Bot test fayli
require('dotenv').config();
const mongoose = require('mongoose');
const { createPOSBot, getPOSBot } = require('./src/telegram.bot');
const Customer = require('./src/models/Customer');

async function testPOSBot() {
  try {
    console.log('🧪 POS Telegram Bot testini boshlash...\n');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Bot yaratish
    console.log('🤖 POS Bot yaratish...');
    const posBot = createPOSBot();

    if (!posBot) {
      console.error('❌ Bot yaratilmadi - token tekshiring');
      return;
    }

    // Bot ma'lumotlarini olish
    const botInfo = await posBot.getBotInfo();
    if (botInfo) {
      console.log('✅ Bot muvaffaqiyatli yaratildi');
      console.log(`📱 Bot username: @${botInfo.username}`);
      console.log(`🆔 Bot ID: ${botInfo.id}`);
      console.log(`📝 Bot nomi: ${botInfo.first_name}\n`);
    }

    // Test mijoz yaratish (agar yo'q bo'lsa)
    console.log('👤 Test mijoz yaratish...');

    let testCustomer = await Customer.findOne({ phone: '+998901234567' });

    if (!testCustomer) {
      testCustomer = new Customer({
        name: 'Test POS Mijoz',
        phone: '+998901234567',
        telegramChatId: '7935196609', // Admin chat ID (test uchun)
        debt: 50000,
        totalPurchases: 150000
      });

      await testCustomer.save();
      console.log('✅ Test mijoz yaratildi:', testCustomer.name);
    } else {
      console.log('✅ Test mijoz mavjud:', testCustomer.name);
    }

    // Test chek yuborish
    console.log('\n📤 Test chek yuborish...');

    const testReceiptData = {
      customer: testCustomer,
      items: [
        {
          name: 'Test Stol',
          quantity: 1,
          price: 500000
        },
        {
          name: 'Test Stul',
          quantity: 4,
          price: 150000
        }
      ],
      total: 1100000,
      paidAmount: 1100000,
      remainingAmount: 0,
      paymentMethod: 'cash',
      receiptNumber: `TEST-POS-${Date.now()}`
    };

    const success = await posBot.sendReceiptToCustomer(testReceiptData);

    if (success) {
      console.log('✅ Test chek muvaffaqiyatli yuborildi!');
    } else {
      console.log('❌ Test chek yuborilmadi');
    }

    console.log('\n🎉 Test tugadi!');
    console.log('\n📋 Keyingi qadamlar:');
    console.log('1. Telegram da botni toping: @' + (botInfo?.username || 'bot_username'));
    console.log('2. /start buyrug\'ini yuboring');
    console.log('3. Telefon raqamingizni yuboring');
    console.log('4. Kassa tizimida chek yarating');

  } catch (error) {
    console.error('❌ Test xatosi:', error);
  } finally {
    // Bot to'xtatish va MongoDB ulanishini yopish
    const bot = getPOSBot();
    if (bot) {
      bot.stopBot();
    }
    await mongoose.disconnect();
    console.log('\n🔌 Test tugadi, ulanishlar yopildi');
    process.exit(0);
  }
}

// Test ishga tushirish
testPOSBot();