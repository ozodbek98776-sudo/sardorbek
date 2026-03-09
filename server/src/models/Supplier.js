const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  address: { type: String, trim: true },
  note: { type: String, trim: true },
  totalDebt: { type: Number, default: 0 }, // Biz qarz bo'lgan summa
  totalPaid: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 }, // Jami kirim summasi
  transactionCount: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

supplierSchema.index({ name: 1 });
supplierSchema.index({ phone: 1 });

module.exports = mongoose.model('Supplier', supplierSchema);
