const mongoose = require('mongoose');

const advancePaymentSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  amount: {
    type: Number,
    required: true,
    min: [0, 'Summa manfiy bo\'lishi mumkin emas']
  },
  reason: {
    type: String,
    trim: true
  },
  
  // Qaytarish
  deductFromSalary: {
    type: Boolean,
    default: true
  },
  deductionPeriod: {
    type: String  // "2024-01"
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'deducted'],
    default: 'pending',
    index: true
  },
  
  // Tasdiqlash
  requestedAt: {
    type: Date,
    default: Date.now
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectedAt: Date,
  rejectionReason: String,
  
  // Chegirish
  deductedAt: Date,
  deductedFromPayroll: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payroll'
  },
  
  notes: String
}, {
  timestamps: true
});

// Indexlar
advancePaymentSchema.index({ employee: 1, status: 1 });
advancePaymentSchema.index({ status: 1, requestedAt: -1 });
advancePaymentSchema.index({ deductionPeriod: 1, status: 1 });

// Method - tasdiqlash
advancePaymentSchema.methods.approve = async function(adminId, deductionPeriod) {
  this.status = 'approved';
  this.approvedBy = adminId;
  this.approvedAt = new Date();
  this.deductionPeriod = deductionPeriod;
  return this.save();
};

// Method - rad etish
advancePaymentSchema.methods.reject = async function(adminId, reason) {
  this.status = 'rejected';
  this.approvedBy = adminId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method - chegirish
advancePaymentSchema.methods.markAsDeducted = async function(payrollId) {
  this.status = 'deducted';
  this.deductedAt = new Date();
  this.deductedFromPayroll = payrollId;
  return this.save();
};

// Static method - oylik avanslarni olish
advancePaymentSchema.statics.getMonthlyAdvances = async function(employeeId, period) {
  return this.find({
    employee: employeeId,
    deductionPeriod: period,
    status: { $in: ['approved', 'deducted'] }
  });
};

// Static method - jami avans summasi
advancePaymentSchema.statics.getTotalAdvances = async function(employeeId, period) {
  const advances = await this.getMonthlyAdvances(employeeId, period);
  return advances.reduce((sum, advance) => sum + advance.amount, 0);
};

module.exports = mongoose.model('AdvancePayment', advancePaymentSchema);
