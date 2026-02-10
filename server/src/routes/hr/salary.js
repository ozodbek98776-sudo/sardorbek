const express = require('express');
const router = express.Router();
const SalarySetting = require('../../models/SalarySetting');
const User = require('../../models/User');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

router.use(auth);
router.use(adminOnly);

// Xodim uchun maosh sozlamalarini olish
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const settings = await SalarySetting.find({ 
      employee: req.params.employeeId 
    })
      .populate('employee', 'name role')
      .populate('createdBy', 'name')
      .sort({ effectiveFrom: -1 })
      .lean();
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Maosh sozlamalarini olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Joriy maosh sozlamasini olish
router.get('/employee/:employeeId/current', async (req, res) => {
  try {
    const setting = await SalarySetting.findOne({
      employee: req.params.employeeId,
      $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ]
    })
      .populate('employee', 'name role')
      .sort({ effectiveFrom: -1 })
      .lean();
    
    res.json({
      success: true,
      setting
    });
  } catch (error) {
    console.error('Joriy maosh sozlamasini olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Yangi maosh sozlamasi yaratish
router.post('/', async (req, res) => {
  try {
    const { 
      employee, 
      baseSalary, 
      bonusEnabled, 
      maxBonus, 
      minBonus,
      allowances,
      deductions,
      effectiveFrom 
    } = req.body;
    
    // Validatsiya
    if (!employee || !baseSalary) {
      return res.status(400).json({ 
        success: false, 
        message: 'Xodim va asosiy maosh majburiy' 
      });
    }
    
    // Xodim mavjudligini tekshirish
    const emp = await User.findById(employee);
    if (!emp) {
      return res.status(404).json({ 
        success: false, 
        message: 'Xodim topilmadi' 
      });
    }
    
    // Oldingi sozlamani tugatish
    const previousSetting = await SalarySetting.findOne({
      employee,
      $or: [
        { effectiveTo: { $exists: false } },
        { effectiveTo: null },
        { effectiveTo: { $gte: new Date() } }
      ]
    });
    
    if (previousSetting) {
      previousSetting.effectiveTo = effectiveFrom ? new Date(effectiveFrom) : new Date();
      await previousSetting.save();
    }
    
    // Yangi sozlama yaratish
    const settingData = {
      employee,
      baseSalary,
      bonusEnabled: bonusEnabled !== false,
      maxBonus: maxBonus || 0,
      minBonus: minBonus || 0,
      allowances: allowances || [],
      deductions: deductions || [],
      effectiveFrom: effectiveFrom || new Date()
    };
    
    // Hardcoded admin uchun createdBy ni employee ga o'rnatish
    if (req.user._id === 'hardcoded-admin-id') {
      settingData.createdBy = employee;
    } else {
      settingData.createdBy = req.user._id;
    }
    
    const setting = new SalarySetting(settingData);
    
    await setting.save();
    await setting.populate('employee', 'name role');
    
    res.status(201).json({
      success: true,
      message: 'Maosh sozlamasi saqlandi',
      setting
    });
  } catch (error) {
    console.error('Maosh sozlamasini yaratishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Maosh sozlamasini tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { 
      baseSalary, 
      bonusEnabled, 
      maxBonus, 
      minBonus,
      allowances,
      deductions 
    } = req.body;
    
    const setting = await SalarySetting.findById(req.params.id);
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sozlama topilmadi' 
      });
    }
    
    // Yangilash
    if (baseSalary !== undefined) setting.baseSalary = baseSalary;
    if (bonusEnabled !== undefined) setting.bonusEnabled = bonusEnabled;
    if (maxBonus !== undefined) setting.maxBonus = maxBonus;
    if (minBonus !== undefined) setting.minBonus = minBonus;
    if (allowances !== undefined) setting.allowances = allowances;
    if (deductions !== undefined) setting.deductions = deductions;
    
    await setting.save();
    await setting.populate('employee', 'name role');
    
    res.json({
      success: true,
      message: 'Maosh sozlamasi yangilandi',
      setting
    });
  } catch (error) {
    console.error('Maosh sozlamasini yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Maosh sozlamasini o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const setting = await SalarySetting.findById(req.params.id);
    
    if (!setting) {
      return res.status(404).json({ 
        success: false, 
        message: 'Sozlama topilmadi' 
      });
    }
    
    // Joriy sozlamani o'chirish mumkin emas
    if (!setting.effectiveTo || setting.effectiveTo >= new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Joriy sozlamani o\'chirish mumkin emas' 
      });
    }
    
    await setting.deleteOne();
    
    res.json({
      success: true,
      message: 'Maosh sozlamasi o\'chirildi'
    });
  } catch (error) {
    console.error('Maosh sozlamasini o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
