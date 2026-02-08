const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
    
    // JWT_SECRET majburiy tekshirish
    if (!process.env.JWT_SECRET) {
      console.error('❌ XAVFSIZLIK: JWT_SECRET environment variable o\'rnatilmagan!');
      return res.status(500).json({ message: 'Server konfiguratsiya xatosi' });
    }
    
    // JWT_SECRET uzunligini tekshirish (minimum 32 belgi)
    if (process.env.JWT_SECRET.length < 32) {
      console.error('❌ XAVFSIZLIK: JWT_SECRET juda qisqa! Minimum 32 belgi kerak.');
      return res.status(500).json({ message: 'Server konfiguratsiya xatosi' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Hardcoded admin check
    if (decoded.id === 'hardcoded-admin-id') {
      req.user = {
        _id: 'hardcoded-admin-id',
        name: 'System Admin',
        login: 'admin',
        role: 'admin'
      };
      return next();
    }
    
    // Database dan foydalanuvchi qidirish
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token yaroqsiz' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token muddati tugagan' });
    }
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Avtorizatsiya xatosi' });
  }
};

// Alias for auth
const authenticateToken = auth;

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    next();
  };
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Faqat admin ruxsati' });
  }
};

module.exports = { auth, authenticateToken, authorize, isAdmin };
