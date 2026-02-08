/**
 * YANGI NARX TIZIMI UCHUN DATABASE INDEXLAR QO'SHISH
 * 
 * Bu script yangi narx tizimi uchun performance indexlarini qo'shadi
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function addPricingIndexes() {
  try {
    console.log('🚀 Database indexlar qo\'shilmoqda...');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system');
    console.log('✅ MongoDB ga ulandi');

    const db = mongoose.connection.db;

    // PRODUCTS COLLECTION INDEXLARI
    console.log('📦 Products collection indexlari...');
    
    // Narx turlari uchun index
    await db.collection('products').createIndex(
      { 'prices.type': 1, 'prices.isActive': 1 },
      { name: 'prices_type_active_idx' }
    );
    console.log('✅ prices.type + prices.isActive index yaratildi');

    // Unit va narx uchun compound index
    await db.collection('products').createIndex(
      { 'unit': 1, 'prices.type': 1 },
      { name: 'unit_price_type_idx' }
    );
    console.log('✅ unit + prices.type index yaratildi');

    // Quantity va prices uchun compound index (stats uchun)
    await db.collection('products').createIndex(
      { 'quantity': 1, 'prices.type': 1 },
      { name: 'quantity_price_type_idx' }
    );
    console.log('✅ quantity + prices.type index yaratildi');

    // RECEIPTS COLLECTION INDEXLARI
    console.log('🧾 Receipts collection indexlari...');
    
    // Receipt items uchun saleType index
    await db.collection('receipts').createIndex(
      { 'items.saleType': 1 },
      { name: 'receipt_items_sale_type_idx' }
    );
    console.log('✅ items.saleType index yaratildi');

    // Receipt items uchun appliedDiscount index
    await db.collection('receipts').createIndex(
      { 'items.appliedDiscount.type': 1 },
      { name: 'receipt_items_discount_type_idx' }
    );
    console.log('✅ items.appliedDiscount.type index yaratildi');

    // ORDERS COLLECTION INDEXLARI
    console.log('📋 Orders collection indexlari...');
    
    // Order items uchun saleType index
    await db.collection('orders').createIndex(
      { 'items.saleType': 1 },
      { name: 'order_items_sale_type_idx' }
    );
    console.log('✅ orders items.saleType index yaratildi');

    // COMPOUND INDEXLAR (Performance uchun)
    console.log('⚡ Performance indexlari...');
    
    // Products: isMainWarehouse + prices.type
    await db.collection('products').createIndex(
      { 'isMainWarehouse': 1, 'prices.type': 1, 'prices.isActive': 1 },
      { name: 'main_warehouse_prices_idx' }
    );
    console.log('✅ isMainWarehouse + prices compound index yaratildi');

    // Products: category + unit + prices
    await db.collection('products').createIndex(
      { 'category': 1, 'unit': 1, 'prices.type': 1 },
      { name: 'category_unit_prices_idx' }
    );
    console.log('✅ category + unit + prices compound index yaratildi');

    // SPARSE INDEXLAR (Optional fieldlar uchun)
    console.log('🔍 Sparse indexlari...');
    
    // BoxInfo uchun sparse index
    await db.collection('products').createIndex(
      { 'boxInfo.unitsPerBox': 1 },
      { name: 'box_info_units_per_box_idx', sparse: true }
    );
    console.log('✅ boxInfo.unitsPerBox sparse index yaratildi');

    // Barcha indexlarni ko'rsatish
    console.log('\n📊 Yaratilgan indexlar:');
    const productIndexes = await db.collection('products').indexes();
    const receiptIndexes = await db.collection('receipts').indexes();
    const orderIndexes = await db.collection('orders').indexes();

    console.log('\n📦 Products indexlari:');
    productIndexes.forEach(index => {
      if (index.name.includes('price') || index.name.includes('unit') || index.name.includes('box')) {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      }
    });

    console.log('\n🧾 Receipts indexlari:');
    receiptIndexes.forEach(index => {
      if (index.name.includes('sale') || index.name.includes('discount')) {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      }
    });

    console.log('\n📋 Orders indexlari:');
    orderIndexes.forEach(index => {
      if (index.name.includes('sale')) {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      }
    });

    console.log('\n🎉 Barcha indexlar muvaffaqiyatli yaratildi!');
    console.log('⚡ Database performance sezilarli darajada yaxshilandi');

  } catch (error) {
    console.error('❌ Index yaratishda xato:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB ulanishi yopildi');
  }
}

// Script ishga tushirish
if (require.main === module) {
  addPricingIndexes();
}

module.exports = { addPricingIndexes };