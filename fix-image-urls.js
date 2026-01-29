const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Product = require('./server/src/models/Product');

async function fixImageUrls() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha mahsulotlarni olish
    const allProducts = await Product.find({});
    console.log(`📊 Jami ${allProducts.length} ta mahsulot topildi\n`);

    let fixedCount = 0;
    let totalImagesFixed = 0;

    for (const product of allProducts) {
      let needsUpdate = false;
      const fixedImages = [];

      for (let img of product.images) {
        let imagePath = typeof img === 'string' ? img : img.path;
        let uploadedBy = typeof img === 'string' ? 'admin' : img.uploadedBy;
        
        // Agar to'liq URL bo'lsa, faqat path qismini olish
        if (imagePath.includes('http://') || imagePath.includes('https://')) {
          try {
            const url = new URL(imagePath);
            imagePath = url.pathname; // /uploads/products/...
            needsUpdate = true;
            totalImagesFixed++;
            console.log(`  🔧 Tuzatildi: ${img} -> ${imagePath}`);
          } catch (e) {
            console.warn(`  ⚠️ URL parse xatosi: ${imagePath}`);
          }
        }
        
        // Agar / bilan boshlanmasa, qo'shish
        if (!imagePath.startsWith('/')) {
          imagePath = '/' + imagePath;
          needsUpdate = true;
        }
        
        // Object formatida saqlash
        fixedImages.push({
          path: imagePath,
          uploadedBy: uploadedBy
        });
      }

      if (needsUpdate) {
        product.images = fixedImages;
        await product.save();
        fixedCount++;
        console.log(`✅ ${product.name} (${product.code}) - ${fixedImages.length} ta rasm tuzatildi`);
      }
    }

    console.log(`\n📊 Natija:`);
    console.log(`   - Jami mahsulotlar: ${allProducts.length}`);
    console.log(`   - Tuzatilgan mahsulotlar: ${fixedCount}`);
    console.log(`   - Tuzatilgan rasmlar: ${totalImagesFixed}`);

    await mongoose.disconnect();
    console.log('\n✅ MongoDB dan uzildi');
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

fixImageUrls();
