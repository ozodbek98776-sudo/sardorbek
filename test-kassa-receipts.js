const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'server', '.env') });

const Receipt = require('./server/src/models/Receipt');

console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Topildi' : 'Topilmadi');

async function testKassaReceipts() {
  try {
    console.log('MongoDB ga ulanish...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // 1. Barcha cheklar sonini tekshirish
    const totalReceipts = await Receipt.countDocuments();
    console.log(`📊 Jami cheklar: ${totalReceipts} ta\n`);

    // 2. Helper receipt turini tekshirish
    const helperReceipts = await Receipt.countDocuments({ receiptType: 'helper_receipt' });
    console.log(`👷 Helper cheklari: ${helperReceipts} ta\n`);

    // 3. Barcha receipt turlarini ko'rish
    const receiptTypes = await Receipt.aggregate([
      {
        $group: {
          _id: '$receiptType',
          count: { $sum: 1 }
        }
      }
    ]);
    console.log('📋 Chek turlari:');
    receiptTypes.forEach(type => {
      console.log(`   ${type._id || 'null'}: ${type.count} ta`);
    });
    console.log('');

    // 4. Oxirgi 5 ta chekni ko'rish
    const recentReceipts = await Receipt.find()
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    console.log('🕐 Oxirgi 5 ta chek:');
    recentReceipts.forEach((receipt, index) => {
      console.log(`\n${index + 1}. Chek ID: ${receipt._id}`);
      console.log(`   Raqam: ${receipt.receiptNumber || 'Yo\'q'}`);
      console.log(`   Turi: ${receipt.receiptType || 'Belgilanmagan'}`);
      console.log(`   Yaratuvchi: ${receipt.createdBy?.name || 'Noma\'lum'} (${receipt.createdBy?.role || 'Noma\'lum'})`);
      console.log(`   Jami: ${receipt.total} so'm`);
      console.log(`   Mahsulotlar: ${receipt.items?.length || 0} ta`);
      console.log(`   Sana: ${receipt.createdAt}`);
    });

    // 5. Helper receipt bo'lgan cheklar
    if (helperReceipts > 0) {
      console.log('\n\n👷 Helper cheklari:');
      const helpers = await Receipt.find({ receiptType: 'helper_receipt' })
        .populate('createdBy', 'name role')
        .populate('helperId', 'name role')
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      helpers.forEach((receipt, index) => {
        console.log(`\n${index + 1}. Chek ID: ${receipt._id}`);
        console.log(`   Raqam: ${receipt.receiptNumber || 'Yo\'q'}`);
        console.log(`   Yaratuvchi: ${receipt.createdBy?.name || 'Noma\'lum'}`);
        console.log(`   Helper: ${receipt.helperId?.name || 'Noma\'lum'}`);
        console.log(`   Jami: ${receipt.total} so'm`);
      });
    }

    // 6. Receipt model strukturasini tekshirish
    console.log('\n\n📝 Receipt model maydonlari:');
    const sampleReceipt = await Receipt.findOne().lean();
    if (sampleReceipt) {
      console.log('Mavjud maydonlar:', Object.keys(sampleReceipt).join(', '));
    }

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanish yopildi');
  }
}

testKassaReceipts();
