const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kassa';

async function addExpenseIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const expensesCollection = db.collection('expenses');

    console.log('\n📊 Current indexes:');
    const currentIndexes = await expensesCollection.indexes();
    currentIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n🔨 Creating optimized indexes...');

    // Drop old single-field indexes if they exist (except _id)
    try {
      await expensesCollection.dropIndex('date_-1');
      console.log('  ✅ Dropped old date_-1 index');
    } catch (err) {
      console.log('  ℹ️  date_-1 index not found (OK)');
    }

    try {
      await expensesCollection.dropIndex('category_1');
      console.log('  ✅ Dropped old category_1 index');
    } catch (err) {
      console.log('  ℹ️  category_1 index not found (OK)');
    }

    try {
      await expensesCollection.dropIndex('createdBy_1');
      console.log('  ✅ Dropped old createdBy_1 index');
    } catch (err) {
      console.log('  ℹ️  createdBy_1 index not found (OK)');
    }

    // Create compound indexes for better query performance
    await expensesCollection.createIndex(
      { date: -1, category: 1 },
      { name: 'date_-1_category_1', background: true }
    );
    console.log('  ✅ Created compound index: date_-1_category_1');

    await expensesCollection.createIndex(
      { category: 1, date: -1 },
      { name: 'category_1_date_-1', background: true }
    );
    console.log('  ✅ Created compound index: category_1_date_-1');

    await expensesCollection.createIndex(
      { createdBy: 1, date: -1 },
      { name: 'createdBy_1_date_-1', background: true }
    );
    console.log('  ✅ Created compound index: createdBy_1_date_-1');

    await expensesCollection.createIndex(
      { createdAt: -1 },
      { name: 'createdAt_-1', background: true }
    );
    console.log('  ✅ Created index: createdAt_-1');

    console.log('\n📊 New indexes:');
    const newIndexes = await expensesCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ All indexes created successfully!');
    console.log('\n📈 Performance improvements:');
    console.log('  - Filtered queries (category + date) will be much faster');
    console.log('  - Stats aggregations will use indexes efficiently');
    console.log('  - Sorting by date will be optimized');

    // Get collection stats
    const stats = await expensesCollection.stats();
    console.log('\n📊 Collection stats:');
    console.log(`  - Total documents: ${stats.count}`);
    console.log(`  - Total size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - Average document size: ${(stats.avgObjSize / 1024).toFixed(2)} KB`);
    console.log(`  - Total index size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

addExpenseIndexes();
