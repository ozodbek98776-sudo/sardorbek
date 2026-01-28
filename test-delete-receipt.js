const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

async function testDeleteReceipt() {
  try {
    console.log('1. Kassa login qilish...\n');
    
    const loginResponse = await axios.post(`${API_URL}/kassa-auth/login`, {
      username: 'kassachi',
      password: 'kassa321'
    });
    
    const token = loginResponse.data.token;
    console.log('Login muvaffaqiyatli!\n');
    
    // 2. Cheklar ro'yxatini olish
    console.log('2. Cheklar royxatini olish...\n');
    
    const receiptsResponse = await axios.get(`${API_URL}/receipts/kassa`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`Jami cheklar: ${receiptsResponse.data.length} ta\n`);
    
    if (receiptsResponse.data.length === 0) {
      console.log('Ochirish uchun chek yoq');
      return;
    }
    
    // Birinchi chekni olish
    const firstReceipt = receiptsResponse.data[0];
    console.log('Ochirish uchun chek:');
    console.log(`   ID: ${firstReceipt._id}`);
    console.log(`   Raqam: ${firstReceipt.receiptNumber}`);
    console.log(`   Jami: ${firstReceipt.totalAmount} som`);
    console.log(`   Mahsulotlar: ${firstReceipt.items.length} ta\n`);
    
    // 3. Chekni o'chirish
    console.log('3. Chekni ochirish...\n');
    
    const deleteResponse = await axios.delete(`${API_URL}/receipts/${firstReceipt._id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Ochirish javobi:', deleteResponse.data);
    console.log('\nChek muvaffaqiyatli ochirildi!');
    
    // 4. Qayta cheklar sonini tekshirish
    const receiptsAfter = await axios.get(`${API_URL}/receipts/kassa`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`\nOchirishdan keyin: ${receiptsAfter.data.length} ta chek`);
    
  } catch (error) {
    console.error('Xatolik:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

testDeleteReceipt();
