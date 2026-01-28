const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Admin mavjudligini tekshirish (authentication talab qilmaydi)
router.get('/check-admin', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    res.json({ 
      hasAdmin: adminCount > 0,
      count: adminCount 
    });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({ 
      hasAdmin: true, // Xatolik bo'lsa, login sahifasiga yo'naltirish
      error: error.message 
    });
  }
});

// Register route - Faqat birinchi admin uchun
router.post('/register', async (req, res) => {
  try {
    const { name, login, phone, password } = req.body;
    
    // Admin mavjudligini tekshirish
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({ 
        message: 'Admin allaqachon mavjud. Ro\'yxatdan o\'tish yopiq.' 
      });
    }
    
    // Login yoki telefon allaqachon mavjudligini tekshirish
    const existingUser = await User.findOne({ 
      $or: [
        { login: login },
        { phone: phone }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'Bu login yoki telefon raqam allaqachon ro\'yxatdan o\'tgan' 
      });
    }

    // Birinchi admin yaratish
    const user = new User({
      name,
      login,
      phone,
      password,
      role: 'admin'
    });

    await user.save();
    
    console.log('✅ Birinchi admin yaratildi:', login);

    // Token yaratish
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'Admin muvaffaqiyatli yaratildi',
      token, 
      user: { 
        _id: user._id, 
        name: user.name,
        login: user.login,
        phone: user.phone, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    
    console.log('🔐 Login attempt:', login);
    
    // MongoDB dan foydalanuvchini qidirish (login yoki phone)
    const user = await User.findOne({ 
      $or: [
        { login: login },
        { phone: login }
      ]
    });
    
    if (!user) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'Login yoki parol noto\'g\'ri' });
    }
    
    console.log('✅ User found:', user.login || user.phone);
    
    // Parolni tekshirish
    const isMatch = await user.comparePassword(password);
    console.log('🔐 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Password incorrect');
      return res.status(400).json({ message: 'Login yoki parol noto\'g\'ri' });
    }
    
    // Token yaratish
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    console.log('✅ Login successful');
    
    res.json({ 
      token, 
      user: { 
        _id: user._id, 
        name: user.name,
        login: user.login,
        phone: user.phone, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = req.user;
  res.json({
    _id: user._id,
    name: user.name,
    login: user.login, // Login qo'shildi
    phone: user.phone || user.email,
    role: user.role,
    createdAt: user.createdAt
  });
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    
    user.name = name;
    user.phone = phone;
    if (password) {
      user.password = password;
    }
    await user.save();
    
    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Admin login va parolni o'zgartirish
router.put('/admin/credentials', auth, async (req, res) => {
  try {
    const { currentPassword, newLogin, newPassword } = req.body;
    
    console.log('🔐 Admin credentials update request:');
    console.log('   User ID:', req.user._id);
    console.log('   User Role:', req.user.role);
    console.log('   Current Password provided:', !!currentPassword);
    console.log('   New Login:', newLogin);
    console.log('   New Password provided:', !!newPassword);
    // Faqat admin o'zgartirishi mumkin
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied: User is not admin');
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin o\'z login va parolini o\'zgartirishi mumkin' 
      });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log('❌ User not found in database');
      return res.status(404).json({ 
        success: false,
        message: 'Foydalanuvchi topilmadi' 
      });
    }
    
    console.log('✅ User found:', user.login);
    
    // Joriy parolni tekshirish
    const isMatch = await user.comparePassword(currentPassword);
    console.log('🔐 Password match:', isMatch);
    
    if (!isMatch) {
      console.log('❌ Current password is incorrect');
      return res.status(400).json({ 
        success: false,
        message: 'Joriy parol noto\'g\'ri' 
      });
    }
    
    // Yangi login tekshirish (agar o'zgartirilsa)
    if (newLogin && newLogin !== user.login) {
      console.log('🔄 Checking if new login is available:', newLogin);
      const existingUser = await User.findOne({ 
        login: newLogin, 
        _id: { $ne: user._id } 
      });
      
      if (existingUser) {
        console.log('❌ Login already taken');
        return res.status(400).json({ 
          success: false,
          message: 'Bu login allaqachon band' 
        });
      }
      
      console.log('✅ Updating login from', user.login, 'to', newLogin);
      user.login = newLogin;
    }
    
    // Yangi parolni o'rnatish
    if (newPassword) {
      console.log('✅ Updating password');
      user.password = newPassword;
    }
    
    console.log('💾 Saving user to database...');
    await user.save();
    console.log('✅ User saved successfully');
    
    // Yangi token yaratish
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    console.log('✅ New token generated');
    
    console.log('📤 Sending response with updated user data');
    res.json({
      success: true,
      message: 'Login va parol muvaffaqiyatli o\'zgartirildi',
      token,
      user: {
        _id: user._id,
        name: user.name,
        login: user.login,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Admin credentials update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Admin ma'lumotlarini olish
router.get('/admin/info', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin uchun' 
      });
    }
    
    const user = await User.findById(req.user._id).select('-password');
    
    res.json({
      success: true,
      admin: {
        _id: user._id,
        name: user.name,
        login: user.login,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// ==================== KASSA FOYDALANUVCHILARINI BOSHQARISH ====================

// Barcha kassa foydalanuvchilarini olish
router.get('/admin/kassa-users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin uchun' 
      });
    }
    
    const kassaUsers = await User.find({ role: 'cashier' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users: kassaUsers
    });
  } catch (error) {
    console.error('Get kassa users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Yangi kassa foydalanuvchisi yaratish
router.post('/admin/kassa-users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin kassa foydalanuvchisi yarata oladi' 
      });
    }
    
    const { name, login, password } = req.body;
    
    // Validatsiya
    if (!name || !login || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Barcha maydonlarni to\'ldiring' 
      });
    }
    
    if (password.length < 4) {
      return res.status(400).json({ 
        success: false,
        message: 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak' 
      });
    }
    
    // Login mavjudligini tekshirish
    const existingUser = await User.findOne({ login });
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Bu login allaqachon band' 
      });
    }
    
    // Yangi kassa foydalanuvchisi yaratish
    const kassaUser = new User({
      name,
      login,
      password,
      role: 'cashier',
      createdBy: req.user._id
    });
    
    await kassaUser.save();
    
    res.status(201).json({
      success: true,
      message: 'Kassa foydalanuvchisi muvaffaqiyatli yaratildi',
      user: {
        _id: kassaUser._id,
        name: kassaUser.name,
        login: kassaUser.login,
        role: kassaUser.role,
        createdAt: kassaUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create kassa user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Kassa foydalanuvchisini o'zgartirish
router.put('/admin/kassa-users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin kassa foydalanuvchisini o\'zgartira oladi' 
      });
    }
    
    const { name, login, password } = req.body;
    const kassaUser = await User.findById(req.params.id);
    
    if (!kassaUser || kassaUser.role !== 'cashier') {
      return res.status(404).json({ 
        success: false,
        message: 'Kassa foydalanuvchisi topilmadi' 
      });
    }
    
    // Login o'zgartirilsa, mavjudligini tekshirish
    if (login && login !== kassaUser.login) {
      const existingUser = await User.findOne({ 
        login, 
        _id: { $ne: kassaUser._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Bu login allaqachon band' 
        });
      }
      
      kassaUser.login = login;
    }
    
    // Ma'lumotlarni yangilash
    if (name) kassaUser.name = name;
    if (password) kassaUser.password = password;
    
    await kassaUser.save();
    
    res.json({
      success: true,
      message: 'Kassa foydalanuvchisi muvaffaqiyatli o\'zgartirildi',
      user: {
        _id: kassaUser._id,
        name: kassaUser.name,
        login: kassaUser.login,
        role: kassaUser.role,
        createdAt: kassaUser.createdAt
      }
    });
  } catch (error) {
    console.error('Update kassa user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Kassa foydalanuvchisini o'chirish
router.delete('/admin/kassa-users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Faqat admin kassa foydalanuvchisini o\'chira oladi' 
      });
    }
    
    const kassaUser = await User.findById(req.params.id);
    
    if (!kassaUser || kassaUser.role !== 'cashier') {
      return res.status(404).json({ 
        success: false,
        message: 'Kassa foydalanuvchisi topilmadi' 
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Kassa foydalanuvchisi muvaffaqiyatli o\'chirildi'
    });
  } catch (error) {
    console.error('Delete kassa user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

module.exports = router;
