const mongoose = require('mongoose');
const crypto = require('crypto');

const storeLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  allowedRadius: {
    type: Number,
    default: 100, // meters
    min: 10,
    max: 5000
  },
  qrToken: {
    type: String,
    unique: true,
    default: () => 'STORE-' + crypto.randomBytes(16).toString('hex')
  },
  address: {
    type: String,
    trim: true
  },
  workStartTime: {
    type: String,
    default: '09:00'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

storeLocationSchema.index({ qrToken: 1 });

module.exports = mongoose.model('StoreLocation', storeLocationSchema);
