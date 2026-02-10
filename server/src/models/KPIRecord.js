const mongoose = require('mongoose');

const kpiRecordSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  kpiTemplate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KPITemplate',
    required: true,
    index: true
  },
  
  // Vaqt davri
  period: {
    type: String,
    required: true,
    index: true  // "2024-01" format
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  
  // Natijalar
  targetValue: {
    type: Number,
    required: true,
    default: 0
  },
  actualValue: {
    type: Number,
    required: true,
    default: 0
  },
  achievementRate: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Bonus
  bonusEarned: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Hisoblash ma'lumotlari
  calculatedAt: {
    type: Date,
    default: Date.now
  },
  calculatedBy: {
    type: String,
    default: 'auto'  // 'auto' yoki admin ID
  },
  
  // Izohlar
  notes: {
    type: String,
    trim: true
  },
  
  // Metadata
  metadata: {
    kpiName: String,
    kpiCode: String,
    kpiType: String,
    weight: Number
  }
}, {
  timestamps: true
});

// Indexlar
kpiRecordSchema.index({ employee: 1, period: 1 });
kpiRecordSchema.index({ employee: 1, year: 1, month: 1 });
kpiRecordSchema.index({ kpiTemplate: 1, period: 1 });
kpiRecordSchema.index({ period: 1, employee: 1, kpiTemplate: 1 }, { unique: true });

// Static method - oylik KPI larni olish
kpiRecordSchema.statics.getMonthlyRecords = async function(employeeId, year, month) {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  return this.find({
    employee: employeeId,
    period
  }).populate('kpiTemplate');
};

// Static method - oylik jami bonusni hisoblash
kpiRecordSchema.statics.calculateMonthlyBonus = async function(employeeId, year, month) {
  const records = await this.getMonthlyRecords(employeeId, year, month);
  return records.reduce((sum, record) => sum + record.bonusEarned, 0);
};

// Method - KPI ni qayta hisoblash
kpiRecordSchema.methods.recalculate = async function() {
  const kpiTemplate = await mongoose.model('KPITemplate').findById(this.kpiTemplate);
  
  if (kpiTemplate) {
    this.achievementRate = kpiTemplate.calculateAchievement(this.actualValue);
    this.bonusEarned = kpiTemplate.calculateBonus(this.actualValue);
    this.calculatedAt = new Date();
    
    return this.save();
  }
  
  throw new Error('KPI Template topilmadi');
};

module.exports = mongoose.model('KPIRecord', kpiRecordSchema);
