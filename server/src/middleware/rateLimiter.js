const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Development: 1000
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov yuborildi. Iltimos, keyinroq urinib ko\'ring.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Development da localhost uchun skip
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

// Login rate limiter - XAVFSIZLIK: Brute force hujumlarni oldini olish
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Production: 5, Development: 50
  message: {
    success: false,
    message: 'Juda ko\'p login urinishlari. 15 daqiqadan keyin qayta urinib ko\'ring.'
  },
  skipSuccessfulRequests: true, // Muvaffaqiyatli loginlarni hisobga olmaslik
  skip: (req) => {
    // Development da localhost uchun skip
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

// File upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  max: 50, // 50 ta fayl
  message: {
    success: false,
    message: 'Juda ko\'p fayl yuklandi. 1 soatdan keyin qayta urinib ko\'ring.'
  },
});

// Create/Update operations limiter
const createLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 30, // 30 ta yaratish/yangilash
  message: {
    success: false,
    message: 'Juda ko\'p operatsiya. Iltimos, sekinroq ishlang.'
  },
});

// YANGI: Kassa operations limiter - POS terminal uchun
const kassaLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Development: 1000
  message: {
    success: false,
    message: 'Juda ko\'p kassa operatsiyasi. Biroz kuting.'
  },
  skip: (req) => {
    // Development da localhost uchun skip
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

// YANGI: Admin operations limiter - muhim operatsiyalar uchun
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 20, // 20 ta admin operatsiya
  message: {
    success: false,
    message: 'Juda ko\'p admin operatsiyasi. Biroz kuting.'
  },
});

// YANGI: Database query limiter - og'ir query'lar uchun
const queryLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: process.env.NODE_ENV === 'production' ? 50 : 200, // Production: 50, Development: 200
  message: {
    success: false,
    message: 'Juda ko\'p ma\'lumot so\'rovi. Biroz kuting.'
  },
  skip: (req) => {
    // Development da localhost uchun skip
    if (process.env.NODE_ENV !== 'production') {
      const ip = req.ip || req.connection.remoteAddress;
      return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    }
    return false;
  }
});

module.exports = {
  apiLimiter,
  loginLimiter,
  uploadLimiter,
  createLimiter,
  kassaLimiter,
  adminLimiter,
  queryLimiter
};
