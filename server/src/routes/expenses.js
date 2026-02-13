const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/permissions');

// Barcha routelar faqat admin uchun
router.use(auth);
router.use(adminOnly);

// Statistika va ro'yxat olish
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, category, page = 1, limit = 20 } = req.query;
    
    // Filter yaratish
    const filter = {};
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    } else {
      // Default: joriy oy
      const now = new Date();
      filter.date = {
        $gte: new Date(now.getFullYear(), now.getMonth(), 1),
        $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      };
    }
    
    if (category) {
      filter.category = category;
    }
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Parallel queries
    const [expenses, total, stats] = await Promise.all([
      Expense.find(filter)
        .populate('created_by', 'name')
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Expense.countDocuments(filter),
      Expense.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // Kategoriya bo'yicha statistika
    const categoryStats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);
    
    res.json({
      success: true,
      expenses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      },
      statistics: {
        total: stats[0]?.totalAmount || 0,
        average: stats[0]?.avgAmount || 0,
        count: stats[0]?.count || 0,
        byCategory: categoryStats
      }
    });
  } catch (error) {
    console.error('Xarajatlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik yuz berdi' });
  }
});

// Yangi xarajat qo'shish
router.post('/', async (req, res) => {
  try {
    const { category, amount, note, date, type, employee_id, employee_name } = req.body;
    
    // Validatsiya
    if (!category) {
      return res.status(400).json({ success: false, message: 'Kategoriya tanlanishi shart' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Summa musbat bo\'lishi kerak' });
    }
    
    // Soliq uchun type majburiy
    if (category === 'soliqlar' && !type) {
      return res.status(400).json({ success: false, message: 'Soliq turi tanlanishi shart' });
    }
    
    // Komunal uchun type majburiy
    if (category === 'komunal' && !type) {
      return res.status(400).json({ success: false, message: 'Komunal turi tanlanishi shart' });
    }
    
    // Shaxsiy xarajatlar uchun type majburiy
    if (category === 'shaxsiy' && !type) {
      return res.status(400).json({ success: false, message: 'Shaxsiy xarajat turi tanlanishi shart' });
    }
    
    // Maosh uchun xodim majburiy
    if (category === 'maosh' && !employee_id) {
      return res.status(400).json({ success: false, message: 'Xodim tanlanishi shart' });
    }
    
    // Juda katta summa tekshirish (masalan 1 milliard)
    if (amount > 1000000000) {
      return res.status(400).json({ success: false, message: 'Summa juda katta' });
    }
    
    const expenseData = {
      category,
      amount,
      note: note || '',
      date: date || new Date(),
      type: type || undefined,
      source: 'manual'
    };

    // Maosh uchun xodim ma'lumotlarini qo'shish
    if (category === 'maosh' && employee_id) {
      expenseData.employee_id = employee_id;
      expenseData.employee_name = employee_name;
    }

    // createdBy - faqat real ObjectId bo'lsa qo'shamiz
    if (req.user._id && req.user._id !== 'hardcoded-admin-id') {
      expenseData.created_by = req.user._id;
    }
    
    const expense = new Expense(expenseData);
    
    await expense.save();
    
    // Populate qilib qaytarish (agar created_by mavjud bo'lsa)
    if (expense.created_by) {
      await expense.populate('created_by', 'name');
    }
    
    res.status(201).json({
      success: true,
      message: 'Xarajat muvaffaqiyatli saqlandi',
      expense
    });
  } catch (error) {
    console.error('Xarajat qo\'shishda xatolik:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    res.status(500).json({ success: false, message: 'Serverda xatolik yuz berdi' });
  }
});

// Xarajatni tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { category, amount, note, date, type } = req.body;
    
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Xarajat topilmadi' });
    }
    
    // Faqat manual xarajatlarni tahrirlash mumkin
    if (expense.source !== 'manual') {
      return res.status(403).json({ 
        success: false, 
        message: 'Avtomatik yaratilgan xarajatni tahrirlash mumkin emas' 
      });
    }
    
    // Validatsiya
    if (amount && amount <= 0) {
      return res.status(400).json({ success: false, message: 'Summa musbat bo\'lishi kerak' });
    }
    
    // Yangilash
    if (category) expense.category = category;
    if (amount) expense.amount = amount;
    if (note !== undefined) expense.note = note;
    if (date) expense.date = date;
    if (type !== undefined) expense.type = type;
    
    await expense.save();
    
    // Populate qilib qaytarish (agar created_by mavjud bo'lsa)
    if (expense.created_by) {
      await expense.populate('created_by', 'name');
    }
    
    res.json({
      success: true,
      message: 'Xarajat yangilandi',
      expense
    });
  } catch (error) {
    console.error('Xarajatni yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik yuz berdi' });
  }
});

// Xarajatni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Xarajat topilmadi' });
    }
    
    // Faqat manual xarajatlarni o'chirish mumkin
    if (expense.source !== 'manual') {
      return res.status(403).json({ 
        success: false, 
        message: 'Avtomatik yaratilgan xarajatni o\'chirish mumkin emas' 
      });
    }
    
    await expense.deleteOne();
    
    res.json({
      success: true,
      message: 'Xarajat o\'chirildi'
    });
  } catch (error) {
    console.error('Xarajatni o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik yuz berdi' });
  }
});

module.exports = router;
