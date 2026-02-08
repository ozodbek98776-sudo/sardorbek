const mongoose = require('mongoose');

// Narx turlari uchun enum
const PRICE_TYPES = {
  COST: 'cost',           // Tan narxi
  UNIT: 'unit',           // Dona/kg/metr narxi
  BOX: 'box',             // Karobka narxi
  DISCOUNT_1: 'discount1', // 1-chi skidka
  DISCOUNT_2: 'discount2', // 2-chi skidka  
  DISCOUNT_3: 'discount3'  // 3-chi skidka
};

// O'lchov birliklari
const UNIT_TYPES = {
  PIECE: 'dona',     // Dona
  KILOGRAM: 'kg',    // Kilogram
  METER: 'metr',     // Metr
  LITER: 'litr',     // Litr
  BOX: 'karobka'     // Karobka
};

// Narx sxemasi - har bir narx turi uchun
const priceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(PRICE_TYPES),
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // Skidka narxlari uchun minimal miqdor
  minQuantity: {
    type: Number,
    default: 1,
    min: 1
  },
  // Skidka foizi (faqat skidka narxlari uchun)
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const productSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  name: { 
    type: String, 
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: { 
    type: String, 
    default: '',
    maxlength: 1000
  },
  
  // ASOSIY NARXLAR - Sizning talabingiz bo'yicha
  prices: [priceSchema],
  
  // Hozirgi miqdor
  quantity: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // O'lchov birligi
  unit: {
    type: String,
    enum: Object.values(UNIT_TYPES),
    default: UNIT_TYPES.PIECE,
    required: true
  },
  
  // Karobka ma'lumotlari (agar karobkada sotilsa)
  boxInfo: {
    unitsPerBox: {
      type: Number,
      default: 1,
      min: 1
    },
    boxWeight: {
      type: Number,
      default: 0
    }
  },
  
  warehouse: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Warehouse' 
  },
  isMainWarehouse: { 
    type: Boolean, 
    default: false 
  },
  category: { 
    type: String, 
    default: ''
  },
  subcategory: {
    type: String,
    default: ''
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  images: [{ 
    path: { type: String, required: true },
    uploadedBy: { type: String, enum: ['admin', 'cashier'], default: 'admin' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  minStock: { 
    type: Number, 
    default: 50,
    min: 0
  },

  // Mahsulot o'lchamlari
  dimensions: {
    width: { type: Number, default: 0 },   // Eni (sm)
    height: { type: Number, default: 0 },  // Bo'yi (sm)
    length: { type: Number, default: 0 }   // Uzunligi (sm)
  },
  
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Dollar kursi (agar kerak bo'lsa)
  dollarRate: { 
    type: Number, 
    default: 12500 
  },
  
  // QR Code
  qrCode: { 
    type: String, 
    default: null 
  }
}, { 
  timestamps: true 
});

// METODLAR - Sizning talabingiz bo'yicha

// 1. Tan narxini olish
productSchema.methods.getCostPrice = function() {
  const costPrice = this.prices.find(p => p.type === PRICE_TYPES.COST && p.isActive);
  return costPrice ? costPrice.amount : 0;
};

// 2. Dona/kg/metr narxini olish
productSchema.methods.getUnitPrice = function() {
  const unitPrice = this.prices.find(p => p.type === PRICE_TYPES.UNIT && p.isActive);
  return unitPrice ? unitPrice.amount : 0;
};

// 3. Karobka narxini olish
productSchema.methods.getBoxPrice = function() {
  const boxPrice = this.prices.find(p => p.type === PRICE_TYPES.BOX && p.isActive);
  return boxPrice ? boxPrice.amount : 0;
};

// 4. Skidka narxlarini olish
productSchema.methods.getDiscountPrices = function() {
  return this.prices.filter(p => 
    [PRICE_TYPES.DISCOUNT_1, PRICE_TYPES.DISCOUNT_2, PRICE_TYPES.DISCOUNT_3].includes(p.type) && 
    p.isActive
  ).sort((a, b) => a.minQuantity - b.minQuantity);
};

// 5. Miqdorga qarab eng yaxshi narxni hisoblash
productSchema.methods.calculateBestPrice = function(quantity, saleType = 'unit') {
  let basePrice = 0;
  let appliedDiscount = null;

  // Sotish turiga qarab asosiy narxni aniqlash
  switch(saleType) {
    case 'unit':
      basePrice = this.getUnitPrice();
      break;
    case 'box':
      basePrice = this.getBoxPrice();
      // Agar karobka narxi yo'q bo'lsa, dona narxini karobka miqdoriga ko'paytirish
      if (!basePrice && this.boxInfo.unitsPerBox > 0) {
        basePrice = this.getUnitPrice() * this.boxInfo.unitsPerBox;
      }
      break;
    default:
      basePrice = this.getUnitPrice();
  }

  // Skidka narxlarini tekshirish
  const discountPrices = this.getDiscountPrices();
  for (const discount of discountPrices) {
    if (quantity >= discount.minQuantity) {
      const discountedPrice = basePrice * (1 - discount.discountPercent / 100);
      if (discountedPrice < basePrice) {
        basePrice = discountedPrice;
        appliedDiscount = {
          type: discount.type,
          percent: discount.discountPercent,
          minQuantity: discount.minQuantity
        };
      }
    }
  }

  return {
    price: Math.round(basePrice),
    originalPrice: saleType === 'unit' ? this.getUnitPrice() : this.getBoxPrice(),
    appliedDiscount,
    saleType,
    unit: this.unit
  };
};

// 6. Barcha narxlarni olish (admin panel uchun)
productSchema.methods.getAllPrices = function() {
  return {
    costPrice: this.getCostPrice(),
    unitPrice: this.getUnitPrice(),
    boxPrice: this.getBoxPrice(),
    discountPrices: this.getDiscountPrices(),
    unit: this.unit,
    boxInfo: this.boxInfo
  };
};

// 7. Narx qo'shish/yangilash metodlari
productSchema.methods.updatePrice = function(priceType, amount, options = {}) {
  const existingPriceIndex = this.prices.findIndex(p => p.type === priceType);
  
  const priceData = {
    type: priceType,
    amount: amount,
    minQuantity: options.minQuantity || 1,
    discountPercent: options.discountPercent || 0,
    isActive: options.isActive !== undefined ? options.isActive : true
  };

  if (existingPriceIndex >= 0) {
    // Mavjud narxni yangilash
    this.prices[existingPriceIndex] = priceData;
  } else {
    // Yangi narx qo'shish
    this.prices.push(priceData);
  }
};

// 8. Karobka ma'lumotlarini yangilash
productSchema.methods.updateBoxInfo = function(unitsPerBox, boxWeight = 0) {
  this.boxInfo = {
    unitsPerBox: unitsPerBox,
    boxWeight: boxWeight
  };
};

// STATIC METODLAR

// Narx turlari ro'yxatini olish
productSchema.statics.getPriceTypes = function() {
  return PRICE_TYPES;
};

// O'lchov birliklari ro'yxatini olish
productSchema.statics.getUnitTypes = function() {
  return UNIT_TYPES;
};

// Performance indexes
productSchema.index({ code: 1 }, { unique: true });
productSchema.index({ name: 1 });
productSchema.index({ warehouse: 1, isMainWarehouse: 1 });
productSchema.index({ isMainWarehouse: 1, code: 1 });
productSchema.index({ category: 1 });
productSchema.index({ subcategory: 1 });
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', code: 'text' });
productSchema.index({ quantity: 1 });
productSchema.index({ 'prices.type': 1, 'prices.isActive': 1 });
productSchema.index({ unit: 1 });

module.exports = mongoose.model('Product', productSchema);
