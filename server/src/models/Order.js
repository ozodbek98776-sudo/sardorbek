const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: String,
  price: Number,
  quantity: Number,
  
  // YANGI NARX TIZIMI FIELDLARI
  saleType: { 
    type: String, 
    enum: ['unit', 'box', 'discount1', 'discount2', 'discount3'], 
    default: 'unit' 
  },
  originalPrice: { type: Number }, // Asl narx (skidka qo'llanishdan oldin)
  appliedDiscount: {
    type: { type: String }, // 'discount1', 'discount2', 'discount3'
    percent: { type: Number }, // Skidka foizi
    minQuantity: { type: Number } // Minimal miqdor
  },
  unitType: { 
    type: String, 
    enum: ['dona', 'kg', 'metr', 'litr', 'karobka'], 
    default: 'dona' 
  }
});

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [orderItemSchema],
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['new', 'processing', 'shipped', 'delivered', 'cancelled'], 
    default: 'new' 
  },
  paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  address: String,
  notes: String,
  
  // YANGI FIELDLAR
  totalSavings: { type: Number, default: 0 }, // Jami tejamkorlik
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
