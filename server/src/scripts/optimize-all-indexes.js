const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kassa';

async function optimizeAllIndexes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    console.log('\n📊 Optimizing all collections...\n');

    // Helper function to create index safely
    async function createIndexSafely(collection, indexSpec, options = {}) {
      try {
        await collection.createIndex(indexSpec, { ...options, background: true });
        return true;
      } catch (error) {
        if (error.code === 86 || error.code === 85 || error.code === 11000) {
          // Index already exists with different options/name, or duplicate key error, skip
          return false;
        }
        throw error;
      }
    }

    // 1. Products collection
    console.log('1️⃣ Products collection:');
    const productsCollection = db.collection('products');
    
    let created = 0;
    if (await createIndexSafely(productsCollection, { code: 1 }, { unique: true })) created++;
    if (await createIndexSafely(productsCollection, { name: 1 })) created++;
    if (await createIndexSafely(productsCollection, { category: 1 })) created++;
    if (await createIndexSafely(productsCollection, { subcategory: 1 })) created++;
    if (await createIndexSafely(productsCollection, { category: 1, subcategory: 1 })) created++;
    if (await createIndexSafely(productsCollection, { quantity: 1 })) created++;
    if (await createIndexSafely(productsCollection, { createdAt: -1 })) created++;
    if (await createIndexSafely(productsCollection, { name: 'text', code: 'text' })) created++;
    console.log(`  ✅ Products: ${created} new indexes created`);

    // 2. Categories collection
    console.log('2️⃣ Categories collection:');
    const categoriesCollection = db.collection('categories');
    
    created = 0;
    if (await createIndexSafely(categoriesCollection, { name: 1 }, { unique: true })) created++;
    if (await createIndexSafely(categoriesCollection, { order: 1 })) created++;
    if (await createIndexSafely(categoriesCollection, { isActive: 1 })) created++;
    console.log(`  ✅ Categories: ${created} new indexes created`);

    // 3. Receipts collection
    console.log('3️⃣ Receipts collection:');
    const receiptsCollection = db.collection('receipts');
    
    created = 0;
    if (await createIndexSafely(receiptsCollection, { receiptNumber: 1 }, { unique: true, sparse: true })) created++;
    if (await createIndexSafely(receiptsCollection, { createdAt: -1 })) created++;
    if (await createIndexSafely(receiptsCollection, { createdBy: 1 })) created++;
    if (await createIndexSafely(receiptsCollection, { paymentMethod: 1 })) created++;
    console.log(`  ✅ Receipts: ${created} new indexes created`);

    // 4. Debts collection
    console.log('4️⃣ Debts collection:');
    const debtsCollection = db.collection('debts');
    
    created = 0;
    if (await createIndexSafely(debtsCollection, { customer: 1 })) created++;
    if (await createIndexSafely(debtsCollection, { status: 1 })) created++;
    if (await createIndexSafely(debtsCollection, { type: 1 })) created++;
    if (await createIndexSafely(debtsCollection, { dueDate: 1 })) created++;
    if (await createIndexSafely(debtsCollection, { createdAt: -1 })) created++;
    if (await createIndexSafely(debtsCollection, { customer: 1, status: 1 })) created++;
    console.log(`  ✅ Debts: ${created} new indexes created`);

    // 5. Expenses collection
    console.log('5️⃣ Expenses collection:');
    const expensesCollection = db.collection('expenses');
    
    created = 0;
    if (await createIndexSafely(expensesCollection, { date: -1, category: 1 })) created++;
    if (await createIndexSafely(expensesCollection, { category: 1, date: -1 })) created++;
    if (await createIndexSafely(expensesCollection, { createdBy: 1, date: -1 })) created++;
    if (await createIndexSafely(expensesCollection, { createdAt: -1 })) created++;
    console.log(`  ✅ Expenses: ${created} new indexes created`);

    // 6. Users collection
    console.log('6️⃣ Users collection:');
    const usersCollection = db.collection('users');
    
    created = 0;
    if (await createIndexSafely(usersCollection, { username: 1 }, { unique: true, sparse: true })) created++;
    if (await createIndexSafely(usersCollection, { role: 1 })) created++;
    console.log(`  ✅ Users: ${created} new indexes created`);

    console.log('\n✅ All indexes optimized successfully!');
    console.log('\n📊 Performance improvements:');
    console.log('  - Faster product searches');
    console.log('  - Faster category filtering');
    console.log('  - Faster receipt queries');
    console.log('  - Faster debt statistics');
    console.log('  - Faster expense reports');

    // Show all indexes
    console.log('\n📋 Current indexes:');
    const collections = [
      { name: 'products', collection: productsCollection },
      { name: 'categories', collection: categoriesCollection },
      { name: 'receipts', collection: receiptsCollection },
      { name: 'debts', collection: debtsCollection },
      { name: 'expenses', collection: expensesCollection },
      { name: 'users', collection: usersCollection }
    ];

    for (const { name, collection } of collections) {
      const indexes = await collection.indexes();
      console.log(`\n${name}: ${indexes.length} indexes`);
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

optimizeAllIndexes();
