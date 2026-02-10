const express = require('express');
const router = express.Router();
const KPITemplate = require('../../models/KPITemplate');
const KPIAssignment = require('../../models/KPIAssignment');
const KPIRecord = require('../../models/KPIRecord');
const KPICalculator = require('../../services/KPICalculator');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

// Barcha routelar faqat admin uchun
router.use(auth);
router.use(adminOnly);

// ============================================
// KPI TEMPLATES
// ============================================

// Barcha KPI shablonlarni olish
router.get('/templates', async (req, res) => {
  try {
    const { isActive, type, role } = req.query;
    
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (type) filter.type = type;
    if (role) filter.applicableRoles = role;
    
    const templates = await KPITemplate.find(filter)
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('KPI shablonlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Yangi KPI shablon yaratish
router.post('/templates', async (req, res) => {
  try {
    const template = new KPITemplate({
      ...req.body,
      createdBy: req.user._id
    });
    
    await template.save();
    
    res.status(201).json({
      success: true,
      message: 'KPI shablon yaratildi',
      template
    });
  } catch (error) {
    console.error('KPI shablon yaratishda xatolik:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kod allaqachon mavjud' 
      });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// KPI shablonni yangilash
router.put('/templates/:id', async (req, res) => {
  try {
    const template = await KPITemplate.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'KPI shablon topilmadi' });
    }
    
    res.json({
      success: true,
      message: 'KPI shablon yangilandi',
      template
    });
  } catch (error) {
    console.error('KPI shablonni yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// KPI shablonni o'chirish
router.delete('/templates/:id', async (req, res) => {
  try {
    const template = await KPITemplate.findById(req.params.id);
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'KPI shablon topilmadi' });
    }
    
    // Faol assignmentlar borligini tekshirish
    const activeAssignments = await KPIAssignment.countDocuments({
      kpiTemplate: req.params.id,
      isActive: true
    });
    
    if (activeAssignments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu KPI hali xodimlarga biriktirilgan. Avval assignmentlarni o\'chiring.'
      });
    }
    
    await template.deleteOne();
    
    res.json({
      success: true,
      message: 'KPI shablon o\'chirildi'
    });
  } catch (error) {
    console.error('KPI shablonni o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// KPI ASSIGNMENTS
// ============================================

// Barcha KPI assignmentlarni olish
router.get('/assignments', async (req, res) => {
  try {
    const { employee, isActive } = req.query;
    
    const filter = {};
    if (employee) filter.employee = employee;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const assignments = await KPIAssignment.find(filter)
      .populate('employee', 'name role')
      .populate('kpiTemplate')
      .populate('assignedBy', 'name')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('KPI assignmentlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xodimga KPI biriktirish
router.post('/assignments', async (req, res) => {
  try {
    const { employee, kpiTemplate, customTarget, customWeight, customMaxBonus } = req.body;
    
    // Mavjudligini tekshirish
    const existing = await KPIAssignment.findOne({
      employee,
      kpiTemplate,
      isActive: true
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bu KPI allaqachon xodimga biriktirilgan'
      });
    }
    
    const assignment = new KPIAssignment({
      employee,
      kpiTemplate,
      customTarget,
      customWeight,
      customMaxBonus,
      assignedBy: req.user._id
    });
    
    await assignment.save();
    await assignment.populate('kpiTemplate');
    
    res.status(201).json({
      success: true,
      message: 'KPI xodimga biriktirildi',
      assignment
    });
  } catch (error) {
    console.error('KPI biriktirishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xodimning KPI larini olish
router.get('/assignments/employee/:employeeId', async (req, res) => {
  try {
    const assignments = await KPIAssignment.getActiveAssignments(req.params.employeeId);
    
    res.json({
      success: true,
      assignments
    });
  } catch (error) {
    console.error('KPI assignmentlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// KPI assignmentni o'chirish
router.delete('/assignments/:id', async (req, res) => {
  try {
    const assignment = await KPIAssignment.findById(req.params.id);
    
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment topilmadi' });
    }
    
    await assignment.deactivate();
    
    res.json({
      success: true,
      message: 'KPI assignment o\'chirildi'
    });
  } catch (error) {
    console.error('KPI assignmentni o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// KPI RECORDS & CALCULATION
// ============================================

// Xodim uchun oylik KPI larni hisoblash
router.post('/calculate', async (req, res) => {
  try {
    const { employeeId, year, month } = req.body;
    
    if (!employeeId || !year || !month) {
      return res.status(400).json({
        success: false,
        message: 'employeeId, year va month majburiy'
      });
    }
    
    const records = await KPICalculator.calculateMonthlyKPIs(employeeId, year, month);
    
    res.json({
      success: true,
      message: 'KPI lar hisoblandi',
      records,
      totalBonus: records.reduce((sum, r) => sum + r.bonusEarned, 0)
    });
  } catch (error) {
    console.error('KPI hisoblashda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Barcha xodimlar uchun KPI hisoblash
router.post('/calculate-all', async (req, res) => {
  try {
    const { year, month } = req.body;
    
    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'year va month majburiy'
      });
    }
    
    const results = await KPICalculator.calculateAllEmployeesKPIs(year, month);
    
    res.json({
      success: true,
      message: 'Barcha xodimlar uchun KPI lar hisoblandi',
      results
    });
  } catch (error) {
    console.error('KPI hisoblashda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Xodimning oylik KPI recordlarini olish
router.get('/records/:employeeId/:year/:month', async (req, res) => {
  try {
    const { employeeId, year, month } = req.params;
    
    const records = await KPIRecord.getMonthlyRecords(
      employeeId,
      parseInt(year),
      parseInt(month)
    );
    
    const totalBonus = await KPIRecord.calculateMonthlyBonus(
      employeeId,
      parseInt(year),
      parseInt(month)
    );
    
    res.json({
      success: true,
      records,
      totalBonus
    });
  } catch (error) {
    console.error('KPI recordlarni olishda xatolik:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
