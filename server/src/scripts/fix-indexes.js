const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    console.log('🔧 Indexlarni tuzatish...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // 1. Barcha indexlarni ko'rish
    console.log('\n📊 Mavjud indexlar:');
    const existingIndexes = await productsCollection.listIndexes().toArray();
    existingIndexes.forEach(index => {
      console.log(`  - ${index.name}`);
    });

    // 2. Eski text index'ni o'chirish
    try {
      await productsCollection.dropIndex('text_search');
      console.log('\n✅ Eski text_search index o\'chirildi');
    } catch (e) {
      console.log('\n⚠️ text_search index topilmadi yoki o\'chirilmadi');
    }

    // 3. Yangi optimizatsiya qilingan indexlarni yaratish
    console.log('\n🚀 Yangi indexlar yaratilmoqda...');

    // Text search index (optimized weights)
    await productsCollection.createIndex(
      { name: 'text', code: 'text' },
      { 
        name: 'kassa_search_optimized',
        weights: { code: 10, name: 5 },
        background: true
      }
    );
    console.log('✅ Text search index yaratildi');

    // Code exact match
    await productsCollection.createIndex(
      { code: 1 },
      { name: 'code_exact', background: true }
    );
    console.log('✅ Code exact match index yaratildi');

    // Category + createdAt
    await productsCollection.createIndex(
      { category: 1, createdAt: -1 },
      { name: 'category_sort', background: true }
    );
    console.log('✅ Category sort index yaratildi');

    // Quantity + isMainWarehouse
    await productsCollection.createIndex(
      { quantity: 1, isMainWarehouse: 1 },
      { name: 'stock_check', background: true }
    );
    console.log('✅ Stock check index yaratildi');

    // Warehouse filter
    await productsCollection.createIndex(
      { warehouse: 1, isMainWarehouse: 1 },
      { name: 'warehouse_filter', background: true }
    );
    console.log('✅ Warehouse filter index yaratildi');

    // 4. Yangi indexlarni ko'rish
    console.log('\n📊 Yangi indexlar:');
    const newIndexes = await productsCollection.listIndexes().toArray();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // 5. Statistika
    const stats = await productsCollection.stats();
    console.log('\n📈 Statistika:');
    console.log(`  - Jami hujjatlar: ${stats.count}`);
    console.log(`  - Jami indexlar: ${stats.nindexes}`);
    console.log(`  - Index hajmi: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n🎉 Indexlar muvaffaqiyatli tuzatildi!');
    
  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB aloqasi uzildi');
  }
}

if (require.main === module) {
  fixIndexes();
}

module.exports = fixIndexes;
