const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true }, // Unique telefon raqam
  email: String,
  address: String,
  telegramChatId: String, // Telegram chat ID for notifications (renamed from telegramId)
  totalPurchases: { type: Number, default: 0 },
  totalBalls: { type: Number, default: 0 }, // Ball tizimi - har 1,000,000 = 1 ball
  debt: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
