const mongoose = require('mongoose');

const kpiTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // KPI turi
  type: {
    type: String,
    required: true,
    enum: [
      'SALES_AMOUNT',      // Savdo hajmi
      'RECEIPT_COUNT',     // Cheklar soni
      'AVERAGE_CHECK',     // O'rtacha chek
      'ATTENDANCE',        // Davomat
      'ERROR_COUNT',       // Xatolar soni
      'CUSTOMER_RATING',   // Mijoz baholari
      'CUSTOM'             // Maxsus
    ],
    index: true
  },
  
  // Hisoblash usuli
  calculationMethod: {
    type: String,
    required: true,
    enum: [
      'PERCENTAGE',        // Foiz (0-100%)
      'TARGET_BASED',      // Maqsadga erishish
      'RANGE_BASED',       // Diapazon
      'INVERSE'            // Teskari (kam = yaxshi)
    ]
  },
  
  // Parametrlar
  unit: {
    type: String,
    default: 'dona'       // so'm, dona, %, kun
  },
  targetValue: {
    type: Number,
    default: 0
  },
  minValue: {
    type: Number,
    default: 0
  },
  maxValue: {
    type: Number
  },
  
  // Og'irlik (bonus hisoblashda)
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  
  // Bonus hisoblash
  bonusPerPoint: {
    type: Number,
    default: 0,
    min: 0
  },
  maxBonusFromThis: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Qo'llaniladigan rollar
  applicableRoles: [{
    type: String,
    enum: ['cashier', 'helper', 'admin']
  }],
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Kim yaratdi
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexlar
kpiTemplateSchema.index({ code: 1, isActive: 1 });
kpiTemplateSchema.index({ type: 1, isActive: 1 });
kpiTemplateSchema.index({ applicableRoles: 1, isActive: 1 });

// Method - KPI hisoblash
kpiTemplateSchema.methods.calculateAchievement = function(actualValue) {
  let achievementRate = 0;
  
  switch (this.calculationMethod) {
    case 'PERCENTAGE':
      achievementRate = Math.min(100, (actualValue / this.targetValue) * 100);
      break;
      
    case 'TARGET_BASED':
      achievementRate = (actualValue / this.targetValue) * 100;
      break;
      
    case 'RANGE_BASED':
      if (actualValue >= this.maxValue) {
        achievementRate = 100;
      } else if (actualValue <= this.minValue) {
        achievementRate = 0;
      } else {
        achievementRate = ((actualValue - this.minValue) / (this.maxValue - this.minValue)) * 100;
      }
      break;
      
    case 'INVERSE':
      // Kam = yaxshi (masalan, xatolar soni)
      if (actualValue <= this.minValue) {
        achievementRate = 100;
      } else if (actualValue >= this.maxValue) {
        achievementRate = 0;
      } else {
        achievementRate = 100 - (((actualValue - this.minValue) / (this.maxValue - this.minValue)) * 100);
      }
      break;
  }
  
  return Math.max(0, Math.min(100, achievementRate));
};

// Method - Bonus hisoblash
kpiTemplateSchema.methods.calculateBonus = function(actualValue) {
  const achievementRate = this.calculateAchievement(actualValue);
  let bonus = (achievementRate / 100) * this.maxBonusFromThis;
  
  return Math.min(bonus, this.maxBonusFromThis);
};

module.exports = mongoose.model('KPITemplate', kpiTemplateSchema);
