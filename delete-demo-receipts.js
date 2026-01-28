require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');

// Receipt schema
const receiptSchema = new mongoose.Schema({
  receiptNumber: String,
  items: Array,
  total: Number,
  helper: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  receiptType: String,
  status: String,
  createdAt: Date,
  updatedAt: Date
});

const Receipt = mongoose.model('Receipt', receiptSchema);

// Product schema
const productSchema = new mongoose.Schema({
  code: String,
  name: String,
  quantity: Number
});

const Product = mongoose.model('Product', productSchema);

async function deleteDemoReceipts() {
  try {
    console.log('🔌 MongoDB ga ulanish...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // 1. Barcha xodim cheklarini ko'rish
    console.log('📋 Barcha xodim cheklar:');
    console.log('='.repeat(70));
    
    const allReceipts = await Receipt.find({ receiptType: 'helper_receipt' })
      .populate('helper', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    
    console.log(`Jami: ${allReceipts.length} ta chek\n`);
    
    allReceipts.forEach((receipt, index) => {
      console.log(`${index + 1}. Chek #${receipt.receiptNumber}`);
      console.log(`   Xodim: ${receipt.helper?.name || 'N/A'}`);
      console.log(`   Mijoz: ${receipt.customer?.name || 'N/A'}`);
      console.log(`   Summa: ${receipt.total} so'm`);
      console.log(`   Mahsulotlar: ${receipt.items.length} ta`);
      console.log(`   Sana: ${receipt.createdAt.toLocaleString('uz-UZ')}`);
      console.log(`   ID: ${receipt._id}`);
      console.log('');
    });

    // 2. Foydalanuvchidan tasdiqlash
    console.log('='.repeat(70));
    console.log('⚠️  DIQQAT: Barcha xodim cheklari o\'chiriladi!');
    console.log('='.repeat(70));
    console.log('\n❓ Davom etishni xohlaysizmi? (ha/yo\'q)');
    console.log('   Agar "ha" deb yozsangiz, barcha cheklar o\'chiriladi.');
    console.log('   Mahsulot miqdorlari qaytariladi.\n');

    // Node.js da foydalanuvchi kiritishini kutish
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('Javob: ', async (answer) => {
      if (answer.toLowerCase() === 'ha' || answer.toLowerCase() === 'yes') {
        console.log('\n🗑️  Cheklar o\'chirilmoqda...\n');

        let deletedCount = 0;
        let restoredProducts = 0;

        for (const receipt of allReceipts) {
          try {
            // Mahsulot miqdorlarini qaytarish
            for (const item of receipt.items) {
              if (item.product) {
                const product = await Product.findById(item.product);
                if (product) {
                  product.quantity += item.quantity;
                  await product.save();
                  restoredProducts++;
                  console.log(`   ✅ ${product.name}: +${item.quantity} ta qaytarildi`);
                }
              }
            }

            // Chekni o'chirish
            await Receipt.findByIdAndDelete(receipt._id);
            deletedCount++;
            console.log(`   🗑️  Chek #${receipt.receiptNumber} o'chirildi\n`);

          } catch (err) {
            console.error(`   ❌ Chek #${receipt.receiptNumber} o'chirishda xatolik:`, err.message);
          }
        }

        console.log('='.repeat(70));
        console.log('✅ YAKUNIY NATIJA:');
        console.log('='.repeat(70));
        console.log(`🗑️  O'chirilgan cheklar: ${deletedCount} ta`);
        console.log(`📦 Qaytarilgan mahsulotlar: ${restoredProducts} ta`);
        console.log('='.repeat(70));

      } else {
        console.log('\n❌ Bekor qilindi. Hech narsa o\'chirilmadi.');
      }

      readline.close();
      await mongoose.connection.close();
      console.log('\n✅ MongoDB ulanishi yopildi');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deleteDemoReceipts();
