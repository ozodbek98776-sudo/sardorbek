const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  costPrice: { type: Number, default: 0 },
  price: { type: Number, required: true }, // Base price (cost price)
  quantity: { type: Number, default: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  isMainWarehouse: { type: Boolean, default: false },
  category: String,
  images: [{ type: String }], // Array of image paths
  minStock: { type: Number, default: 50 },
  
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
  // Wholesale pricing tiers
  pricingTiers: {
    tier1: { // 1-9 dona
      minQuantity: { type: Number, default: 1 },
      maxQuantity: { type: Number, default: 9 },
      markupPercent: { type: Number, default: 15 } // 15% qo'shimcha
    },
    tier2: { // 10-99 dona
      minQuantity: { type: Number, default: 10 },
      maxQuantity: { type: Number, default: 99 },
      markupPercent: { type: Number, default: 13 } // 13% qo'shimcha
    },
    tier3: { // 100+ dona
      minQuantity: { type: Number, default: 100 },
      maxQuantity: { type: Number, default: null }, // cheksiz
      markupPercent: { type: Number, default: 11 } // 11% qo'shimcha
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
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Miqdorga qarab narx hisoblash method
productSchema.methods.calculatePrice = function(quantity) {
  const basePrice = this.price; // Base price (cost price)
  let markupPercent = 15; // Default 15%
  
  // Pricing tier aniqlash
  if (quantity >= 100) {
    markupPercent = this.pricingTiers?.tier3?.markupPercent || 11;
  } else if (quantity >= 10) {
    markupPercent = this.pricingTiers?.tier2?.markupPercent || 13;
  } else {
    markupPercent = this.pricingTiers?.tier1?.markupPercent || 15;
  }
  
  // Narxni hisoblash
  const finalPrice = basePrice * (1 + markupPercent / 100);
  return Math.round(finalPrice); // Yaxlitlash
};

// Pricing tier ma'lumotini olish method
productSchema.methods.getPricingTier = function(quantity) {
  if (quantity >= 100) {
    return {
      tier: 'tier3',
      name: '100+ dona',
      markupPercent: this.pricingTiers?.tier3?.markupPercent || 11,
      minQuantity: 100,
      maxQuantity: null
    };
  } else if (quantity >= 10) {
    return {
      tier: 'tier2', 
      name: '10-99 dona',
      markupPercent: this.pricingTiers?.tier2?.markupPercent || 13,
      minQuantity: 10,
      maxQuantity: 99
    };
  } else {
    return {
      tier: 'tier1',
      name: '1-9 dona', 
      markupPercent: this.pricingTiers?.tier1?.markupPercent || 15,
      minQuantity: 1,
      maxQuantity: 9
    };
  }
};

module.exports = mongoose.model('Product', productSchema);
