const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../models/Product');

async function addProductIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Mavjud indekslarni ko'rish
    const existingIndexes = await Product.collection.getIndexes();
    console.log('📋 Mavjud indekslar:', Object.keys(existingIndexes));

    // Yangi indekslarni qo'shish
    console.log('\n🔧 Yangi indekslar qo\'shilmoqda...');

    // 1. Code bo'yicha indeks (tez qidirish uchun)
    try {
      await Product.collection.createIndex({ code: 1 }, { background: true });
      console.log('✅ Code indeksi qo\'shildi');
    } catch (err) {
      if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️ Code indeksi allaqachon mavjud');
      } else {
        throw err;
      }
    }

    // 2. Name bo'yicha indeks (qidirish uchun)
    try {
      await Product.collection.createIndex({ name: 1 }, { background: true });
      console.log('✅ Name indeksi qo\'shildi');
    } catch (err) {
      if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️ Name indeksi allaqachon mavjud');
      } else {
        throw err;
      }
    }

    // 3. Warehouse va isMainWarehouse bo'yicha compound indeks
    try {
      await Product.collection.createIndex(
        { warehouse: 1, isMainWarehouse: 1 },
        { background: true }
      );
      console.log('✅ Warehouse + isMainWarehouse indeksi qo\'shildi');
    } catch (err) {
      if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️ Warehouse + isMainWarehouse indeksi allaqachon mavjud');
      } else {
        throw err;
      }
    }

    // 4. Quantity bo'yicha indeks (stock filter uchun)
    try {
      await Product.collection.createIndex({ quantity: 1 }, { background: true });
      console.log('✅ Quantity indeksi qo\'shildi');
    } catch (err) {
      if (err.code === 86 || err.codeName === 'IndexKeySpecsConflict') {
        console.log('⚠️ Quantity indeksi allaqachon mavjud');
      } else {
        throw err;
      }
    }

    // 5. Text search uchun indeks (name va code bo'yicha)
    try {
      await Product.collection.createIndex(
        { name: 'text', code: 'text' },
        { background: true, weights: { name: 2, code: 1 } }
      );
      console.log('✅ Text search indeksi qo\'shildi');
    } catch (err) {
      if (err.code === 85) {
        console.log('⚠️ Text indeks allaqachon mavjud');
      } else {
        throw err;
      }
    }

    // Yangi indekslarni ko'rish
    const newIndexes = await Product.collection.getIndexes();
    console.log('\n📋 Yangilangan indekslar:', Object.keys(newIndexes));

    console.log('\n✅ Barcha indekslar muvaffaqiyatli qo\'shildi!');
    console.log('💡 Endi mahsulotlar tezroq yuklanadi.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

addProductIndexes();
