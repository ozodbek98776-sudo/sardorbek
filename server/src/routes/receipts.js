const express = require('express');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');

const router = express.Router();

// Kassa uchun chek yaratish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { items, total, paymentMethod, customer } = req.body;

    const receiptData = {
      items: items.map(item => ({
        product: item.product,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.quantity
      })),
      total,
      paymentMethod,
      customer: customer || null,
      status: 'completed',
      createdAt: new Date()
    };

    const receipt = new Receipt(receiptData);
    await receipt.save();

    // Mahsulot miqdorlarini yangilash
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Mijoz statistikasini yangilash
    if (customer) {
      await Customer.findByIdAndUpdate(
        customer,
        { $inc: { totalPurchases: total } }
      );
    }

    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const receipts = await Receipt.find(query)
      .populate('createdBy', 'name role')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

/**
 * Bulk sync endpoint for offline sales
 * Receives array of sales from offline POS
 * IMPORTANT: This endpoint must be idempotent - handle duplicate offlineIds
 */
router.post('/bulk', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { sales } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ success: false, message: 'No sales provided' });
    }

    const results = [];
    const errors = [];

    for (const sale of sales) {
      try {
        // Check if this offline sale was already synced (by offlineId in metadata)
        const existingReceipt = await Receipt.findOne({ 'metadata.offlineId': sale.offlineId });
        if (existingReceipt) {
          // Already synced, skip but mark as success
          results.push({ offlineId: sale.offlineId, status: 'already_synced' });
          continue;
        }

        // Create receipt from offline sale
        const receipt = new Receipt({
          items: sale.items,
          total: sale.total,
          paymentMethod: sale.paymentMethod || 'cash',
          customer: sale.customer,
          status: 'completed',
          isReturn: sale.isReturn || false,
          createdBy: req.user._id,
          createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
          metadata: { offlineId: sale.offlineId, syncedAt: new Date() }
        });

        // Update product quantities (skip stock check for offline sales)
        for (const item of sale.items) {
          const quantityChange = sale.isReturn ? item.quantity : -item.quantity;
          await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
        }

        await receipt.save();
        results.push({ offlineId: sale.offlineId, status: 'synced', receiptId: receipt._id });

      } catch (itemError) {
        errors.push({ offlineId: sale.offlineId, error: itemError.message });
      }
    }

    // Return success even if some items failed - client will retry failed ones
    res.json({
      success: true,
      synced: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { items, total, paymentMethod, customer, isReturn } = req.body;
    const isHelper = req.user.role === 'helper';

    // Check stock availability before sale (not for returns)
    if (!isReturn && !isHelper) {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}`
          });
        }
      }
    }

    const receipt = new Receipt({
      items,
      total,
      paymentMethod,
      customer,
      status: isHelper ? 'pending' : 'completed',
      isReturn: isReturn || false,
      createdBy: req.user._id
    });

    if (!isHelper) {
      for (const item of items) {
        // If return mode, add to stock; otherwise subtract
        const quantityChange = isReturn ? item.quantity : -item.quantity;
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
      }
    }

    await receipt.save();

    // Send telegram notification if customer is selected
    if (customer && !isReturn) {
      try {
        const customerData = await Customer.findById(customer);
        if (customerData) {
          await telegramService.sendPurchaseNotification(
            customerData,
            items,
            total,
            paymentMethod
          );
        }
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
        // Don't fail the receipt creation if telegram fails
      }
    }

    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/approve', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    // Check stock availability before approving
    for (const item of receipt.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}`
        });
      }
    }

    receipt.status = 'approved';
    receipt.processedBy = req.user._id;

    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
    }

    await receipt.save();
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/reject', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    receipt.status = 'rejected';
    receipt.processedBy = req.user._id;
    await receipt.save();

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
