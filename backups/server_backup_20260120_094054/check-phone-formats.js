// Database dagi telefon raqam formatlarini tekshirish
require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./src/models/Customer');

async function checkPhoneFormats() {
  try {
    console.log('📞 Database dagi telefon raqam formatlarini tekshirish...\n');

    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha mijozlarni olish
    const customers = await Customer.find({}).select('name phone telegramChatId').limit(20);

    console.log(`📋 Jami ${customers.length} ta mijoz topildi:\n`);

    customers.forEach((customer, index) => {
      console.log(`${index + 1}. ${customer.name}`);
      console.log(`   📞 Phone: "${customer.phone}"`);
      console.log(`   📱 Telegram ID: ${customer.telegramChatId || 'YO\'Q'}`);
      console.log(`   📏 Phone uzunligi: ${customer.phone.length}`);
      console.log(`   🔤 Phone formati: ${getPhoneFormat(customer.phone)}`);
      console.log('');
    });

    // Telefon raqam formatlarini guruhlash
    const formats = {};
    customers.forEach(customer => {
      const format = getPhoneFormat(customer.phone);
      if (!formats[format]) formats[format] = 0;
      formats[format]++;
    });

    console.log('📊 Telefon raqam formatlari:');
    Object.entries(formats).forEach(([format, count]) => {
      console.log(`   ${format}: ${count} ta`);
    });

  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB ulanishi yopildi');
  }
}

function getPhoneFormat(phone) {
  if (phone.startsWith('+998')) return '+998XXXXXXXXX';
  if (phone.startsWith('998')) return '998XXXXXXXXX';
  if (phone.startsWith('+')) return '+XXXXXXXXXXX';
  if (phone.length === 9) return 'XXXXXXXXX (9 raqam)';
  if (phone.length === 12) return 'XXXXXXXXXXXX (12 raqam)';
  if (phone.length === 13) return 'XXXXXXXXXXXXX (13 raqam)';
  return `Noma'lum format (${phone.length} raqam)`;
}

// Test ishga tushirish
checkPhoneFormats();