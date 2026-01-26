const express = require('express');
const Debt = require('../models/Debt');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');

// Format number function
const formatNumber = (num) => {
  return new Intl.NumberFormat('uz-UZ').format(num);
};

const router = express.Router();

// Kassa uchun qarzlarni olish (auth talab qilmaydi) - faqat tasdiqlangan qarzlar
router.get('/kassa', async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = {
      status: status || 'approved' // Default faqat tasdiqlangan qarzlar
    };
    if (type) query.type = type;

    console.log('Kassa qarzlar so\'rovi:', query);

    const debts = await Debt.find(query)
      .populate('customer', 'name phone')
      .populate('user', 'name phone role')
      .populate('items.product', 'name code price')
      .sort({ createdAt: -1 });

    console.log(`${debts.length} ta tasdiqlangan qarz topildi`);

    res.json(debts);
  } catch (error) {
    console.error('Qarzlarni olishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun qarz o'chirish (auth talab qilmaydi)
router.delete('/kassa/:id', async (req, res) => {
  try {
    const debt = await Debt.findById(req.params.id).populate('customer', 'name phone');
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

    console.log(`Qarz o'chirilmoqda: ${debt.customer?.name} - ${debt.amount} so'm (Status: ${debt.status})`);

    // Agar qarz tasdiqlangan bo'lsa, mijozning umumiy qarzidan ayirish
    if (debt.status === 'approved' && debt.customer) {
      const remainingAmount = debt.amount - debt.paidAmount;
      await Customer.findByIdAndUpdate(debt.customer._id, {
        $inc: { debt: -remainingAmount }
      });
      console.log(`Mijozning umumiy qarzidan ${remainingAmount} so'm ayrildi`);
    }

    await Debt.findByIdAndDelete(req.params.id);

    console.log('Qarz muvaffaqiyatli o\'chirildi');
    res.json({ message: 'Qarz o\'chirildi' });
  } catch (error) {
    console.error('Qarzni o\'chirishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun yangi qarz qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { customer, amount, paidAmount, dueDate, description, items } = req.body;

    console.log(`Qarz qo'shish so'rovi: mijoz=${customer}, summa=${amount}, to'langan=${paidAmount}`);

    // Mijozning mavjud qarzini tekshirish
    const existingCustomer = await Customer.findById(customer);
    if (!existingCustomer) {
      return res.status(404).json({ message: 'Mijoz topilmadi' });
    }

    // Mijozning mavjud aktiv qarzini topish
    const existingDebt = await Debt.findOne({
      customer: customer,
      status: 'approved',
      type: 'receivable'
    }).sort({ createdAt: -1 }); // Eng oxirgi qarzni olish

    const remainingAmount = amount - (paidAmount || 0);
    let debt;

    if (existingDebt) {
      // Mavjud qarzga qo'shish
      console.log(`Mavjud qarzga qo'shish: ${existingDebt.amount} + ${amount} = ${existingDebt.amount + amount}`);

      existingDebt.amount += amount;
      existingDebt.description = `${existingDebt.description}\n+ ${description || `Xarid qoldig'i - ${new Date().toLocaleDateString('uz-UZ')}`} (${formatNumber(amount)} so'm)`;

      // Agar yangi mahsulotlar bo'lsa, qo'shish
      if (items && items.length > 0) {
        existingDebt.items = existingDebt.items.concat(items);
      }

      await existingDebt.save();
      debt = existingDebt;

      console.log(`✅ Mavjud qarzga qo'shildi. Yangi summa: ${debt.amount} so'm`);
    } else {
      // Yangi qarz yaratish (agar mavjud qarz bo'lmasa)
      console.log('Yangi qarz yaratilmoqda...');

      const debtData = {
        type: 'receivable',
        customer,
        amount: amount,
        paidAmount: paidAmount || 0,
        dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: description || `Xarid qoldig'i - ${new Date().toLocaleDateString('uz-UZ')}`,
        items: items || [],
        status: 'approved'
      };

      debt = new Debt(debtData);
      await debt.save();

      console.log(`✅ Yangi qarz yaratildi: ${debt.amount} so'm`);
    }

    // Mijozning umumiy qarzini yangilash
    await Customer.findByIdAndUpdate(customer, {
      $inc: { debt: remainingAmount }
    });

    // Populate qilib qaytarish
    await debt.populate([
      { path: 'customer', select: 'name phone' },
      { path: 'items.product', select: 'name code price' }
    ]);

    console.log(`Mijozning yangi umumiy qarzi: ${existingCustomer.debt + remainingAmount} so'm`);

    // Telegram ga xabar yuborish
    try {
      const telegramService = require('../services/telegramService');
      await telegramService.sendDebtNotification({
        customerName: debt.customer.name,
        customerPhone: debt.customer.phone,
        amount: amount, // Faqat qo'shilgan summa
        totalAmount: debt.amount, // Umumiy qarz summasi
        paidAmount: debt.paidAmount,
        remainingDebt: debt.amount - debt.paidAmount,
        dueDate: debt.dueDate,
        description: description || `Xarid qoldig'i - ${new Date().toLocaleDateString('uz-UZ')}`,
        items: items || [],
        isAddedToExisting: !!existingDebt // Mavjud qarzga qo'shilganligini ko'rsatish
      });
      console.log('✅ Telegram xabari yuborildi');
    } catch (telegramError) {
      console.error('❌ Telegram notification error:', telegramError);
    }

    res.status(201).json(debt);
  } catch (error) {
    console.error('Qarz qo\'shishda xatolik:', error);
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
      status: 'approved',
      createdBy: req.user._id
    };

    if (type === 'payable') {
      debtData.creditorName = creditorName;
    } else {
      debtData.customer = customer;
    }

    const debt = new Debt(debtData);
    await debt.save();

    // Darhol mijozning umumiy qarzini yangilash (faqat receivable qarzlar uchun)
    if (debt.type === 'receivable' && debt.customer) {
      await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: debt.amount } });
    }

    if (debt.customer) {
      await debt.populate('customer', 'name phone');
    }

    // Mijozga xabar yuborish
    if (debt.type === 'receivable' && debt.customer) {
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
      }
    }

    res.status(201).json(debt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { type, customer, creditorName, amount, dueDate, description, collateral } = req.body;
    const debt = await Debt.findById(req.params.id);
    if (!debt) return res.status(404).json({ message: 'Qarz topilmadi' });

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

    debt.status = 'approved';
    await debt.save();

    if (debt.type === 'receivable' && debt.customer) {
      await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: debt.amount } });
    }

    await debt.populate('customer', 'name phone');

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

// Qarzga to'lov qilish
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const { amount, method } = req.body;
    const debt = await Debt.findById(req.params.id);
    
    if (!debt) {
      return res.status(404).json({ message: 'Qarz topilmadi' });
    }

    const remainingAmount = debt.amount - debt.paidAmount;
    
    if (amount > remainingAmount) {
      return res.status(400).json({ message: 'Ortiq pul kiritib bo\'lmaydi' });
    }

    debt.paidAmount += amount;
    
    // Agar to'langan summa jami qarzga teng bo'lsa, qarzni to'langan deb belgilash
    if (debt.paidAmount >= debt.amount) {
      debt.status = 'paid';
      debt.paidAmount = debt.amount;
      
      // Mijozning umumiy qarzini yangilash
      if (debt.type === 'receivable' && debt.customer) {
        await Customer.findByIdAndUpdate(debt.customer, {
          $inc: { debt: -remainingAmount }
        });
      }
    }

    await debt.save();
    
    // Populate qilib qaytarish
    if (debt.customer) {
      await debt.populate('customer', 'name phone');
    }

    res.json(debt);
  } catch (error) {
    console.error('To\'lov qilishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;