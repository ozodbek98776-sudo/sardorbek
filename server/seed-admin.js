// Admin foydalanuvchi yaratish
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

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB ga ulandi');

    // Mavjud admin login bilan foydalanuvchini tekshirish
    const existingAdmin = await User.findOne({ login: 'Admin321' });
    
    if (existingAdmin) {
      // Login mavjud bo'lsa, parolni yangilash
      const hashedPassword = await bcrypt.hash('Admin123', 10);
      existingAdmin.password = hashedPassword;
      await existingAdmin.save();
      console.log('✓ Admin paroli yangilandi va MongoDB ga saqlandi!');
      console.log('Login: Admin321');
      console.log('Parol: Admin123');
    } else {
      // Yangi admin yaratish
      const hashedPassword = await bcrypt.hash('Admin123', 10);
      const admin = new User({
        name: 'Admin',
        login: 'Admin321',
        password: hashedPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('✓ Admin foydalanuvchi yaratildi va MongoDB ga saqlandi!');
      console.log('Login: Admin321');
      console.log('Parol: Admin123');
    }

    // Mavjud adminlarni ham yangilash (login qo'shish)
    const adminsWithoutLogin = await User.find({ role: 'admin', login: { $exists: false } });
    for (const admin of adminsWithoutLogin) {
      if (!admin.login) {
        admin.login = 'Admin321';
        const hashedPassword = await bcrypt.hash('Admin123', 10);
        admin.password = hashedPassword;
        await admin.save();
        console.log(`✓ Admin "${admin.name}" ga login qo'shildi va MongoDB ga saqlandi`);
      }
    }

    await mongoose.disconnect();
    console.log('\n✓ Tayyor! Admin login va parol MongoDB da qotib qo\'yildi.');
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
}

seedAdmin();
