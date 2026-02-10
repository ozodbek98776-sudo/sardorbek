const mongoose = require('mongoose');

const kpiAssignmentSchema = new mongoose.Schema({
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
  
  // Shaxsiy maqsadlar (agar kerak bo'lsa)
  customTarget: {
    type: Number
  },
  customWeight: {
    type: Number,
    min: 0,
    max: 100
  },
  customMaxBonus: {
    type: Number,
    min: 0
  },
  
  // Vaqt oralig'i
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Kim biriktirdi
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexlar
kpiAssignmentSchema.index({ employee: 1, kpiTemplate: 1 });
kpiAssignmentSchema.index({ employee: 1, isActive: 1 });
kpiAssignmentSchema.index({ kpiTemplate: 1, isActive: 1 });
kpiAssignmentSchema.index({ startDate: 1, endDate: 1 });

// Unique constraint - bir xodimga bir KPI faqat bir marta biriktirilishi mumkin
kpiAssignmentSchema.index(
  { employee: 1, kpiTemplate: 1, isActive: 1 },
  { 
    unique: true,
    partialFilterExpression: { isActive: true }
  }
);

// Method - joriy faol KPI larni olish
kpiAssignmentSchema.statics.getActiveAssignments = async function(employeeId) {
  const now = new Date();
  return this.find({
    employee: employeeId,
    isActive: true,
    startDate: { $lte: now },
    $or: [
      { endDate: { $gte: now } },
      { endDate: null }
    ]
  }).populate('kpiTemplate');
};

// Method - KPI ni deaktivlashtirish
kpiAssignmentSchema.methods.deactivate = async function() {
  this.isActive = false;
  this.endDate = new Date();
  return this.save();
};

module.exports = mongoose.model('KPIAssignment', kpiAssignmentSchema);
