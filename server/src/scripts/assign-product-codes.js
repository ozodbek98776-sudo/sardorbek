/**
 * Migration: mavjud mahsulotlarga 1 dan boshlab auto-increment kod berish
 * Ishlatish: cd server && node src/scripts/assign-product-codes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const Product = require('../models/Product');
  const Counter = mongoose.model('Counter');

  // Kodsiz mahsulotlarni createdAt bo'yicha tartiblash
  const products = await Product.find({ code: { $in: [null, undefined] } })
    .sort({ createdAt: 1 });

  if (products.length === 0) {
    console.log('Barcha mahsulotlarda kod bor.');
    process.exit(0);
  }

  // Hozirgi eng katta kodni topish
  const maxProduct = await Product.findOne({ code: { $ne: null } })
    .sort({ code: -1 });
  let nextCode = maxProduct ? maxProduct.code + 1 : 1;

  console.log(`${products.length} ta mahsulotga kod beriladi (${nextCode} dan boshlab)...`);

  for (const product of products) {
    product.code = nextCode++;
    await product.save({ validateBeforeSave: false });
  }

  // Counter ni yangilash
  await Counter.findByIdAndUpdate(
    'productCode',
    { seq: nextCode - 1 },
    { upsert: true }
  );

  console.log(`Tayyor! ${products.length} ta mahsulotga kod berildi (1 — ${nextCode - 1})`);
  process.exit(0);
}

run().catch(err => {
  console.error('Xato:', err);
  process.exit(1);
});
