const express = require('express');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [
      totalRevenue,
      todaySales,
      weekSales,
      monthSales,
      totalReceipts,
      totalProducts,
      lowStock,
      outOfStock,
      peakHourData
    ] = await Promise.all([
      Receipt.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: weekAgo } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.aggregate([{ $match: { status: 'completed', createdAt: { $gte: monthAgo } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
      Receipt.countDocuments({ status: 'completed' }),
      Product.countDocuments(),
      Product.countDocuments({ $expr: { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$minStock'] }] } }),
      Product.countDocuments({ quantity: 0 }),
      Receipt.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, total: { $sum: '$total' } } },
        { $sort: { total: -1 } },
        { $limit: 1 }
      ])
    ]);

    let peakHour = '';
    if (peakHourData.length > 0) {
      const hour = peakHourData[0]._id;
      peakHour = `${hour.toString().padStart(2, '0')}:00 - ${(hour + 1).toString().padStart(2, '0')}:00`;
    }

    res.json({
      totalRevenue: totalRevenue[0]?.total || 0,
      todaySales: todaySales[0]?.total || 0,
      weekSales: weekSales[0]?.total || 0,
      monthSales: monthSales[0]?.total || 0,
      totalReceipts,
      totalProducts,
      lowStock,
      outOfStock,
      peakHour
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/chart', auth, authorize('admin'), async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Uzbekistan timezone offset (UTC+5)
    const tzOffset = 5 * 60; // minutes
    
    if (period === 'today') {
      // Hourly data for today - single aggregation query
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const hourlyData = await Receipt.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: today, $lt: tomorrow } } },
        { 
          $group: { 
            _id: { 
              $hour: { 
                date: '$createdAt', 
                timezone: '+05:00' 
              } 
            }, 
            total: { $sum: '$total' } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Create full 24-hour array
      const hourMap = new Map(hourlyData.map(h => [h._id, h.total]));
      const data = [];
      for (let hour = 0; hour < 24; hour++) {
        data.push({
          date: `${hour.toString().padStart(2, '0')}:00`,
          sales: hourMap.get(hour) || 0
        });
      }
      
      res.json(data);
    } else {
      // Daily data for week/month - single aggregation query
      const days = period === 'month' ? 30 : 7;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);
      
      const dailyData = await Receipt.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { 
          $group: { 
            _id: { 
              $dateToString: { 
                format: '%Y-%m-%d', 
                date: '$createdAt',
                timezone: '+05:00'
              } 
            }, 
            total: { $sum: '$total' } 
          } 
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Create full days array
      const dayMap = new Map(dailyData.map(d => [d._id, d.total]));
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        data.push({
          date: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
          sales: dayMap.get(dateKey) || 0
        });
      }
      
      res.json(data);
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/top-products', auth, authorize('admin'), async (req, res) => {
  try {
    const topProducts = await Receipt.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalSold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);
    
    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Dashboard Tab 1: Hisobot (sana bo'yicha)
router.get('/report', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const Expense = require('../models/Expense');
    const expFilter = {};
    if (startDate || endDate) {
      expFilter.date = {};
      if (startDate) expFilter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        expFilter.date.$lte = end;
      }
    }

    const [salesAgg, expAgg] = await Promise.all([
      Receipt.aggregate([
        { $match: filter },
        { $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          totalCash: { $sum: '$cashAmount' },
          totalCard: { $sum: '$cardAmount' },
          totalClick: { $sum: '$clickAmount' },
          totalDebt: { $sum: '$remainingAmount' },
          totalBonus: { $sum: '$bonusAmount' },
          salesCount: { $sum: 1 },
          deliveryCount: { $sum: { $cond: ['$isDelivery', 1, 0] } },
          deliveryAmount: { $sum: { $cond: ['$isDelivery', '$total', 0] } }
        }}
      ]),
      Expense.aggregate([
        { $match: expFilter },
        { $group: { _id: null, totalExpenses: { $sum: '$amount' } } }
      ])
    ]);

    const sales = salesAgg[0] || { totalSales: 0, totalCash: 0, totalCard: 0, totalClick: 0, totalDebt: 0, totalBonus: 0, salesCount: 0, deliveryCount: 0, deliveryAmount: 0 };
    const expenses = expAgg[0] || { totalExpenses: 0 };

    res.json({ success: true, data: { ...sales, totalExpenses: expenses.totalExpenses } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard Tab 2: Xodimlar statistikasi
router.get('/employees', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { status: 'completed' };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const [cashierStats, deliveryStats] = await Promise.all([
      Receipt.aggregate([
        { $match: { ...filter, isDelivery: { $ne: true } } },
        { $group: {
          _id: '$createdBy',
          salesCount: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          cashTotal: { $sum: '$cashAmount' },
          cardTotal: { $sum: '$cardAmount' },
          clickTotal: { $sum: '$clickAmount' }
        }},
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          name: { $ifNull: ['$user.name', 'Admin'] },
          role: { $ifNull: ['$user.role', 'admin'] },
          bonusPercentage: { $ifNull: ['$user.bonusPercentage', 0] },
          salesCount: 1, totalAmount: 1, cashTotal: 1, cardTotal: 1, clickTotal: 1,
          bonus: { $multiply: ['$totalAmount', { $divide: [{ $ifNull: ['$user.bonusPercentage', 0] }, 100] }] }
        }}
      ]),
      Receipt.aggregate([
        { $match: { ...filter, isDelivery: true } },
        { $group: {
          _id: '$deliveryPerson',
          deliveryCount: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }},
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
          name: { $ifNull: ['$user.name', 'Admin'] },
          deliveryCount: 1, totalAmount: 1
        }}
      ])
    ]);

    res.json({ success: true, cashiers: cashierStats, deliveryPersons: deliveryStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Dashboard Tab 3: Cheklar ro'yxati
router.get('/receipts-list', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, type, page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(50, parseInt(limit) || 20);
    const filter = { status: 'completed' };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (type === 'delivery') filter.isDelivery = true;
    if (type === 'sale') filter.isDelivery = { $ne: true };

    const [receipts, total] = await Promise.all([
      Receipt.find(filter)
        .populate('createdBy', 'name')
        .populate('customer', 'name phone')
        .populate('deliveryPerson', 'name')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      Receipt.countDocuments(filter)
    ]);

    res.json({ success: true, data: receipts, total, page: p, hasMore: p * l < total });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
