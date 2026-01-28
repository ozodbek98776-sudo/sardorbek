// Eski formatdagi rasmlarni yangi formatga o'tkazish
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./src/models/Product');

async function migrateImages() {
  try {
    console.log('🔄 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/biznesjon');
    console.log('✅ MongoDB ga ulandi');

    console.log('🔍 Mahsulotlarni tekshirish...');
    const products = await Product.find({});
    console.log(`📦 Jami ${products.length} ta mahsulot topildi`);

    let migratedCount = 0;
    let alreadyMigratedCount = 0;

    for (const product of products) {
      if (!product.images || product.images.length === 0) {
        continue;
      }

      // Agar birinchi rasm string bo'lsa, eski format
      if (typeof product.images[0] === 'string') {
        console.log(`🔄 Mahsulot migratsiya qilinmoqda: ${product.name} (${product.code})`);
        
        // Barcha rasmlarni yangi formatga o'tkazish
        product.images = product.images.map(imagePath => ({
          path: imagePath,
          uploadedBy: 'admin', // Eski rasmlar admin tomonidan yuklangan deb hisoblaymiz
          uploadedAt: product.createdAt || new Date()
        }));

        await product.save();
        migratedCount++;
        console.log(`✅ Migratsiya qilindi: ${product.name}`);
      } else {
        alreadyMigratedCount++;
      }
    }

    console.log('\n📊 Natijalar:');
    console.log(`✅ Migratsiya qilindi: ${migratedCount} ta mahsulot`);
    console.log(`ℹ️  Allaqachon yangi formatda: ${alreadyMigratedCount} ta mahsulot`);
    console.log(`📦 Jami: ${products.length} ta mahsulot`);

    await mongoose.connection.close();
    console.log('\n✅ Migratsiya muvaffaqiyatli yakunlandi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

migrateImages();
