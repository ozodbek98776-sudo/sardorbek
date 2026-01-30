const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Debt = require('./server/src/models/Debt');

async function cleanUnknownDebts() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Noma'lum mijozli qarzlarni topish
    console.log('🔍 Noma\'lum mijozli qarzlar qidirilmoqda...');
    
    // customer maydoni null yoki mavjud bo'lmagan qarzlar
    const unknownDebts = await Debt.find({
      $or: [
        { customer: null },
        { customer: { $exists: false } }
      ]
    });

    console.log(`📊 Topildi: ${unknownDebts.length} ta noma'lum mijozli qarz\n`);

    if (unknownDebts.length === 0) {
      console.log('✅ Noma\'lum mijozli qarzlar yo\'q. Hamma narsa tartibda!');
      process.exit(0);
    }

    // Qarzlarni ko'rsatish
    console.log('📋 Noma\'lum qarzlar ro\'yxati:');
    unknownDebts.forEach((debt, index) => {
      console.log(`   ${index + 1}. Qarz ID: ${debt._id}`);
      console.log(`      Summa: ${debt.amount} so'm`);
      console.log(`      Sana: ${debt.createdAt}`);
      console.log(`      Status: ${debt.status}`);
      console.log('');
    });

    // O'chirish
    console.log('🗑️  Noma\'lum qarzlar o\'chirilmoqda...');
    const result = await Debt.deleteMany({
      $or: [
        { customer: null },
        { customer: { $exists: false } }
      ]
    });

    console.log(`✅ ${result.deletedCount} ta noma'lum qarz o'chirildi!`);
    console.log('🎉 Tozalash muvaffaqiyatli yakunlandi!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

cleanUnknownDebts();
