require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');

// MongoDB ga ulanish
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga muvaffaqiyatli ulandi\n');
  } catch (error) {
    console.error('❌ MongoDB ulanish xatosi:', error.message);
    process.exit(1);
  }
};

// User schema (oddiy versiya)
const userSchema = new mongoose.Schema({
  name: String,
  login: String,
  password: String,
  role: String,
  phone: String,
  createdAt: Date
});

const User = mongoose.model('User', userSchema);

// Admin ma'lumotlarini topish
const getAdminCredentials = async () => {
  try {
    await connectDB();

    console.log('🔍 Admin foydalanuvchilarni qidiryapman...\n');
    
    // Barcha admin foydalanuvchilarni topish
    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.log('⚠️  Hech qanday admin foydalanuvchi topilmadi!');
      console.log('💡 Yangi admin yaratish uchun: npm run seed-admin\n');
    } else {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔐 ADMIN PANEL LOGIN MA\'LUMOTLARI');
      console.log('═══════════════════════════════════════════════════════\n');

      admins.forEach((admin, index) => {
        console.log(`👤 Admin #${index + 1}:`);
        console.log(`   Ism:       ${admin.name || 'N/A'}`);
        console.log(`   Login:     ${admin.login}`);
        console.log(`   Parol:     [HASH] ${admin.password}`);
        console.log(`   Rol:       ${admin.role}`);
        console.log(`   Telefon:   ${admin.phone || 'N/A'}`);
        console.log(`   Yaratildi: ${admin.createdAt ? admin.createdAt.toLocaleString('uz-UZ') : 'N/A'}`);
        console.log('');
      });

      console.log('═══════════════════════════════════════════════════════');
      console.log('⚠️  MUHIM ESLATMA:');
      console.log('═══════════════════════════════════════════════════════');
      console.log('Parol bcrypt bilan hash qilingan (xavfsizlik uchun).');
      console.log('Agar parolni unutgan bo\'lsangiz, yangi parol o\'rnatish kerak.\n');
      
      console.log('📝 Parolni o\'zgartirish uchun quyidagi scriptni ishga tushiring:');
      console.log('   node reset-admin-password.js\n');
    }

    // Kassa foydalanuvchilarni ham ko'rsatish
    console.log('\n🏪 KASSA FOYDALANUVCHILARI:');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const kassaUsers = await User.find({ role: 'kassa' });
    
    if (kassaUsers.length === 0) {
      console.log('⚠️  Hech qanday kassa foydalanuvchi topilmadi!\n');
    } else {
      kassaUsers.forEach((kassa, index) => {
        console.log(`💰 Kassa #${index + 1}:`);
        console.log(`   Ism:       ${kassa.name || 'N/A'}`);
        console.log(`   Login:     ${kassa.login}`);
        console.log(`   Parol:     [HASH] ${kassa.password}`);
        console.log(`   Rol:       ${kassa.role}`);
        console.log(`   Telefon:   ${kassa.phone || 'N/A'}`);
        console.log('');
      });
    }

    // Barcha foydalanuvchilar statistikasi
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const kassaCount = await User.countDocuments({ role: 'kassa' });
    const helperCount = await User.countDocuments({ role: 'helper' });

    console.log('\n📊 STATISTIKA:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Jami foydalanuvchilar: ${totalUsers}`);
    console.log(`├─ Adminlar:           ${adminCount}`);
    console.log(`├─ Kassalar:           ${kassaCount}`);
    console.log(`└─ Yordamchilar:       ${helperCount}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB ulanishi yopildi');
    process.exit(0);
  }
};

// Scriptni ishga tushirish
getAdminCredentials();
