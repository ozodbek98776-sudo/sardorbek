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
    const { search, page = 1, limit = 10, category } = req.query; // 10 ta mahsulot
    const query = {};

    // ✅ Kategoriya filtri qo'shish
    if (category && typeof category === 'string' && category.trim() !== '') {
      query.category = category.trim();
    }

    // Search query faqat string va bo'sh bo'lmasa
    if (search && typeof search === 'string' && search.trim() !== '' && search !== 'undefined') {
      const searchTerm = search.trim();
      // Agar qidiruv faqat raqamlardan iborat bo'lsa, kod bo'yicha qidirish
      const isNumericSearch = /^\d+$/.test(searchTerm);

      if (isNumericSearch) {
        query.$or = [
          { code: { $regex: `^${searchTerm}`, $options: 'i' } }, // Kod bilan boshlanadi (yuqori prioritet)
          { code: { $regex: searchTerm, $options: 'i' } }, // Kod tarkibida bor
          { name: { $regex: searchTerm, $options: 'i' } } // Nom ichida ham qidirish
        ];
      } else {
        query.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { code: { $regex: searchTerm, $options: 'i' } },
          { code: searchTerm } // Aniq kod bo'yicha qidirish
        ];
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Total count - statistika uchun
    const total = await Product.countDocuments(query);

    // Minimal ma'lumotlar - faqat card uchun kerakli
    const products = await Product.find(query)
      .select('name code price quantity images prices unit category') // prices array + code qo'shildi
      .limit(limitNum)
      .skip(skip)
      .lean();
    
    // ✅ Validatsiyani o'chirish - barcha mahsulotlar chiqsin (Products sahifasi kabi)
    // Faqat nom va kod bo'lsa yetarli
    const validProducts = products.filter(product => {
      const hasValidName = product.name &&
        product.name.trim().length >= 1 &&
        product.name.trim() !== '';

      const hasValidCode = product.code &&
        product.code.trim() !== '' &&
        product.code.trim().length <= 30;

      return hasValidName && hasValidCode;
    });

    console.log(`Kassa endpoint: Page ${pageNum}/${Math.ceil(total / limitNum)}, Found ${validProducts.length} products`);
    if (search && search !== 'undefined') {
      console.log(`Search query: "${search}", Results: ${validProducts.length}`);
    }

    // ✅ Cache header'ni o'chirish (har doim yangi ma'lumot)
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      products: validProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
        hasMore: pageNum < Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Kassa products error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun tovar qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { code, name, costPrice, price, quantity, category, section } = req.body;

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
      isMainWarehouse: true,
      category: category || 'Boshqa',
      section: section || 'Boshqa'
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

    // ✅ Socket.IO event emit qilish
    if (global.io) {
      global.io.emit('product:created', product);
      console.log('📡 Socket emit: product:created (POST /kassa)');
    }

    // ✅ Cache tozalash
    statsCache = null;

    console.log(`Kassa: Yangi tovar qo'shildi - ${product.name} (${product.code})`);
    res.status(201).json(product);
  } catch (error) {
    console.error('Kassa add product error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// ⚡ Search statistics endpoint - DB dagi jami mahsulotlar soni (search bo'yicha)
router.get('/search-stats', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};

    console.log(`📊 Search stats request: search="${search}"`);

    // Search filter
    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = search.trim();
      const isNumericSearch = /^\d+$/.test(searchTerm);
      
      if (isNumericSearch) {
        query.$or = [
          { code: { $regex: `^${searchTerm}`, $options: 'i' } },
          { code: { $regex: searchTerm, $options: 'i' } },
          { name: { $regex: searchTerm, $options: 'i' } }
        ];
      } else {
        query.$or = [
          { name: { $regex: searchTerm, $options: 'i' } },
          { code: { $regex: searchTerm, $options: 'i' } }
        ];
      }
    }

    console.log(`📊 Query: ${JSON.stringify(query)}`);

    // ⚡ DB dagi jami mahsulotlar soni (search bo'yicha)
    const stats = await Product.aggregate([
      { $match: query },
      {
        $facet: {
          total: [{ $count: 'count' }],
          lowStock: [
            { $match: { quantity: { $gt: 0, $lte: 50 } } },
            { $count: 'count' }
          ],
          outOfStock: [
            { $match: { quantity: 0 } },
            { $count: 'count' }
          ],
          totalValue: [
            {
              $group: {
                _id: null,
                value: {
                  $sum: {
                    $multiply: [
                      { $ifNull: ['$unitPrice', { $ifNull: ['$price', 0] }] },
                      '$quantity'
                    ]
                  }
                }
              }
            }
          ]
        }
      }
    ]);

    console.log(`📊 Aggregation result:`, stats);

    const result = {
      total: stats[0]?.total[0]?.count || 0,
      lowStock: stats[0]?.lowStock[0]?.count || 0,
      outOfStock: stats[0]?.outOfStock[0]?.count || 0,
      totalValue: stats[0]?.totalValue[0]?.value || 0
    };

    console.log(`📊 Search statistics (${search || 'all'}):`, result);
    res.json(result);
  } catch (error) {
    console.error('❌ Error in GET /products/search-stats:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, warehouse, mainOnly, kassaView, category, subcategory, page = 1, limit = 10, lowStock, stockFilter } = req.query;
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
    if (category) query.category = category;
    if (subcategory) query.subcategory = subcategory;
    
    // ⚡ STOCK FILTER - Backend da filter qilish
    if (stockFilter === 'low') {
      query.quantity = { $gt: 0, $lte: 50 };
    } else if (stockFilter === 'out') {
      query.quantity = 0;
    } else if (lowStock === 'true') {
      // Eski format uchun
      query.quantity = { $gt: 0, $lte: 50 };
    }

    // ⚡ KASSA VIEW - ULTRA MINIMAL + PAGINATION
    if (kassaView === 'true') {
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 50; // 50 ta mahsulot
      
      // Birinchi barcha mahsulotlarni olish va filter qilish
      const allProducts = await Product.find(query)
        .select('name code price unitPrice quantity images category section prices')
        .lean()
        .hint({ code: 1 });

      // Filter out products with invalid or missing data
      const validProducts = allProducts.filter(product => {
        // Juda qisqa nomli tovarlarni o'chirish (1 harf)
        const hasValidName = product.name &&
          product.name.trim().length > 0 &&
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

      // Raqamli sort - JavaScript'da
      validProducts.sort((a, b) => {
        const codeA = parseInt(a.code) || 999999;
        const codeB = parseInt(b.code) || 999999;
        if (codeA === 999999 && codeB === 999999) {
          return String(a.code).localeCompare(String(b.code));
        }
        return codeA - codeB;
      });

      // Pagination
      const skip = (pageNum - 1) * limitNum;
      const paginatedProducts = validProducts.slice(skip, skip + limitNum);
      const total = validProducts.length;

      res.set('Cache-Control', 'public, max-age=60'); // 1 daqiqa cache
      res.set('X-Content-Type-Options', 'nosniff');
      
      return res.json({
        products: paginatedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
          hasMore: pageNum < Math.ceil(total / limitNum)
        }
      });
    }

    // ⚡ PAGINATION - Admin uchun
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // ⚡ Parallel query
    const [total, rawProducts] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query)
        .select('name price quantity description warehouse isMainWarehouse unit images pricingTiers costPrice unitPrice boxPrice previousPrice currentPrice category subcategory prices boxInfo')
        .populate('warehouse', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
    ]);

    const totalPages = Math.ceil(total / limitNum);

    console.log(`⚡ PAGINATION: Sahifa ${pageNum}/${totalPages}, ${rawProducts.length} ta maxsulot ${Date.now() - req.startTime}ms da yuklandi`);

    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('X-Content-Type-Options', 'nosniff');
    
    res.json({
      data: rawProducts,
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

// QR kod bo'yicha mahsulot qidirish - SCANNER UCHUN
router.get('/scan-qr/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    
    console.log(`🔍 QR Scanner: Mahsulot qidirilmoqda - ${code}`);
    
    // Mahsulotni ID bo'yicha qidirish
    let query = { _id: code };
    
    // Agar MongoDB ObjectId formatida bo'lmasa, qidiruv qilmaylik
    if (!code.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(404).json({ 
        success: false,
        message: 'Mahsulot topilmadi',
        code: code
      });
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
    
    // MUAMMO 4 YECHIMI: Sharp mavjud emasligini log qilish
    if (!sharpLib) {
      console.warn('⚠️ Sharp module not available - images will not be compressed');
      console.warn('⚠️ To enable compression, run: npm install sharp');
    }
    
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
          const compressedBuffer = await sharpLib(inputPath, { failOn: 'none' })
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
          
          // MUAMMO 3 YECHIMI: Consistent format - faqat path string qaytarish
          imagePaths.push(`/uploads/products/${file.filename}`);
        } catch (compressionError) {
          console.error(`⚠️ Rasm siqishda xatolik: ${file.filename}`, compressionError);
          // Agar siqish xatosi bo'lsa, asl rasmni saqlab qolish
          imagePaths.push(`/uploads/products/${file.filename}`);
        }
      }
    } else {
      // Sharp not available - use original files
      for (const file of req.files) {
        imagePaths.push(`/uploads/products/${file.filename}`);
      }
    }
    
    console.log('📦 Rasm pathlar:', imagePaths);
    
    // Consistent response format - faqat path stringlar array
    res.json({ images: imagePaths });
  } catch (error) {
    console.error('❌ Upload xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// MUAMMO 5 YECHIMI: Cleanup unused images - bekor qilingan rasmlarni o'chirish
router.post('/cleanup-images', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { imagePaths } = req.body;
    
    if (!imagePaths || !Array.isArray(imagePaths) || imagePaths.length === 0) {
      return res.status(400).json({ message: 'Rasm yo\'llari ko\'rsatilmagan' });
    }
    
    console.log('🧹 Cleaning up unused images:', imagePaths);
    
    const deletedFiles = [];
    const errors = [];
    
    for (const imagePath of imagePaths) {
      try {
        // Path ni normalizatsiya qilish
        let filePath = imagePath;
        if (filePath.startsWith('/uploads/')) {
          filePath = filePath.replace('/uploads/', '');
        }
        
        const fullPath = path.join(__dirname, '../../uploads', filePath);
        
        // Fayl mavjudligini tekshirish
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          deletedFiles.push(imagePath);
          console.log(`✅ O'chirildi: ${imagePath}`);
        } else {
          console.warn(`⚠️ Fayl topilmadi: ${fullPath}`);
        }
      } catch (err) {
        console.error(`❌ O'chirishda xatolik: ${imagePath}`, err);
        errors.push({ path: imagePath, error: err.message });
      }
    }
    
    res.json({ 
      success: true, 
      deleted: deletedFiles.length,
      deletedFiles,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('❌ Cleanup xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Delete image - admin va kassa uchun (kassa faqat o'z rasmlarini o'chirishi mumkin)
router.delete('/delete-image', auth, async (req, res) => {
  console.log('🔍 DELETE /delete-image request received');
  console.log('User:', req.user);
  console.log('Body:', req.body);
  try {
    // req.user mavjudligini tekshirish
    if (!req.user) {
      console.error('❌ req.user undefined - auth middleware ishlamadi');
      return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
    }

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
let cachedStats = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 daqiqa

router.get('/overall-stats', auth, async (req, res) => {
  try {
    console.log('📊 Overall stats so\'rovi keldi...');
    
    // Cache tekshirish
    const now = Date.now();
    if (cachedStats && cacheTime && (now - cacheTime) < CACHE_DURATION) {
      console.log('✅ Cache dan qaytarildi');
      return res.json(cachedStats);
    }
    
    console.log('🔄 Yangi statistika hisoblanmoqda...');
    
    // MongoDB aggregation pipeline - tezroq hisoblash
    const stats = await Product.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          lowStock: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $lte: ['$quantity', { $ifNull: ['$minStock', 50] }] },
                    { $gt: ['$quantity', 0] }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStock: {
            $sum: {
              $cond: [{ $eq: ['$quantity', 0] }, 1, 0]
            }
          },
          totalValue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$currentPrice', { $ifNull: ['$unitPrice', { $ifNull: ['$price', 0] }] }] },
                { $ifNull: ['$quantity', 0] }
              ]
            }
          }
        }
      }
    ]);
    
    const result = stats.length > 0 ? {
      total: stats[0].total || 0,
      lowStock: stats[0].lowStock || 0,
      outOfStock: stats[0].outOfStock || 0,
      totalValue: Math.round(stats[0].totalValue || 0)
    } : {
      total: 0,
      lowStock: 0,
      outOfStock: 0,
      totalValue: 0
    };
    
    console.log('📊 Hisoblangan statistika:', result);
    
    // Cache ga saqlash
    cachedStats = result;
    cacheTime = now;
    
    res.json(result);
  } catch (error) {
    console.error('❌ Overall stats error:', error);
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
    console.log('🔍 POST / request received');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Prices field:', req.body.prices);
    const { warehouse, code, packageInfo, costPriceInDollar, dollarRate, images, discounts, prices, ...rest } = req.body;

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
      costPriceInDollar: costPriceInDollar || 0,
      dollarRate: dollarRate || 12500,
      images: formattedImages
    };

    // YANGI NARX TIZIMI - prices array ni to'g'ridan-to'g'ri qabul qilish
    if (prices && Array.isArray(prices)) {
      console.log('✅ Prices array qabul qilindi:', prices);
      productData.prices = prices;
    }
    // Eski tizim uchun - discounts array (backward compatibility)
    else if (discounts && Array.isArray(discounts) && discounts.length > 0) {
      const pricesArray = productData.prices || [];
      
      discounts.forEach(discount => {
        if (discount.minQuantity > 0 && discount.percent > 0) {
          pricesArray.push({
            type: discount.type,
            amount: 0, // Hisoblash kerak emas, discountPercent ishlatiladi
            minQuantity: discount.minQuantity,
            discountPercent: discount.percent,
            isActive: true
          });
        }
      });
      
      if (pricesArray.length > 0) {
        productData.prices = pricesArray;
      }
    }

    // createdBy - faqat real ObjectId bo'lsa qo'shamiz
    if (req.user._id && req.user._id !== 'hardcoded-admin-id') {
      productData.createdBy = req.user._id;
    }

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
      pricesCount: productData.prices?.length || 0
    });

    const product = new Product(productData);
    await product.save();
    
    console.log('✅ Tovar MongoDB ga saqlandi:', {
      _id: product._id,
      code: product.code,
      name: product.name,
      isMainWarehouse: product.isMainWarehouse,
      warehouse: product.warehouse,
      imagesCount: product.images?.length || 0,
      prices: product.prices
    });
    
    // Populate warehouse before returning
    await product.populate('warehouse', 'name');
    
    // QR code yaratish - background da (javobni kutmasdan)
    setImmediate(async () => {
      try {
        const qrData = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${product._id}`;
        const qrCode = await QRCode.toDataURL(qrData);
        await Product.findByIdAndUpdate(product._id, { qrCode });
        console.log('✅ QR code background da yaratildi:', product._id);
      } catch (qrError) {
        console.error('⚠️ QR code yaratish xatosi:', qrError);
      }
    });
    
    console.log(`✅ Yangi tovar qo'shildi: ${product.name} (${product.code}), isMainWarehouse: ${product.isMainWarehouse}, images: ${product.images?.length || 0}`);
    
    // ⚡ Socket.IO - Real-time update
    if (global.io) {
      global.io.emit('product:created', product);
      // ⚡ Cache ni tozalash
      statsCache = null;
      console.log('📡 Socket emit: product:created');
    }
    
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

// Kassa uchun - kategoriya yangilash (auth talab qilmaydi)
router.put('/:id/category', async (req, res) => {
  try {
    const { category } = req.body;
    
    console.log(`📂 Kategoriya yangilash: ID=${req.params.id}, Category=${category}`);

    if (!category) {
      return res.status(400).json({ message: 'Kategoriya ko\'rsatilmagan' });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { category: category },
      { new: true }
    ).populate('warehouse', 'name');

    if (!product) {
      console.log('❌ Tovar topilmadi:', req.params.id);
      return res.status(404).json({ message: 'Tovar topilmadi' });
    }

    console.log(`✅ Kategoriya yangilandi: ${product.name} -> ${category}`);
    
    // Socket.IO - Real-time update
    if (global.io) {
      global.io.emit('product:updated', product);
      // ⚡ Cache ni tozalash
      statsCache = null;
    }

    res.json(product);
  } catch (error) {
    console.error('❌ Kategoriya yangilash xatosi:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('🔍 PUT /:id request received for ID:', req.params.id);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Prices field:', req.body.prices);
    const { warehouse, code, packageInfo, images, discounts, prices, ...rest } = req.body;

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

    // YANGI NARX TIZIMI - prices array ni to'g'ridan-to'g'ri qabul qilish
    if (prices && Array.isArray(prices)) {
      console.log('✅ Prices array qabul qilindi:', prices);
      updateData.prices = prices;
    }
    // Eski tizim uchun - discounts array (backward compatibility)
    else if (discounts && Array.isArray(discounts)) {
      const product = await Product.findById(req.params.id);
      if (product) {
        // Eski discount narxlarini o'chirish
        const existingPrices = (product.prices || []).filter(p => 
          !['discount1', 'discount2', 'discount3'].includes(p.type)
        );
        
        // Yangi discount narxlarini qo'shish
        discounts.forEach(discount => {
          if (discount.minQuantity > 0 && discount.percent > 0) {
            existingPrices.push({
              type: discount.type,
              amount: 0,
              minQuantity: discount.minQuantity,
              discountPercent: discount.percent,
              isActive: true
            });
          }
        });
        
        updateData.prices = existingPrices;
      }
    }

    // Add package information if provided
    if (packageInfo) {
      const product = await Product.findById(req.params.id);
      if (product) {
        updateData.packages = [...(product.packages || []), packageInfo];
      }
    }

    console.log('💾 Update data:', JSON.stringify(updateData, null, 2));

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('warehouse', 'name');
    
    if (!product) return res.status(404).json({ message: 'Tovar topilmadi' });
    
    console.log('✅ Product updated successfully:', product._id);
    console.log('Updated prices:', product.prices);
    
    // QR code yaratish - background da (agar yo'q bo'lsa yoki code o'zgargan bo'lsa)
    if (!product.qrCode || code) {
      setImmediate(async () => {
        try {
          const qrData = `${process.env.CLIENT_URL || 'http://localhost:5173'}/product/${product._id}`;
          const qrCode = await QRCode.toDataURL(qrData);
          await Product.findByIdAndUpdate(product._id, { qrCode });
          console.log('✅ QR code background da yangilandi:', product._id);
        } catch (qrError) {
          console.error('⚠️ QR code yaratish xatosi:', qrError);
        }
      });
    }
    
    // ⚡ Socket.IO - Real-time update
    if (global.io) {
      console.log('📡 Socket emit: product:updated with prices:', product.prices);
      global.io.emit('product:updated', product);
      // ⚡ Cache ni tozalash
      statsCache = null;
      console.log('📡 Socket emit: product:updated');
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
    
    // ⚡ Socket.IO - Real-time update
    if (global.io) {
      global.io.emit('product:deleted', { _id: product._id });
      // ⚡ Cache ni tozalash
      statsCache = null;
      console.log('📡 Socket emit: product:deleted');
    }
    
    res.json({ message: 'Tovar o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
