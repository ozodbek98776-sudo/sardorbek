// Admin login field qo'shish
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

async function addAdminLogin() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB ga ulandi');

    // Barcha adminlarni topish
    const admins = await User.find({ role: 'admin' });
    console.log(`Topilgan adminlar: ${admins.length}`);

    for (const admin of admins) {
      if (!admin.login) {
        admin.login = 'Admin321';
        const hashedPassword = await bcrypt.hash('Admin123', 10);
        admin.password = hashedPassword;
        await admin.save();
        console.log(`✓ Admin "${admin.name}" ga login qo'shildi va MongoDB ga saqlandi: Admin321`);
      } else {
        console.log(`✓ Admin "${admin.name}" allaqachon login ga ega: ${admin.login}`);
      }
    }

    console.log('\n✓ Tayyor! Admin login va parol MongoDB da qotib qo\'yildi.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
}

addAdminLogin();
