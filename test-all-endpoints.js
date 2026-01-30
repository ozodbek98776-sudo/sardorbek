const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testAllEndpoints() {
  console.log('🧪 Barcha endpointlarni test qilish\n');
  console.log('='.repeat(70));

  const results = {
    passed: [],
    failed: []
  };

  // Test helper function
  const test = async (name, fn) => {
    try {
      await fn();
      results.passed.push(name);
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed.push({ name, error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  };

  // 1. Health Check
  await test('Health Check', async () => {
    const res = await axios.get(`${API_URL}/api/health`);
    if (res.data.status !== 'ok') throw new Error('Health check failed');
  });

  // 2. Admin Login
  let adminToken;
  await test('Admin Login', async () => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        login: 'admin',
        password: 'admin123'
      });
      adminToken = res.data.token;
      if (!adminToken) throw new Error('No token received');
    } catch (error) {
      console.log('Login xato tafsilotlari:', error.response?.data);
      throw error;
    }
  });

  if (!adminToken) {
    console.log('\n❌ Admin login xato - qolgan testlar o\'tkazilmaydi');
    return;
  }

  // 3. Products List
  await test('Products List', async () => {
    const res = await axios.get(`${API_URL}/api/products?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.data.data) throw new Error('No products data');
  });

  // 4. Products Stats
  await test('Products Overall Stats', async () => {
    const res = await axios.get(`${API_URL}/api/products/overall-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (typeof res.data.total !== 'number') throw new Error('Invalid stats');
  });

  // 5. Warehouses
  await test('Warehouses List', async () => {
    const res = await axios.get(`${API_URL}/api/warehouses`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!Array.isArray(res.data)) throw new Error('Invalid warehouses data');
  });

  // 6. Customers (Kassa endpoint)
  await test('Customers List (Kassa)', async () => {
    const res = await axios.get(`${API_URL}/api/customers/kassa`);
    if (!Array.isArray(res.data)) throw new Error('Invalid customers data');
  });

  // 7. Receipts - All Helper Receipts
  await test('All Helper Receipts', async () => {
    const res = await axios.get(`${API_URL}/api/receipts/all-helper-receipts?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.data.receipts) throw new Error('No receipts data');
  });

  // 8. Kassa Login
  let kassaToken;
  await test('Kassa Login', async () => {
    const res = await axios.post(`${API_URL}/api/kassa-auth/login`, {
      username: 'kassachi',
      password: 'kassa321'
    });
    kassaToken = res.data.token;
    if (!kassaToken) throw new Error('No token received');
  });

  // 9. Kassa Receipts
  if (kassaToken) {
    await test('Kassa Receipts', async () => {
      const res = await axios.get(`${API_URL}/api/receipts/kassa`, {
        headers: { Authorization: `Bearer ${kassaToken}` }
      });
      if (!Array.isArray(res.data)) throw new Error('Invalid receipts data');
    });
  }

  // 10. Stats Dashboard
  await test('Dashboard Stats', async () => {
    const res = await axios.get(`${API_URL}/api/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!res.data) throw new Error('No stats data');
  });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST NATIJALARI:');
  console.log('='.repeat(70));
  console.log(`✅ Muvaffaqiyatli: ${results.passed.length}`);
  console.log(`❌ Xato: ${results.failed.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Xatolar:');
    results.failed.forEach(({ name, error }) => {
      console.log(`   - ${name}: ${error}`);
    });
  }
  
  console.log('='.repeat(70));
  
  if (results.failed.length === 0) {
    console.log('\n🎉 BARCHA TESTLAR MUVAFFAQIYATLI!');
  } else {
    console.log(`\n⚠️  ${results.failed.length} ta test xato!`);
  }
}

testAllEndpoints().catch(console.error);
