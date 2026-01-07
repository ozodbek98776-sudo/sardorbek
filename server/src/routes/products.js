const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

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
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Faqat rasm fayllari ruxsat etilgan!'));
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search, warehouse, mainOnly, kassaView } = req.query;
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
    if (warehouse) query.warehouse = warehouse;
    if (mainOnly === 'true') query.isMainWarehouse = true;

    // For kassa view, return all products with essential fields only
    if (kassaView === 'true') {
      const products = await Product.find(query)
        .select('name code price quantity description warehouse isMainWarehouse')
        .populate('warehouse', 'name')
        .sort({ code: 1 }) // Kod bo'yicha saralash - tezroq qidirish uchun
        .limit(search ? 50 : 1000); // Qidiruv bo'lsa 50 ta, aks holda 1000 ta

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

      console.log(`Kassa view: Found ${products.length} total products, ${validProducts.length} valid products`);
      console.log(`Search query: "${search}", Results: ${validProducts.length}`);

      // Debug: log first few products to see their structure
      if (products.length > 0 && search) {
        console.log('Sample search result:', JSON.stringify(validProducts[0], null, 2));
      }

      return res.json(validProducts);
    }

    const products = await Product.find(query).populate('warehouse', 'name');
    res.json(products);
  } catch (error) {
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

// Upload images for product
router.post('/upload-images', auth, authorize('admin'), upload.array('images', 8), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Rasm yuklanmadi' });
    }
    const imagePaths = req.files.map(file => `/uploads/products/${file.filename}`);
    res.json({ images: imagePaths });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Delete image
router.delete('/delete-image', auth, authorize('admin'), async (req, res) => {
  try {
    const { imagePath } = req.body;
    if (!imagePath) return res.status(400).json({ message: 'Rasm yo\'li ko\'rsatilmagan' });

    const fullPath = path.join(__dirname, '../..', imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    res.json({ message: 'Rasm o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

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
    const { warehouse, code, packageInfo, ...rest } = req.body;

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
    if (warehouse) {
      const warehouseDoc = await Warehouse.findById(warehouse);
      if (warehouseDoc && warehouseDoc.name === 'Asosiy ombor') {
        isMainWarehouse = true;
      }
    }

    // Prepare product data
    const productData = {
      ...rest,
      code: productCode,
      warehouse,
      isMainWarehouse,
      createdBy: req.user._id
    };

    // Add package information if provided
    if (packageInfo) {
      productData.packages = [packageInfo];
    }

    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { warehouse, code, packageInfo, ...rest } = req.body;

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

    // Prepare update data
    const updateData = { ...rest, code, warehouse, isMainWarehouse };

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
    res.json(product);
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
