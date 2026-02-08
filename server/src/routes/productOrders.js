const express = require('express');
const ProductOrder = require('../models/ProductOrder');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const { auth, authorize } = require('../middleware/auth');
const { serviceWrapper } = require('../middleware/serviceErrorHandler');

const router = express.Router();

// Get all product orders
router.get('/', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const { status } = req.query;
    
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const orders = await ProductOrder.find(query)
      .populate('createdBy', 'name')
      .populate('receivedBy', 'name')
      .populate('products.product', 'name code')
      .sort({ orderDate: -1 });
    
    return orders;
  });
});

// Create new product order
router.post('/', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const { products, description } = req.body;
    
    if (!products || products.length === 0) {
      const error = new Error('Kamida bitta tovar tanlang');
      error.statusCode = 400;
      throw error;
    }
    
    // Calculate total amount
    const totalAmount = products.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    
    const order = new ProductOrder({
      products,
      totalAmount,
      description,
      createdBy: req.user.id
    });
    
    await order.save();
    await order.populate('createdBy', 'name');
    
    console.log('✅ Product order created:', order._id);
    
    return order;
  });
});

// Receive product order (qabul qilish)
router.post('/:id/receive', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const order = await ProductOrder.findById(req.params.id);
    
    if (!order) {
      const error = new Error('Buyurtma topilmadi');
      error.statusCode = 404;
      throw error;
    }
    
    if (order.status !== 'pending') {
      const error = new Error('Bu buyurtma allaqachon qabul qilingan yoki bekor qilingan');
      error.statusCode = 400;
      throw error;
    }
    
    // Update product quantities
    for (const item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
        
        // Emit socket event for real-time update
        if (global.io) {
          global.io.emit('product:updated', product);
        }
      }
    }
    
    // Create expense record
    const expense = new Expense({
      category: 'tovar',
      amount: order.totalAmount,
      description: order.description || 'Tovar buyurtmasi qabul qilindi',
      date: new Date(),
      products: order.products.map(p => ({
        product: p.product,
        name: p.name,
        quantity: p.quantity,
        price: p.price
      })),
      createdBy: req.user.id
    });
    
    await expense.save();
    
    // Update order status
    order.status = 'received';
    order.receivedDate = new Date();
    order.receivedBy = req.user.id;
    await order.save();
    
    await order.populate(['createdBy', 'receivedBy'], 'name');
    
    console.log('✅ Product order received:', order._id);
    
    return { order, expense };
  });
});

// Cancel product order
router.post('/:id/cancel', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const order = await ProductOrder.findById(req.params.id);
    
    if (!order) {
      const error = new Error('Buyurtma topilmadi');
      error.statusCode = 404;
      throw error;
    }
    
    if (order.status !== 'pending') {
      const error = new Error('Faqat kutilayotgan buyurtmalarni bekor qilish mumkin');
      error.statusCode = 400;
      throw error;
    }
    
    order.status = 'cancelled';
    await order.save();
    
    return order;
  });
});

// Delete product order
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  await serviceWrapper(req, res, async () => {
    const order = await ProductOrder.findByIdAndDelete(req.params.id);
    
    if (!order) {
      const error = new Error('Buyurtma topilmadi');
      error.statusCode = 404;
      throw error;
    }
    
    return { message: 'Buyurtma o\'chirildi' };
  });
});

module.exports = router;
