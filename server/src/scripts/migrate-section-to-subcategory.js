const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kassa';

async function migrateSectionToSubcategory() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const productsCollection = db.collection('products');

    console.log('\n📊 Checking products with section field...');
    
    // Section maydoni bo'lgan mahsulotlarni topish
    const productsWithSection = await productsCollection.find({ 
      section: { $exists: true, $ne: '' } 
    }).toArray();
    
    console.log(`Found ${productsWithSection.length} products with section field`);

    if (productsWithSection.length > 0) {
      console.log('\n🔄 Migrating section to subcategory...');
      
      for (const product of productsWithSection) {
        await productsCollection.updateOne(
          { _id: product._id },
          { 
            $set: { subcategory: product.section },
            $unset: { section: '' }
          }
        );
        console.log(`  ✅ Migrated product: ${product.name} (section: ${product.section} → subcategory: ${product.section})`);
      }
      
      console.log(`\n✅ Successfully migrated ${productsWithSection.length} products`);
    } else {
      console.log('\n✅ No products with section field found');
    }

    // Remove section field from all products
    console.log('\n🧹 Removing section field from all products...');
    const result = await productsCollection.updateMany(
      {},
      { $unset: { section: '' } }
    );
    console.log(`✅ Removed section field from ${result.modifiedCount} products`);

    // Update indexes
    console.log('\n🔨 Updating indexes...');
    
    try {
      await productsCollection.dropIndex('section_1');
      console.log('  ✅ Dropped section_1 index');
    } catch (err) {
      console.log('  ℹ️  section_1 index not found (OK)');
    }

    try {
      await productsCollection.dropIndex('category_1_section_1');
      console.log('  ✅ Dropped category_1_section_1 index');
    } catch (err) {
      console.log('  ℹ️  category_1_section_1 index not found (OK)');
    }

    await productsCollection.createIndex({ subcategory: 1 });
    console.log('  ✅ Created subcategory_1 index');

    await productsCollection.createIndex({ category: 1, subcategory: 1 });
    console.log('  ✅ Created category_1_subcategory_1 index');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Migrated ${productsWithSection.length} products`);
    console.log(`  - Removed section field from all products`);
    console.log(`  - Updated indexes`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

migrateSectionToSubcategory();
