// Admin userlarni tekshirish
const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/sardor_furnitura';

const userSchema = new mongoose.Schema({
  name: String,
  login: String,
  phone: String,
  email: String,
  password: String,
  role: String,
  createdBy: mongoose.Schema.Types.ObjectId,
  bonusPercentage: Number,
  totalEarnings: Number,
  totalBonus: Number
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function checkAdmins() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ MongoDB ga ulandi\n');

    // Barcha userlarni topish
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ Hech qanday user topilmadi!\n');
      console.log('Admin yaratish uchun quyidagi buyruqni bajaring:');
      console.log('node server/create-admin.js\n');
    } else {
      console.log(`✓ Jami ${users.length} ta user topildi:\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name}`);
        console.log(`   Login: ${user.login || 'yo\'q'}`);
        console.log(`   Phone: ${user.phone || 'yo\'q'}`);
        console.log(`   Email: ${user.email || 'yo\'q'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Yaratilgan: ${user.createdAt}\n`);
      });
      
      const admins = users.filter(u => u.role === 'admin');
      console.log(`\n✓ Admin userlar: ${admins.length} ta`);
      
      if (admins.length > 0) {
        console.log('\nAdmin login ma\'lumotlari:');
        admins.forEach(admin => {
          console.log(`- Login: ${admin.login || 'yo\'q'} (${admin.name})`);
        });
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    process.exit(1);
  }
}

checkAdmins();
