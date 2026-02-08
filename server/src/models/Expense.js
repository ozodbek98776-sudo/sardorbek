const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['kommunal', 'oylik', 'ovqat', 'tovar', 'boshqa']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Tovar xaridi uchun mahsulotlar ro'yxati
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: String,
    quantity: Number,
    price: Number
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// ⚡ OPTIMIZED INDEXES for better query performance
expenseSchema.index({ date: -1, category: 1 }); // Compound index for filtered queries
expenseSchema.index({ category: 1, date: -1 }); // Alternative compound index
expenseSchema.index({ createdBy: 1, date: -1 }); // For user-specific queries
expenseSchema.index({ createdAt: -1 }); // For sorting by creation time

module.exports = mongoose.model('Expense', expenseSchema);
