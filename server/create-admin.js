// Admin user yaratish
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sardor_furnitura';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  login: { type: String, sparse: true, unique: true },
  phone: { type: String, sparse: true },
  email: { type: String, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'cashier', 'helper'], default: 'admin' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bonusPercentage: { type: Number, default: 0, min: 0, max: 100 },
  totalEarnings: { type: Number, default: 0 },
  totalBonus: { type: Number, default: 0 }
}, { timestamps: true });

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB ga ulandi');

    // Mavjud admin login bilan foydalanuvchini o'chirish
    await User.deleteOne({ login: 'Admin321' });
    console.log('✓ Eski admin o\'chirildi');

    // Yangi admin yaratish
    const admin = new User({
      name: 'Admin',
      login: 'Admin321',
      password: 'Admin123',
      role: 'admin'
    });

    await admin.save();
    console.log('\n✓ Admin muvaffaqiyatli yaratildi!');
    console.log('Login: Admin321');
    console.log('Parol: Admin123');
    console.log('\nBu login va parol bilan kirib bo\'lishingiz mumkin.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error.message);
    process.exit(1);
  }
}

createAdmin();
