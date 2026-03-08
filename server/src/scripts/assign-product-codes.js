/**
 * Migration: mavjud mahsulotlarga 1 dan boshlab auto-increment kod berish (bulk)
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
  const products = await Product.find(
    { $or: [{ code: null }, { code: { $exists: false } }] },
    { _id: 1 }
  ).sort({ createdAt: 1 }).lean();

  if (products.length === 0) {
    console.log('Barcha mahsulotlarda kod bor.');
    process.exit(0);
  }

  // Hozirgi eng katta kodni topish
  const maxProduct = await Product.findOne({ code: { $ne: null } })
    .sort({ code: -1 }).lean();
  let nextCode = maxProduct ? maxProduct.code + 1 : 1;

  console.log(`${products.length} ta mahsulotga kod beriladi (${nextCode} dan boshlab)...`);

  // bulkWrite bilan tez yangilash
  const ops = products.map((p, i) => ({
    updateOne: {
      filter: { _id: p._id },
      update: { $set: { code: nextCode + i } }
    }
  }));

  const result = await Product.bulkWrite(ops);
  const lastCode = nextCode + products.length - 1;

  // Counter ni yangilash
  await Counter.findByIdAndUpdate(
    'productCode',
    { seq: lastCode },
    { upsert: true }
  );

  console.log(`Tayyor! ${result.modifiedCount} ta mahsulotga kod berildi (${nextCode} — ${lastCode})`);
  process.exit(0);
}

run().catch(err => {
  console.error('Xato:', err);
  process.exit(1);
});
