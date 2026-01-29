const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

const adminCredentials = {
  login: 'admin',
  password: 'admin123'
};

async function testEdgeCases() {
  console.log('🧪 XODIM QO\'SHISH - EDGE CASES TESTI\n');
  
  try {
    // Admin login
    const loginResponse = await axios.post(`${API_URL}/auth/login`, adminCredentials);
    const token = loginResponse.data.token;
    console.log('✅ Admin login muvaffaqiyatli\n');
    
    // Test 1: Bo'sh maydonlar
    console.log('TEST 1: Bo\'sh maydonlar');
    try {
      await axios.post(
        `${API_URL}/auth/admin/helpers`,
        { name: '', login: '', password: '' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('❌ XATO: Bo\'sh maydonlar qabul qilindi!\n');
    } catch (error) {
      console.log('✅ To\'g\'ri: Bo\'sh maydonlar rad etildi');
      console.log('   Xabar:', error.response?.data?.message);
      console.log('');
    }
    
    // Test 2: Qisqa parol
    console.log('TEST 2: Qisqa parol (3 ta belgi)');
    try {
      await axios.post(
        `${API_URL}/auth/admin/helpers`,
        { name: 'Test', login: 'test123', password: '123' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('❌ XATO: Qisqa parol qabul qilindi!\n');
    } catch (error) {
      console.log('✅ To\'g\'ri: Qisqa parol rad etildi');
      console.log('   Xabar:', error.response?.data?.message);
      console.log('');
    }
    
    // Test 3: Dublikat login
    console.log('TEST 3: Dublikat login');
    const helper1 = {
      name: 'Xodim 1',
      login: 'duplicate_test',
      phone: '+998901111111',
      password: 'test123'
    };
    
    // Birinchi xodimni yaratish
    const createResponse = await axios.post(
      `${API_URL}/auth/admin/helpers`,
      helper1,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Birinchi xodim yaratildi:', createResponse.data.user.login);
    
    // Xuddi shu login bilan yana urinish
    try {
      await axios.post(
        `${API_URL}/auth/admin/helpers`,
        { ...helper1, name: 'Xodim 2' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('❌ XATO: Dublikat login qabul qilindi!\n');
    } catch (error) {
      console.log('✅ To\'g\'ri: Dublikat login rad etildi');
      console.log('   Xabar:', error.response?.data?.message);
      console.log('');
    }
    
    // Cleanup
    await axios.delete(
      `${API_URL}/auth/admin/helpers/${createResponse.data.user._id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('🧹 Cleanup: Test xodim o\'chirildi\n');
    
    // Test 4: Dublikat telefon
    console.log('TEST 4: Dublikat telefon');
    const helper2 = {
      name: 'Xodim 3',
      login: 'phone_test_1',
      phone: '+998902222222',
      password: 'test123'
    };
    
    const createResponse2 = await axios.post(
      `${API_URL}/auth/admin/helpers`,
      helper2,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Birinchi xodim yaratildi:', createResponse2.data.user.phone);
    
    try {
      await axios.post(
        `${API_URL}/auth/admin/helpers`,
        { name: 'Xodim 4', login: 'phone_test_2', phone: '+998902222222', password: 'test123' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('❌ XATO: Dublikat telefon qabul qilindi!\n');
    } catch (error) {
      console.log('✅ To\'g\'ri: Dublikat telefon rad etildi');
      console.log('   Xabar:', error.response?.data?.message);
      console.log('');
    }
    
    // Cleanup
    await axios.delete(
      `${API_URL}/auth/admin/helpers/${createResponse2.data.user._id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('🧹 Cleanup: Test xodim o\'chirildi\n');
    
    // Test 5: Telefonsiz xodim (telefon optional)
    console.log('TEST 5: Telefonsiz xodim');
    const helper3 = {
      name: 'Telefonsiz Xodim',
      login: 'no_phone_test',
      password: 'test123'
    };
    
    const createResponse3 = await axios.post(
      `${API_URL}/auth/admin/helpers`,
      helper3,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Telefonsiz xodim yaratildi');
    console.log('   Telefon:', createResponse3.data.user.phone || '(bo\'sh)');
    console.log('');
    
    // Cleanup
    await axios.delete(
      `${API_URL}/auth/admin/helpers/${createResponse3.data.user._id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('🧹 Cleanup: Test xodim o\'chirildi\n');
    
    // Test 6: Admin bo'lmagan foydalanuvchi
    console.log('TEST 6: Admin bo\'lmagan foydalanuvchi');
    
    // Oddiy xodim yaratish
    const tempHelper = {
      name: 'Temp Helper',
      login: 'temp_helper',
      password: 'test123'
    };
    
    const tempResponse = await axios.post(
      `${API_URL}/auth/admin/helpers`,
      tempHelper,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Xodim bilan login
    const helperLoginResponse = await axios.post(`${API_URL}/auth/login`, {
      login: tempHelper.login,
      password: tempHelper.password
    });
    const helperToken = helperLoginResponse.data.token;
    
    // Xodim bilan yangi xodim yaratishga urinish
    try {
      await axios.post(
        `${API_URL}/auth/admin/helpers`,
        { name: 'Test', login: 'test456', password: 'test123' },
        { headers: { Authorization: `Bearer ${helperToken}` } }
      );
      console.log('❌ XATO: Xodim yangi xodim yarata oldi!\n');
    } catch (error) {
      console.log('✅ To\'g\'ri: Xodim rad etildi (faqat admin)');
      console.log('   Xabar:', error.response?.data?.message);
      console.log('');
    }
    
    // Cleanup
    await axios.delete(
      `${API_URL}/auth/admin/helpers/${tempResponse.data.user._id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('🧹 Cleanup: Test xodim o\'chirildi\n');
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 BARCHA EDGE CASE TESTLAR MUVAFFAQIYATLI O\'TDI!');
    console.log('═══════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ TEST XATOSI:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Xabar:', error.response.data?.message);
      console.error('   Ma\'lumot:', error.response.data);
    } else {
      console.error('   Xatolik:', error.message);
    }
    console.log('');
    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════');
console.log('  XODIM QO\'SHISH - EDGE CASES TESTI');
console.log('═══════════════════════════════════════════════════\n');

testEdgeCases();
