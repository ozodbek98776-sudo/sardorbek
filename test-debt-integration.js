const axios = require('axios');

// Test qarz qo'shish funksiyasi
async function testDebtAddition() {
  try {
    console.log('🧪 Qarz qo\'shish testini boshlash...');

    // Test ma'lumotlari
    const testDebtData = {
      customer: '60f1b2b3c4d5e6f7a8b9c0d1', // Test mijoz ID (o'zgartirishingiz kerak)
      amount: 50000, // 50,000 so'm
      paidAmount: 0,
      description: 'Test qarz - mavjud qarzga qo\'shish',
      items: [
        {
          product: '60f1b2b3c4d5e6f7a8b9c0d2',
          name: 'Test mahsulot',
          code: 'TEST001',
          price: 25000,
          quantity: 2
        }
      ]
    };

    // Qarz qo'shish so'rovi
    const response = await axios.post('http://localhost:5000/api/debts/kassa', testDebtData);

    console.log('✅ Qarz muvaffaqiyatli qo\'shildi:', response.data);
    console.log('📱 Telegram botga xabar yuborildi');

    // Ikkinchi marta test qilish - mavjud qarzga qo'shilishini ko'rish uchun
    console.log('\n🧪 Ikkinchi qarz qo\'shish testi...');

    const secondDebtData = {
      ...testDebtData,
      amount: 30000, // 30,000 so'm qo'shimcha
      description: 'Ikkinchi test qarz - mavjud qarzga qo\'shilishi kerak'
    };

    const secondResponse = await axios.post('http://localhost:5000/api/debts/kassa', secondDebtData);

    console.log('✅ Ikkinchi qarz muvaffaqiyatli qo\'shildi:', secondResponse.data);
    console.log('📊 Jami qarz summasi:', secondResponse.data.amount, 'so\'m');

  } catch (error) {
    console.error('❌ Test xatosi:', error.response?.data || error.message);
  }
}

// Test ishga tushirish
if (require.main === module) {
  testDebtAddition();
}

module.exports = { testDebtAddition };