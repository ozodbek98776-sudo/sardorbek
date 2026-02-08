/**
 * NARX TARIXI MODELI
 * Mahsulot narxlarining o'zgarish tarixini saqlaydi
 */

const mongoose = require('mongoose');

const priceChangeSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['cost', 'unit', 'box', 'discount1', 'discount2', 'discount3'],
    required: true
  },
  oldAmount: { type: Number },
  newAmount: { type: Number, required: true },
  oldMinQuantity: { type: Number },
  newMinQuantity: { type: Number },
  oldDiscountPercent: { type: Number },
  newDiscountPercent: { type: Number }
});

const priceHistorySchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', 
    required: true,
    index: true
  },
  productCode: { type: String, required: true }, // Tez qidiruv uchun
  productName: { type: String, required: true }, // Tez ko'rish uchun
  
  // O'zgarish ma'lumotlari
  changeType: {
    type: String,
    enum: ['create', 'update', 'bulk_update', 'migration'],
    required: true
  },
  changes: [priceChangeSchema],
  
  // Kim o'zgartirgan
  changedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  changedByName: { type: String }, // Tez ko'rish uchun
  
  // Qo'shimcha ma'lumotlar
  reason: { type: String }, // O'zgarish sababi
  notes: { type: String }, // Qo'shimcha izohlar
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  
  // Eski va yangi narxlar (to'liq snapshot)
  oldPrices: [{
    type: String,
    amount: Number,
    minQuantity: Number,
    discountPercent: Number,
    isActive: Boolean
  }],
  newPrices: [{
    type: String,
    amount: Number,
    minQuantity: Number,
    discountPercent: Number,
    isActive: Boolean
  }]
}, { 
  timestamps: true 
});

// INDEXLAR
priceHistorySchema.index({ product: 1, createdAt: -1 }); // Mahsulot tarixi
priceHistorySchema.index({ productCode: 1, createdAt: -1 }); // Kod bo'yicha qidiruv
priceHistorySchema.index({ changedBy: 1, createdAt: -1 }); // Foydalanuvchi bo'yicha
priceHistorySchema.index({ changeType: 1, createdAt: -1 }); // O'zgarish turi bo'yicha
priceHistorySchema.index({ createdAt: -1 }); // Vaqt bo'yicha

// METODLAR

// Narx o'zgarishini qayd qilish
priceHistorySchema.statics.logPriceChange = async function(productId, oldPrices, newPrices, changedBy, options = {}) {
  try {
    const Product = mongoose.model('Product');
    const User = mongoose.model('User');
    
    const product = await Product.findById(productId);
    const user = await User.findById(changedBy);
    
    if (!product || !user) {
      throw new Error('Product yoki User topilmadi');
    }

    // O'zgarishlarni aniqlash
    const changes = [];
    const newPricesMap = new Map(newPrices.map(p => [p.type, p]));
    const oldPricesMap = new Map((oldPrices || []).map(p => [p.type, p]));

    // Yangi narxlarni tekshirish
    for (const newPrice of newPrices) {
      const oldPrice = oldPricesMap.get(newPrice.type);
      
      if (!oldPrice) {
        // Yangi narx qo'shildi
        changes.push({
          type: newPrice.type,
          oldAmount: null,
          newAmount: newPrice.amount,
          newMinQuantity: newPrice.minQuantity,
          newDiscountPercent: newPrice.discountPercent
        });
      } else if (
        oldPrice.amount !== newPrice.amount ||
        oldPrice.minQuantity !== newPrice.minQuantity ||
        oldPrice.discountPercent !== newPrice.discountPercent
      ) {
        // Narx o'zgartirildi
        changes.push({
          type: newPrice.type,
          oldAmount: oldPrice.amount,
          newAmount: newPrice.amount,
          oldMinQuantity: oldPrice.minQuantity,
          newMinQuantity: newPrice.minQuantity,
          oldDiscountPercent: oldPrice.discountPercent,
          newDiscountPercent: newPrice.discountPercent
        });
      }
    }

    // O'chirilgan narxlarni tekshirish
    for (const oldPrice of (oldPrices || [])) {
      if (!newPricesMap.has(oldPrice.type)) {
        changes.push({
          type: oldPrice.type,
          oldAmount: oldPrice.amount,
          newAmount: null,
          oldMinQuantity: oldPrice.minQuantity,
          oldDiscountPercent: oldPrice.discountPercent
        });
      }
    }

    // Agar o'zgarish bo'lmasa, qayd qilmaslik
    if (changes.length === 0) {
      return null;
    }

    // Narx tarixini saqlash
    const priceHistory = new this({
      product: productId,
      productCode: product.code,
      productName: product.name,
      changeType: options.changeType || 'update',
      changes: changes,
      changedBy: changedBy,
      changedByName: user.name,
      reason: options.reason,
      notes: options.notes,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      oldPrices: oldPrices || [],
      newPrices: newPrices
    });

    await priceHistory.save();
    return priceHistory;
  } catch (error) {
    console.error('Price history log error:', error);
    throw error;
  }
};

// Mahsulot narx tarixini olish
priceHistorySchema.statics.getProductHistory = async function(productId, limit = 50) {
  return this.find({ product: productId })
    .populate('changedBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Foydalanuvchi faoliyatini olish
priceHistorySchema.statics.getUserActivity = async function(userId, limit = 100) {
  return this.find({ changedBy: userId })
    .populate('product', 'name code')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Narx o'zgarishlari statistikasi
priceHistorySchema.statics.getPriceChangeStats = async function(dateFrom, dateTo) {
  const pipeline = [
    {
      $match: {
        createdAt: {
          $gte: new Date(dateFrom),
          $lte: new Date(dateTo)
        }
      }
    },
    {
      $group: {
        _id: {
          changeType: '$changeType',
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
        },
        count: { $sum: 1 },
        products: { $addToSet: '$product' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        changes: {
          $push: {
            type: '$_id.changeType',
            count: '$count',
            uniqueProducts: { $size: '$products' }
          }
        },
        totalChanges: { $sum: '$count' }
      }
    },
    { $sort: { _id: -1 } }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('PriceHistory', priceHistorySchema);