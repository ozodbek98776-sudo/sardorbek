const express = require('express');
const Expense = require('../models/Expense');
const { auth, authorize } = require('../middleware/auth');
const { serviceWrapper } = require('../middleware/serviceErrorHandler');

const router = express.Router();

// Get all expenses with filters - OPTIMIZED
router.get('/', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const { category, startDate, endDate, limit = 20, skip = 0 } = req.query;
    
    console.log('📊 Expenses GET request:', { category, startDate, endDate, limit, skip });
    
    const query = {};
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Date filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // ⚡ OPTIMIZED: Use lean() for faster queries, select only needed fields
    const expenses = await Expense.find(query)
      .select('category amount description date createdBy createdAt products')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .hint({ date: -1, category: 1 }) // Force use of index
      .lean() // Convert to plain JS objects for better performance
      .maxTimeMS(40000); // Set max execution time to 40 seconds
    
    console.log('✅ Expenses found:', expenses.length);
    
    return expenses;
  });
});

// Get expense statistics - SUPER OPTIMIZED with single aggregation
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    console.log('📊 Stats request received');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    // ⚡ SUPER OPTIMIZED: Single aggregation pipeline instead of 5 separate queries
    const results = await Expense.aggregate([
      {
        $facet: {
          // Total
          total: [
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          // Today
          today: [
            { $match: { date: { $gte: today } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          // Week
          week: [
            { $match: { date: { $gte: weekAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          // Month
          month: [
            { $match: { date: { $gte: monthAgo } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ],
          // By category
          byCategory: [
            { $group: { 
              _id: '$category', 
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            } },
            { $sort: { total: -1 } }
          ]
        }
      }
    ]).maxTimeMS(40000).allowDiskUse(true);
    
    const data = results[0];
    
    const stats = {
      total: data.total[0]?.total || 0,
      today: data.today[0]?.total || 0,
      week: data.week[0]?.total || 0,
      month: data.month[0]?.total || 0,
      byCategory: data.byCategory || []
    };
    
    console.log('✅ Stats calculated:', stats);
    
    return stats;
  });
});

// Create new expense
router.post('/', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const { category, amount, description, date, products } = req.body;
    
    console.log('📊 Create expense request:', { category, amount, description, date, products, userId: req.user.id });
    
    const expenseData = {
      category,
      amount,
      description,
      date: date || new Date(),
      createdBy: req.user.id
    };
    
    // Agar tovar kategoriyasi bo'lsa va products mavjud bo'lsa
    if (category === 'tovar' && products && Array.isArray(products)) {
      expenseData.products = products;
    }
    
    const expense = new Expense(expenseData);
    
    await expense.save();
    await expense.populate('createdBy', 'name');
    
    console.log('✅ Expense created:', expense._id);
    
    return expense;
  });
});

// Update expense
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const { category, amount, description, date, products } = req.body;
    
    const updateData = { category, amount, description, date };
    
    // Agar tovar kategoriyasi bo'lsa va products mavjud bo'lsa
    if (category === 'tovar' && products && Array.isArray(products)) {
      updateData.products = products;
    } else {
      // Boshqa kategoriyalarga o'tganda products ni o'chirish
      updateData.products = [];
    }
    
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name');
    
    if (!expense) {
      const error = new Error('Xarajat topilmadi');
      error.statusCode = 404;
      throw error;
    }
    
    return expense;
  });
});

// Delete expense
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    
    if (!expense) {
      const error = new Error('Xarajat topilmadi');
      error.statusCode = 404;
      throw error;
    }
    
    return { message: 'Xarajat o\'chirildi' };
  });
});

module.exports = router;
