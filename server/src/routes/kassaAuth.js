const express = require('express');
const crypto = require('crypto');
const KassaSession = require('../models/KassaSession');

const router = express.Router();

// Kassa login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Sodda login tekshiruvi (keyinchalik murakkablashtirish mumkin)
    const validCredentials = [
      { username: 'alisher', password: '2011' },
      { username: 'kassa1', password: 'kassa123' },
      { username: 'admin', password: 'admin123' }
    ];

    const user = validCredentials.find(u => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Noto\'g\'ri login yoki parol'
      });
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

    res.json({
      success: true,
      message: 'Muvaffaqiyatli login',
      data: {
        sessionToken: sessionToken,
        username: username,
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