const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Models
const Product = require('../src/models/Product');

// Backup file - o'chirilgan mahsulotlar
const fs = require('fs');
const backupFile = path.join(__dirname, 'deleted-products-backup.json');

async function restoreProducts() {
  try {
    console.log('🔄 Database ulanmoqda...');
    
    // Cloud MongoDB URI
    const mongoUri = 'mongodb+srv://ozodbekweb011_db_user:pPZfsDeWMONS0dz0@nazorat1.kcvyamy.mongodb.net/nazorat?retryWrites=true&w=majority&appName=nazorat1&ssl=true&serverSelectionTimeoutMS=10000&socketTimeoutMS=45000&connectTimeoutMS=10000';
    
    console.log('📍 MongoDB Atlas ulanmoqda...');
    
    await mongoose.connect(mongoUri);
    
    console.log('✅ Database ulandi\n');

    // Backup file'ni o'qish
    if (!fs.existsSync(backupFile)) {
      console.log('❌ Backup file topilmadi:', backupFile);
      console.log('📝 Avval seed file ishga tushiring: npm run seed:clean-before-16');
      process.exit(1);
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    console.log(`📦 Backup'dan ${backupData.length} ta mahsulot topildi`);

    // Oxiridagi 100 ta mahsulotni qaytarish
    const lastHundred = backupData.slice(0, 100);
    console.log(`\n📥 Qaytarilmoqda: ${lastHundred.length} ta mahsulot\n`);

    // Mahsulotlarni database'ga qaytarish
    const result = await Product.insertMany(lastHundred);
    
    console.log(`✅ Qaytarildi: ${result.length} ta mahsulot`);

    // Qoldirgan mahsulotlarni ko'rsatish
    const totalProducts = await Product.countDocuments();
    console.log(`\n📊 Jami mahsulotlar: ${totalProducts} ta`);

    console.log('\n✅ Mahsulotlar qaytarildi!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    process.exit(1);
  }
}

// Ishga tushirish
restoreProducts();
