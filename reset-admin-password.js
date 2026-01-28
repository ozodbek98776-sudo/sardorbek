require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Readline interface yaratish
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Savol berish funksiyasi
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

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

// User schema
const userSchema = new mongoose.Schema({
  name: String,
  login: String,
  password: String,
  role: String,
  phone: String,
  createdAt: Date
});

// Parolni hash qilish
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.model('User', userSchema);

// Admin parolini reset qilish
const resetAdminPassword = async () => {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 ADMIN PAROLINI RESET QILISH');
    console.log('═══════════════════════════════════════════════════════\n');

    // Barcha adminlarni ko'rsatish
    const admins = await User.find({ role: 'admin' });

    if (admins.length === 0) {
      console.log('⚠️  Hech qanday admin topilmadi!');
      rl.close();
      process.exit(1);
    }

    console.log('Mavjud adminlar:\n');
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name || 'N/A'} (Login: ${admin.login})`);
    });
    console.log('');

    // Admin tanlash
    const choice = await question('Qaysi adminni tanlaysiz? (raqam kiriting): ');
    const selectedIndex = parseInt(choice) - 1;

    if (selectedIndex < 0 || selectedIndex >= admins.length) {
      console.log('❌ Noto\'g\'ri tanlov!');
      rl.close();
      process.exit(1);
    }

    const selectedAdmin = admins[selectedIndex];
    console.log(`\n✅ Tanlandi: ${selectedAdmin.name} (${selectedAdmin.login})\n`);

    // Yangi login (ixtiyoriy)
    const newLogin = await question(`Yangi login (bo'sh qoldirish uchun Enter bosing, joriy: ${selectedAdmin.login}): `);
    
    // Yangi parol
    const newPassword = await question('Yangi parol kiriting: ');

    if (!newPassword || newPassword.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      process.exit(1);
    }

    // Tasdiqlash
    const confirm = await question('\n⚠️  Parolni o\'zgartirmoqchimisiz? (ha/yo\'q): ');

    if (confirm.toLowerCase() !== 'ha' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ Bekor qilindi');
      rl.close();
      process.exit(0);
    }

    // Parolni yangilash
    if (newLogin && newLogin.trim()) {
      selectedAdmin.login = newLogin.trim();
    }
    selectedAdmin.password = newPassword;
    await selectedAdmin.save();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ MUVAFFAQIYATLI O\'ZGARTIRILDI!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 Yangi ma\'lumotlar:');
    console.log(`   Ism:   ${selectedAdmin.name}`);
    console.log(`   Login: ${selectedAdmin.login}`);
    console.log(`   Parol: ${newPassword}`);
    console.log(`   Rol:   ${selectedAdmin.role}\n`);
    console.log('💡 Endi bu ma\'lumotlar bilan kirish mumkin!');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error.message);
  } finally {
    rl.close();
    await mongoose.connection.close();
    console.log('✅ MongoDB ulanishi yopildi');
    process.exit(0);
  }
};

// Scriptni ishga tushirish
resetAdminPassword();
