const express = require('express');
const router = express.Router();
const Payroll = require('../../models/Payroll');
const PayrollService = require('../../services/PayrollService');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

router.use(auth);
router.use(adminOnly);

// Payroll ro'yxatini olish
router.get('/', async (req, res) => {
  try {
    const { year, month, employee, status } = req.query;
    
    const filter = {};
    
    if (year) filter.year = parseInt(year);
    if (month) filter.month = parseInt(month);
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    
    const payrolls = await Payroll.find(filter)
      .populate('employee', 'name role position')
      .populate('approvedBy', 'name')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      payrolls,
      total: payrolls.length
    });
  } catch (error) {
    console.error('Payroll ro\'yxatini olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Bitta payroll ni olish
router.get('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'name role position')
      .populate('approvedBy', 'name')
      .populate('createdBy', 'name')
      .lean();
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll topilmadi' 
      });
    }
    
    res.json({
      success: true,
      payroll
    });
  } catch (error) {
    console.error('Payroll ni olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Oylik maosh hisoblash
router.post('/calculate', async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'EmployeeId, year va month majburiy' 
      });
    }
    
    // Mavjud payroll tekshirish
    const existing = await Payroll.findOne({
      employee: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu oy uchun payroll allaqachon mavjud' 
      });
    }
    
    // Maosh hisoblash
    const payroll = await PayrollService.createMonthlyPayroll(
      employeeId, 
      parseInt(year), 
      parseInt(month),
      req.user._id
    );
    
    res.status(201).json({
      success: true,
      message: 'Maosh hisoblandi',
      payroll
    });
  } catch (error) {
    console.error('Maosh hisoblashda xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Serverda xatolik' 
    });
  }
});

// Barcha xodimlar uchun maosh hisoblash
router.post('/calculate-all', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year va month majburiy' 
      });
    }
    
    const result = await PayrollService.createAllEmployeesPayroll(
      parseInt(year), 
      parseInt(month),
      req.user._id
    );
    
    res.status(201).json({
      success: true,
      message: `${result.success.length} ta xodim uchun maosh hisoblandi`,
      result
    });
  } catch (error) {
    console.error('Barcha maoshlarni hisoblashda xatolik:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Serverda xatolik' 
    });
  }
});

// Payroll ni tasdiqlash va to'lash
router.post('/:id/approve', async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;
    
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll topilmadi' 
      });
    }
    
    if (payroll.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payroll allaqachon to\'langan' 
      });
    }
    
    payroll.status = 'paid';
    payroll.paymentDate = new Date();
    payroll.paymentMethod = paymentMethod || 'cash';
    if (notes) payroll.notes = notes;
    payroll.approvedBy = req.user._id;
    payroll.approvedAt = new Date();
    
    await payroll.save();
    await payroll.populate('employee', 'name role');
    
    res.json({
      success: true,
      message: 'Maosh to\'landi',
      payroll
    });
  } catch (error) {
    console.error('Payroll ni tasdiqlashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Payroll ni bekor qilish
router.post('/:id/cancel', async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll topilmadi' 
      });
    }
    
    if (payroll.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'To\'langan payroll ni bekor qilish mumkin emas' 
      });
    }
    
    payroll.status = 'cancelled';
    await payroll.save();
    
    res.json({
      success: true,
      message: 'Payroll bekor qilindi'
    });
  } catch (error) {
    console.error('Payroll ni bekor qilishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Payroll ni o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({ 
        success: false, 
        message: 'Payroll topilmadi' 
      });
    }
    
    if (payroll.status === 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'To\'langan payroll ni o\'chirish mumkin emas' 
      });
    }
    
    await payroll.deleteOne();
    
    res.json({
      success: true,
      message: 'Payroll o\'chirildi'
    });
  } catch (error) {
    console.error('Payroll ni o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
