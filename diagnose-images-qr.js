require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

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
  images: [String],
  qrCode: String,
  price: Number,
  quantity: Number
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

// Diagnostika
const diagnoseImagesAndQR = async () => {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 RASMLAR VA QR-CODELAR DIAGNOSTIKASI');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Mahsulotlar statistikasi
    const totalProducts = await Product.countDocuments();
    const productsWithImages = await Product.countDocuments({ images: { $exists: true, $ne: [] } });
    const productsWithQR = await Product.countDocuments({ qrCode: { $exists: true, $ne: null } });
    const productsWithoutImages = totalProducts - productsWithImages;
    const productsWithoutQR = totalProducts - productsWithQR;

    console.log('📊 UMUMIY STATISTIKA:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Jami mahsulotlar:        ${totalProducts}`);
    console.log(`├─ Rasmi bor:            ${productsWithImages} (${Math.round(productsWithImages/totalProducts*100)}%)`);
    console.log(`├─ Rasmi yo'q:           ${productsWithoutImages} (${Math.round(productsWithoutImages/totalProducts*100)}%)`);
    console.log(`├─ QR code bor:          ${productsWithQR} (${Math.round(productsWithQR/totalProducts*100)}%)`);
    console.log(`└─ QR code yo'q:         ${productsWithoutQR} (${Math.round(productsWithoutQR/totalProducts*100)}%)\n`);

    // 2. Uploads papkasini tekshirish
    const uploadsDir = path.join(__dirname, 'server/uploads/products');
    console.log('📁 UPLOADS PAPKASI:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Path: ${uploadsDir}`);
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      console.log(`✅ Papka mavjud`);
      console.log(`📸 Jami fayllar: ${files.length}`);
      
      if (files.length > 0) {
        console.log(`\nBirinchi 5 ta fayl:`);
        files.slice(0, 5).forEach((file, i) => {
          const filePath = path.join(uploadsDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  ${i + 1}. ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }
    } else {
      console.log(`❌ Papka topilmadi!`);
      console.log(`💡 Papka yaratish: mkdir -p ${uploadsDir}`);
    }
    console.log('');

    // 3. Rasmli mahsulotlarni tekshirish
    console.log('🖼️  RASMLI MAHSULOTLAR:');
    console.log('═══════════════════════════════════════════════════════');
    
    const productsWithImagesData = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    }).limit(10);

    if (productsWithImagesData.length > 0) {
      console.log(`Birinchi ${productsWithImagesData.length} ta rasmli mahsulot:\n`);
      
      productsWithImagesData.forEach((product, i) => {
        console.log(`${i + 1}. ${product.name} (${product.code})`);
        console.log(`   Rasmlar: ${product.images.length} ta`);
        product.images.forEach((img, j) => {
          console.log(`   ${j + 1}) ${img}`);
          
          // Fayl mavjudligini tekshirish
          const fullPath = path.join(__dirname, 'server', img);
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            console.log(`      ✅ Mavjud (${(stats.size / 1024).toFixed(2)} KB)`);
          } else {
            console.log(`      ❌ Fayl topilmadi!`);
          }
        });
        console.log('');
      });
    } else {
      console.log('⚠️  Rasmli mahsulotlar topilmadi\n');
    }

    // 4. QR code'li mahsulotlarni tekshirish
    console.log('📱 QR CODE\'LI MAHSULOTLAR:');
    console.log('═══════════════════════════════════════════════════════');
    
    const productsWithQRData = await Product.find({ 
      qrCode: { $exists: true, $ne: null } 
    }).limit(5);

    if (productsWithQRData.length > 0) {
      console.log(`Birinchi ${productsWithQRData.length} ta QR code'li mahsulot:\n`);
      
      productsWithQRData.forEach((product, i) => {
        console.log(`${i + 1}. ${product.name} (${product.code})`);
        console.log(`   QR Code: ${product.qrCode ? product.qrCode.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`   QR Type: ${product.qrCode ? (product.qrCode.startsWith('data:') ? 'Data URL' : 'File Path') : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  QR code\'li mahsulotlar topilmadi\n');
    }

    // 5. Environment variables tekshirish
    console.log('⚙️  ENVIRONMENT VARIABLES:');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`CLIENT_URL:      ${process.env.CLIENT_URL || 'N/A'}`);
    console.log(`CLIENT_URL_PROD: ${process.env.CLIENT_URL_PROD || 'N/A'}`);
    console.log(`PORT:            ${process.env.PORT || '8000'}`);
    console.log('');

    // 6. Muammolar va yechimlar
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 MUAMMOLAR VA YECHIMLAR:');
    console.log('═══════════════════════════════════════════════════════\n');

    const issues = [];

    if (productsWithoutImages > totalProducts * 0.5) {
      issues.push({
        problem: `${productsWithoutImages} ta mahsulotda rasm yo'q (${Math.round(productsWithoutImages/totalProducts*100)}%)`,
        solution: 'Admin paneldan mahsulotlarga rasm yuklang'
      });
    }

    if (productsWithoutQR > totalProducts * 0.5) {
      issues.push({
        problem: `${productsWithoutQR} ta mahsulotda QR code yo'q (${Math.round(productsWithoutQR/totalProducts*100)}%)`,
        solution: 'QR codelarni qayta yaratish: node regenerate-qr-codes.js'
      });
    }

    if (!fs.existsSync(uploadsDir)) {
      issues.push({
        problem: 'Uploads papkasi topilmadi',
        solution: `mkdir -p ${uploadsDir}`
      });
    }

    // Rasm yo'llari tekshiruvi
    const productsWithBrokenImages = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    });

    let brokenImagesCount = 0;
    for (const product of productsWithBrokenImages) {
      for (const img of product.images) {
        const fullPath = path.join(__dirname, 'server', img);
        if (!fs.existsSync(fullPath)) {
          brokenImagesCount++;
          break;
        }
      }
    }

    if (brokenImagesCount > 0) {
      issues.push({
        problem: `${brokenImagesCount} ta mahsulotda rasm fayli topilmadi`,
        solution: 'Rasmlarni qayta yuklang yoki notogri yollarni tuzating'
      });
    }

    if (issues.length === 0) {
      console.log('✅ Hech qanday muammo topilmadi!\n');
    } else {
      issues.forEach((issue, i) => {
        console.log(`${i + 1}. ❌ MUAMMO: ${issue.problem}`);
        console.log(`   💡 YECHIM: ${issue.solution}\n`);
      });
    }

    // 7. Tavsiyalar
    console.log('═══════════════════════════════════════════════════════');
    console.log('💡 TAVSIYALAR:');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('1. Rasmlar ishlamasa:');
    console.log('   • Server ishlab turganini tekshiring: http://localhost:8000');
    console.log('   • Uploads papkasini tekshiring: server/uploads/products');
    console.log('   • Browser console da xatolarni koring (F12)');
    console.log('   • VITE_UPLOADS_URL togri sozlanganini tekshiring\n');

    console.log('2. QR code ishlamasa:');
    console.log('   • QR codelarni qayta yaratish: node regenerate-qr-codes.js');
    console.log('   • CLIENT_URL togri sozlanganini tekshiring');
    console.log('   • QR scanner sahifasi ochilishini tekshiring\n');

    console.log('3. Yangi mahsulot qoshganda:');
    console.log('   • Rasm yuklash tugmasi ishlashini tekshiring');
    console.log('   • Multer middleware togri sozlanganini tekshiring');
    console.log('   • Sharp kutubxonasi ornatilganini tekshiring: npm install sharp\n');

    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Xatolik:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB ulanishi yopildi');
    process.exit(0);
  }
};

// Run diagnostics
diagnoseImagesAndQR();
