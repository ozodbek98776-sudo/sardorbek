const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'Avtorizatsiya talab qilinadi' });
    
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ message: 'Server konfiguratsiya xatosi' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Kassa user uchun maxsus holat
    if (decoded.id === 'kassa-user') {
      req.user = {
        _id: 'kassa-user',
        name: decoded.name || 'Kassa',
        role: decoded.role || 'cashier',
        login: 'kassachi'
      };
      return next();
    }
    
    // Oddiy user uchun database dan olish
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'Foydalanuvchi topilmadi' });

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token yaroqsiz' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat berilmagan' });
    }
    next();
  };
};

module.exports = { auth, authorize };
