const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  method: { type: String, enum: ['cash', 'card'], default: 'cash' },
  date: { type: Date, default: Date.now }
});

const debtItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
});

const debtSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Admin kiritgan foydalanuvchi
  creditorName: { type: String }, // For own debts (who you owe to)
  amount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  originalDueDate: { type: Date }, // Dastlabki muddat
  status: { type: String, enum: ['pending_approval', 'approved', 'overdue', 'paid', 'blacklist'], default: 'pending_approval' },
  type: { type: String, enum: ['receivable', 'payable'], default: 'receivable' }, // receivable = they owe me, payable = I owe them
  description: { type: String },
  collateral: { type: String }, // Garov - what was left as collateral
  items: [debtItemSchema], // Qarz berilgan mahsulotlar
  payments: [paymentSchema],
  extensionCount: { type: Number, default: 0 }, // Necha marta muddat berilgan
  extensionDays: { type: Number, default: 0 }, // Jami necha kun muddat berilgan
  lastExtensionAt: { type: Date }, // Oxirgi marta qachon muddat berilgan
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Performance indexes
debtSchema.index({ customer: 1, status: 1 });
debtSchema.index({ status: 1, createdAt: -1 });
debtSchema.index({ dueDate: 1 });
debtSchema.index({ user: 1 });
debtSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Debt', debtSchema);
