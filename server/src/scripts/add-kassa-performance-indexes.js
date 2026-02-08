const mongoose = require('mongoose');
require('dotenv').config();

async function addKassaPerformanceIndexes() {
  try {
    console.log('🚀 Kassa Performance Indexes yaratilmoqda...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    // ⚡ KASSA UCHUN ULTRA-FAST INDEXES
    
    // 1. Compound index for kassa search - most important
    await productsCollection.createIndex(
      { 
        name: 'text', 
        code: 'text' 
      },
      { 
        name: 'kassa_search_text',
        weights: { 
          code: 10,  // Code gets higher priority
          name: 5 
        },
        background: true
      }
    );
    console.log('✅ Text search index yaratildi');

    // 2. Code exact match - fastest lookup
    await productsCollection.createIndex(
      { code: 1 },
      { 
        name: 'kassa_code_exact',
        background: true,
        unique: true,
        sparse: true
      }
    );
    console.log('✅ Code exact match index yaratildi');

    // 3. Category filter for kassa
    await productsCollection.createIndex(
      { category: 1, createdAt: -1 },
      { 
        name: 'kassa_category_sort',
        background: true
      }
    );
    console.log('✅ Category filter index yaratildi');

    // 4. Compound index for kassa pagination
    await productsCollection.createIndex(
      { 
        isMainWarehouse: 1,
        category: 1,
        createdAt: -1
      },
      { 
        name: 'kassa_pagination',
        background: true
      }
    );
    console.log('✅ Pagination index yaratildi');

    // 5. Prices array optimization
    await productsCollection.createIndex(
      { 'prices.type': 1, 'prices.isActive': 1 },
      { 
        name: 'kassa_prices_lookup',
        background: true
      }
    );
    console.log('✅ Prices lookup index yaratildi');

    // 6. Quantity and availability
    await productsCollection.createIndex(
      { quantity: 1, isMainWarehouse: 1 },
      { 
        name: 'kassa_stock_check',
        background: true
      }
    );
    console.log('✅ Stock check index yaratildi');

    // 7. Numeric code sorting optimization
    await productsCollection.createIndex(
      { code: 1 },
      { 
        name: 'kassa_code_sort',
        background: true,
        collation: { locale: 'en_US', numericOrdering: true }
      }
    );
    console.log('✅ Numeric code sorting index yaratildi');

    // ⚡ ADDITIONAL PERFORMANCE INDEXES

    // 8. Image loading optimization
    await productsCollection.createIndex(
      { 'images.path': 1 },
      { 
        name: 'image_path_lookup',
        background: true,
        sparse: true
      }
    );
    console.log('✅ Image path index yaratildi');

    // 9. Warehouse filtering
    await productsCollection.createIndex(
      { warehouse: 1, isMainWarehouse: 1 },
      { 
        name: 'warehouse_filter',
        background: true
      }
    );
    console.log('✅ Warehouse filter index yaratildi');

    // 10. QR code lookup
    await productsCollection.createIndex(
      { qrCode: 1 },
      { 
        name: 'qr_code_lookup',
        background: true,
        sparse: true
      }
    );
    console.log('✅ QR code lookup index yaratildi');

    // ⚡ VERIFY INDEXES
    const indexes = await productsCollection.listIndexes().toArray();
    console.log('\n📊 Yaratilgan indexlar:');
    indexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // ⚡ INDEX USAGE STATISTICS
    console.log('\n📈 Index statistikasi:');
    const stats = await productsCollection.stats();
    console.log(`  - Jami hujjatlar: ${stats.count}`);
    console.log(`  - Jami indexlar: ${stats.nindexes}`);
    console.log(`  - Index hajmi: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n🎉 Barcha Kassa Performance indexlari muvaffaqiyatli yaratildi!');
    console.log('\n⚡ Kutilayotgan performance yaxshilanishlar:');
    console.log('  - Qidiruv tezligi: 10-50x tezroq');
    console.log('  - Pagination: 5-20x tezroq');
    console.log('  - Category filter: 3-10x tezroq');
    console.log('  - Code lookup: 100x tezroq');
    
  } catch (error) {
    console.error('❌ Index yaratishda xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ MongoDB aloqasi uzildi');
  }
}

// Run the script
if (require.main === module) {
  addKassaPerformanceIndexes();
}

module.exports = addKassaPerformanceIndexes;