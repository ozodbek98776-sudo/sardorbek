// Behruz Namozovga chek yuborish testini amalga oshirish
require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./server/src/models/Customer');
const telegramService = require('./server/src/services/telegramService');

async function testBehruzReceipt() {
  try {
    console.log('🔍 Behruz Namozov ma\'lumotlarini qidirish...\n');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Behruz Namozovni qidirish
    const behruz = await Customer.findOne({
      $or: [
        { name: /behruz/i },
        { name: /namozov/i },
        { name: /behruz.*namozov/i }
      ]
    });

    if (!behruz) {
      console.log('❌ Behruz Namozov topilmadi');

      // Barcha mijozlarni ko'rsatish
      const customers = await Customer.find({}).limit(10);
      console.log('\n📋 Mavjud mijozlar (birinchi 10 ta):');
      customers.forEach((customer, index) => {
        console.log(`${index + 1}. ${customer.name} - ${customer.phone} - Chat ID: ${customer.telegramChatId || 'YO\'Q'}`);
      });

      return;
    }

    console.log('✅ Behruz Namozov topildi:');
    console.log(`   Ism: ${behruz.name}`);
    console.log(`   Telefon: ${behruz.phone}`);
    console.log(`   Telegram Chat ID: ${behruz.telegramChatId || 'YO\'Q'}`);
    console.log(`   Qarz: ${behruz.debt || 0} so'm`);
    console.log(`   Jami xaridlar: ${behruz.totalPurchases || 0} so'm\n`);

    if (!behruz.telegramChatId) {
      console.log('❌ Behruz Namozovda telegram chat ID yo\'q!');
      console.log('💡 Yechim: Behruz telegram botga /start yuborishi va telefon raqamini kiritishi kerak');
      return;
    }

    // Test chek ma'lumotlari
    const testReceiptData = {
      customer: behruz,
      items: [
        {
          name: 'Test Mahsulot 1',
          code: 'TEST001',
          price: 25000,
          quantity: 2
        },
        {
          name: 'Test Mahsulot 2',
          code: 'TEST002',
          price: 15000,
          quantity: 1
        }
      ],
      total: 65000,
      paidAmount: 65000,
      remainingAmount: 0,
      paymentMethod: 'cash',
      receiptNumber: `BEHRUZ-TEST-${Date.now()}`
    };

    console.log('📤 Behruz Namozovga test chek yuborish...');

    // POS Bot orqali chek yuborish
    const success = await telegramService.sendReceiptToCustomerViaPOSBot(testReceiptData);

    if (success) {
      console.log('✅ Test chek muvaffaqiyatli yuborildi!');
      console.log(`📱 Mijoz: ${behruz.name}`);
      console.log(`📞 Telefon: ${behruz.phone}`);
      console.log(`🧾 Chek raqami: ${testReceiptData.receiptNumber}`);
      console.log(`💰 Summa: ${testReceiptData.total.toLocaleString()} so'm`);
    } else {
      console.log('❌ Chek yuborilmadi');
    }

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB dan uzildi');
  }
}

// Test ishga tushirish
if (require.main === module) {
  testBehruzReceipt();
}

module.exports = { testBehruzReceipt };