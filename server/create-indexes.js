require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Drop old indexes
    console.log('🗑️  Dropping old indexes...');
    await Product.collection.dropIndexes();
    
    // Create optimized indexes
    console.log('📊 Creating optimized indexes...');
    
    // 1. Compound index for main warehouse queries (MOST IMPORTANT!)
    await Product.collection.createIndex(
      { isMainWarehouse: 1, code: 1 },
      { name: 'isMainWarehouse_code_1' }
    );
    console.log('✅ Created: isMainWarehouse_code_1');
    
    // 2. Code index (for search)
    await Product.collection.createIndex(
      { code: 1 },
      { name: 'code_1' }
    );
    console.log('✅ Created: code_1');
    
    // 3. Name index (for search)
    await Product.collection.createIndex(
      { name: 1 },
      { name: 'name_1' }
    );
    console.log('✅ Created: name_1');
    
    // 4. Warehouse index
    await Product.collection.createIndex(
      { warehouse: 1 },
      { name: 'warehouse_1' }
    );
    console.log('✅ Created: warehouse_1');
    
    // 5. Text search index
    await Product.collection.createIndex(
      { name: 'text', code: 'text' },
      { name: 'text_search' }
    );
    console.log('✅ Created: text_search');
    
    // List all indexes
    console.log('\n📋 All indexes:');
    const indexes = await Product.collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
    
    console.log('\n🎉 Indexes created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createIndexes();
