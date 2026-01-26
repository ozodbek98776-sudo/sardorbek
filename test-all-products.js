// Test script - barcha mahsulotlarni yuklash
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function testAllProducts() {
  try {
    console.log('🔍 Testing products endpoint...');
    
    // Login qilish
    const loginRes = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });
    
    const token = loginRes.data.token;
    console.log('✅ Login successful');
    
    // Barcha mahsulotlarni olish
    const timestamp = Date.now();
    const productsRes = await makeRequest({
      hostname: 'localhost',
      port: 8000,
      path: `/api/products?t=${timestamp}`,
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = productsRes.data.data || productsRes.data;
    const pagination = productsRes.data.pagination;
    
    console.log('\n📊 NATIJA:');
    console.log('- Response keys:', Object.keys(productsRes.data));
    console.log('- Data type:', typeof data);
    console.log('- Is Array:', Array.isArray(data));
    
    if (Array.isArray(data)) {
      console.log('- Jami mahsulotlar:', data.length);
      console.log('- Pagination:', pagination);
      console.log('- Birinchi 10 ta mahsulot kodlari:', data.slice(0, 10).map(p => p.code).join(', '));
      console.log('- Oxirgi 10 ta mahsulot kodlari:', data.slice(-10).map(p => p.code).join(', '));
      
      if (data.length < 1000) {
        console.log('\n⚠️ OGOHLANTIRISH: Faqat', data.length, 'ta mahsulot yuklandi!');
        console.log('MongoDB da 1033 ta mahsulot bo\'lishi kerak.');
      } else {
        console.log('\n✅ MUVAFFAQIYAT: Barcha mahsulotlar yuklandi!');
      }
    } else {
      console.log('❌ Data array emas!');
      console.log('Data:', JSON.stringify(data).substring(0, 200));
    }
    
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  }
}

testAllProducts();
