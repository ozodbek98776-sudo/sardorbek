const express = require('express');
const { auth } = require('../middleware/auth');
const serviceFactory = require('../services/business/ServiceFactory');
const { serviceWrapper } = require('../middleware/serviceErrorHandler');

const router = express.Router();

// Service larni olish
const userService = serviceFactory.user;

// Universal login route - barcha rollar uchun
router.post('/login', serviceWrapper(async (req, res) => {
  const { login, password } = req.body;
  const result = await userService.login(login, password);
  return result;
}));

// Admin mavjudligini tekshirish (auth talab qilmaydi)
router.get('/check-admin', async (req, res) => {
  try {
    console.log('✅ Check admin endpoint called');
    // Hardcoded admin har doim mavjud
    res.json({ hasAdmin: true, message: 'Test successful' });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({ hasAdmin: false, error: error.message });
  }
});

// Current user ma'lumotlarini olish
router.get('/me', auth, serviceWrapper(async (req, res) => {
  return {
    _id: req.user._id,
    name: req.user.name,
    login: req.user.login,
    phone: req.user.phone || req.user.email,
    role: req.user.role,
    createdAt: req.user.createdAt
  };
}));

// Profile yangilash
router.put('/profile', auth, serviceWrapper(async (req, res) => {
  const result = await userService.updateUser(req.user._id, req.body, req.user);
  return result.user;
}));

// Admin login va parolni o'zgartirish
router.put('/admin/credentials', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin o\'z login va parolini o\'zgartirishi mumkin');
  }
  
  const result = await userService.updateAdminCredentials(req.user._id, req.body);
  return result;
}));

// Admin ma'lumotlarini olish
router.get('/admin/info', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin uchun');
  }
  
  const result = await userService.getAdminInfo(req.user._id);
  return result;
}));

// ==================== KASSA FOYDALANUVCHILARINI BOSHQARISH ====================

// Barcha kassa foydalanuvchilarini olish
router.get('/admin/kassa-users', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin uchun');
  }
  
  const result = await userService.getUsers({ role: 'cashier' });
  return { success: true, users: result.data };
}));

// Yangi kassa foydalanuvchisi yaratish
router.post('/admin/kassa-users', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin kassa foydalanuvchisi yarata oladi');
  }
  
  const userData = { ...req.body, role: 'cashier' };
  const result = await userService.createUser(userData, req.user);
  return {
    success: true,
    message: 'Kassa foydalanuvchisi muvaffaqiyatli yaratildi',
    user: result.user
  };
}));

// Kassa foydalanuvchisini o'zgartirish
router.put('/admin/kassa-users/:id', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin kassa foydalanuvchisini o\'zgartira oladi');
  }
  
  const result = await userService.updateUser(req.params.id, req.body, req.user);
  return {
    success: true,
    message: 'Kassa foydalanuvchisi muvaffaqiyatli o\'zgartirildi',
    user: result.user
  };
}));

// Kassa foydalanuvchisini o'chirish
router.delete('/admin/kassa-users/:id', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin kassa foydalanuvchisini o\'chira oladi');
  }
  
  const result = await userService.deleteUser(req.params.id, req.user);
  return {
    success: true,
    message: 'Kassa foydalanuvchisi muvaffaqiyatli o\'chirildi'
  };
}));

// ==================== XODIMLARNI (HELPERS) BOSHQARISH ====================

// Barcha xodimlarni olish
router.get('/admin/helpers', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin uchun');
  }
  
  const result = await userService.getUsers({ role: 'helper' });
  return { success: true, users: result.data };
}));

// Yangi xodim yaratish
router.post('/admin/helpers', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin xodim yarata oladi');
  }
  
  const userData = { ...req.body, role: 'helper' };
  const result = await userService.createUser(userData, req.user);
  
  // Socket.IO notification
  if (global.io) {
    global.io.emit('helper:created', {
      _id: result.user._id,
      name: result.user.name,
      login: result.user.login,
      phone: result.user.phone,
      role: result.user.role
    });
  }
  
  return {
    success: true,
    message: 'Xodim muvaffaqiyatli yaratildi',
    user: result.user
  };
}));

// Xodimni o'zgartirish
router.put('/admin/helpers/:id', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin xodimni o\'zgartira oladi');
  }
  
  const result = await userService.updateUser(req.params.id, req.body, req.user);
  
  // Socket.IO notification
  if (global.io) {
    global.io.emit('helper:updated', {
      _id: result.user._id,
      name: result.user.name,
      login: result.user.login,
      phone: result.user.phone,
      role: result.user.role,
      bonusPercentage: result.user.bonusPercentage
    });
  }
  
  return {
    success: true,
    message: 'Xodim muvaffaqiyatli o\'zgartirildi',
    user: result.user
  };
}));

// Xodimni o'chirish
router.delete('/admin/helpers/:id', auth, serviceWrapper(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw userService.createPermissionError('Faqat admin xodimni o\'chira oladi');
  }
  
  const result = await userService.deleteUser(req.params.id, req.user);
  
  // Socket.IO notification
  if (global.io) {
    global.io.emit('helper:deleted', { _id: req.params.id });
  }
  
  return {
    success: true,
    message: 'Xodim muvaffaqiyatli o\'chirildi'
  };
}));

module.exports = router;
