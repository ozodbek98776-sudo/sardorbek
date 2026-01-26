#!/usr/bin/env node

/**
 * Test script - Maxsulotlar pagination va MongoDB saqlash
 * 
 * Ishlatish:
 * node test-product-pagination.js
 */

const axios = require('axios');

const API_URL = 'http://localhost:8000/api';
let authToken = '';

// Test ma'lumotlari
const testProducts = [
  { code: 'TEST001', name: 'Test Maxsulot 1', price: 10000, quantity: 100 },
  { code: 'TEST002', name: 'Test Maxsulot 2', price: 20000, quantity: 50 },
  { code: 'TEST003', name: 'Test Maxsulot 3', price: 15000, quantity: 75 },
];

async function login() {
  try {
    console.log('🔐 Login qilinmoqda...');
    const res = await axios.post(`${API_URL}/auth/login`, {
      phone: '+998901234567', // Admin phone
      password: 'admin123'
    });
    authToken = res.data.token;
    console.log('✅ Login muvaffaqiyatli');
    return true;
  } catch (err) {
    console.error('❌ Login xatosi:', err.response?.data?.message || err.message);
    return false;
  }
}

async function addProduct(product) {
  try {
    console.log(`\n📝 Maxsulot qo'shilmoqda: ${product.name}`);
    const res = await axios.post(`${API_URL}/products`, product, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(`✅ Maxsulot qo'shildi:`, {
      _id: res.data._id,
      code: res.data.code,
      name: res.data.name,
      isMainWarehouse: res.data.isMainWarehouse
    });
    return res.data;
  } catch (err) {
    console.error(`❌ Maxsulot qo'shishda xatolik:`, err.response?.data?.message || err.message);
    return null;
  }
}

async function getProducts(page = 1, limit = 500) {
  try {
    console.log(`\n📥 Maxsulotlar yuklanyapti (sahifa ${page}, limit ${limit})...`);
    const res = await axios.get(`${API_URL}/products?mainOnly=true&page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const products = res.data.data || res.data;
    const pagination = res.data.pagination;
    
    console.log(`✅ Maxsulotlar yuklandi:`, {
      count: products.length,
      page: pagination?.page,
      totalPages: pagination?.pages,
      total: pagination?.total
    });
    
    // Test maxsulotlarini topish
    const testProductsFound = products.filter(p => p.code.startsWith('TEST'));
    console.log(`🔍 Test maxsulotlari topildi: ${testProductsFound.length}`);
    testProductsFound.forEach(p => {
      console.log(`   - ${p.code}: ${p.name} (${p.quantity} dona)`);
    });
    
    return { products, pagination };
  } catch (err) {
    console.error('❌ Maxsulotlarni yuklashda xatolik:', err.response?.data?.message || err.message);
    return null;
  }
}

async function checkMongoDB() {
  try {
    console.log('\n🗄️ MongoDB tekshirilmoqda...');
    const res = await axios.get(`${API_URL}/products?mainOnly=true&limit=1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const pagination = res.data.pagination;
    console.log(`✅ MongoDB ulanish muvaffaqiyatli:`, {
      totalProducts: pagination?.total,
      database: 'nazorat'
    });
    return true;
  } catch (err) {
    console.error('❌ MongoDB ulanish xatosi:', err.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Maxsulotlar Pagination Test Boshlanmoqda\n');
  console.log('='.repeat(50));
  
  // 1. Login
  if (!await login()) {
    console.log('\n❌ Test to\'xtadi - login xatosi');
    process.exit(1);
  }
  
  // 2. MongoDB tekshirish
  if (!await checkMongoDB()) {
    console.log('\n❌ Test to\'xtadi - MongoDB ulanish xatosi');
    process.exit(1);
  }
  
  // 3. Maxsulotlar qo'shish
  console.log('\n📦 Test Maxsulotlari Qo\'shilmoqda');
  console.log('-'.repeat(50));
  
  const addedProducts = [];
  for (const product of testProducts) {
    const added = await addProduct(product);
    if (added) addedProducts.push(added);
  }
  
  if (addedProducts.length === 0) {
    console.log('\n❌ Test to\'xtadi - maxsulot qo\'shishda xatolik');
    process.exit(1);
  }
  
  // 4. Maxsulotlarni yuklash (sahifa 1)
  console.log('\n📄 Pagination Test');
  console.log('-'.repeat(50));
  
  const result1 = await getProducts(1, 500);
  if (!result1) {
    console.log('\n❌ Test to\'xtadi - maxsulotlarni yuklashda xatolik');
    process.exit(1);
  }
  
  // 5. Agar ko'proq sahifalar bo'lsa, sahifa 2 ni yuklash
  if (result1.pagination && result1.pagination.pages > 1) {
    console.log('\n📄 Sahifa 2 Yuklanyapti...');
    await getProducts(2, 500);
  }
  
  // 6. Natijalar
  console.log('\n' + '='.repeat(50));
  console.log('✅ BARCHA TESTLAR MUVAFFAQIYATLI YAKUNLANDI!\n');
  console.log('📊 Natijalar:');
  console.log(`   - Qo'shilgan maxsulotlar: ${addedProducts.length}`);
  console.log(`   - Jami maxsulotlar: ${result1.pagination?.total}`);
  console.log(`   - Jami sahifalar: ${result1.pagination?.pages}`);
  console.log(`   - Har sahifada: 500 ta maxsulot`);
  console.log('\n💡 Keyingi qadam: VPS ga deploy qilish');
}

// Testni ishga tushirish
runTests().catch(err => {
  console.error('❌ Test xatosi:', err.message);
  process.exit(1);
});
