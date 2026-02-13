const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['komunal', 'soliqlar', 'ovqatlanish', 'dostavka', 'tovar_xarid', 'shaxsiy', 'maosh'],
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount musbat bo\'lishi kerak']
  },
  note: {
    type: String,
    maxlength: 300,
    trim: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  type: {
    type: String,
    // Soliq uchun: ndpi, qqs, mulk_solig, transport_solig, boshqa
    // Komunal uchun: elektr, gaz, suv, internet, telefon, chiqindi, boshqa
    // Shaxsiy uchun: transport, uyali_aloqa, kiyim, tibbiyot, ta_lim, boshqa
    trim: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true
  },
  employee_name: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    enum: ['manual', 'inventory'],
    default: 'manual',
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    index: true
  }
}, {
  timestamps: true
});

// Indexlar
expenseSchema.index({ date: -1, category: 1 });
expenseSchema.index({ created_by: 1, date: -1 });

// Virtual field - formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('uz-UZ').format(this.amount);
});

// Sana validatsiyasi - kelajak sanaga ruxsat bermaslik (default)
expenseSchema.pre('validate', function(next) {
  if (this.date > new Date()) {
    return next(new Error('Kelajak sanaga xarajat kiritish mumkin emas'));
  }
  next();
});

module.exports = mongoose.model('Expense', expenseSchema);
