const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

contactSchema.index({ phone: 1 }, { unique: true });
contactSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Contact', contactSchema);
