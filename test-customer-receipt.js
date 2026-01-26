// Mijozga chek yuborish testini amalga oshirish
const telegramService = require('./server/src/services/telegramService');

async function testCustomerReceipt() {
  console.log('🧾 Mijozga chek yuborish testini boshlash...\n');

  // Test mijoz ma'lumotlari
  const testCustomer = {
    name: 'Test Mijoz',
    phone: '+998901234567',
    telegramChatId: 'YOUR_TEST_CHAT_ID', // Bu yerga o'z chat ID ni kiriting
    debt: 50000 // 50,000 so'm qarz
  };

  // Test chek ma'lumotlari
  const testReceiptData = {
    customer: testCustomer,
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
    receiptNumber: `TEST-CHK-${Date.now()}`
  };

  try {
    console.log('📤 Mijozga yangi bot orqali chek yuborish...');

    await telegramService.sendReceiptToCustomerViaNewBot(testReceiptData);

    console.log('✅ Mijozga chek muvaffaqiyatli yuborildi!');
    console.log(`📱 Mijoz: ${testCustomer.name}`);
    console.log(`📞 Telefon: ${testCustomer.phone}`);
    console.log(`🧾 Chek raqami: ${testReceiptData.receiptNumber}`);
    console.log(`💰 Summa: ${testReceiptData.total.toLocaleString()} so'm`);

  } catch (error) {
    console.error('❌ Xatolik:', error.message);

    if (error.message.includes('chat ID')) {
      console.log('\n💡 Yechim:');
      console.log('1. test-customer-receipt.js faylida YOUR_TEST_CHAT_ID ni o\'z chat ID ga almashtiring');
      console.log('2. Chat ID olish uchun botga /start yuboring va getUpdates API dan oling');
    }
  }
}

// Test ishga tushirish
if (require.main === module) {
  testCustomerReceipt();
}

module.exports = { testCustomerReceipt };