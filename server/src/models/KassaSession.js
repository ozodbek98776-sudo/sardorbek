const mongoose = require('mongoose');

const kassaSessionSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  loginTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  sessionToken: {
    type: String,
    required: true,
    unique: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ipAddress: {
    type: String,
    default: ''
  },
  userAgent: {
    type: String,
    default: ''
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 soat
  }
}, {
  timestamps: true
});

// Session muddati tugagan sessionlarni avtomatik o'chirish
kassaSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Session yangilash metodi
kassaSessionSchema.methods.updateActivity = function () {
  this.lastActivity = new Date();
  this.expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return this.save();
};

// Aktiv sessionni tekshirish
kassaSessionSchema.methods.isValidSession = function () {
  return this.isActive && this.expiresAt > new Date();
};

module.exports = mongoose.model('KassaSession', kassaSessionSchema);