const express = require('express');
const router = express.Router();
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');

// GET /api/sales - Get all sales with filters
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, customerId, productId, limit = 100 } = req.query;
    
    // Build query filter
    const filter = {};
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    if (customerId) {
      filter.customer = customerId;
    }
    
    if (productId) {
      filter['items.product'] = productId;
    }
    
    // Fetch sales (receipts)
    const sales = await Receipt.find(filter)
      .populate('customer', 'name phone')
      .populate('items.product', 'name code price')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Calculate totals
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
    
    res.json({
      success: true,
      count: sales.length,
      totalRevenue,
      totalItems,
      sales
    });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ 
      success: false,
      message: 'Savdolarni yuklashda xatolik',
      error: error.message 
    });
  }
});

// POST /api/sales - Create new sale (same as receipt)
router.post('/', async (req, res) => {
  try {
    const { items, customer, paymentMethod, discount, notes } = req.body;
    
    // Validate items
    if (!items || items.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Kamida bitta mahsulot tanlang' 
      });
    }
    
    // Calculate totals
    let subtotal = 0;
    const processedItems = [];
    
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: `Mahsulot topilmadi: ${item.product}` 
        });
      }
      
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false,
          message: `${product.name} uchun yetarli miqdor yo'q` 
        });
      }
      
      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;
      
      processedItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      });
      
      // Update product quantity
      product.quantity -= item.quantity;
      await product.save();
    }
    
    const discountAmount = discount || 0;
    const total = subtotal - discountAmount;
    
    // Create receipt
    const receipt = new Receipt({
      items: processedItems,
      customer,
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod: paymentMethod || 'cash',
      notes,
      createdBy: req.user?.id || null
    });
    
    await receipt.save();
    
    // Populate for response
    await receipt.populate('customer', 'name phone');
    await receipt.populate('items.product', 'name code price');
    await receipt.populate('createdBy', 'name');
    
    res.status(201).json({
      success: true,
      message: 'Savdo muvaffaqiyatli yaratildi',
      sale: receipt
    });
  } catch (error) {
    console.error('Error creating sale:', error);
    res.status(500).json({ 
      success: false,
      message: 'Savdo yaratishda xatolik',
      error: error.message 
    });
  }
});

// GET /api/sales/stats - Get sales statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = '7' } = req.query;
    
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sales = await Receipt.find({
      createdAt: { $gte: startDate }
    });
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalSales = sales.length;
    const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;
    
    res.json({
      success: true,
      period: `${days} kun`,
      totalRevenue,
      totalSales,
      averageSale
    });
  } catch (error) {
    console.error('Error fetching sales stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Statistikani yuklashda xatolik',
      error: error.message 
    });
  }
});

module.exports = router;