const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testHelperReceipts() {
  try {
    console.log('🧪 Xodim cheklari tizimini test qilish\n');
    console.log('='.repeat(60));

    // 1. Helper sifatida login
    console.log('\n1️⃣ Helper sifatida login...');
    const helperLogin = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'helper1',
      password: 'helper123'
    });
    const helperToken = helperLogin.data.token;
    console.log('✅ Helper login muvaffaqiyatli');

    // 2. Chek yaratish (helper)
    console.log('\n2️⃣ Chek yaratish (helper)...');
    const receiptData = {
      items: [
        {
          product: '507f1f77bcf86cd799439011', // Test product ID
          name: 'Test mahsulot',
          code: '123',
          price: 10000,
          quantity: 2
        }
      ],
      total: 20000,
      paidAmount: 20000,
      cashAmount: 20000,
      cardAmount: 0,
      paymentMethod: 'cash'
    };

    const receiptRes = await axios.post(`${API_URL}/api/receipts`, receiptData, {
      headers: { Authorization: `Bearer ${helperToken}` }
    });
    console.log('✅ Chek yaratildi:', receiptRes.data._id);
    console.log('   - Status:', receiptRes.data.status);
    console.log('   - Receipt Type:', receiptRes.data.receiptType);

    // 3. Admin sifatida login
    console.log('\n3️⃣ Admin sifatida login...');
    const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin login muvaffaqiyatli');

    // 4. Admin panelda xodim cheklarini ko'rish
    console.log('\n4️⃣ Admin panelda xodim cheklarini ko'rish...');
    const adminReceipts = await axios.get(`${API_URL}/api/receipts/all-helper-receipts`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('✅ Admin panelda cheklar:', adminReceipts.data.receipts.length, 'ta');

    // 5. Kassa sifatida login
    console.log('\n5️⃣ Kassa sifatida login...');
    const kassaLogin = await axios.post(`${API_URL}/api/kassa-auth/login`, {
      username: 'kassachi',
      password: 'kassa321'
    });
    const kassaToken = kassaLogin.data.token;
    console.log('✅ Kassa login muvaffaqiyatli');

    // 6. Kassa panelda cheklarni ko'rish
    console.log('\n6️⃣ Kassa panelda cheklarni ko'rish...');
    const kassaReceipts = await axios.get(`${API_URL}/api/receipts/kassa`, {
      headers: { Authorization: `Bearer ${kassaToken}` }
    });
    console.log('✅ Kassa panelda cheklar:', kassaReceipts.data.length, 'ta');

    console.log('\n' + '='.repeat(60));
    console.log('✅ BARCHA TESTLAR MUVAFFAQIYATLI!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ XATOLIK:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testHelperReceipts();
