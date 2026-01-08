const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  code: String,
  price: Number,
  quantity: Number
});

const receiptSchema = new mongoose.Schema({
  items: [cartItemSchema],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card'], default: 'cash' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'completed' },
  isReturn: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Kassir cheklari uchun yangi maydonlar
  helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Chekni chiqargan kassir
  isPaid: { type: Boolean, default: false }, // To'lov holati
  receiptType: { type: String, enum: ['sale', 'helper_receipt'], default: 'sale' }, // Chek turi
  metadata: {
    offlineId: { type: String, index: true },
    syncedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', receiptSchema);
