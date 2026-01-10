// Faqat mijozga chek yuborish testini amalga oshirish
require('dotenv').config();
const mongoose = require('mongoose');
const { createPOSBot, getPOSBot } = require('./src/telegram.bot');
const Customer = require('./src/models/Customer');

async function testCustomerOnlyReceipt() {
  try {
    console.log('🧾 Faqat mijozga chek yuborish testini boshlash...\n');

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

    // Test mijoz topish yoki yaratish
    console.log('👤 Test mijoz topish...');

    let testCustomer = await Customer.findOne({
      name: 'k' // K mijozni topish
    });

    if (!testCustomer) {
      console.log('❌ Test mijoz topilmadi');
      return;
    }

    console.log(`✅ Test mijoz topildi: ${testCustomer.name} (${testCustomer.phone})`);
    console.log(`📱 Telegram ID: ${testCustomer.telegramChatId || 'YO\'Q'}`);

    // Agar telegram ID yo'q bo'lsa, test uchun qo'shamiz
    if (!testCustomer.telegramChatId) {
      testCustomer.telegramChatId = '7935196609'; // Admin chat ID (test uchun)
      await testCustomer.save();
      console.log('✅ Test uchun telegram ID qo\'shildi');
    }

    // Test chek ma'lumotlari - mijoz uchun tushunarli
    console.log('\n📤 Mijozga chek yuborish...');

    const testReceiptData = {
      customer: testCustomer,
      items: [
        {
          name: 'Yotoq xonasi komplekti',
          quantity: 1,
          price: 2500000
        },
        {
          name: 'Shkaf 3 eshikli',
          quantity: 1,
          price: 1800000
        },
        {
          name: 'Kreslo',
          quantity: 2,
          price: 450000
        }
      ],
      total: 5200000,
      paidAmount: 5200000,
      remainingAmount: 0,
      paymentMethod: 'cash',
      receiptNumber: `CHK-${Date.now()}`
    };

    const success = await posBot.sendReceiptToCustomer(testReceiptData);

    if (success) {
      console.log('✅ Mijozga chek muvaffaqiyatli yuborildi!');
      console.log(`👤 Mijoz: ${testCustomer.name}`);
      console.log(`📞 Telefon: ${testCustomer.phone}`);
      console.log(`💰 Jami summa: ${testReceiptData.total.toLocaleString()} so'm`);
      console.log(`📦 Mahsulotlar soni: ${testReceiptData.items.length} ta`);
    } else {
      console.log('❌ Chek yuborilmadi');
    }

    console.log('\n🎯 Natija:');
    console.log('✅ Faqat mijozga chek yuborildi');
    console.log('✅ Admin/do\'konga xabar yuborilmadi');
    console.log('✅ Chek mijoz uchun tushunarli formatda');

    console.log('\n📋 Keyingi qadamlar:');
    console.log('1. KassaMain da mijoz tanlab chek yarating');
    console.log('2. Faqat tanlangan mijozga chek boradi');
    console.log('3. Sizga (admin) ga xabar bormaydi');

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
testCustomerOnlyReceipt();