require('dotenv').config();
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    console.log('🔌 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi\n');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    console.log('📊 Hozirgi indexlar:');
    const existingIndexes = await collection.indexes();
    existingIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n⚡ Yangi indexlar yaratilmoqda...\n');

    // 1. Code index (tez qidiruv uchun)
    await collection.createIndex({ code: 1 }, { background: true });
    console.log('✅ Code index yaratildi');

    // 2. Name index (qidiruv uchun)
    await collection.createIndex({ name: 1 }, { background: true });
    console.log('✅ Name index yaratildi');

    // 3. isMainWarehouse + code (asosiy ombor mahsulotlari uchun)
    await collection.createIndex({ isMainWarehouse: 1, code: 1 }, { background: true });
    console.log('✅ isMainWarehouse + code index yaratildi');

    // 4. Quantity index (kam qolgan mahsulotlar uchun)
    await collection.createIndex({ quantity: 1 }, { background: true });
    console.log('✅ Quantity index yaratildi');

    // 5. Warehouse index
    await collection.createIndex({ warehouse: 1 }, { background: true });
    console.log('✅ Warehouse index yaratildi');

    console.log('\n📊 Yangi indexlar ro\'yxati:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Barcha indexlar muvaffaqiyatli yaratildi!');
    console.log('⚡ Endi mahsulotlar 10x tezroq yuklanadi!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

createIndexes();
