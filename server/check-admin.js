// Admin user mavjudligini tekshirish
const mongoose = require('mongoose');
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

const User = mongoose.model('User', userSchema);

async function checkAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB ga ulandi\n');

    // Barcha admin userlarni topish
    const admins = await User.find({ role: 'admin' });
    console.log(`Topilgan admin userlar: ${admins.length}\n`);

    if (admins.length === 0) {
      console.log('❌ Hech qanday admin user topilmadi!');
      console.log('Admin user yaratish uchun create-admin.js scriptini ishga tushiring:\n');
      console.log('  node Sardor_furnitura/server/create-admin.js\n');
    } else {
      admins.forEach((admin, index) => {
        console.log(`Admin ${index + 1}:`);
        console.log(`  Name: ${admin.name}`);
        console.log(`  Login: ${admin.login || 'yo\'q'}`);
        console.log(`  Phone: ${admin.phone || 'yo\'q'}`);
        console.log(`  Role: ${admin.role}`);
        console.log(`  Created: ${admin.createdAt}\n`);
      });
    }

    // Login bilan admin topish
    const adminByLogin = await User.findOne({ login: 'Admin321' });
    if (adminByLogin) {
      console.log('✓ Admin321 login bilan user topildi!');
      console.log(`  Name: ${adminByLogin.name}`);
      console.log(`  Role: ${adminByLogin.role}`);
    } else {
      console.log('❌ Admin321 login bilan user topilmadi!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error.message);
    process.exit(1);
  }
}

checkAdmin();
