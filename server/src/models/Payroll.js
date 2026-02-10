const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Vaqt davri
  period: {
    type: String,
    required: true,
    index: true  // "2024-01"
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
  
  // Maosh tarkibi
  baseSalary: {
    type: Number,
    required: true,
    default: 0
  },
  totalBonus: {
    type: Number,
    default: 0
  },
  allowances: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  advancePayments: {
    type: Number,
    default: 0
  },
  
  // Jami
  grossSalary: {
    type: Number,
    required: true,
    default: 0
  },
  netSalary: {
    type: Number,
    required: true,
    default: 0
  },
  
  // KPI breakdown
  kpiBreakdown: [{
    kpiTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'KPITemplate'
    },
    kpiName: String,
    kpiCode: String,
    targetValue: Number,
    actualValue: Number,
    achievementRate: Number,
    bonusEarned: Number,
    weight: Number
  }],
  
  // To'lov holati
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled'],
    default: 'pending',
    index: true
  },
  paymentDate: Date,
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card'],
    default: 'cash'
  },
  
  // Izohlar
  notes: String,
  
  // Tasdiqlash
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  
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
payrollSchema.index({ employee: 1, period: 1 }, { unique: true });
payrollSchema.index({ employee: 1, year: 1, month: 1 });
payrollSchema.index({ status: 1, period: 1 });
payrollSchema.index({ period: 1, status: 1 });

// Pre-save hook - grossSalary va netSalary hisoblash
payrollSchema.pre('save', function(next) {
  // Gross Salary = Base + Bonus + Allowances
  this.grossSalary = this.baseSalary + this.totalBonus + this.allowances;
  
  // Net Salary = Gross - Deductions - Advance
  this.netSalary = this.grossSalary - this.deductions - this.advancePayments;
  
  next();
});

// Method - tasdiqlash
payrollSchema.methods.approve = async function(adminId) {
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  return this.save();
};

// Method - to'lash
payrollSchema.methods.markAsPaid = async function(paymentMethod = 'cash') {
  this.status = 'paid';
  this.paymentDate = new Date();
  this.paymentMethod = paymentMethod;
  return this.save();
};

// Method - bekor qilish
payrollSchema.methods.cancel = async function() {
  this.status = 'cancelled';
  return this.save();
};

// Static method - oylik payroll yaratish
payrollSchema.statics.createMonthlyPayroll = async function(employeeId, year, month, createdBy) {
  const period = `${year}-${String(month).padStart(2, '0')}`;
  
  // Mavjudligini tekshirish
  const existing = await this.findOne({ employee: employeeId, period });
  if (existing) {
    throw new Error('Bu oy uchun payroll allaqachon mavjud');
  }
  
  // Salary setting olish
  const SalarySetting = mongoose.model('SalarySetting');
  const salarySetting = await SalarySetting.getActiveSetting(employeeId);
  
  if (!salarySetting) {
    throw new Error('Xodim uchun maosh sozlamalari topilmadi');
  }
  
  // KPI records olish
  const KPIRecord = mongoose.model('KPIRecord');
  const kpiRecords = await KPIRecord.getMonthlyRecords(employeeId, year, month);
  
  // KPI breakdown yaratish
  const kpiBreakdown = kpiRecords.map(record => ({
    kpiTemplate: record.kpiTemplate._id,
    kpiName: record.metadata.kpiName,
    kpiCode: record.metadata.kpiCode,
    targetValue: record.targetValue,
    actualValue: record.actualValue,
    achievementRate: record.achievementRate,
    bonusEarned: record.bonusEarned,
    weight: record.metadata.weight
  }));
  
  // Jami bonus
  const totalBonus = kpiRecords.reduce((sum, record) => sum + record.bonusEarned, 0);
  
  // Payroll yaratish
  const payroll = new this({
    employee: employeeId,
    period,
    year,
    month,
    baseSalary: salarySetting.baseSalary,
    totalBonus: Math.min(totalBonus, salarySetting.maxBonus),
    allowances: salarySetting.totalAllowances,
    deductions: salarySetting.totalDeductions,
    advancePayments: 0, // Keyinroq qo'shiladi
    kpiBreakdown,
    createdBy
  });
  
  return payroll.save();
};

module.exports = mongoose.model('Payroll', payrollSchema);
