require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const defaultCategories = [
  { name: 'Mebel furnitura', order: 0 },
  { name: 'Yumshoq mebel', order: 1 },
  { name: 'Linoleum uy', order: 2 },
  { name: 'Linoleum avto', order: 3 },
  { name: 'Paralon', order: 4 },
  { name: 'Fant (avtomobil)', order: 5 },
  { name: 'Avto mato', order: 6 },
  { name: 'Klyonka', order: 7 },
  { name: 'Boshqa', order: 8 }
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Check if categories already exist
    const existingCount = await Category.countDocuments();
    if (existingCount > 0) {
      console.log(`ℹ️  ${existingCount} ta kategoriya allaqachon mavjud`);
      console.log('Yangi kategoriyalar qo\'shilmadi');
      process.exit(0);
    }

    // Insert default categories
    await Category.insertMany(defaultCategories);
    console.log(`✅ ${defaultCategories.length} ta kategoriya qo'shildi`);

    const categories = await Category.find().sort({ order: 1 });
    console.log('\n📋 Kategoriyalar ro\'yxati:');
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (order: ${cat.order})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Xatolik:', err);
    process.exit(1);
  }
}

seedCategories();
