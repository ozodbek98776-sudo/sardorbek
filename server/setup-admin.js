// Admin user yaratish va tekshirish
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

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

const User = mongoose.model('User', userSchema);

async function setupAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB ga ulandi\n');

    // Eski admin o'chirish
    await User.deleteMany({ login: 'Admin321' });
    console.log('✓ Eski admin o\'chirildi');

    // Yangi admin yaratish
    const admin = new User({
      name: 'Admin',
      login: 'Admin321',
      password: 'Admin123',
      role: 'admin'
    });

    await admin.save();
    console.log('✓ Yangi admin yaratildi\n');

    // Tekshirish - admin topish
    const foundAdmin = await User.findOne({ login: 'Admin321' });
    if (foundAdmin) {
      console.log('✓ Admin topildi:');
      console.log(`  Name: ${foundAdmin.name}`);
      console.log(`  Login: ${foundAdmin.login}`);
      console.log(`  Role: ${foundAdmin.role}\n`);

      // Parol tekshirish
      const isPasswordCorrect = await foundAdmin.comparePassword('Admin123');
      if (isPasswordCorrect) {
        console.log('✓ Parol to\'g\'ri!\n');
      } else {
        console.log('❌ Parol noto\'g\'ri!\n');
      }
    } else {
      console.log('❌ Admin topilmadi!\n');
    }

    console.log('Login qismida quyidagi ma\'lumotlarni kiriting:');
    console.log('  Login: Admin321');
    console.log('  Parol: Admin123\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error.message);
    process.exit(1);
  }
}

setupAdmin();
