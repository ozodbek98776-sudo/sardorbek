const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Models
const Product = require('../src/models/Product');

// Cutoff date - 16-sana oxiri (2026-02-16 23:59:59)
const CUTOFF_DATE = new Date(2026, 1, 17, 0, 0, 0, 0); // February 17, 2026 00:00:00 (16-sana oxiri)

async function cleanDatabase() {
  try {
    console.log('🔄 Database ulanmoqda...');
    
    // Cloud MongoDB URI
    const mongoUri = 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&connectTimeoutMS=10000';
    
    console.log('📍 MongoDB Atlas ulanmoqda...');
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ Database ulandi');
    console.log(`📅 Cutoff date: ${CUTOFF_DATE.toISOString()}`);
    console.log('🗑️ 16-sanagaacha qo\'shilgan mahsulotlar o\'chirilmoqda...\n');

    // Barcha mahsulotlarni ko'rish
    const allProducts = await Product.find({}).select('name createdAt').sort({ createdAt: -1 }).lean();
    console.log(`📊 Jami mahsulotlar: ${allProducts.length} ta`);

    // Agar mahsulot bo'lmasa
    if (allProducts.length === 0) {
      console.log('\n❌ Database bo\'sh! Mahsulotlar topilmadi.');
      console.log('💡 Restore uchun: npm run restore:last-100-products');
      process.exit(0);
    }

    // Birinchi 3 ta mahsulotning sanalarini ko'rsatish
    console.log('\n📅 Oxiridagi 3 ta mahsulotning sanalari:');
    allProducts.slice(0, 3).forEach(p => {
      console.log(`  - ${p.name}: ${new Date(p.createdAt).toISOString()}`);
    });

    // Oxiridagi 100 ta mahsulotni qoldirish uchun, ularning eng eski sanasini topish
    const lastHundred = allProducts.slice(0, 100);
    const oldestInLastHundred = lastHundred[lastHundred.length - 1];
    const cutoffForLastHundred = new Date(oldestInLastHundred.createdAt);
    
    console.log(`\n📦 Oxiridagi 100 ta mahsulot qoldirish`);
    console.log(`  Eng eski sana: ${cutoffForLastHundred.toISOString()}`);

    // 16-sanagaacha qo'shilganlar (oxiridagi 100 tadan tashqari)
    const beforeCutoff = allProducts.filter(p => new Date(p.createdAt) < cutoffForLastHundred);
    console.log(`\n📦 O'chiriladi: ${beforeCutoff.length} ta mahsulot`);
    console.log(`📦 Qoldiradi: 100 ta mahsulot\n`);

    // O'chirilgan mahsulotlarni backup'ga saqlash
    const productsToDelete = await Product.find({
      createdAt: { $lt: cutoffForLastHundred }
    }).lean();

    const backupFile = path.join(__dirname, 'deleted-products-backup.json');
    fs.writeFileSync(backupFile, JSON.stringify(productsToDelete, null, 2));
    console.log(`💾 Backup saqlandi: ${backupFile}`);
    console.log(`   ${productsToDelete.length} ta mahsulot backup'da\n`);

    // 16-sanagaacha qo'shilgan mahsulotlarni o'chirish (oxiridagi 100 tadan tashqari)
    const deleteResult = await Product.deleteMany({
      createdAt: { $lt: cutoffForLastHundred }
    });

    console.log(`✅ O'chirildi: ${deleteResult.deletedCount} ta mahsulot`);

    // Qoldirgan mahsulotlarni ko'rsatish
    const remainingProducts = await Product.countDocuments({
      createdAt: { $gte: cutoffForLastHundred }
    });

    console.log(`\n📊 Qoldirgan ma'lumotlar:`);
    console.log(`  📦 Products: ${remainingProducts} ta (oxiridagi 100 ta)`);

    console.log('\n✅ Database tozalandi!');
    console.log(`✅ ${deleteResult.deletedCount} ta mahsulot o'chirib tashlandi`);
    console.log(`✅ 100 ta mahsulot qoldirish`);
    console.log(`\n💡 Qaytarish uchun: npm run restore:last-100-products`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

// Ishga tushirish
cleanDatabase();
