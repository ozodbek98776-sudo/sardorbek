const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testKassaChanges() {
  console.log('🧪 Kassa o\'zgarishlarini test qilish\n');
  console.log('='.repeat(70));

  try {
    // 1. Admin login
    console.log('\n1️⃣ Admin login...');
    const adminLogin = await axios.post(`${API_URL}/api/auth/login`, {
      login: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLogin.data.token;
    console.log('✅ Admin login muvaffaqiyatli');

    // 2. Xodim cheklar - Admin panelda
    console.log('\n2️⃣ Admin panelda xodim cheklari...');
    const adminReceipts = await axios.get(`${API_URL}/api/receipts/all-helper-receipts?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`✅ Admin panelda ${adminReceipts.data.receipts.length} ta chek topildi`);
    console.log(`   - Jami: ${adminReceipts.data.summary.totalReceipts} ta`);
    console.log(`   - Summa: ${adminReceipts.data.summary.totalAmount} so'm`);
    console.log(`   - Mahsulotlar: ${adminReceipts.data.summary.totalItems} ta`);

    // 3. Mahsulotlar - Kassa endpoint
    console.log('\n3️⃣ Kassa uchun mahsulotlar...');
    const products = await axios.get(`${API_URL}/api/products/kassa`);
    console.log(`✅ ${products.data.length} ta mahsulot topildi`);
    
    // Rasmli mahsulotlar
    const withImages = products.data.filter(p => p.images && p.images.length > 0);
    console.log(`   - Rasmli mahsulotlar: ${withImages.length} ta`);

    // 4. Qarzlar - Kassa endpoint
    console.log('\n4️⃣ Kassa uchun qarzlar...');
    const debts = await axios.get(`${API_URL}/api/debts/kassa`);
    console.log(`✅ ${debts.data.length} ta qarz topildi`);

    // 5. Mijozlar - Kassa endpoint
    console.log('\n5️⃣ Kassa uchun mijozlar...');
    const customers = await axios.get(`${API_URL}/api/customers/kassa`);
    console.log(`✅ ${customers.data.length} ta mijoz topildi`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST NATIJALARI:');
    console.log('='.repeat(70));
    console.log('✅ Barcha backend API\'lar ishlayapti!');
    console.log('\n📝 Backend Funksiyalar:');
    console.log('   1. Xodim cheklari admin panelda ko\'rinadi ✅');
    console.log('   2. Mahsulotlar API ishlayapti ✅');
    console.log('   3. Qarzlar API ishlayapti ✅');
    console.log('   4. Mijozlar API ishlayapti ✅');
    console.log('\n⚠️  Frontend O\'zgarishlar (Manual Test Kerak):');
    console.log('   - KassaProducts: Rasm o\'chirish tugmasi olib tashlandi ❌');
    console.log('   - KassaDebts: Qarz o\'chirish tugmalari olib tashlandi ❌');
    console.log('   - KassaReceipts: Chek o\'chirish tugmasi olib tashlandi ❌');
    console.log('\n🎯 Frontend o\'zgarishlarni ko\'rish uchun:');
    console.log('   1. Brauzerda kassa panelga kiring');
    console.log('   2. Mahsulotlar bo\'limida - faqat Upload tugmasi bo\'lishi kerak');
    console.log('   3. Qarzlar bo\'limida - faqat Ko\'rish tugmasi bo\'lishi kerak');
    console.log('   4. Cheklar bo\'limida - faqat Ko\'rish va Print tugmalari bo\'lishi kerak');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ XATO:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testKassaChanges();
