// MongoDB ga to'g'ridan-to'g'ri ulanish
require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');

async function checkProducts() {
  try {
    console.log('🔌 MongoDB ga ulanmoqda...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal-uz');
    console.log('✅ MongoDB ga ulandi');
    
    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
    
    const total = await Product.countDocuments();
    console.log('\n📊 MongoDB NATIJASI:');
    console.log('- Jami mahsulotlar:', total);
    
    // Birinchi 10 ta mahsulot
    const first10 = await Product.find().limit(10).select('code name').lean();
    console.log('- Birinchi 10 ta:', first10.map(p => `${p.code} - ${p.name}`).join('\n  '));
    
    // Oxirgi 10 ta mahsulot
    const last10 = await Product.find().sort({ _id: -1 }).limit(10).select('code name').lean();
    console.log('- Oxirgi 10 ta:', last10.map(p => `${p.code} - ${p.name}`).join('\n  '));
    
    await mongoose.disconnect();
    console.log('\n✅ Tekshirish tugadi');
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  }
}

checkProducts();
