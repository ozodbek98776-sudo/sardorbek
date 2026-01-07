const express = require('express');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Automatic cleanup function for overdue debts
const cleanupOverdueDebts = async () => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today

    // Find debts that are due today or overdue (including today)
    const overdueDebts = await Debt.find({
      dueDate: { $lte: today }, // Less than or equal to today
      status: { $ne: 'paid' }
    }).populate('customer', 'name phone');

    console.log(`Found ${overdueDebts.length} overdue debts to cleanup (including today)`);

    for (const debt of overdueDebts) {
      // Update customer's total debt (subtract the remaining amount)
      if (debt.customer && debt.type === 'receivable') {
        const remainingAmount = debt.amount - debt.paidAmount;
        if (remainingAmount > 0) {
          await Customer.findByIdAndUpdate(debt.customer._id, {
            $inc: { debt: -remainingAmount }
          });
          console.log(`Reduced customer ${debt.customer.name} debt by ${remainingAmount}`);
        }
      }

      // Delete the debt
      await Debt.findByIdAndDelete(debt._id);
      console.log(`Deleted overdue debt: ${debt._id} for customer ${debt.customer?.name}`);
    }

    return overdueDebts.length;
  } catch (error) {
    console.error('Error cleaning up overdue debts:', error);
    return 0;
  }
};

// Manual cleanup endpoint (for testing)
router.post('/cleanup-overdue', async (req, res) => {
  try {
    const deletedCount = await cleanupOverdueDebts();
    res.json({
      message: `${deletedCount} ta muddati o'tgan qarz o'chirildi`,
      deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun qarzlarni olish (auth talab qilmaydi)
router.get('/kassa', async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    // Sort by due date (ascending) - earliest due dates first
    const debts = await Debt.find(query)
      .populate('customer', 'name phone')
      .sort({ dueDate: 1, createdAt: -1 }); // First by due date (earliest first), then by creation date (newest first)

    res.json(debts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun yangi qarz qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { customer, amount, paidAmount = 0, dueDate, description, collateral } = req.body;

    // Check if customer already has an existing debt
    const existingDebt = await Debt.findOne({
      customer,
      type: 'receivable',
      status: { $ne: 'paid' }
    });

    if (existingDebt) {
      // Update existing debt by adding new amount
      const newTotalAmount = existingDebt.amount + amount;
      const newPaidAmount = existingDebt.paidAmount + paidAmount;

      // Combine descriptions
      let combinedDescription = existingDebt.description || '';
      if (description) {
        combinedDescription += combinedDescription ? '\n\n--- Yangi qarz ---\n' + description : description;
      }

      // Update the existing debt
      existingDebt.amount = newTotalAmount;
      existingDebt.paidAmount = newPaidAmount;
      existingDebt.description = combinedDescription;

      // Update due date to the later one
      if (new Date(dueDate) > new Date(existingDebt.dueDate)) {
        existingDebt.dueDate = dueDate;
      }

      // Set status based on payment
      if (newPaidAmount >= newTotalAmount) {
        existingDebt.status = 'paid';
      } else {
        existingDebt.status = 'pending';
      }

      await existingDebt.save();

      // Update customer's total debt (add only the remaining unpaid amount)
      const newRemainingAmount = (amount - paidAmount);
      if (newRemainingAmount > 0) {
        await Customer.findByIdAndUpdate(customer, { $inc: { debt: newRemainingAmount } });
      }

      // Populate and return
      await existingDebt.populate('customer', 'name phone');

      res.status(200).json({
        ...existingDebt.toObject(),
        message: 'Mavjud qarzga qo\'shildi'
      });
    } else {
      // Create new debt if no existing debt found
      const debtData = {
        type: 'receivable',
        customer,
        amount,
        paidAmount,
        dueDate,
        description,
        collateral
      };

      // Set status based on payment
      if (paidAmount >= amount) {
        debtData.status = 'paid';
      }

      const debt = new Debt(debtData);
      await debt.save();

      // Update customer's total debt (only unpaid amount)
      const remainingAmount = amount - paidAmount;
      if (remainingAmount > 0) {
        await Customer.findByIdAndUpdate(customer, { $inc: { debt: remainingAmount } });
      }

      // Populate and return
      await debt.populate('customer', 'name phone');

      res.status(201).json({
        ...debt.toObject(),
        message: 'Yangi qarz yaratildi'
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun qarzni o'chirish (auth talab qilmaydi)
router.delete('/kassa/:id', async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    // Mijozning qarzini kamaytirish (faqat to'lanmagan qism)
    if (debt.type === 'receivable' && debt.customer) {
      const remainingAmount = debt.amount - debt.paidAmount;
      if (remainingAmount > 0) {
        await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: -remainingAmount } });
      }
    }

    await Debt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Qarz o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun qarzni yangilash (auth talab qilmaydi)
router.put('/kassa/:id', async (req, res) => {
  try {
    const { amount, paidAmount = 0, dueDate } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    // Mijozning qarzini yangilash (faqat receivable type uchun)
    if (debt.type === 'receivable' && debt.customer) {
      const oldRemaining = debt.amount - debt.paidAmount;
      const newRemaining = amount - paidAmount;
      const diff = newRemaining - oldRemaining;
      if (diff !== 0) {
        await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: diff } });
      }
    }

    // Qarz ma'lumotlarini yangilash
    debt.amount = amount;
    debt.paidAmount = paidAmount;
    debt.dueDate = dueDate;

    // Status ni yangilash
    if (paidAmount >= amount) {
      debt.status = 'paid';
    } else {
      debt.status = 'pending';
    }

    await debt.save();

    // Populate qilib qaytarish
    await debt.populate('customer', 'name phone');

    res.json(debt);
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
      pending: await Debt.countDocuments({ ...typeFilter, status: 'pending' }),
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
      createdBy: req.user._id
    };

    if (type === 'payable') {
      // Own debt - I owe someone
      debtData.creditorName = creditorName;
    } else {
      // Customer debt - they owe me
      debtData.customer = customer;
      await Customer.findByIdAndUpdate(customer, { $inc: { debt: amount } });
    }

    const debt = new Debt(debtData);
    await debt.save();

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

module.exports = router;
