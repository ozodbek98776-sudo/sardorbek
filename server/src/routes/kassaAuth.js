const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const KassaSession = require('../models/KassaSession');
const User = require('../models/User');

const router = express.Router();

// Kassa login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login va parol kiritilishi shart'
      });
    }

    // .env dan maxfiy login va parolni olish
    const KASSA_LOGIN = process.env.KASSA_LOGIN || 'kassachi';
    const KASSA_PASSWORD = process.env.KASSA_PASSWORD || 'kassa321';

    let user = null;
    let isKassaUser = false;

    // Maxfiy login va parol bilan tekshirish
    if (username === KASSA_LOGIN && password === KASSA_PASSWORD) {
      isKassaUser = true;
      // Maxfiy kassa user uchun virtual user yaratish
      user = {
        _id: 'kassa-user',
        name: 'Kassa',
        role: 'cashier',
        login: username
      };
    } else {
      // Database dan tekshirish
      user = await User.findOne({ login: username });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Noto\'g\'ri login yoki parol'
        });
      }

      // Parolni tekshirish
      const isMatch = await user.comparePassword(password);
      
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Noto\'g\'ri login yoki parol'
        });
      }

      // Faqat cashier va helper ruxsat etiladi
      if (!['cashier', 'helper'].includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Kassa paneliga kirish ruxsati yo\'q'
        });
      }
    }

    // Eski sessionlarni o'chirish
    await KassaSession.deleteMany({
      username: username,
      $or: [
        { isActive: false },
        { expiresAt: { $lt: new Date() } }
      ]
    });

    // Yangi session yaratish
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.get('User-Agent') || '';

    const session = new KassaSession({
      username: username,
      sessionToken: sessionToken,
      ipAddress: ipAddress,
      userAgent: userAgent,
      isActive: true
    });

    await session.save();

    // JWT token yaratish
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role,
        name: user.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Muvaffaqiyatli login',
      token: token, // JWT token qo'shildi
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        login: user.login
      },
      data: {
        sessionToken: sessionToken,
        username: user.name,
        loginTime: session.loginTime,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Kassa login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// Session tekshiruvi
router.post('/verify', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Session token yo\'q'
      });
    }

    const session = await KassaSession.findOne({
      sessionToken: sessionToken,
      isActive: true
    });

    if (!session || !session.isValidSession()) {
      return res.status(401).json({
        success: false,
        message: 'Session yaroqsiz yoki muddati tugagan'
      });
    }

    // Session faolligini yangilash
    await session.updateActivity();

    res.json({
      success: true,
      message: 'Session faol',
      data: {
        username: session.username,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      }
    });

  } catch (error) {
    console.error('Session verify error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { sessionToken } = req.body;

    if (sessionToken) {
      await KassaSession.findOneAndUpdate(
        { sessionToken: sessionToken },
        { isActive: false }
      );
    }

    res.json({
      success: true,
      message: 'Muvaffaqiyatli logout'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// Aktiv sessionlar ro'yxati (admin uchun)
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await KassaSession.find({
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).select('-sessionToken').sort({ loginTime: -1 });

    res.json({
      success: true,
      data: sessions
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

module.exports = router;