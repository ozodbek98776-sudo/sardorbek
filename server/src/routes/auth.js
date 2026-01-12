const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register route
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password, role = 'admin' } = req.body;
    
    // Telefon raqam allaqachon mavjudligini tekshirish
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan' });
    }

    // Birinchi foydalanuvchi admin bo'ladi
    const userCount = await User.countDocuments();
    const userRole = userCount === 0 ? 'admin' : role;

    // Yangi foydalanuvchi yaratish
    const user = new User({
      name,
      phone,
      password,
      role: userRole
    });

    await user.save();

    // Token yaratish
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    
    res.status(201).json({ 
      message: 'Ro\'yxatdan o\'tish muvaffaqiyatli',
      token, 
      user: { 
        _id: user._id, 
        name: user.name, 
        phone: user.phone, 
        role: user.role 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone, password, login } = req.body;
    
    // Support login with phone, email, or login username
    let user;
    if (login) {
      // Login bilan kirish (admin uchun)
      user = await User.findOne({ login });
    } else {
      // Phone yoki email bilan kirish
      user = await User.findOne({ 
        $or: [{ phone }, { email: phone }] 
      });
    }
    
    if (!user) return res.status(400).json({ message: 'Login yoki parol noto\'g\'ri' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Login yoki parol noto\'g\'ri' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, phone: user.phone || user.email, login: user.login, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const user = req.user;
  res.json({
    _id: user._id,
    name: user.name,
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

module.exports = router;
