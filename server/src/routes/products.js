const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Vaqtni o'lchash middleware
router.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Lazy load sharp - only when needed
let sharp = null;
let sharpLoaded = false;

const getSharp = () => {
  if (!sharpLoaded) {
    try {
      sharp = require('sharp');
      console.log('✅ Sharp module loaded successfully');
    } catch (err) {
      console.warn('⚠️ Sharp module not found. Image compression will be skipped. Run: npm install sharp');
      sharp = null;
    }
    sharpLoaded = true;
  }
  return sharp;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    console.log(`📄 File filter: ${file.originalname}, ext: ${extname}, mime: ${mimetype}, type: ${file.mimetype}`);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    console.log(`❌ File rejected: ${file.originalname}`);
    cb(new Error('Faqat rasm fayllari ruxsat etilgan!'));
  }
});

// Kassa uchun alohida endpoint - token talab qilmaydi
router.get('/kassa', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    if (search) {
      // Agar qidiruv faqat raqamlardan iborat bo'lsa, kod bo'yicha qidirish
      const isNumericSearch = /^\d+$/.test(search);

      if (isNumericSearch) {
        query.$or = [
          { code: { $regex: `^${search}`, $options: 'i' } }, // Kod bilan boshlanadi (yuqori prioritet)
          { code: { $regex: search, $options: 'i' } }, // Kod tarkibida bor
          { name: { $regex: search, $options: 'i' } } // Nom ichida ham qidirish
        ];
      } else {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { code: search } // Aniq kod bo'yicha qidirish
        ];
      }
    }

    const products = await Product.find(query)
      .select('name code price quantity description warehouse isMainWarehouse')
      .populate('warehouse', 'name')
      .limit(search ? 50 : 1000)
      .lean()
      .hint({ code: 1 });
    
    // ⚡ Raqamli sort - JavaScript'da (1, 2, 3, 10, 100...)
    products.sort((a, b) => {
      const codeA = parseInt(a.code) || 999999;
      const codeB = parseInt(b.code) || 999999;
      
      // Agar ikkalasi ham raqam bo'lmasa, string sort
      if (codeA === 999999 && codeB === 999999) {
        return String(a.code).localeCompare(String(b.code));
      }
      
      return codeA - codeB;
    });

    // Filter out products with invalid or missing data
    const validProducts = products.filter(product => {
      // Juda qisqa nomli tovarlarni o'chirish (1-2 harf)
      const hasValidName = product.name &&
        product.name.trim().length > 2 &&
        product.name.trim() !== '';

      // Juda uzun kodli tovarlarni o'chirish (30+ belgi)
      const hasValidCode = product.code &&
        product.code.trim() !== '' &&
        product.code.trim().length < 30;

      // Narx va miqdor mavjudligi
      const hasValidData = product.price !== undefined &&
        product.quantity !== undefined;

      return hasValidName && hasValidCode && hasValidData;
    });

    console.log(`Kassa endpoint: Found ${products.length} total products, ${validProducts.length} valid products`);
    console.log(`Search query: "${search}", Results: ${validProducts.length}`);

    res.json(validProducts);
  } catch (error) {
    console.error('Kassa products error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun tovar qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { code, name, costPrice, price, quantity } = req.body;

    // Validatsiya
    if (!code || !name || !price) {
      return res.status(400).json({ message: 'Kod, nom va narx majburiy maydonlar' });
    }

    // Kod takrorlanishini tekshirish
    const existingProduct = await Product.findOne({ code: code.trim() });
    if (existingProduct) {
      return res.status(400).json({ message: 'Bu kod bilan tovar allaqachon mavjud' });
    }

    // Asosiy omborni topish
    let mainWarehouse = await Warehouse.findOne({ name: 'Asosiy ombor' });
    if (!mainWarehouse) {
      // Agar asosiy ombor yo'q bo'lsa, yaratish
      mainWarehouse = new Warehouse({
        name: 'Asosiy ombor',
        address: 'Asosiy ombor manzili'
      });
      await mainWarehouse.save();
    }

    const productData = {
      code: code.trim(),
      name: name.trim(),
      costPrice: parseFloat(costPrice) || 0,
      price: parseFloat(price),
      quantity: parseInt(quantity) || 0,
      warehouse: mainWarehouse._id,
      isMainWarehouse: true
    };

    const product = new Product(productData);
    await product.save();

    // QR code yaratish
    try {
      const qrData = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${product._id}`;
      const qrCode = await QRCode.toDataURL(qrData);
      product.qrCode = qrCode;
      await product.save();
    } catch (qrError) {
      console.error('QR code yaratish xatosi:', qrError);
    }

    // Populate qilib qaytarish
    await product.populate('warehouse', 'name');

    console.log(`Kassa: Yangi tovar qo'shildi - ${product.name} (${product.code})`);
    res.status(201).json(product);
  } catch (error) {
    console.error('Kassa add product error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, warehouse, mainOnly, kassaView, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const isNumericSearch = /^\d+$/.test(search);
      if (isNumericSearch) {
        query.$or = [
          { code: { $regex: `^${search}`, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      } else {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { code: { $regex: search, $options: 'i' } },
          { code: search }
        ];
      }
    }
    if (warehouse) query.warehouse = warehouse;
    if (mainOnly === 'true') query.isMainWarehouse = true;

    // Kassa view - tez va oddiy
    if (kassaView === 'true') {
      const products = await Product.find(query)
        .select('name code price quantity description warehouse isMainWarehouse qrCode')
        .populate('warehouse', 'name')
        .limit(search ? 50 : 10000)
        .lean();

      // ⚡ Raqamli sort
      products.sort((a, b) => {
        const codeA = parseInt(a.code) || 999999;
        const codeB = parseInt(b.code) || 999999;
        if (codeA === 999999 && codeB === 999999) {
          return String(a.code).localeCompare(String(b.code));
        }
        return codeA - codeB;
      });

      res.set('Cache-Control', 'public, max-age=300');
      return res.json(products);
    }

    // ⚡ PAGINATION - 20 tadan yuklash
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ⚡ ULTRA TEZKOR - Parallel query + Pagination
    const [total, rawProducts] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select('name code price quantity description warehouse isMainWarehouse unit images pricingTiers costPrice unitPrice boxPrice previousPrice currentPrice')
        .populate('warehouse', 'name')
        .skip(skip)
        .limit(limitNum)
        .lean() // 40% tezroq!
        .hint({ isMainWarehouse: 1, code: 1 }) // Compound index ishlatish
    ]);

    // ⚡ JavaScript'da raqamli sort (MongoDB'dan tezroq!)
    const products = rawProducts.sort((a, b) => {
      const codeA = parseInt(a.code) || 999999;
      const codeB = parseInt(b.code) || 999999;
      if (codeA === 999999 && codeB === 999999) {
        return String(a.code).localeCompare(String(b.code));
      }
      return codeA - codeB;
    });

    const totalPages = Math.ceil(total / limitNum);

    console.log(`⚡ PAGINATION: Sahifa ${pageNum}/${totalPages}, ${products.length} ta maxsulot ${Date.now() - req.startTime}ms da yuklandi`);

    // ⚡ Response headers - tezroq yuklash uchun
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('X-Content-Type-Options', 'nosniff');
    
    res.json({
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages,
        hasMore: pageNum < totalPages
      }
    });
  } catch (error) {
    console.error('❌ Error in GET /products:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Get next auto-generated code
router.get('/next-code', auth, async (req, res) => {
  try {
    const lastProduct = await Product.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    if (lastProduct && lastProduct.code) {
      const match = lastProduct.code.match(/(\d+)$/);
      if (match) {
        nextNum = parseInt(match[1]) + 1;
      }
    }
    res.json({ code: String(nextNum) });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Check if code exists
router.get('/check-code/:code', auth, async (req, res) => {
  try {
    const { excludeId } = req.query;
    const query = { code: req.params.code };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    const exists = await Product.findOne(query);
    res.json({ exists: !!exists });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// QR kod bo'yicha mahsulot qidirish - SCANNER UCHUN
router.get('/scan-qr/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log(`🔍 QR Scanner: Mahsulot qidirilmoqda - ${code}`);
    
    // Mahsulotni kod yoki ID bo'yicha qidirish
    let query = { code: code };
    
    // Agar MongoDB ObjectId formatida bo'lsa, ID bo'yicha ham qidirish
    if (code.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ code: code }, { _id: code }] };
    }
    
    const product = await Product.findOne(query)
      .populate('warehouse', 'name location');
    
    if (!product) {
      console.log(`❌ QR Scanner: Mahsulot topilmadi - ${code}`);
      return res.status(404).json({ 
        success: false,
        message: 'Mahsulot topilmadi',
        code: code
      });
    }
    
    console.log(`✅ QR Scanner: Mahsulot topildi - ${product.name}`);
    
    // Mahsulot ma'lumotlarini to'g'ridan-to'g'ri qaytarish (product object)
    res.json(product);
  } catch (error) {
    console.error('❌ QR Scanner xatosi:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Upload images for product - admin va kassa uchun
router.post('/upload-images', auth, authorize('admin', 'cashier'), upload.array('images', 8), async (req, res) => {
  try {
    console.log('📸 Rasm upload so\'rovi keldi');
    console.log('Files:', req.files?.length || 0);
    console.log('User role:', req.user?.role);
    
    if (!req.files || req.files.length === 0) {
      console.log('❌ Rasm fayllar topilmadi');
      return res.status(400).json({ message: 'Rasm yuklanmadi' });
    }
    
    console.log('✅ Rasmlar yuklandi:', req.files.map(f => ({ name: f.filename, size: f.size })));
    
    // Compress images using sharp (if available)
    const imagePaths = [];
    const sharpLib = getSharp();
    
    // Kim yuklayotganini aniqlash
    const uploadedBy = req.user?.role === 'cashier' ? 'cashier' : 'admin';
    
    if (sharpLib) {
      for (const file of req.files) {
        try {
          const inputPath = file.path;
          const ext = path.extname(file.originalname).toLowerCase();
          
          // Determine output format and quality
          let outputFormat = 'jpeg';
          let quality = 80;
          
          if (ext === '.png') {
            outputFormat = 'png';
            quality = 80;
          } else if (ext === '.webp') {
            outputFormat = 'webp';
            quality = 80;
          }
          
          // Compress and optimize image
          const compressedBuffer = await sharpLib(inputPath)
            .rotate() // Auto-rotate based on EXIF data
            .resize(1920, 1920, {
              fit: 'inside',
              withoutEnlargement: true
            })
            [outputFormat]({ quality })
            .toBuffer();
          
          // Write compressed image back
          fs.writeFileSync(inputPath, compressedBuffer);
          
          const compressedSize = fs.statSync(inputPath).size;
          console.log(`✅ Rasm siqildi: ${file.filename} (${(compressedSize / 1024).toFixed(2)} KB)`);
          
          imagePaths.push({
            path: `/uploads/products/${file.filename}`,
            uploadedBy: uploadedBy,
            uploadedAt: new Date()
          });
        } catch (compressionError) {
          console.error(`⚠️ Rasm siqishda xatolik: ${file.filename}`, compressionError);
          // Agar siqish xatosi bo'lsa, asl rasmni saqlab qolish
          imagePaths.push({
            path: `/uploads/products/${file.filename}`,
            uploadedBy: uploadedBy,
            uploadedAt: new Date()
          });
        }
      }
    } else {
      // Sharp not available - use original files
      console.log('⚠️ Sharp module not available, using original images');
      for (const file of req.files) {
        imagePaths.push({
          path: `/uploads/products/${file.filename}`,
          uploadedBy: uploadedBy,
          uploadedAt: new Date()
        });
      }
    }
    
    console.log('📦 Rasm pathlar:', imagePaths);
    
    res.json({ images: imagePaths });
  } catch (error) {
    console.error('❌ Upload xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Delete image - admin va kassa uchun (kassa faqat o'z rasmlarini o'chirishi mumkin)
router.delete('/delete-image', auth, async (req, res) => {
  console.log('🔍 DELETE /delete-image request received');
  console.log('User:', req.user);
  console.log('Body:', req.body);
  try {
    const { imagePath, productId } = req.body;
    if (!imagePath) return res.status(400).json({ message: 'Rasm yo\'li ko\'rsatilmagan' });

    // Agar productId berilgan bo'lsa, mahsulotdan ham o'chirish
    if (productId) {
      // Mahsulotni topish
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: 'Mahsulot topilmadi' });
      }

      // Rasmni topish
      const imageIndex = product.images.findIndex(img => {
        // Eski format (string) yoki yangi format (object)
        const imgPath = typeof img === 'string' ? img : img.path;
        return imgPath === imagePath;
      });

      if (imageIndex === -1) {
        return res.status(404).json({ message: 'Rasm topilmadi' });
      }

      const imageToDelete = product.images[imageIndex];
      const uploadedBy = typeof imageToDelete === 'string' ? 'admin' : imageToDelete.uploadedBy;

      // Agar kassa bo'lsa, faqat o'z rasmlarini o'chirishi mumkin
      if (req.user.role === 'cashier' && uploadedBy !== 'cashier') {
        return res.status(403).json({ message: 'Siz faqat o\'zingiz yuklagan rasmlarni o\'chirishingiz mumkin' });
      }

      // Rasmni mahsulotdan o'chirish
      product.images.splice(imageIndex, 1);
      await product.save();
      console.log(`✅ Rasm mahsulotdan o'chirildi: ${imagePath}`);
    }

    // Rasmni fayldan o'chirish
    const fullPath = path.join(__dirname, '../..', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      console.log(`✅ Rasm fayl o'chirildi: ${imagePath}`);
    } else {
      console.log(`⚠️ Rasm fayl topilmadi: ${fullPath}`);
    }

    res.json({ message: 'Rasm o\'chirildi', success: true });
  } catch (error) {
    console.error('❌ Rasm o\'chirishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Umumiy statistika - barcha mahsulotlar uchun (cache qilinadi)
router.get('/overall-stats', auth, async (req, res) => {
  try {
    // Barcha mahsulotlarni bir marta olish
    const allProducts = await Product.find({}).lean();
    
    const stats = {
      total: allProducts.length,
      lowStock: allProducts.filter(p => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
      outOfStock: allProducts.filter(p => p.quantity === 0).length,
      totalValue: allProducts.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Statistikani yuklashda xatolik', error: error.message });
  }
});

// Mahsulot statistikasi - sotuv tarixi
router.get('/stats/:id', auth, async (req, res) => {
  try {
    const Receipt = require('../models/Receipt');
    const productId = req.params.id;
    const { period } = req.query; // 7, 30, 90, 365, 'all'
    
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });

    // Davr bo'yicha filter
    let dateFilter = {};
    const now = new Date();
    if (period && period !== 'all') {
      const days = parseInt(period);
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - days);
      dateFilter = { createdAt: { $gte: startDate } };
    }

    // Barcha sotuvlarni olish (bu mahsulot qatnashgan)
    const receipts = await Receipt.find({
      'items.product': productId,
      status: 'completed',
      ...dateFilter
    }).sort({ createdAt: -1 }).populate('customer', 'name phone');

    // Statistikalarni hisoblash
    let totalSold = 0;
    let totalRevenue = 0;
    const salesByDate = {};
    const salesByHour = {};
    const salesByMonth = {};
    const salesHistory = [];

    receipts.forEach(receipt => {
      const item = receipt.items.find(i => i.product?.toString() === productId);
      if (item) {
        totalSold += item.quantity;
        totalRevenue += item.price * item.quantity;

        // Sana bo'yicha
        const date = new Date(receipt.createdAt).toLocaleDateString('uz-UZ');
        if (!salesByDate[date]) salesByDate[date] = { count: 0, revenue: 0 };
        salesByDate[date].count += item.quantity;
        salesByDate[date].revenue += item.price * item.quantity;

        // Oy bo'yicha
        const monthKey = new Date(receipt.createdAt).toISOString().slice(0, 7); // YYYY-MM
        if (!salesByMonth[monthKey]) salesByMonth[monthKey] = { count: 0, revenue: 0 };
        salesByMonth[monthKey].count += item.quantity;
        salesByMonth[monthKey].revenue += item.price * item.quantity;

        // Soat bo'yicha
        const hour = new Date(receipt.createdAt).getHours();
        if (!salesByHour[hour]) salesByHour[hour] = { count: 0, revenue: 0 };
        salesByHour[hour].count += item.quantity;
        salesByHour[hour].revenue += item.price * item.quantity;

        // Tarix
        salesHistory.push({
          date: receipt.createdAt,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          customer: receipt.customer,
          receiptId: receipt._id
        });
      }
    });

    // Eng ko'p sotilgan kun
    let bestDay = null;
    let bestDayCount = 0;
    Object.entries(salesByDate).forEach(([date, data]) => {
      if (data.count > bestDayCount) {
        bestDayCount = data.count;
        bestDay = date;
      }
    });

    // Eng ko'p sotilgan soat
    let bestHour = null;
    let bestHourCount = 0;
    Object.entries(salesByHour).forEach(([hour, data]) => {
      if (data.count > bestHourCount) {
        bestHourCount = data.count;
        bestHour = parseInt(hour);
      }
    });

    // Davr bo'yicha kunlik statistika
    const days = period === 'all' ? 365 : (parseInt(period) || 7);
    const periodStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('uz-UZ');
      const isoDate = date.toISOString().split('T')[0];
      periodStats.push({
        date: isoDate,
        count: salesByDate[dateStr]?.count || 0,
        revenue: salesByDate[dateStr]?.revenue || 0
      });
    }

    // Oylik statistika (yillik ko'rinish uchun)
    const monthlyStats = Object.entries(salesByMonth)
      .map(([month, data]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('uz-UZ', { year: 'numeric', month: 'short' }),
        count: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Soatlar bo'yicha (0-23)
    const hourlyStats = [];
    for (let h = 0; h < 24; h++) {
      hourlyStats.push({
        hour: h,
        label: `${h}:00`,
        count: salesByHour[h]?.count || 0,
        revenue: salesByHour[h]?.revenue || 0
      });
    }

    res.json({
      product: {
        _id: product._id,
        name: product.name,
        code: product.code,
        price: product.price,
        quantity: product.quantity
      },
      stats: {
        totalSold,
        totalRevenue,
        totalReceipts: receipts.length,
        averagePerSale: receipts.length > 0 ? Math.round(totalSold / receipts.length) : 0,
        bestDay: bestDay ? { date: bestDay, count: bestDayCount } : null,
        bestHour: bestHour !== null ? { hour: bestHour, label: `${bestHour}:00 - ${bestHour + 1}:00`, count: bestHourCount } : null
      },
      periodStats,
      monthlyStats,
      hourlyStats,
      recentSales: salesHistory.slice(0, 50) // Oxirgi 50 ta sotuv
    });
  } catch (error) {
    console.error('Product stats error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Public endpoint - QR code skanerlash uchun (auth talab qilmaydi)
router.get('/public/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('warehouse', 'name');
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });

    // Asosiy dona narx (yoki baza narx)
    const basePrice = product.unitPrice || product.price || 0;

    // 3 ta chegirmali narxni hisoblash
    let tierPrices = undefined;
    const tiers = product.pricingTiers || {};

    const buildTierPrice = (tier) => {
      if (!tier) return null;
      const minQ = tier.minQuantity || 0;
      const maxQ = tier.maxQuantity || 0;
      const discount = tier.discountPercent || 0;
      const finalPrice = Math.round(basePrice * (1 - discount / 100));
      return {
        minQuantity: minQ,
        maxQuantity: maxQ,
        discountPercent: discount,
        price: finalPrice
      };
    };

    const tier1 = buildTierPrice(tiers.tier1);
    const tier2 = buildTierPrice(tiers.tier2);
    const tier3 = buildTierPrice(tiers.tier3);

    if (tier1 || tier2 || tier3) {
      tierPrices = { tier1, tier2, tier3 };
    }

    // Faqat kerakli ma'lumotlarni qaytarish
    res.json({
      _id: product._id,
      code: product.code,
      name: product.name,
      description: product.description || '',
      price: basePrice,
      costPrice: product.costPrice,
      quantity: product.quantity,
      unit: product.unit,
      images: product.images,
      dimensions: product.dimensions,
      warehouse: product.warehouse,
      createdAt: product.createdAt,
      ...(tierPrices ? { tierPrices } : {})
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Clean up invalid products (admin only)
router.delete('/cleanup-invalid', auth, authorize('admin'), async (req, res) => {
  try {
    // Find products with invalid data
    const allProducts = await Product.find({});
    const invalidProducts = allProducts.filter(product => {
      const hasInvalidName = !product.name ||
        product.name.trim().length <= 2 ||
        product.name.trim() === '';

      const hasInvalidCode = !product.code ||
        product.code.trim() === '' ||
        product.code.trim().length > 30;

      return hasInvalidName || hasInvalidCode;
    });

    console.log(`Found ${invalidProducts.length} invalid products to delete`);

    // Delete invalid products
    const deletePromises = invalidProducts.map(product =>
      Product.findByIdAndDelete(product._id)
    );

    await Promise.all(deletePromises);

    res.json({
      message: `${invalidProducts.length} ta noto'g'ri tovar o'chirildi`,
      deletedCount: invalidProducts.length,
      deletedProducts: invalidProducts.map(p => ({ id: p._id, name: p.name, code: p.code }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Mahsulot miqdorini kamaytirish - kassa uchun
router.put('/:id/reduce-quantity', async (req, res) => {
  try {
    console.log(`Miqdor kamaytirish so'rovi keldi: ID=${req.params.id}, Body:`, req.body);

    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      console.log('Noto\'g\'ri miqdor:', quantity);
      return res.status(400).json({ message: 'Noto\'g\'ri miqdor' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      console.log('Tovar topilmadi:', req.params.id);
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }

    console.log(`Tovar topildi: ${product.name}, Hozirgi miqdor: ${product.quantity}, Kamaytirilishi kerak: ${quantity}`);

    // Miqdorni tekshirish
    if (product.quantity < quantity) {
      console.log(`Yetarli miqdor yo'q: Mavjud=${product.quantity}, So'ralgan=${quantity}`);
      return res.status(400).json({
        message: `Yetarli miqdor yo'q. Mavjud: ${product.quantity}, So'ralgan: ${quantity}`,
        availableQuantity: product.quantity,
        requestedQuantity: quantity
      });
    }

    // Miqdorni kamaytirish
    const oldQuantity = product.quantity;
    product.quantity -= quantity;
    await product.save();

    console.log(`✅ ${product.name} mahsuloti miqdori ${quantity} ta kamaytirildi. Eski: ${oldQuantity}, Yangi: ${product.quantity}`);

    res.json({
      message: 'Miqdor muvaffaqiyatli kamaytirildi',
      product: {
        id: product._id,
        name: product.name,
        code: product.code,
        previousQuantity: oldQuantity,
        newQuantity: product.quantity,
        reducedBy: quantity
      }
    });
  } catch (error) {
    console.error('Miqdorni kamaytirish xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Get product by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('warehouse', 'name');
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { warehouse, code, packageInfo, costPriceInDollar, dollarRate, images, ...rest } = req.body;

    // Auto-generate code if not provided
    let productCode = code;
    if (!productCode) {
      const lastProduct = await Product.findOne().sort({ createdAt: -1 });
      let nextNum = 1;
      if (lastProduct && lastProduct.code) {
        const match = lastProduct.code.match(/(\d+)$/);
        if (match) {
          nextNum = parseInt(match[1]) + 1;
        }
      }
      productCode = String(nextNum);
    }

    // Check if code already exists
    const existingProduct = await Product.findOne({ code: productCode });
    if (existingProduct) {
      return res.status(400).json({ message: `Kod "${productCode}" allaqachon mavjud` });
    }

    // Check if warehouse is "Asosiy ombor"
    let isMainWarehouse = false;
    let finalWarehouse = warehouse;
    
    if (warehouse) {
      const warehouseDoc = await Warehouse.findById(warehouse);
      if (warehouseDoc && warehouseDoc.name === 'Asosiy ombor') {
        isMainWarehouse = true;
      }
    } else {
      // Agar warehouse berilmasa, asosiy omborni topish
      const mainWarehouse = await Warehouse.findOne({ name: 'Asosiy ombor' });
      if (mainWarehouse) {
        finalWarehouse = mainWarehouse._id;
        isMainWarehouse = true;
      }
    }

    // Rasmlarni to'g'ri formatga o'tkazish
    let formattedImages = [];
    if (images && Array.isArray(images)) {
      formattedImages = images.map(img => {
        // Agar string bo'lsa, object ga o'tkazish
        if (typeof img === 'string') {
          return {
            path: img,
            uploadedBy: 'admin',
            uploadedAt: new Date()
          };
        }
        // Agar object bo'lsa, to'g'ridan-to'g'ri qaytarish
        return img;
      });
    }

    // Prepare product data
    const productData = {
      ...rest,
      code: productCode,
      warehouse: finalWarehouse,
      isMainWarehouse,
      createdBy: req.user._id,
      costPriceInDollar: costPriceInDollar || 0,
      dollarRate: dollarRate || 12500,
      images: formattedImages
    };

    // Add package information if provided
    if (packageInfo) {
      productData.packages = [packageInfo];
    }

    console.log('📝 Tovar qo\'shilmoqda. Ma\'lumotlar:', {
      code: productCode,
      name: productData.name,
      warehouse: finalWarehouse,
      isMainWarehouse,
      quantity: productData.quantity,
      price: productData.price,
      imagesCount: formattedImages.length
    });

    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Tovar MongoDB ga saqland:', {
      _id: product._id,
      code: product.code,
      name: product.name,
      isMainWarehouse: product.isMainWarehouse,
      warehouse: product.warehouse,
      imagesCount: product.images?.length || 0
    });
    
    // Populate warehouse before returning
    await product.populate('warehouse', 'name');
    
    // QR code yaratish
    try {
      const qrData = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${product._id}`;
      const qrCode = await QRCode.toDataURL(qrData);
      product.qrCode = qrCode;
      await product.save();
      console.log('✅ QR code yaratildi:', product._id);
    } catch (qrError) {
      console.error('⚠️ QR code yaratish xatosi:', qrError);
      // QR code xatosi bo'lsa ham mahsulot saqlanadi
    }
    
    console.log(`✅ Yangi tovar qo'shildi: ${product.name} (${product.code}), isMainWarehouse: ${product.isMainWarehouse}, images: ${product.images?.length || 0}`);
    res.status(201).json(product);
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun - faqat rasmlarni yangilash
router.put('/:id/images', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { images } = req.body;
    
    if (!images || !Array.isArray(images)) {
      return res.status(400).json({ message: 'Rasmlar ro\'yxati talab qilinadi' });
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { images },
      { new: true }
    ).populate('warehouse');
    
    if (!product) {
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Image update error:', error);
    res.status(500).json({ message: 'Rasmlarni yangilashda xatolik', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('🔍 PUT /:id request received for ID:', req.params.id);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Images field:', req.body.images);
    const { warehouse, code, packageInfo, images, ...rest } = req.body;

    // Check if code already exists (excluding current product)
    if (code) {
      const existingProduct = await Product.findOne({ code, _id: { $ne: req.params.id } });
      if (existingProduct) {
        return res.status(400).json({ message: `Kod "${code}" allaqachon mavjud` });
      }
    }

    // Check if warehouse is "Asosiy ombor"
    let isMainWarehouse = false;
    if (warehouse) {
      const warehouseDoc = await Warehouse.findById(warehouse);
      if (warehouseDoc && warehouseDoc.name === 'Asosiy ombor') {
        isMainWarehouse = true;
      }
    }

    // Rasmlarni to'g'ri formatga o'tkazish
    let formattedImages = undefined;
    if (images && Array.isArray(images)) {
      formattedImages = images.map(img => {
        // Agar string bo'lsa, object ga o'tkazish
        if (typeof img === 'string') {
          return {
            path: img,
            uploadedBy: 'admin',
            uploadedAt: new Date()
          };
        }
        // Agar object bo'lsa, to'g'ridan-to'g'ri qaytarish
        return img;
      });
    }

    // Prepare update data
    const { costPriceInDollar, dollarRate, ...updateRest } = rest;
    const updateData = { 
      ...updateRest, 
      code, 
      warehouse, 
      isMainWarehouse,
      costPriceInDollar: costPriceInDollar || 0,
      dollarRate: dollarRate || 12500
    };

    // Agar rasmlar bo'lsa, qo'shish
    if (formattedImages) {
      updateData.images = formattedImages;
    }

    // Add package information if provided
    if (packageInfo) {
      const product = await Product.findById(req.params.id);
      if (product) {
        updateData.packages = [...(product.packages || []), packageInfo];
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    
    // QR code yaratish (agar yo'q bo'lsa yoki code o'zgargan bo'lsa)
    if (!product.qrCode || code) {
      try {
        const qrData = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${product._id}`;
        const qrCode = await QRCode.toDataURL(qrData);
        product.qrCode = qrCode;
        await product.save();
      } catch (qrError) {
        console.error('QR code yaratish xatosi:', qrError);
      }
    }
    
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    res.json({ message: 'Tovar o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
