const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const SalarySetting = require('../../models/SalarySetting');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

// Barcha routelar faqat admin uchun
router.use(auth);
router.use(adminOnly);

// HR Dashboard statistikasi
router.get('/stats/dashboard', async (req, res) => {
  try {
    // Jami xodimlar (terminated bo'lmaganlar)
    const totalEmployees = await User.countDocuments({
      role: { $in: ['cashier', 'helper'] },
      status: { $ne: 'terminated' }
    });
    
    // Faol xodimlar
    const activeEmployees = await User.countDocuments({
      role: { $in: ['cashier', 'helper'] },
      status: 'active'
    });
    
    // Barcha faol xodimlarning maoshlari
    const activeEmployeesList = await User.find({
      role: { $in: ['cashier', 'helper'] },
      status: 'active'
    }).select('_id');
    
    const employeeIds = activeEmployeesList.map(e => e._id);
    
    // Har bir xodimning joriy maoshini olish
    const salaries = await SalarySetting.find({
      employee: { $in: employeeIds },
      $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ]
    });
    
    // Jami va o'rtacha maosh
    const totalPayroll = salaries.reduce((sum, s) => sum + (s.baseSalary || 0), 0);
    const avgSalary = salaries.length > 0 ? Math.round(totalPayroll / salaries.length) : 0;
    
    res.json({
      success: true,
      stats: {
        totalEmployees,
        activeEmployees,
        totalPayroll,
        avgSalary,
        inactiveEmployees: totalEmployees - activeEmployees
      }
    });
  } catch (error) {
    console.error('Stats olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// So'nggi faoliyatlar
router.get('/stats/recent-activity', async (req, res) => {
  try {
    const Payroll = require('../../models/Payroll');
    
    // So'nggi 10 ta faoliyat
    const activities = [];
    
    // 1. So'nggi to'langan maoshlar
    const recentPayrolls = await Payroll.find({ status: 'paid' })
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('employee', 'name')
      .lean();
    
    recentPayrolls.forEach(payroll => {
      activities.push({
        type: 'payment',
        message: `${payroll.employee.name} uchun maosh to'landi - ${payroll.netSalary.toLocaleString()} so'm`,
        date: payroll.paymentDate,
        color: 'green'
      });
    });
    
    // 2. So'nggi qo'shilgan xodimlar
    const recentEmployees = await User.find({
      role: { $in: ['cashier', 'helper'] },
      status: { $ne: 'terminated' }
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select('name createdAt')
      .lean();
    
    recentEmployees.forEach(emp => {
      activities.push({
        type: 'new_employee',
        message: `Yangi xodim qo'shildi - ${emp.name}`,
        date: emp.createdAt,
        color: 'blue'
      });
    });
    
    // Sanaga ko'ra saralash
    activities.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      activities: activities.slice(0, 10)
    });
  } catch (error) {
    console.error('Recent activity olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Barcha xodimlarni olish
router.get('/', async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    const filter = {};
    
    // Role filter
    if (role && role !== 'all') {
      filter.role = role;
    } else {
      // Faqat xodimlar (admin emas)
      filter.role = { $in: ['cashier', 'helper'] };
    }
    
    // Status filter - default faqat active va inactive
    if (status) {
      filter.status = status;
    } else {
      // Terminated xodimlarni ko'rsatmaslik
      filter.status = { $ne: 'terminated' };
    }
    
    // Search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { login: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    
    const employees = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();
    
    // Har bir xodim uchun maosh sozlamalarini olish
    const employeesWithSalary = await Promise.all(
      employees.map(async (emp) => {
        const salary = await SalarySetting.findOne({
          employee: emp._id,
          $or: [
            { effectiveTo: { $exists: false } },
            { effectiveTo: null },
            { effectiveTo: { $gte: new Date() } }
          ]
        }).sort({ effectiveFrom: -1 });
        
        return {
          ...emp,
          salary: salary ? {
            baseSalary: salary.baseSalary,
            maxBonus: salary.maxBonus,
            bonusEnabled: salary.bonusEnabled
          } : null
        };
      })
    );
    
    res.json({
      success: true,
      employees: employeesWithSalary,
      total: employeesWithSalary.length
    });
  } catch (error) {
    console.error('Xodimlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Bitta xodimni olish
router.get('/:id', async (req, res) => {
  try {
    const employee = await User.findById(req.params.id)
      .select('-password')
      .lean();
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }
    
    // Maosh sozlamalari
    const salary = await SalarySetting.findOne({
      employee: employee._id,
      $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ]
    }).sort({ effectiveFrom: -1 });
    
    res.json({
      success: true,
      employee: {
        ...employee,
        salary
      }
    });
  } catch (error) {
    console.error('Xodimni olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Yangi xodim qo'shish
router.post('/', async (req, res) => {
  try {
    const { name, login, password, phone, role, position, department, hireDate } = req.body;
    
    // Validatsiya
    if (!name || !login || !password || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Majburiy maydonlar to\'ldirilmagan' 
      });
    }
    
    // Login mavjudligini tekshirish (faqat active/inactive xodimlar)
    const existing = await User.findOne({ 
      login,
      status: { $ne: 'terminated' } // Terminated xodimlarni hisobga olmaslik
    });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu login band' 
      });
    }
    
    // Yangi xodim yaratish
    const employee = new User({
      name,
      login,
      password, // Model da hash qilinadi
      phone,
      role,
      position,
      department,
      hireDate: hireDate || new Date(),
      status: 'active'
    });
    
    await employee.save();
    
    // Passwordni olib tashlash
    const employeeData = employee.toObject();
    delete employeeData.password;
    
    res.status(201).json({
      success: true,
      message: 'Xodim muvaffaqiyatli qo\'shildi',
      employee: employeeData
    });
  } catch (error) {
    console.error('Xodim qo\'shishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Xodimni tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, role, position, department, status } = req.body;
    
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }
    
    // Yangilash
    if (name) employee.name = name;
    if (phone) employee.phone = phone;
    if (role) employee.role = role;
    if (position) employee.position = position;
    if (department) employee.department = department;
    if (status) employee.status = status;
    
    await employee.save();
    
    const employeeData = employee.toObject();
    delete employeeData.password;
    
    res.json({
      success: true,
      message: 'Xodim ma\'lumotlari yangilandi',
      employee: employeeData
    });
  } catch (error) {
    console.error('Xodimni yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Xodimni o'chirish (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }
    
    // Soft delete
    employee.status = 'terminated';
    employee.terminationDate = new Date();
    await employee.save();
    
    res.json({
      success: true,
      message: 'Xodim o\'chirildi'
    });
  } catch (error) {
    console.error('Xodimni o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
