const mongoose = require('mongoose');
require('dotenv').config();

const Expense = require('../models/Expense');

async function optimizeExpenseIndexes() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Check existing indexes
    console.log('\n📊 Current indexes:');
    const indexes = await Expense.collection.getIndexes();
    console.log(JSON.stringify(indexes, null, 2));

    // 2. Drop all indexes except _id
    console.log('\n🗑️ Dropping old indexes...');
    try {
      await Expense.collection.dropIndexes();
      console.log('✅ Old indexes dropped');
    } catch (err) {
      console.log('⚠️ No indexes to drop or error:', err.message);
    }

    // 3. Create optimized compound indexes
    console.log('\n🔨 Creating optimized indexes...');
    
    // Main query index: date DESC + category
    await Expense.collection.createIndex(
      { date: -1, category: 1 },
      { 
        name: 'date_-1_category_1',
        background: true 
      }
    );
    console.log('✅ Created index: date_-1_category_1');

    // Alternative query index: category + date DESC
    await Expense.collection.createIndex(
      { category: 1, date: -1 },
      { 
        name: 'category_1_date_-1',
        background: true 
      }
    );
    console.log('✅ Created index: category_1_date_-1');

    // User-specific queries
    await Expense.collection.createIndex(
      { createdBy: 1, date: -1 },
      { 
        name: 'createdBy_1_date_-1',
        background: true 
      }
    );
    console.log('✅ Created index: createdBy_1_date_-1');

    // Sort by creation time
    await Expense.collection.createIndex(
      { createdAt: -1 },
      { 
        name: 'createdAt_-1',
        background: true 
      }
    );
    console.log('✅ Created index: createdAt_-1');

    // 4. Verify new indexes
    console.log('\n📊 New indexes:');
    const newIndexes = await Expense.collection.getIndexes();
    console.log(JSON.stringify(newIndexes, null, 2));

    // 5. Get collection stats
    console.log('\n📈 Collection statistics:');
    const stats = await Expense.collection.stats();
    console.log(`Total documents: ${stats.count}`);
    console.log(`Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
    console.log(`Total index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

    console.log('\n✅ Expense indexes optimized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error optimizing indexes:', error);
    process.exit(1);
  }
}

optimizeExpenseIndexes();
