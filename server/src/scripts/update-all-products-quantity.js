require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * XAVFSIZ SCRIPT: Barcha mahsulotlarning quantity ni 500 ga o'zgartiradi
 * HECH NARSA O'CHIRILMAYDI - faqat quantity yangilanadi
 */

async function updateAllProductsQuantity() {
  try {
    console.log('🔄 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha mahsulotlarni olish
    console.log('📦 Barcha mahsulotlarni yuklash...');
    const products = await Product.find({});
    console.log(`✅ ${products.length} ta mahsulot topildi\n`);

    if (products.length === 0) {
      console.log('⚠️ Hech qanday mahsulot topilmadi!');
      process.exit(0);
    }

    // Tasdiqlash
    console.log('⚠️  DIQQAT: Barcha mahsulotlarning quantity ni 500 ga o\'zgartirmoqchimisiz?');
    console.log('📊 Joriy holatlar:');
    
    // Statistika
    const stats = {
      total: products.length,
      zeroQuantity: products.filter(p => p.quantity === 0).length,
      lowQuantity: products.filter(p => p.quantity > 0 && p.quantity < 100).length,
      normalQuantity: products.filter(p => p.quantity >= 100).length
    };
    
    console.log(`   - Jami mahsulotlar: ${stats.total}`);
    console.log(`   - Quantity = 0: ${stats.zeroQuantity}`);
    console.log(`   - Quantity < 100: ${stats.lowQuantity}`);
    console.log(`   - Quantity >= 100: ${stats.normalQuantity}\n`);

    // Yangilash
    console.log('🔄 Barcha mahsulotlarning quantity ni 500 ga yangilash...');
    
    // updateMany ishlatish - tezroq va ishonchli
    const result = await Product.updateMany(
      {}, // Barcha mahsulotlar
      { $set: { quantity: 500 } } // Quantity ni 500 ga o'rnatish
    );

    console.log('\n✅ YANGILASH YAKUNLANDI!\n');
    console.log('📊 Natijalar:');
    console.log(`   - Topilgan mahsulotlar: ${result.matchedCount}`);
    console.log(`   - Yangilangan mahsulotlar: ${result.modifiedCount}`);

    // Tekshirish
    console.log('\n🔍 Tekshirish...');
    const verifyProducts = await Product.find({});
    const allHave500 = verifyProducts.every(p => p.quantity === 500);
    
    if (allHave500) {
      console.log('✅ Barcha mahsulotlarning quantity = 500 tasdiqlandi!');
    } else {
      const notUpdated = verifyProducts.filter(p => p.quantity !== 500);
      console.log(`⚠️ ${notUpdated.length} ta mahsulot yangilanmadi:`);
      notUpdated.forEach(p => {
        console.log(`   - ${p.name}: quantity = ${p.quantity}`);
      });
    }

    console.log('\n✅ Script muvaffaqiyatli yakunlandi!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

// Script ni ishga tushirish
console.log('═══════════════════════════════════════════════════════');
console.log('  MAHSULOTLAR QUANTITY NI YANGILASH SCRIPTI');
console.log('═══════════════════════════════════════════════════════\n');

updateAllProductsQuantity();
