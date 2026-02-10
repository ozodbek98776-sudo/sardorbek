const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function cleanTerminatedEmployees() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB ga ulandi');

    // Terminated xodimlarni o'chirish
    const result = await User.deleteMany({ 
      status: 'terminated',
      role: { $in: ['cashier', 'helper'] } // Faqat xodimlar, adminlarni emas
    });

    console.log(`✅ ${result.deletedCount} ta terminated xodim o'chirildi`);

    await mongoose.disconnect();
    console.log('MongoDB dan uzildi');
  } catch (error) {
    console.error('Xatolik:', error);
    process.exit(1);
  }
}

cleanTerminatedEmployees();
