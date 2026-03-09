const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  price: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const supplierTransactionSchema = new mongoose.Schema({
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [transactionItemSchema],
  totalAmount: { type: Number, required: true },
  // To'lov tafsilotlari
  cashAmount: { type: Number, default: 0 },
  cardAmount: { type: Number, default: 0 },
  clickAmount: { type: Number, default: 0 },
  debtAmount: { type: Number, default: 0 }, // Qarz summa
  paidAmount: { type: Number, default: 0 }, // Jami to'langan
  note: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

supplierTransactionSchema.index({ supplier: 1, createdAt: -1 });

module.exports = mongoose.model('SupplierTransaction', supplierTransactionSchema);
