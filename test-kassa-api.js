const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testKassaAPI() {
  try {
    console.log('Admin login qilish...\n');
    
    // 1. Admin login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      login: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('Login muvaffaqiyatli!');
    console.log(`   User: ${user.name} (${user.role})`);
    console.log(`   Token: ${token.substring(0, 20)}...\n`);
    
    // 2. Cheklar ro'yxatini olish
    console.log('Cheklar royxatini olish...\n');
    
    const receiptsResponse = await axios.get(`${API_URL}/receipts/kassa`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`✅ Cheklar yuklandi: ${receiptsResponse.data.length} ta\n`);
    
    if (receiptsResponse.data.length > 0) {
      console.log('📄 Birinchi chek:');
      const firstReceipt = receiptsResponse.data[0];
      console.log(`   ID: ${firstReceipt._id}`);
      console.log(`   Raqam: ${firstReceipt.receiptNumber}`);
      console.log(`   Jami: ${firstReceipt.totalAmount} so'm`);
      console.log(`   Mahsulotlar: ${firstReceipt.items.length} ta`);
      console.log(`   Yaratuvchi: ${firstReceipt.createdBy.name}`);
      console.log(`   Sana: ${firstReceipt.createdAt}`);
    } else {
      console.log('Hech qanday chek topilmadi');
      console.log('   Hodimlar tomonidan yaratilgan cheklar yoq');
    }
    
  } catch (error) {
    console.error('❌ Xatolik:', error.response?.data?.message || error.message);
    if (error.response?.status === 403) {
      console.error('   Ruxsat yoq - faqat kassir va admin korishi mumkin');
    }
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  }
}

testKassaAPI();
