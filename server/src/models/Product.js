const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' }, // Qisqacha tavsif
  costPrice: { type: Number, default: 0 }, // Tan narxi
  unitPrice: { type: Number, default: 0 }, // Dona narxi
  boxPrice: { type: Number, default: 0 }, // Karobka narxi
  price: { type: Number, required: true }, // Base price (cost price)
  previousPrice: { type: Number, default: 0 }, // Oldingi narxi
  currentPrice: { type: Number, default: 0 }, // Hozirgi narxi
  quantity: { type: Number, default: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  isMainWarehouse: { type: Boolean, default: false },
  category: { 
    type: String, 
    default: 'Boshqa'
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  images: [{ 
    path: { type: String, required: true }, // Rasm yo'li
    uploadedBy: { type: String, enum: ['admin', 'cashier'], default: 'admin' }, // Kim yuklagan
    uploadedAt: { type: Date, default: Date.now } // Qachon yuklangan
  }], // Array of image objects with metadata
  minStock: { type: Number, default: 50 },

  // Mahsulot o'lchamlari (sm/mm)
  dimensions: {
    width: { type: String, default: '' },   // Eni (sm)
    height: { type: String, default: '' },  // Bo'yi (mm)
    length: { type: String, default: '' }   // Uzunligi (sm)
  },

  // O'lchov birliklari
  unit: {
    type: String,
    enum: ['dona', 'metr', 'rulon', 'karobka', 'gram', 'kg', 'litr'],
    default: 'dona'
  },

  // Rulon/Karobka uchun qo'shimcha ma'lumotlar
  unitConversion: {
    enabled: { type: Boolean, default: false },
    // Masalan: 1 rulon = 30 metr, 1 karobka = 12 dona
    baseUnit: { type: String, enum: ['dona', 'metr', 'gram', 'kg', 'litr'], default: 'dona' },
    conversionRate: { type: Number, default: 1 }, // 1 rulon = X metr
    packageCount: { type: Number, default: 0 }, // Nechta rulon/karobka bor
    totalBaseUnits: { type: Number, default: 0 } // Jami metr/dona
  },

  // Turli narxlar
  prices: {
    perUnit: { type: Number, default: 0 }, // Dona narxi
    perMeter: { type: Number, default: 0 }, // Metr narxi
    perGram: { type: Number, default: 0 }, // Gram narxi
    perKg: { type: Number, default: 0 }, // Kg narxi
    perRoll: { type: Number, default: 0 }, // Rulon narxi
    perBox: { type: Number, default: 0 } // Karobka narxi
  },
  // Wholesale pricing tiers - Foizli chegirmalar
  pricingTiers: {
    tier1: { // 1-dan X gacha
      minQuantity: { type: Number, default: 1 },
      maxQuantity: { type: Number, default: 5 },
      discountPercent: { type: Number, default: 1 } // 1% chegirma
    },
    tier2: { // X dan Y gacha
      minQuantity: { type: Number, default: 6 },
      maxQuantity: { type: Number, default: 20 },
      discountPercent: { type: Number, default: 3 } // 3% chegirma
    },
    tier3: { // Y dan Z gacha
      minQuantity: { type: Number, default: 21 },
      maxQuantity: { type: Number, default: 100 },
      discountPercent: { type: Number, default: 5 } // 5% chegirma
    }
  },
  // Package/batch information
  packages: [{
    packageCount: { type: Number, required: true }, // Nechta qop
    unitsPerPackage: { type: Number, required: true }, // Har qopda nechta
    totalCost: { type: Number, required: true }, // Jami narxi
    costPerUnit: { type: Number, required: true }, // Bir dona narxi
    dateAdded: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Dollar narxlari
  costPriceInDollar: { type: Number, default: 0 }, // Tan narxi dollarda
  dollarRate: { type: Number, default: 12500 }, // Dollar kursi (1 dollar = X so'm)
  
  // QR Code
  qrCode: { type: String, default: null } // QR code data URL yoki path
}, { timestamps: true });

// Miqdorga qarab narx hisoblash method (chegirma bilan)
productSchema.methods.calculatePrice = function (quantity) {
  const basePrice = this.unitPrice || this.price; // Dona narxi
  let discountPercent = 0; // Default chegirma yo'q

  // Pricing tier aniqlash
  const tier1 = this.pricingTiers?.tier1;
  const tier2 = this.pricingTiers?.tier2;
  const tier3 = this.pricingTiers?.tier3;

  if (tier3 && quantity >= tier3.minQuantity) {
    discountPercent = tier3.discountPercent || 5;
  } else if (tier2 && quantity >= tier2.minQuantity) {
    discountPercent = tier2.discountPercent || 3;
  } else if (tier1 && quantity >= tier1.minQuantity) {
    discountPercent = tier1.discountPercent || 1;
  }

  // Narxni hisoblash (chegirma bilan)
  const finalPrice = basePrice * (1 - discountPercent / 100);
  return Math.round(finalPrice); // Yaxlitlash
};

// Pricing tier ma'lumotini olish method
productSchema.methods.getPricingTier = function (quantity) {
  const tier1 = this.pricingTiers?.tier1;
  const tier2 = this.pricingTiers?.tier2;
  const tier3 = this.pricingTiers?.tier3;

  if (tier3 && quantity >= tier3.minQuantity) {
    return {
      tier: 'tier3',
      name: `${tier3.minQuantity}+ dona`,
      discountPercent: tier3.discountPercent || 5,
      minQuantity: tier3.minQuantity,
      maxQuantity: tier3.maxQuantity
    };
  } else if (tier2 && quantity >= tier2.minQuantity) {
    return {
      tier: 'tier2',
      name: `${tier2.minQuantity}-${tier2.maxQuantity} dona`,
      discountPercent: tier2.discountPercent || 3,
      minQuantity: tier2.minQuantity,
      maxQuantity: tier2.maxQuantity
    };
  } else {
    return {
      tier: 'tier1',
      name: `${tier1?.minQuantity || 1}-${tier1?.maxQuantity || 5} dona`,
      discountPercent: tier1?.discountPercent || 1,
      minQuantity: tier1?.minQuantity || 1,
      maxQuantity: tier1?.maxQuantity || 5
    };
  }
};

// Performance indexes for faster queries
// Note: code index avtomatik yaratiladi (unique: true)
productSchema.index({ name: 1 });
productSchema.index({ warehouse: 1, isMainWarehouse: 1 });
productSchema.index({ isMainWarehouse: 1, code: 1 }); // Compound index - juda tez!
productSchema.index({ category: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ name: 'text', code: 'text' }); // Text search index
productSchema.index({ quantity: 1 }); // Quantity index - statistika uchun
productSchema.index({ price: 1, quantity: 1 }); // Compound index - totalValue hisoblash uchun

module.exports = mongoose.model('Product', productSchema);
