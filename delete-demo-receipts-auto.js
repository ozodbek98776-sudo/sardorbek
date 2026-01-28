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

async function deleteDemoReceiptsAuto() {
  try {
    console.log('🔌 MongoDB ga ulanish...\n');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');

    // Barcha xodim cheklarini topish
    const allReceipts = await Receipt.find({ receiptType: 'helper_receipt' })
      .populate('helper', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    
    console.log('📋 Topilgan cheklar:');
    console.log('='.repeat(70));
    console.log(`Jami: ${allReceipts.length} ta chek\n`);

    let deletedCount = 0;
    let restoredProducts = 0;
    let errors = 0;

    console.log('🗑️  Cheklar o\'chirilmoqda...\n');

    for (const receipt of allReceipts) {
      try {
        console.log(`Chek #${receipt.receiptNumber || receipt._id.toString().slice(-6)}`);
        console.log(`   Summa: ${receipt.total} so'm`);
        console.log(`   Mahsulotlar: ${receipt.items.length} ta`);

        // Mahsulot miqdorlarini qaytarish
        for (const item of receipt.items) {
          if (item.product) {
            try {
              const product = await Product.findById(item.product);
              if (product) {
                const oldQuantity = product.quantity;
                product.quantity += item.quantity;
                await product.save();
                restoredProducts++;
                console.log(`   ✅ ${product.name}: ${oldQuantity} → ${product.quantity} (+${item.quantity})`);
              } else {
                console.log(`   ⚠️  Mahsulot topilmadi: ${item.product}`);
              }
            } catch (err) {
              console.log(`   ❌ Mahsulot qaytarishda xatolik: ${err.message}`);
            }
          }
        }

        // Chekni o'chirish
        await Receipt.findByIdAndDelete(receipt._id);
        deletedCount++;
        console.log(`   🗑️  O'chirildi\n`);

      } catch (err) {
        errors++;
        console.error(`   ❌ Xatolik: ${err.message}\n`);
      }
    }

    console.log('='.repeat(70));
    console.log('✅ YAKUNIY NATIJA:');
    console.log('='.repeat(70));
    console.log(`🗑️  O'chirilgan cheklar: ${deletedCount} ta`);
    console.log(`📦 Qaytarilgan mahsulotlar: ${restoredProducts} ta`);
    console.log(`❌ Xatolar: ${errors} ta`);
    console.log('='.repeat(70));

    await mongoose.connection.close();
    console.log('\n✅ MongoDB ulanishi yopildi');
    process.exit(0);

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
}

deleteDemoReceiptsAuto();
