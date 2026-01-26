require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User model
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  login: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'cashier', 'helper'], required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function createKassaUser() {
  try {
    console.log('🔌 MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ulandi\n');

    // Eski kassa user ni o'chirish (agar mavjud bo'lsa)
    const existingUser = await User.findOne({ login: 'kassasardorbek' });
    if (existingUser) {
      await User.deleteOne({ login: 'kassasardorbek' });
      console.log('🗑️  Eski kassa user o\'chirildi');
    }

    // Parolni hash qilish
    const password = 'kassa4321';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('🔐 Parol hash qilindi:');
    console.log('   Original: kassa4321');
    console.log('   Hash:', hashedPassword.substring(0, 30) + '...\n');

    // Yangi kassa user yaratish
    const kassaUser = new User({
      name: 'Kassa Sardorbek',
      login: 'kassasardorbek',
      password: hashedPassword,
      role: 'cashier'
    });

    await kassaUser.save();

    console.log('✅ Kassa user muvaffaqiyatli yaratildi!\n');
    console.log('📋 User ma\'lumotlari:');
    console.log('   Ism: Kassa Sardorbek');
    console.log('   Login: kassasardorbek');
    console.log('   Parol: kassa4321');
    console.log('   Role: cashier');
    console.log('   ID:', kassaUser._id);
    console.log('\n🔒 Parol MongoDB da hash sifatida saqlandi');
    console.log('🔒 Hech kim parolni ko\'ra olmaydi\n');

    // Test: Parolni tekshirish
    console.log('🧪 Parol tekshiruvi...');
    const isMatch = await kassaUser.comparePassword('kassa4321');
    console.log('   To\'g\'ri parol:', isMatch ? '✅ Tasdiqlandi' : '❌ Xato');

    const isWrong = await kassaUser.comparePassword('wrongpassword');
    console.log('   Noto\'g\'ri parol:', isWrong ? '❌ Xato' : '✅ Rad etildi');

    console.log('\n✅ Hammasi tayyor! Endi kassa paneliga kirish mumkin:');
    console.log('   Login: kassasardorbek');
    console.log('   Parol: kassa4321');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

createKassaUser();
