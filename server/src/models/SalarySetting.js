const mongoose = require('mongoose');

const salarySettingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Fixed maosh
  baseSalary: {
    type: Number,
    required: true,
    min: [0, 'Maosh manfiy bo\'lishi mumkin emas']
  },
  
  // Bonus sozlamalari
  bonusEnabled: {
    type: Boolean,
    default: true
  },
  maxBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  minBonus: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Qo'shimcha to'lovlar
  allowances: [{
    type: {
      type: String,
      enum: ['transport', 'meal', 'housing', 'communication', 'other'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    description: String
  }],
  
  // Chegirmalar
  deductions: [{
    type: {
      type: String,
      enum: ['tax', 'insurance', 'loan', 'advance', 'other'],
      required: true
    },
    amount: Number,
    percentage: Number,
    description: String
  }],
  
  // Amal qilish muddati
  effectiveFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  effectiveTo: {
    type: Date
  },
  
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
salarySettingSchema.index({ employee: 1, effectiveFrom: -1 });
salarySettingSchema.index({ employee: 1, isActive: 1 });

// Virtual - jami qo'shimcha to'lovlar
salarySettingSchema.virtual('totalAllowances').get(function() {
  return this.allowances.reduce((sum, allowance) => sum + allowance.amount, 0);
});

// Virtual - jami chegirmalar
salarySettingSchema.virtual('totalDeductions').get(function() {
  return this.deductions.reduce((sum, deduction) => {
    if (deduction.percentage) {
      return sum + (this.baseSalary * deduction.percentage / 100);
    }
    return sum + (deduction.amount || 0);
  }, 0);
});

// Method - joriy faol sozlamani olish
salarySettingSchema.statics.getActiveSetting = async function(employeeId) {
  const now = new Date();
  return this.findOne({
    employee: employeeId,
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [
      { effectiveTo: { $gte: now } },
      { effectiveTo: null }
    ]
  }).sort({ effectiveFrom: -1 });
};

module.exports = mongoose.model('SalarySetting', salarySettingSchema);
