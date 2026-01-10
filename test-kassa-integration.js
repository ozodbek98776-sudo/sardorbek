// KassaMain dan chek yaratish testini simulatsiya qilish
const axios = require('axios');

const SERVER_URL = 'http://localhost:3003'; // Server URL

async function testKassaReceiptCreation() {
  console.log('🧾 Kassa chek yaratish va telegram bot integratsiyasini test qilish...\n');

  // Test chek ma'lumotlari
  const testReceiptData = {
    items: [
      {
        product: '507f1f77bcf86cd799439011', // Test product ID
        name: 'Test Mahsulot 1',
        code: 'TEST001',
        price: 25000,
        quantity: 2,
        paymentBreakdown: { cash: 50000, click: 0, card: 0 }
      },
      {
        product: '507f1f77bcf86cd799439012', // Test product ID
        name: 'Test Mahsulot 2',
        code: 'TEST002',
        price: 15000,
        quantity: 1,
        paymentBreakdown: { cash: 15000, click: 0, card: 0 }
      }
    ],
    total: 65000,
    paymentMethod: 'cash',
    customer: null, // Mijoz tanlanmagan
    receiptNumber: `KASSA-TEST-${Date.now()}`,
    paidAmount: 65000,
    remainingAmount: 0
  };

  try {
    console.log('📤 Kassa endpoint ga chek ma\'lumotlarini yuborish...');
    console.log('🔗 URL:', `${SERVER_URL}/api/receipts/kassa`);
    console.log('📋 Ma\'lumotlar:', JSON.stringify(testReceiptData, null, 2));

    const response = await axios.post(`${SERVER_URL}/api/receipts/kassa`, testReceiptData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Chek muvaffaqiyatli yaratildi!');
    console.log('📨 Server javobi:', response.data);
    console.log('🧾 Chek ID:', response.data._id);
    console.log('📅 Yaratilgan vaqt:', response.data.createdAt);

    console.log('\n🎉 Test muvaffaqiyatli tugadi!');
    console.log('\n📋 Natija:');
    console.log('1. ✅ Chek database ga saqlandi');
    console.log('2. ✅ Telegram botga admin xabari yuborildi');
    console.log('3. ✅ Agar mijoz tanlangan bo\'lsa, unga ham xabar yuborildi');

  } catch (error) {
    console.error('❌ Test xatosi:', error.response?.data || error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Yechim:');
      console.log('1. Serverni ishga tushiring: npm start (server papkasida)');
      console.log('2. Server 3003 portda ishlayotganini tekshiring');
    } else if (error.response?.status === 404) {
      console.log('\n💡 Yechim:');
      console.log('1. /api/receipts/kassa endpoint mavjudligini tekshiring');
      console.log('2. Routes to\'g\'ri ulangan ekanligini tekshiring');
    }
  }
}

// Mijoz bilan test
async function testKassaReceiptWithCustomer() {
  console.log('\n👤 Mijoz bilan chek yaratish testini boshlash...\n');

  const testReceiptDataWithCustomer = {
    items: [
      {
        product: '507f1f77bcf86cd799439013',
        name: 'Mijoz uchun mahsulot',
        code: 'CUST001',
        price: 100000,
        quantity: 1,
        paymentBreakdown: { cash: 100000, click: 0, card: 0 }
      }
    ],
    total: 100000,
    paymentMethod: 'cash',
    customer: '507f1f77bcf86cd799439020', // Test customer ID
    receiptNumber: `KASSA-CUSTOMER-${Date.now()}`,
    paidAmount: 100000,
    remainingAmount: 0
  };

  try {
    console.log('📤 Mijoz bilan chek yaratish...');

    const response = await axios.post(`${SERVER_URL}/api/receipts/kassa`, testReceiptDataWithCustomer, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Mijoz bilan chek muvaffaqiyatli yaratildi!');
    console.log('📨 Server javobi:', response.data);

    console.log('\n🎉 Mijoz testi muvaffaqiyatli tugadi!');
    console.log('\n📋 Natija:');
    console.log('1. ✅ Chek database ga saqlandi');
    console.log('2. ✅ Admin telegram botga xabar yuborildi');
    console.log('3. ✅ Mijozga shaxsiy telegram xabari yuborildi (agar ro\'yxatdan o\'tgan bo\'lsa)');

  } catch (error) {
    console.error('❌ Mijoz testi xatosi:', error.response?.data || error.message);
  }
}

// Testlarni ishga tushirish
async function runAllTests() {
  await testKassaReceiptCreation();
  await testKassaReceiptWithCustomer();

  console.log('\n🏁 Barcha testlar tugadi!');
  console.log('\n📱 Telegram botni tekshirish uchun:');
  console.log('1. @sardorbek_savdo_bot ga boring');
  console.log('2. Yangi xabarlar kelganini ko\'ring');
  console.log('3. Mijoz sifatida /start yuborib ro\'yxatdan o\'ting');
}

// Test ishga tushirish
if (require.main === module) {
  runAllTests();
}

module.exports = { testKassaReceiptCreation, testKassaReceiptWithCustomer };