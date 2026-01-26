const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const users = await User.find({ createdBy: req.user._id }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/helpers', auth, authorize('admin'), async (req, res) => {
  try {
    const helpers = await User.find({
      createdBy: req.user._id,
      role: { $in: ['cashier', 'helper'] }
    }).select('-password');
    res.json(helpers);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa uchun foydalanuvchilarni olish (auth talab qilmaydi)
router.get('/kassa', async (req, res) => {
  try {
    const helpers = await User.find({
      role: { $in: ['cashier', 'helper'] }
    }).select('-password');
    res.json(helpers);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, login, phone, password, role, bonusPercentage } = req.body;

    // Login yoki phone allaqachon mavjudligini tekshirish
    const existingUser = await User.findOne({
      $or: [{ login }, { phone }]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'Bu login yoki telefon raqam allaqachon ro\'yxatdan o\'tgan' });
    }

    const userData = {
      name,
      login,
      phone,
      password,
      role,
      createdBy: req.user._id
    };

    // Agar kassir bo'lsa va bonus foizi berilgan bo'lsa
    if (role === 'cashier' && bonusPercentage !== undefined) {
      userData.bonusPercentage = Math.max(0, Math.min(100, bonusPercentage)); // 0-100% orasida
    }

    const user = new User(userData);
    await user.save();

    res.status(201).json({
      _id: user._id,
      name: user.name,
      login: user.login,
      phone: user.phone,
      role: user.role,
      bonusPercentage: user.bonusPercentage || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { name, phone, role, password, bonusPercentage } = req.body;

    const user = await User.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!user) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    user.name = name;
    user.phone = phone;
    user.role = role;

    // Agar kassir bo'lsa va bonus foizi berilgan bo'lsa
    if (role === 'cashier' && bonusPercentage !== undefined) {
      user.bonusPercentage = Math.max(0, Math.min(100, bonusPercentage)); // 0-100% orasida
    } else if (role !== 'cashier') {
      user.bonusPercentage = 0; // Kassir bo'lmasa bonus yo'q
    }

    if (password) {
      user.password = password;
    }
    await user.save();

    const result = user.toObject();
    delete result.password;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('Delete request for user ID:', req.params.id);
    console.log('Requested by user:', req.user._id);

    // Avval foydalanuvchini topish
    const user = await User.findById(req.params.id);
    if (!user) {
      console.log('User not found in database');
      return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });
    }

    console.log('Found user:', user.name, 'createdBy:', user.createdBy);

    // Agar admin bo'lsa, har qanday foydalanuvchini o'chirishi mumkin
    // Aks holda faqat o'zi yaratgan foydalanuvchilarni o'chirishi mumkin
    if (req.user.role === 'admin') {
      await User.findByIdAndDelete(req.params.id);
      console.log('User deleted successfully');
      res.json({ message: 'Foydalanuvchi o\'chirildi' });
    } else {
      const userToDelete = await User.findOne({ _id: req.params.id, createdBy: req.user._id });
      if (!userToDelete) {
        console.log('User not created by current user');
        return res.status(404).json({ message: 'Foydalanuvchi topilmadi yoki sizda ruxsat yo\'q' });
      }
      await User.findByIdAndDelete(req.params.id);
      res.json({ message: 'Foydalanuvchi o\'chirildi' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
