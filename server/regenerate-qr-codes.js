#!/usr/bin/env node

/**
 * QR Code Regeneration Script
 * Mavjud mahsulotlar uchun QR code yaratish
 * 
 * Usage: node regenerate-qr-codes.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Product = require('./src/models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function regenerateQRCodes() {
  try {
    console.log('🔗 MongoDB ga ulanmoqda...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ MongoDB ga ulandi');

    // QR code bo'lmagan mahsulotlarni topish
    console.log('\n📊 Mahsulotlar tekshirilmoqda...');
    const productsWithoutQR = await Product.find({ 
      $or: [
        { qrCode: { $exists: false } },
        { qrCode: null },
        { qrCode: '' }
      ]
    });

    console.log(`📦 QR code bo'lmagan mahsulotlar: ${productsWithoutQR.length}`);

    if (productsWithoutQR.length === 0) {
      console.log('✓ Barcha mahsulotlarda QR code mavjud');
      await mongoose.connection.close();
      process.exit(0);
    }

    // QR code yaratish
    console.log('\n🔄 QR code yaratilmoqda...\n');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < productsWithoutQR.length; i++) {
      const product = productsWithoutQR[i];
      try {
        const qrData = `${CLIENT_URL}/product/${product._id}`;
        const qrCode = await QRCode.toDataURL(qrData);
        
        product.qrCode = qrCode;
        await product.save();
        
        successCount++;
        console.log(`✓ [${i + 1}/${productsWithoutQR.length}] ${product.name} (${product.code})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ [${i + 1}/${productsWithoutQR.length}] ${product.name}: ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 NATIJA:');
    console.log(`✓ Muvaffaqiyatli: ${successCount}`);
    console.log(`✗ Xatolik: ${errorCount}`);
    console.log('='.repeat(50));

    await mongoose.connection.close();
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    process.exit(1);
  }
}

// Skriptni ishga tushirish
regenerateQRCodes();
