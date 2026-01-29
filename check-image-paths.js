const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

const Product = require('./server/src/models/Product');

async function checkImagePaths() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB ga ulandi');

    // Rasmli mahsulotlarni topish
    const productsWithImages = await Product.find({ 
      images: { $exists: true, $ne: [] } 
    }).limit(10);

    console.log(`\n📊 Jami ${productsWithImages.length} ta rasmli mahsulot topildi\n`);

    productsWithImages.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} (${product.code})`);
      console.log('   Rasmlar:');
      product.images.forEach((img, imgIndex) => {
        if (typeof img === 'string') {
          console.log(`   ${imgIndex + 1}. STRING: ${img}`);
        } else {
          console.log(`   ${imgIndex + 1}. OBJECT: ${JSON.stringify(img)}`);
        }
      });
      console.log('');
    });

    // localhost:5000 bilan boshlanadigan rasmlarni topish
    const productsWithLocalhost = await Product.find({
      $or: [
        { 'images': { $regex: 'localhost:5000' } },
        { 'images.path': { $regex: 'localhost:5000' } }
      ]
    });

    console.log(`\n⚠️ localhost:5000 bilan ${productsWithLocalhost.length} ta mahsulot topildi\n`);

    if (productsWithLocalhost.length > 0) {
      console.log('Noto\'g\'ri yo\'lli mahsulotlar:');
      productsWithLocalhost.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name} (${product.code})`);
        product.images.forEach((img, imgIndex) => {
          const imgPath = typeof img === 'string' ? img : img.path;
          if (imgPath.includes('localhost:5000')) {
            console.log(`   ❌ ${imgPath}`);
          }
        });
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ MongoDB dan uzildi');
  } catch (error) {
    console.error('❌ Xatolik:', error);
    process.exit(1);
  }
}

checkImagePaths();
