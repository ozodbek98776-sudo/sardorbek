const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALL_ROLES, ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  login: { type: String, sparse: true, unique: true }, // Admin login
  phone: { type: String, sparse: true }, // Unique olib tashlandi
  email: { type: String, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ALL_ROLES, default: ROLES.ADMIN },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // HR fields
  status: { type: String, enum: ['active', 'inactive', 'terminated'], default: 'active' },
  position: { type: String },
  department: { type: String },
  hireDate: { type: Date },
  terminationDate: { type: Date },
  
  // Bonus tizimi
  bonusPercentage: { type: Number, default: 0, min: 0, max: 100 },
  totalEarnings: { type: Number, default: 0 },
  totalBonus: { type: Number, default: 0 },

  // QR Attendance token
  qrToken: { type: String, unique: true, sparse: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Auto-generate QR token for new users
userSchema.pre('save', function (next) {
  if (!this.qrToken) {
    this.qrToken = 'QR-' + this._id.toString() + '-' + Date.now().toString(36);
  }
  next();
});


userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
