const express = require('express');
const router = express.Router();
const Supplier = require('../models/Supplier');
const SupplierTransaction = require('../models/SupplierTransaction');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

router.use(auth);
router.use(authorize('admin'));

// Barcha ta'minotchilarni olish
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }
    const suppliers = await Supplier.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bitta ta'minotchi + tranzaktsiyalar
router.get('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id).lean();
    if (!supplier) return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });

    const transactions = await SupplierTransaction.find({ supplier: req.params.id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();

    res.json({ success: true, supplier, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Yangi ta'minotchi qo'shish (kontaktdan)
router.post('/', async (req, res) => {
  try {
    const { name, phone, company, address, note } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Ism majburiy' });

    if (phone) {
      const existing = await Supplier.findOne({ phone });
      if (existing) return res.status(400).json({ success: false, message: "Bu telefon raqam allaqachon mavjud" });
    }

    const supplierData = { name, phone, company, address, note };
    if (req.user._id && req.user._id !== 'hardcoded-admin-id') {
      supplierData.createdBy = req.user._id;
    }
    const supplier = await Supplier.create(supplierData);
    res.status(201).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ta'minotchini tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, company, address, note } = req.body;
    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name, phone, company, address, note },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });
    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Ta'minotchini o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });

    // Tranzaktsiyalari bo'lsa o'chirish mumkin emas
    const txCount = await SupplierTransaction.countDocuments({ supplier: req.params.id });
    if (txCount > 0) {
      return res.status(400).json({ success: false, message: "Kirim tarixi bor, o'chirib bo'lmaydi" });
    }
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "O'chirildi" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kirim yaratish (mahsulot qo'shish + to'lov)
router.post('/:id/transactions', async (req, res) => {
  try {
    const { items, cashAmount = 0, cardAmount = 0, clickAmount = 0, debtAmount = 0, note } = req.body;

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });
    if (!items || items.length === 0) return res.status(400).json({ success: false, message: 'Mahsulotlar kerak' });

    // Mahsulotlar mavjudligini tekshirish
    const productIds = items.map(i => i.product);
    const products = await Product.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    const txItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = productMap.get(item.product);
      if (!product) return res.status(400).json({ success: false, message: `Mahsulot topilmadi: ${item.product}` });

      const itemTotal = item.quantity * item.price;
      txItems.push({
        product: product._id,
        name: product.name,
        quantity: item.quantity,
        price: item.price,
        total: itemTotal
      });
      totalAmount += itemTotal;
    }

    const paidAmount = cashAmount + cardAmount + clickAmount;
    const actualDebt = totalAmount - paidAmount;

    // Tranzaktsiya yaratish
    const transaction = await SupplierTransaction.create({
      supplier: supplier._id,
      items: txItems,
      totalAmount,
      cashAmount,
      cardAmount,
      clickAmount,
      debtAmount: actualDebt > 0 ? actualDebt : 0,
      paidAmount,
      note,
      ...(req.user._id !== 'hardcoded-admin-id' && { createdBy: req.user._id })
    });

    // Mahsulotlar miqdorini va tan narxini yangilash
    for (const item of txItems) {
      const product = productMap.get(item.product.toString());
      product.quantity += item.quantity;
      product.updatePrice('cost', item.price);
      await product.save();
    }

    // Ta'minotchi statistikasini yangilash
    supplier.totalAmount += totalAmount;
    supplier.totalPaid += paidAmount;
    supplier.totalDebt += (actualDebt > 0 ? actualDebt : 0);
    supplier.transactionCount += 1;
    await supplier.save();

    res.status(201).json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Qarz to'lash
router.post('/:id/pay-debt', async (req, res) => {
  try {
    const { amount, method = 'cash', note } = req.body;
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: "Ta'minotchi topilmadi" });
    if (amount <= 0) return res.status(400).json({ success: false, message: "Summa 0 dan katta bo'lishi kerak" });

    supplier.totalPaid += amount;
    supplier.totalDebt = Math.max(0, supplier.totalDebt - amount);
    await supplier.save();

    // To'lov tranzaktsiyasini yozish
    await SupplierTransaction.create({
      supplier: supplier._id,
      items: [],
      totalAmount: 0,
      [`${method}Amount`]: amount,
      paidAmount: amount,
      debtAmount: -amount,
      note: note || "Qarz to'lash",
      ...(req.user._id !== 'hardcoded-admin-id' && { createdBy: req.user._id })
    });

    res.json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
