require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const QRCode = require('qrcode');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi\n');
  } catch (error) {
    console.error('❌ MongoDB ulanish xatosi:', error.message);
    process.exit(1);
  }
};

// Product schema
const productSchema = new mongoose.Schema({
  code: String,
  name: String,
  qrCode: String
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// QR code'larni yaratish
const fixQRCodes = async () => {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 QR CODE\'LARNI YARATISH');
    console.log('═══════════════════════════════════════════════════════\n');

    // QR code yo'q mahsulotlarni topish
    const productsWithoutQR = await Product.find({
      $or: [
        { qrCode: { $exists: false } },
        { qrCode: null },
        { qrCode: '' }
      ]
    });

    console.log(`📊 Jami QR code yo'q mahsulotlar: ${productsWithoutQR.length}\n`);

    if (productsWithoutQR.length === 0) {
      console.log('✅ Barcha mahsulotlarda QR code mavjud!\n');
      process.exit(0);
    }

    console.log('🔄 QR code yaratish boshlandi...\n');

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let successCount = 0;
    let errorCount = 0;

    // Batch processing - 100 tadan
    const batchSize = 100;
    const totalBatches = Math.ceil(productsWithoutQR.length / batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, productsWithoutQR.length);
      const batch = productsWithoutQR.slice(start, end);

      console.log(`📦 Batch ${batchIndex + 1}/${totalBatches} (${start + 1}-${end})`);

      // Parallel QR code yaratish
      const promises = batch.map(async (product) => {
        try {
          const qrData = `${clientUrl}/product/${product._id}`;
          const qrCode = await QRCode.toDataURL(qrData);
          
          product.qrCode = qrCode;
          await product.save();
          
          return { success: true, product };
        } catch (error) {
          return { success: false, product, error: error.message };
        }
      });

      const results = await Promise.all(promises);

      // Natijalarni hisoblash
      results.forEach((result) => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
          console.error(`   ❌ ${result.product.name} - ${result.error}`);
        }
      });

      console.log(`   ✅ ${successCount}/${productsWithoutQR.length} bajarildi\n`);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 NATIJA:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Muvaffaqiyatli: ${successCount}`);
    console.log(`❌ Xatolik:        ${errorCount}`);
    console.log(`📱 Jami:           ${productsWithoutQR.length}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB ulanishi yopildi');
    process.exit(0);
  }
};

// Run script
fixQRCodes();
