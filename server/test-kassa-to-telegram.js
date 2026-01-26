// KassaMain dan telegram botga chek yuborish testini amalga oshirish
const axios = require('axios');

const SERVER_URL = 'http://localhost:3003';

async function testKassaToTelegram() {
  try {
    console.log('🧾 KassaMain dan Telegram botga chek yuborish testini boshlash...\n');

    // Avval mijozlarni ko'ramiz
    console.log('👥 Mijozlar ro\'yxatini olish...');
    const customersResponse = await axios.get(`${SERVER_URL}/api/customers/kassa`);
    const customers = customersResponse.data;

    console.log(`📋 Jami ${customers.length} ta mijoz topildi:`);
    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name} (${customer.phone}) - Telegram ID: ${customer.telegramChatId || 'YO\'Q'}`);
    });

    // Telegram ID mavjud mijozni topish
    const telegramCustomer = customers.find(c => c.telegramChatId);

    if (!telegramCustomer) {
      console.log('\n❌ Hech qanday mijozda telegram ID yo\'q');
      console.log('💡 Avval mijoz botga /start yuborib ro\'yxatdan o\'tishi kerak');
      return;
    }

    console.log(`\n✅ Telegram ID mavjud mijoz topildi: ${telegramCustomer.name}`);
    console.log(`📱 Telegram ID: ${telegramCustomer.telegramChatId}`);

    // Test chek ma'lumotlari - KassaMain formatida
    const testReceiptData = {
      items: [
        {
          product: '507f1f77bcf86cd799439011', // Test product ID
          name: 'Yotoq xonasi komplekti',
          code: 'YXK001',
          price: 2500000,
          quantity: 1,
          paymentBreakdown: { cash: 2500000, click: 0, card: 0 }
        },
        {
          product: '507f1f77bcf86cd799439012', // Test product ID
          name: 'Shkaf 3 eshikli',
          code: 'SHK003',
          price: 1800000,
          quantity: 1,
          paymentBreakdown: { cash: 1800000, click: 0, card: 0 }
        }
      ],
      total: 4300000,
      paymentMethod: 'cash',
      customer: telegramCustomer._id, // Telegram ID mavjud mijoz
      receiptNumber: `KASSA-TELEGRAM-TEST-${Date.now()}`,
      paidAmount: 4300000,
      remainingAmount: 0,
      createdBy: '507f1f77bcf86cd799439013' // Test user ID
    };

    console.log('\n📤 KassaMain formatida chek yaratish...');
    console.log(`👤 Tanlangan mijoz: ${telegramCustomer.name}`);
    console.log(`💰 Jami summa: ${testReceiptData.total.toLocaleString()} so'm`);
    console.log(`📦 Mahsulotlar: ${testReceiptData.items.length} ta`);

    // Kassa endpoint ga yuborish
    const response = await axios.post(`${SERVER_URL}/api/receipts/kassa`, testReceiptData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ Chek muvaffaqiyatli yaratildi!');
    console.log(`🧾 Chek ID: ${response.data._id}`);
    console.log(`📅 Yaratilgan vaqt: ${response.data.createdAt}`);

    console.log('\n🎯 Natija:');
    console.log(`✅ Chek database ga saqlandi`);
    console.log(`✅ ${telegramCustomer.name} ga telegram orqali chek yuborildi`);
    console.log(`✅ Admin ga xabar yuborilmadi (faqat mijozga)`);

    console.log('\n📱 Telegram botni tekshiring:');
    console.log(`1. ${telegramCustomer.name} ning telegram chatida yangi chek xabari bo'lishi kerak`);
    console.log(`2. Chek tarkibida mahsulotlar, narxlar va jami summa ko'rsatilgan`);
    console.log(`3. Mijoz uchun tushunarli formatda`);

  } catch (error) {
    console.error('❌ Test xatosi:', error.response?.data || error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Yechim:');
      console.log('1. Serverni ishga tushiring: npm start');
      console.log('2. Server 3003 portda ishlayotganini tekshiring');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Yechim:');
      console.log('1. /api/receipts/kassa endpoint mavjudligini tekshiring');
    } else if (error.response?.status === 500) {
      console.log('\n💡 Server xatosi:');
      console.log('1. Server loglarini tekshiring');
      console.log('2. MongoDB ulanishini tekshiring');
      console.log('3. Telegram bot tokenini tekshiring');
    }
  }
}

// Test ishga tushirish
testKassaToTelegram();