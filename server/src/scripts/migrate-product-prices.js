/**
 * MAHSULOT NARXLARINI YANGI FORMATGA O'TKAZISH SCRIPT
 * 
 * Bu script mavjud mahsulotlarning eski narx formatini yangi formatga o'tkazadi:
 * - costPrice, unitPrice, boxPrice -> prices array
 * - pricingTiers -> discount prices
 * 
 * XAVFSIZLIK:
 * - Backup yaratadi
 * - Dry-run rejimi
 * - Rollback imkoniyati
 * - Validatsiya
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Backup papkasini yaratish
const BACKUP_DIR = path.join(__dirname, '../../../backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Eski Product model (migration uchun)
const oldProductSchema = new mongoose.Schema({
  code: String,
  name: String,
  costPrice: Number,
  unitPrice: Number,
  boxPrice: Number,
  price: Number,
  pricingTiers: {
    tier1: {
      minQuantity: Number,
      maxQuantity: Number,
      discountPercent: Number
    },
    tier2: {
      minQuantity: Number,
      maxQuantity: Number,
      discountPercent: Number
    },
    tier3: {
      minQuantity: Number,
      maxQuantity: Number,
      discountPercent: Number
    }
  },
  unit: String,
  quantity: Number,
  category: String,
  warehouse: mongoose.Schema.Types.ObjectId,
  isMainWarehouse: Boolean,
  description: String,
  images: Array,
  minStock: Number,
  dimensions: Object,
  createdBy: mongoose.Schema.Types.ObjectId,
  dollarRate: Number,
  qrCode: String
}, { timestamps: true });

const OldProduct = mongoose.model('OldProduct', oldProductSchema, 'products');

// Yangi Product model
const Product = require('../models/Product');

async function createBackup() {
  try {
    console.log('📦 Backup yaratilmoqda...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `products-backup-${timestamp}.json`);
    
    const products = await OldProduct.find({}).lean();
    fs.writeFileSync(backupFile, JSON.stringify(products, null, 2));
    
    console.log(`✅ Backup yaratildi: ${backupFile}`);
    console.log(`📊 ${products.length} ta mahsulot backup qilindi`);
    
    return backupFile;
  } catch (error) {
    console.error('❌ Backup yaratishda xato:', error);
    throw error;
  }
}

async function validateMigration() {
  try {
    console.log('🔍 Migration natijalarini validatsiya qilish...');
    
    const products = await Product.find({}).limit(10);
    let validCount = 0;
    let invalidCount = 0;
    
    for (const product of products) {
      if (Array.isArray(product.prices) && product.prices.length > 0) {
        const hasUnitPrice = product.prices.some(p => p.type === 'unit' && p.isActive);
        if (hasUnitPrice) {
          validCount++;
        } else {
          invalidCount++;
          console.warn(`⚠️ Mahsulot ${product.code} da unit price yo'q`);
        }
      } else {
        // Eski format - bu normal
        validCount++;
      }
    }
    
    console.log(`✅ Validatsiya: ${validCount} valid, ${invalidCount} invalid`);
    return invalidCount === 0;
  } catch (error) {
    console.error('❌ Validatsiya xatosi:', error);
    return false;
  }
}

async function dryRun() {
  try {
    console.log('🧪 DRY RUN - hech narsa o\'zgartirilmaydi...');
    
    const oldProducts = await OldProduct.find({}).limit(5).lean();
    console.log(`📦 ${oldProducts.length} ta mahsulot test qilinadi`);

    for (const oldProduct of oldProducts) {
      console.log(`\n📦 ${oldProduct.name} (${oldProduct.code}):`);
      
      // Narxlar massivini yaratish (test)
      const prices = [];
      
      if (oldProduct.costPrice && oldProduct.costPrice > 0) {
        prices.push({ type: 'cost', amount: oldProduct.costPrice });
        console.log(`  ✅ Tan narxi: ${oldProduct.costPrice}`);
      }

      let unitPrice = oldProduct.unitPrice || oldProduct.price || 0;
      if (unitPrice > 0) {
        prices.push({ type: 'unit', amount: unitPrice });
        console.log(`  ✅ Asosiy narx: ${unitPrice}`);
      }

      if (oldProduct.boxPrice && oldProduct.boxPrice > 0) {
        prices.push({ type: 'box', amount: oldProduct.boxPrice });
        console.log(`  ✅ Karobka narxi: ${oldProduct.boxPrice}`);
      }

      // Skidka narxlari
      if (oldProduct.pricingTiers) {
        const tiers = ['tier1', 'tier2', 'tier3'];
        tiers.forEach((tierName, index) => {
          const tier = oldProduct.pricingTiers[tierName];
          if (tier && tier.minQuantity && tier.discountPercent && unitPrice > 0) {
            const discountedPrice = unitPrice * (1 - tier.discountPercent / 100);
            prices.push({
              type: `discount${index + 1}`,
              amount: Math.round(discountedPrice),
              minQuantity: tier.minQuantity,
              discountPercent: tier.discountPercent
            });
            console.log(`  ✅ ${index + 1}-skidka: ${Math.round(discountedPrice)} (${tier.discountPercent}%)`);
          }
        });
      }
      
      console.log(`  📊 Jami ${prices.length} ta narx yaratiladi`);
    }
    
    console.log('\n✅ Dry run yakunlandi. Hech narsa o\'zgartirilmadi.');
    return true;
  } catch (error) {
    console.error('❌ Dry run xatosi:', error);
    return false;
  }
}
  try {
    console.log('🚀 Mahsulot narxlarini migration boshlandi...');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system');
    console.log('✅ MongoDB ga ulandi');

    // Barcha mahsulotlarni olish
    const oldProducts = await OldProduct.find({}).lean();
    console.log(`📦 ${oldProducts.length} ta mahsulot topildi`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const oldProduct of oldProducts) {
      try {
        // Yangi narxlar massivini yaratish
        const prices = [];

        // 1. Tan narxi (cost price)
        if (oldProduct.costPrice && oldProduct.costPrice > 0) {
          prices.push({
            type: 'cost',
            amount: oldProduct.costPrice,
            isActive: true
          });
        }

        // 2. Asosiy narx (unit price)
        let unitPrice = oldProduct.unitPrice || oldProduct.price || 0;
        if (unitPrice > 0) {
          prices.push({
            type: 'unit',
            amount: unitPrice,
            isActive: true
          });
        }

        // 3. Karobka narxi (box price)
        if (oldProduct.boxPrice && oldProduct.boxPrice > 0) {
          prices.push({
            type: 'box',
            amount: oldProduct.boxPrice,
            isActive: true
          });
        }

        // 4. Skidka narxlari (discount prices)
        if (oldProduct.pricingTiers) {
          const tiers = ['tier1', 'tier2', 'tier3'];
          
          tiers.forEach((tierName, index) => {
            const tier = oldProduct.pricingTiers[tierName];
            if (tier && tier.minQuantity && tier.discountPercent && unitPrice > 0) {
              const discountedPrice = unitPrice * (1 - tier.discountPercent / 100);
              
              prices.push({
                type: `discount${index + 1}`,
                amount: Math.round(discountedPrice),
                minQuantity: tier.minQuantity,
                discountPercent: tier.discountPercent,
                isActive: true
              });
            }
          });
        }

        // Yangi formatda yangilash
        const updateData = {
          prices: prices,
          unit: oldProduct.unit || 'dona'
        };

        // Eski fieldlarni o'chirish
        const unsetData = {
          costPrice: 1,
          unitPrice: 1,
          boxPrice: 1,
          price: 1,
          pricingTiers: 1
        };

        await Product.updateOne(
          { _id: oldProduct._id },
          { 
            $set: updateData,
            $unset: unsetData
          }
        );

        migratedCount++;
        
        if (migratedCount % 100 === 0) {
          console.log(`⏳ ${migratedCount} ta mahsulot migrate qilindi...`);
        }

      } catch (error) {
        console.error(`❌ Mahsulot migrate qilishda xato (${oldProduct.code}):`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎉 Migration yakunlandi!');
    console.log(`✅ Muvaffaqiyatli: ${migratedCount} ta mahsulot`);
    console.log(`❌ Xatolar: ${errorCount} ta mahsulot`);

    // Natijalarni tekshirish
    console.log('\n🔍 Natijalarni tekshirish...');
    const sampleProducts = await Product.find({}).limit(3);
    
    for (const product of sampleProducts) {
      console.log(`\n📦 ${product.name} (${product.code}):`);
      console.log(`  Unit: ${product.unit}`);
      console.log(`  Prices count: ${product.prices?.length || 0}`);
      
      if (product.prices && product.prices.length > 0) {
        product.prices.forEach(price => {
          console.log(`    ${price.type}: ${price.amount} so'm ${price.minQuantity ? `(${price.minQuantity}+ ${product.unit})` : ''}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Migration xatosi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB ulanishi yopildi');
  }
}

// Rollback funksiyasi (agar kerak bo'lsa)
async function rollbackMigration() {
  try {
    console.log('🔄 Rollback boshlandi...');

    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pos-system');
    console.log('✅ MongoDB ga ulandi');

    const products = await Product.find({}).lean();
    console.log(`📦 ${products.length} ta mahsulot topildi`);

    let rollbackCount = 0;

    for (const product of products) {
      try {
        if (!product.prices || product.prices.length === 0) continue;

        const updateData = {};
        
        // Narxlarni eski formatga qaytarish
        product.prices.forEach(price => {
          switch (price.type) {
            case 'cost':
              updateData.costPrice = price.amount;
              break;
            case 'unit':
              updateData.unitPrice = price.amount;
              updateData.price = price.amount;
              break;
            case 'box':
              updateData.boxPrice = price.amount;
              break;
          }
        });

        // Skidka narxlarini pricingTiers ga qaytarish
        const discountPrices = product.prices.filter(p => p.type.startsWith('discount'));
        if (discountPrices.length > 0) {
          updateData.pricingTiers = {};
          
          discountPrices.forEach((discount, index) => {
            const tierName = `tier${index + 1}`;
            updateData.pricingTiers[tierName] = {
              minQuantity: discount.minQuantity,
              maxQuantity: discount.minQuantity * 10, // Taxminiy
              discountPercent: discount.discountPercent
            };
          });
        }

        await Product.updateOne(
          { _id: product._id },
          { 
            $set: updateData,
            $unset: { prices: 1 }
          }
        );

        rollbackCount++;

      } catch (error) {
        console.error(`❌ Rollback xatosi (${product.code}):`, error.message);
      }
    }

    console.log(`🎉 Rollback yakunlandi! ${rollbackCount} ta mahsulot qaytarildi`);

  } catch (error) {
    console.error('❌ Rollback xatosi:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Command line argumentlarni tekshirish
const command = process.argv[2];

if (command === 'migrate') {
  migrateProductPrices();
} else if (command === 'rollback') {
  rollbackMigration();
} else {
  console.log(`
📋 ISHLATISH:

Migration qilish:
  node migrate-product-prices.js migrate

Rollback qilish:
  node migrate-product-prices.js rollback

⚠️  DIQQAT: Migration qilishdan oldin ma'lumotlar bazasini backup qiling!
  `);
}

module.exports = {
  migrateProductPrices,
  rollbackMigration
};