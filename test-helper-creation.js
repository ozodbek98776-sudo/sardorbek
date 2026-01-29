const axios = require('axios');

const API_URL = 'http://localhost:8000/api';

// Test ma'lumotlari
const adminCredentials = {
  login: 'admin',
  password: 'admin123'
};

const testHelper = {
  name: 'Test Xodim',
  login: 'testhelper',
  phone: '+998901234567',
  password: 'test123'
};

async function testHelperCreation() {
  console.log('🧪 XODIM QO\'SHISH TESTI\n');
  
  try {
    // 1. Admin login
    console.log('1️⃣ Admin login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, adminCredentials);
    const token = loginResponse.data.token;
    console.log('✅ Admin login muvaffaqiyatli');
    console.log('   Token:', token.substring(0, 20) + '...\n');
    
    // 2. Mavjud xodimlarni olish
    console.log('2️⃣ Mavjud xodimlarni olish...');
    const helpersResponse = await axios.get(`${API_URL}/auth/admin/helpers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Mavjud xodimlar:', helpersResponse.data.users?.length || 0);
    if (helpersResponse.data.users?.length > 0) {
      console.log('   Birinchi xodim:', helpersResponse.data.users[0].name);
    }
    console.log('');
    
    // 3. Yangi xodim qo'shish
    console.log('3️⃣ Yangi xodim qo\'shish...');
    console.log('   Ma\'lumotlar:', {
      name: testHelper.name,
      login: testHelper.login,
      phone: testHelper.phone,
      password: '****'
    });
    
    try {
      const createResponse = await axios.post(
        `${API_URL}/auth/admin/helpers`,
        testHelper,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('✅ Xodim muvaffaqiyatli yaratildi!');
      console.log('   ID:', createResponse.data.user._id);
      console.log('   Ism:', createResponse.data.user.name);
      console.log('   Login:', createResponse.data.user.login);
      console.log('   Telefon:', createResponse.data.user.phone);
      console.log('   Rol:', createResponse.data.user.role);
      console.log('');
      
      // 4. Xodimlar ro'yxatini qayta tekshirish
      console.log('4️⃣ Yangilangan xodimlar ro\'yxati...');
      const updatedHelpersResponse = await axios.get(`${API_URL}/auth/admin/helpers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Jami xodimlar:', updatedHelpersResponse.data.users?.length || 0);
      console.log('');
      
      // 5. Yangi xodim bilan login qilish
      console.log('5️⃣ Yangi xodim bilan login...');
      const helperLoginResponse = await axios.post(`${API_URL}/auth/login`, {
        login: testHelper.login,
        password: testHelper.password
      });
      console.log('✅ Xodim login muvaffaqiyatli!');
      console.log('   Token:', helperLoginResponse.data.token.substring(0, 20) + '...');
      console.log('   Rol:', helperLoginResponse.data.user.role);
      console.log('');
      
      // 6. Test xodimni o'chirish (cleanup)
      console.log('6️⃣ Test xodimni o\'chirish (cleanup)...');
      await axios.delete(
        `${API_URL}/auth/admin/helpers/${createResponse.data.user._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Test xodim o\'chirildi');
      console.log('');
      
      console.log('🎉 BARCHA TESTLAR MUVAFFAQIYATLI O\'TDI!\n');
      
    } catch (createError) {
      console.error('❌ Xodim yaratishda xatolik:');
      console.error('   Status:', createError.response?.status);
      console.error('   Xabar:', createError.response?.data?.message);
      console.error('   Ma\'lumot:', createError.response?.data);
      console.log('');
      
      // Agar xodim allaqachon mavjud bo'lsa, uni o'chirib qayta urinish
      if (createError.response?.data?.message?.includes('allaqachon')) {
        console.log('⚠️ Xodim allaqachon mavjud, o\'chirib qayta urinish...');
        
        // Barcha xodimlarni olish va test xodimni topish
        const allHelpers = await axios.get(`${API_URL}/auth/admin/helpers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const existingHelper = allHelpers.data.users?.find(h => h.login === testHelper.login);
        if (existingHelper) {
          console.log('   Topildi:', existingHelper.name, '(ID:', existingHelper._id + ')');
          await axios.delete(
            `${API_URL}/auth/admin/helpers/${existingHelper._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('✅ Eski xodim o\'chirildi');
          console.log('');
          
          // Qayta urinish
          console.log('🔄 Qayta urinish...');
          const retryResponse = await axios.post(
            `${API_URL}/auth/admin/helpers`,
            testHelper,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('✅ Xodim muvaffaqiyatli yaratildi!');
          console.log('   ID:', retryResponse.data.user._id);
          console.log('');
          
          // Cleanup
          await axios.delete(
            `${API_URL}/auth/admin/helpers/${retryResponse.data.user._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log('✅ Test xodim o\'chirildi');
          console.log('');
          console.log('🎉 BARCHA TESTLAR MUVAFFAQIYATLI O\'TDI!\n');
        }
      }
    }
    
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

// Testni ishga tushirish
console.log('═══════════════════════════════════════════════════');
console.log('  XODIM QO\'SHISH FUNKSIYASI TESTI');
console.log('═══════════════════════════════════════════════════\n');

testHelperCreation();
