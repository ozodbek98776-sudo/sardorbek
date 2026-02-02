const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  code: String,
  price: Number,
  quantity: Number,
  paymentBreakdown: {
    cash: { type: Number, default: 0 },
    click: { type: Number, default: 0 },
    card: { type: Number, default: 0 }
  }
});

const receiptSchema = new mongoose.Schema({
  items: [cartItemSchema],
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'click', 'mixed'], default: 'cash' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String }, // Mijoz ismi (oddiy mijoz uchun)
  isRegularCustomer: { type: Boolean, default: false }, // Oddiy mijoz belgisi
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'completed' },
  isReturn: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Kassir cheklari uchun yangi maydonlar
  helperId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Chekni chiqargan kassir
  isPaid: { type: Boolean, default: false }, // To'lov holati
  receiptType: { type: String, enum: ['sale', 'helper_receipt', 'direct_sale'], default: 'sale' }, // Chek turi
  // To'lov ma'lumotlari
  paidAmount: { type: Number, default: 0 }, // To'langan summa
  cashAmount: { type: Number, default: 0 }, // Naqd pul summasi
  cardAmount: { type: Number, default: 0 }, // Karta summasi
  remainingAmount: { type: Number, default: 0 }, // Qoldiq summa
  receiptNumber: { type: String }, // Chek raqami
  metadata: {
    offlineId: { type: String, index: true },
    syncedAt: { type: Date }
  }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', receiptSchema);
