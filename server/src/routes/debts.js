const express = require('express');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');

const router = express.Router();

// Kassa uchun qarzlarni olish (auth talab qilmaydi)
router.get('/kassa', async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const debts = await Debt.find(query)
      .populate('customer', 'name phone')
      .populate('user', 'name phone role')
      .populate('items.product', 'name code price')
      .sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun yangi qarz qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { customer, amount, paidAmount, dueDate, description, items } = req.body;

    const debtData = {
      type: 'receivable', // Mijoz bizga qarz
      customer,
      amount,
      paidAmount: paidAmount || 0,
      dueDate,
      description,
      items: items || [],
      status: 'pending_approval' // Kassachi qo'shgan qarz admin tasdiqlashini kutadi
    };

    const debt = new Debt(debtData);
    await debt.save();

    // Populate qilib qaytarish
    await debt.populate([
      { path: 'customer', select: 'name phone' },
      { path: 'items.product', select: 'name code price' }
    ]);

    // Telegram ga xabar yuborish
    try {
      await telegramService.sendDebtNotification({
        customerName: debt.customer.name,
        customerPhone: debt.customer.phone,
        amount: debt.amount,
        paidAmount: debt.paidAmount,
        remainingDebt: debt.amount - debt.paidAmount,
        dueDate: debt.dueDate,
        description: debt.description,
        items: debt.items
      });
    } catch (telegramError) {
      console.error('Telegram notification error:', telegramError);
      // Telegram xatosi asosiy jarayonni to'xtatmasin
    }

    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Mijozning qarzlar tarixini olish
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    const debts = await Debt.find({ customer: customerId }).sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const debts = await Debt.find(query).populate('customer', 'name phone').sort({ createdAt: -1 });
    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const { type } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const typeFilter = type ? { type } : {};

    const stats = {
      total: await Debt.countDocuments(typeFilter),
      approved: await Debt.countDocuments({ ...typeFilter, status: 'approved' }),
      pendingApproval: await Debt.countDocuments({ ...typeFilter, status: 'pending_approval' }),
      today: await Debt.countDocuments({ ...typeFilter, status: { $ne: 'paid' }, dueDate: { $gte: today, $lt: new Date(today.getTime() + 86400000) } }),
      overdue: await Debt.countDocuments({ ...typeFilter, status: 'overdue' }),
      paid: await Debt.countDocuments({ ...typeFilter, status: 'paid' }),
      blacklist: await Debt.countDocuments({ ...typeFilter, status: 'blacklist' }),
      totalAmount: (await Debt.aggregate([
        { $match: { ...typeFilter, status: { $ne: 'paid' } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$paidAmount'] } } } }
      ]))[0]?.total || 0
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { type, customer, creditorName, amount, dueDate, description, collateral } = req.body;

    const debtData = {
      type: type || 'receivable',
      amount,
      dueDate,
      description,
      collateral,
      status: 'pending_approval', // Barcha qarzlar avval tasdiqlashdan o'tadi
      createdBy: req.user._id
    };

    if (type === 'payable') {
      // Own debt - I owe someone
      debtData.creditorName = creditorName;
    } else {
      // Customer debt - they owe me
      debtData.customer = customer;
      // Mijozning umumiy qarziga qo'shilmaydi - faqat tasdiqlangandan keyin
    }

    const debt = new Debt(debtData);
    await debt.save();

    // Populate customer ma'lumotlari
    if (debt.customer) {
      await debt.populate('customer', 'name phone');
    }

    // Telegram ga xabar yuborish (faqat receivable type uchun)
    if (type !== 'payable' && debt.customer) {
      try {
        await telegramService.sendDebtNotification({
          customerName: debt.customer.name,
          customerPhone: debt.customer.phone,
          amount: debt.amount,
          dueDate: debt.dueDate,
          description: debt.description,
          collateral: debt.collateral
        });
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
        // Telegram xatosi asosiy jarayonni to'xtatmasin
      }
    }

    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/:id/payment', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { amount, method } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    debt.payments.push({ amount, method });
    debt.paidAmount += amount;

    if (debt.paidAmount >= debt.amount) {
      debt.status = 'paid';
    }

    await debt.save();

    // Only update customer debt for receivable type
    if (debt.type === 'receivable' && debt.customer) {
      await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: -amount } });
    }

    // Populate customer ma'lumotlari
    await debt.populate('customer', 'name phone');

    // Telegram ga to'lov xabari
    if (debt.customer) {
      try {
        await telegramService.sendPaymentNotification({
          customerName: debt.customer.name,
          amount: amount,
          remainingDebt: debt.amount - debt.paidAmount
        });
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    }

    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { type, customer, creditorName, amount, dueDate, description, collateral } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    // Update customer debt if amount changed (for receivable type)
    if (debt.type === 'receivable' && debt.customer) {
      const oldRemaining = debt.amount - debt.paidAmount;
      const newRemaining = amount - debt.paidAmount;
      const diff = newRemaining - oldRemaining;
      if (diff !== 0) {
        await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: diff } });
      }
    }

    debt.amount = amount;
    debt.dueDate = dueDate;
    debt.description = description;
    debt.collateral = collateral;

    if (type === 'payable') {
      debt.creditorName = creditorName;
    } else {
      debt.customer = customer;
    }

    await debt.save();
    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const debt = await Debt.findByIdAndDelete(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });
    res.json({ message: 'Qarz o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Qarzni tasdiqlash (faqat admin)
router.post('/:id/approve', auth, authorize('admin'), async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    if (debt.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Bu qarz allaqachon ko\'rib chiqilgan' });
    }

    // Qarzni tasdiqlash
    debt.status = 'approved';
    await debt.save();

    // Mijozning umumiy qarziga qo'shish (faqat tasdiqlangandan keyin)
    if (debt.type === 'receivable' && debt.customer) {
      await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: debt.amount } });
    }

    await debt.populate('customer', 'name phone');

    // Telegram ga tasdiqlash xabari
    if (debt.customer) {
      try {
        await telegramService.sendDebtApprovalNotification({
          customerName: debt.customer.name,
          amount: debt.amount,
          dueDate: debt.dueDate
        });
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    }

    res.json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Qarzni rad etish (faqat admin)
router.post('/:id/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    if (debt.status !== 'pending_approval') {
      return res.status(400).json({ message: 'Bu qarz allaqachon ko\'rib chiqilgan' });
    }

    // Qarzni o'chirish (rad etish)
    debt.description = `${debt.description || ''} [RAD ETILDI: ${reason || 'Sabab ko\'rsatilmagan'}]`;
    await debt.deleteOne();

    res.json({ message: 'Qarz rad etildi va o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Tasdiqlashni kutayotgan qarzlar soni (admin uchun notification)
router.get('/pending-approvals/count', auth, authorize('admin'), async (req, res) => {
  try {
    const count = await Debt.countDocuments({ status: 'pending_approval' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
