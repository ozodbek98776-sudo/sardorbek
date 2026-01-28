const axios = require('axios');

const API_URL = 'http://localhost:8000';

async function testProductImages() {
  try {
    console.log('🔍 Mahsulotlarni tekshirish...\n');

    // Login qilish
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const token = loginRes.data.token;
    console.log('✅ Login muvaffaqiyatli\n');

    // Mahsulotlarni olish
    const productsRes = await axios.get(`${API_URL}/api/products?page=1&limit=100`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const products = productsRes.data.data || [];
    console.log(`📦 Jami mahsulotlar: ${products.length}\n`);

    let withImages = 0;
    let withoutImages = 0;
    let stringFormatImages = 0;
    let objectFormatImages = 0;

    console.log('📊 Mahsulotlar tahlili:\n');
    
    for (const product of products) {
      if (product.images && product.images.length > 0) {
        withImages++;
        
        // Birinchi rasmni tekshirish
        const firstImage = product.images[0];
        if (typeof firstImage === 'string') {
          stringFormatImages++;
          console.log(`🔸 #${product.code} - ${product.name}`);
          console.log(`   Rasm formati: STRING - ${firstImage}`);
        } else if (typeof firstImage === 'object' && firstImage.path) {
          objectFormatImages++;
          console.log(`🔹 #${product.code} - ${product.name}`);
          console.log(`   Rasm formati: OBJECT - ${firstImage.path} (${firstImage.uploadedBy || 'N/A'})`);
        }
      } else {
        withoutImages++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📈 XULOSA:');
    console.log('='.repeat(60));
    console.log(`✅ Rasmi bor mahsulotlar: ${withImages}`);
    console.log(`   - String formatda: ${stringFormatImages}`);
    console.log(`   - Object formatda: ${objectFormatImages}`);
    console.log(`❌ Rasmi yo'q mahsulotlar: ${withoutImages}`);
    console.log('='.repeat(60));

    if (stringFormatImages > 0) {
      console.log('\n⚠️  DIQQAT: ' + stringFormatImages + ' ta mahsulotda rasmlar eski formatda (string)!');
      console.log('💡 Migration scriptni ishga tushiring: node server/migrate-images.js');
    }

  } catch (error) {
    console.error('❌ Xatolik:', error.response?.data || error.message);
  }
}

testProductImages();
