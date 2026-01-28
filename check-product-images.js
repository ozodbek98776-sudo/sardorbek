require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./server/src/models/Product');

async function checkProductImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz');
    console.log('✅ MongoDB ga ulandi\n');

    const allProducts = await Product.find({});
    console.log(`📦 Jami mahsulotlar: ${allProducts.length}\n`);

    let withImages = 0;
    let withoutImages = 0;
    let stringFormatImages = 0;
    let objectFormatImages = 0;

    console.log('📊 Mahsulotlar tahlili:\n');
    
    for (const product of allProducts) {
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
          console.log(`   Rasm formati: OBJECT - ${firstImage.path} (${firstImage.uploadedBy})`);
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

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

checkProductImages();
