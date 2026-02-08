require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Mahsulotlar quantity ni tekshirish scripti
 */

async function checkProductsQuantity() {
  try {
    console.log('🔄 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha mahsulotlarni olish
    const products = await Product.find({}).limit(10);
    
    console.log('📊 Birinchi 10 ta mahsulot:\n');
    console.log('═══════════════════════════════════════════════════════════════');
    
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Quantity: ${product.quantity}`);
      console.log(`   ID: ${product._id}`);
      console.log('───────────────────────────────────────────────────────────────');
    });

    // Statistika
    const totalProducts = await Product.countDocuments();
    const products500 = await Product.countDocuments({ quantity: 500 });
    const productsNot500 = await Product.countDocuments({ quantity: { $ne: 500 } });

    console.log('\n📈 STATISTIKA:');
    console.log(`   Jami mahsulotlar: ${totalProducts}`);
    console.log(`   Quantity = 500: ${products500}`);
    console.log(`   Quantity ≠ 500: ${productsNot500}`);

    if (productsNot500 > 0) {
      console.log('\n⚠️ Quantity 500 bo\'lmagan mahsulotlar:');
      const notUpdated = await Product.find({ quantity: { $ne: 500 } }).limit(20);
      notUpdated.forEach(p => {
        console.log(`   - ${p.name}: quantity = ${p.quantity}`);
      });
    } else {
      console.log('\n✅ Barcha mahsulotlarning quantity = 500!');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('  MAHSULOTLAR QUANTITY NI TEKSHIRISH');
console.log('═══════════════════════════════════════════════════════\n');

checkProductsQuantity();
