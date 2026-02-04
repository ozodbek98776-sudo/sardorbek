const express = require('express');
const Customer = require('../models/Customer');
const Receipt = require('../models/Receipt');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Kassa uchun yangi mijoz qo'shish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    console.log(`📝 Yangi mijoz qo'shish so'rovi:`);
    console.log(`   - Ism: ${name}`);
    console.log(`   - Telefon: ${phone}`);
    console.log(`   - Email: ${email || 'yo\'q'}`);
    console.log(`   - Manzil: ${address || 'yo\'q'}`);

    // Telefon raqami mavjudligini tekshirish
    if (phone) {
      const existingCustomer = await Customer.findOne({ phone });
      if (existingCustomer) {
        console.log(`⚠️ Bu telefon raqami bilan mijoz allaqachon mavjud: ${existingCustomer.name}`);
        return res.status(400).json({
          message: 'Bu telefon raqami bilan mijoz allaqachon mavjud',
          existingCustomer: {
            _id: existingCustomer._id,
            name: existingCustomer.name,
            phone: existingCustomer.phone
          }
        });
      }
    }

    const customer = new Customer({
      name: name.trim(),
      phone: phone ? phone.trim() : '',
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      debt: 0,
      totalPurchases: 0
    });

    await customer.save();

    console.log(`✅ Yangi mijoz yaratildi:`);
    console.log(`   - ID: ${customer._id}`);
    console.log(`   - Ism: ${customer.name}`);
    console.log(`   - Telefon: ${customer.phone}`);

    res.status(201).json({
      success: true,
      message: 'Mijoz muvaffaqiyatli qo\'shildi',
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        debt: customer.debt,
        totalPurchases: customer.totalPurchases
      }
    });

  } catch (error) {
    console.error('❌ Mijoz qo\'shishda xatolik:', error);
    console.error('Xatolik tafsilotlari:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Mijoz qo\'shishda xatolik yuz berdi',
      error: error.message
    });
  }
});

// Kassa uchun mijozlarni olish (auth talab qilmaydi)
router.get('/kassa', async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const customers = await Customer.find(query);

    // Get purchase totals for each customer
    const customerIds = customers.map(c => c._id);
    const purchaseStats = await Receipt.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
          status: { $in: ['completed', 'approved'] },
          isReturn: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalPurchases: { $sum: '$total' },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    // Map purchase stats to customers
    const statsMap = {};
    purchaseStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        totalPurchases: stat.totalPurchases,
        purchaseCount: stat.purchaseCount
      };
    });

    const customersWithStats = customers.map(c => ({
      ...c.toObject(),
      totalPurchases: statsMap[c._id.toString()]?.totalPurchases || 0,
      purchaseCount: statsMap[c._id.toString()]?.purchaseCount || 0
    }));

    res.json(customersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const customers = await Customer.find(query);

    // Get purchase totals for each customer
    const customerIds = customers.map(c => c._id);
    const purchaseStats = await Receipt.aggregate([
      {
        $match: {
          customer: { $in: customerIds },
          status: { $in: ['completed', 'approved'] },
          isReturn: { $ne: true }
        }
      },
      {
        $group: {
          _id: '$customer',
          totalPurchases: { $sum: '$total' },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    // Map purchase stats to customers
    const statsMap = {};
    purchaseStats.forEach(stat => {
      statsMap[stat._id.toString()] = {
        totalPurchases: stat.totalPurchases,
        purchaseCount: stat.purchaseCount
      };
    });

    const customersWithStats = customers.map(c => ({
      ...c.toObject(),
      totalPurchases: statsMap[c._id.toString()]?.totalPurchases || 0,
      purchaseCount: statsMap[c._id.toString()]?.purchaseCount || 0
    }));

    res.json(customersWithStats);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Mijoz statistikasi
router.get('/:id/stats', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });

    const Debt = require('../models/Debt');
    
    // Barcha qarzlarni olish
    const debts = await Debt.find({ customer: req.params.id }).sort({ createdAt: -1 });
    
    // Jami qarz va to'langan miqdorni hisoblash
    let totalDebt = 0;
    let totalPaid = 0;
    
    debts.forEach(debt => {
      totalDebt += debt.amount || 0;
      totalPaid += debt.paidAmount || 0;
    });

    // Xaridlar statistikasi
    const purchaseStats = await Receipt.aggregate([
      {
        $match: {
          customer: customer._id,
          status: { $in: ['completed', 'approved'] },
          isReturn: { $ne: true }
        }
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: '$total' },
          purchaseCount: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address
      },
      totalDebt,
      totalPaid,
      remainingDebt: totalDebt - totalPaid,
      debts: debts.map(d => ({
        _id: d._id,
        amount: d.amount,
        paidAmount: d.paidAmount || 0,
        status: d.status,
        description: d.description,
        createdAt: d.createdAt,
        dueDate: d.dueDate
      })),
      totalPurchases: purchaseStats[0]?.totalPurchases || 0,
      purchaseCount: purchaseStats[0]?.purchaseCount || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Statistikani yuklashda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const customer = new Customer({ ...req.body, createdBy: req.user._id });
    await customer.save();
    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Mijoz topilmadi' });
    
    // Mijozning barcha qarzlarini o'chirish
    const Debt = require('../models/Debt');
    const deletedDebts = await Debt.deleteMany({ customer: req.params.id });
    
    console.log(`🗑️ Mijoz o'chirilmoqda: ${customer.name}`);
    console.log(`   - Mijoz ID: ${req.params.id}`);
    console.log(`   - O'chirilgan qarzlar soni: ${deletedDebts.deletedCount}`);
    
    // Mijozni o'chirish
    await Customer.findByIdAndDelete(req.params.id);
    
    res.json({ 
      message: 'Mijoz va uning barcha qarzlari o\'chirildi',
      deletedDebtsCount: deletedDebts.deletedCount
    });
  } catch (error) {
    console.error('❌ Mijozni o\'chirishda xatolik:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
