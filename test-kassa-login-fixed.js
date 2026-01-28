const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testKassaLoginFixed() {
  try {
    console.log('Kassa login qilish (yangi JWT token bilan)...\n');
    
    // 1. Kassa login
    const loginResponse = await axios.post(`${API_URL}/kassa-auth/login`, {
      username: 'kassachi',
      password: 'kassa321'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    if (!loginResponse.data.token) {
      console.error('Token topilmadi!');
      return;
    }
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('\nLogin muvaffaqiyatli!');
    console.log(`   User: ${user.name} (${user.role})`);
    console.log(`   Token: ${token.substring(0, 30)}...\n`);
    
    // 2. Cheklar ro'yxatini olish
    console.log('Cheklar royxatini olish...\n');
    
    const receiptsResponse = await axios.get(`${API_URL}/receipts/kassa`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log(`Cheklar yuklandi: ${receiptsResponse.data.length} ta\n`);
    
    if (receiptsResponse.data.length > 0) {
      console.log('Birinchi 3 ta chek:');
      receiptsResponse.data.slice(0, 3).forEach((receipt, index) => {
        console.log(`\n${index + 1}. Chek #${receipt.receiptNumber}`);
        console.log(`   Jami: ${receipt.totalAmount} som`);
        console.log(`   Mahsulotlar: ${receipt.items.length} ta`);
        console.log(`   Yaratuvchi: ${receipt.createdBy.name}`);
      });
    } else {
      console.log('Hech qanday chek topilmadi');
    }
    
  } catch (error) {
    console.error('Xatolik:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testKassaLoginFixed();
