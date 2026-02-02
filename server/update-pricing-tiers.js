require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product');

async function updatePricingTiers() {
  try {
    console.log('🔄 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi');

    console.log('🔄 Mahsulotlarni yangilash boshlandi...');
    
    // Barcha mahsulotlarni yangilash - default pricing tiers qo'shish
    const result = await Product.updateMany(
      {}, // Barcha mahsulotlar
      {
        $set: {
          'pricingTiers.tier1.discountPercent': 1,
          'pricingTiers.tier2.discountPercent': 3,
          'pricingTiers.tier3.discountPercent': 5
        }
      }
    );

    console.log(`✅ ${result.modifiedCount} ta mahsulot yangilandi`);
    console.log('📊 Yangi default qiymatlar:');
    console.log('   - Tier 1: 1% skidka');
    console.log('   - Tier 2: 3% skidka');
    console.log('   - Tier 3: 5% skidka');

    // Bir nechta mahsulotni tekshirish
    const sampleProducts = await Product.find().limit(3);
    console.log('\n📦 Namuna mahsulotlar:');
    sampleProducts.forEach(product => {
      console.log(`\n   ${product.name} (${product.code})`);
      console.log(`   - Tier 1: ${product.pricingTiers?.tier1?.discountPercent || 0}%`);
      console.log(`   - Tier 2: ${product.pricingTiers?.tier2?.discountPercent || 0}%`);
      console.log(`   - Tier 3: ${product.pricingTiers?.tier3?.discountPercent || 0}%`);
    });

    console.log('\n✅ Barcha mahsulotlar muvaffaqiyatli yangilandi!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

updatePricingTiers();
