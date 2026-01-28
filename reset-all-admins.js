require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// Readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// MongoDB connection
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
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Main function
const resetAllAdmins = async () => {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔄 BARCHA ADMINLARNI O\'CHIRISH VA YANGI ADMIN YARATISH');
    console.log('═══════════════════════════════════════════════════════\n');

    // Joriy holatni ko'rsatish
    const allUsers = await User.find();
    const admins = await User.find({ role: 'admin' });
    const kassas = await User.find({ role: 'kassa' });
    const helpers = await User.find({ role: 'helper' });

    console.log('📊 JORIY HOLAT:\n');
    console.log(`Jami foydalanuvchilar: ${allUsers.length}`);
    console.log(`├─ Adminlar:           ${admins.length}`);
    console.log(`├─ Kassalar:           ${kassas.length}`);
    console.log(`└─ Yordamchilar:       ${helpers.length}\n`);

    if (admins.length > 0) {
      console.log('🗑️  O\'CHIRILADIGAN ADMINLAR:\n');
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.name} (Login: ${admin.login || 'N/A'})`);
      });
      console.log('');
    }

    // Tasdiqlash
    console.log('⚠️  DIQQAT:');
    console.log('   • Barcha adminlar o\'chiriladi');
    console.log('   • Yangi admin yaratiladi');
    console.log('   • Mahsulotlar, buyurtmalar, cheklar SAQLANADI');
    console.log('   • Kassalar va yordamchilar SAQLANADI\n');

    const confirm1 = await question('Davom etishni xohlaysizmi? (ha/yo\'q): ');
    
    if (confirm1.toLowerCase() !== 'ha' && confirm1.toLowerCase() !== 'yes') {
      console.log('❌ Bekor qilindi');
      rl.close();
      process.exit(0);
    }

    // Yangi admin ma'lumotlarini so'rash
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 YANGI ADMIN MA\'LUMOTLARI');
    console.log('═══════════════════════════════════════════════════════\n');

    const adminName = await question('Admin ismi (masalan: Admin): ');
    const adminLogin = await question('Admin login (masalan: admin): ');
    const adminPassword = await question('Admin paroli (masalan: 123456): ');
    const adminPhone = await question('Telefon raqami (ixtiyoriy): ');

    // Validatsiya
    if (!adminName || !adminLogin || !adminPassword) {
      console.log('❌ Barcha maydonlar to\'ldirilishi shart!');
      rl.close();
      process.exit(1);
    }

    if (adminPassword.length < 6) {
      console.log('❌ Parol kamida 6 ta belgidan iborat bo\'lishi kerak!');
      rl.close();
      process.exit(1);
    }

    // Oxirgi tasdiqlash
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 YANGI ADMIN:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Ism:     ${adminName}`);
    console.log(`Login:   ${adminLogin}`);
    console.log(`Parol:   ${adminPassword}`);
    console.log(`Telefon: ${adminPhone || 'N/A'}`);
    console.log('═══════════════════════════════════════════════════════\n');

    const confirm2 = await question('⚠️  Barcha adminlarni o\'chirib, yangi admin yaratamizmi? (ha/yo\'q): ');
    
    if (confirm2.toLowerCase() !== 'ha' && confirm2.toLowerCase() !== 'yes') {
      console.log('❌ Bekor qilindi');
      rl.close();
      process.exit(0);
    }

    console.log('\n🔄 Jarayon boshlandi...\n');

    // 1. Barcha adminlarni o'chirish
    const deleteResult = await User.deleteMany({ role: 'admin' });
    console.log(`✅ ${deleteResult.deletedCount} ta admin o'chirildi`);

    // 2. Yangi admin yaratish
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const newAdmin = new User({
      name: adminName,
      login: adminLogin,
      password: hashedPassword,
      role: 'admin',
      phone: adminPhone || null,
      createdAt: new Date()
    });

    await newAdmin.save();
    console.log('✅ Yangi admin yaratildi\n');

    // Yangi holatni ko'rsatish
    const newAllUsers = await User.find();
    const newAdmins = await User.find({ role: 'admin' });
    const newKassas = await User.find({ role: 'kassa' });
    const newHelpers = await User.find({ role: 'helper' });

    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MUVAFFAQIYATLI BAJARILDI!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📊 YANGI HOLAT:\n');
    console.log(`Jami foydalanuvchilar: ${newAllUsers.length}`);
    console.log(`├─ Adminlar:           ${newAdmins.length}`);
    console.log(`├─ Kassalar:           ${newKassas.length}`);
    console.log(`└─ Yordamchilar:       ${newHelpers.length}\n`);

    console.log('🔐 YANGI ADMIN BILAN KIRISH:\n');
    console.log(`   URL:   /login`);
    console.log(`   Login: ${adminLogin}`);
    console.log(`   Parol: ${adminPassword}\n`);

    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 ESLATMA:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Mahsulotlar saqlanadi');
    console.log('✅ Buyurtmalar saqlanadi');
    console.log('✅ Cheklar saqlanadi');
    console.log('✅ Qarzlar saqlanadi');
    console.log('✅ Mijozlar saqlanadi');
    console.log('✅ Kassalar saqlanadi');
    console.log('✅ Yordamchilar saqlanadi');
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

// Run script
resetAllAdmins();
