const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 100, // 100 ta so'rov
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov yuborildi. Iltimos, keyinroq urinib ko\'ring.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login rate limiter - stricter
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 5, // 5 ta urinish
  message: {
    success: false,
    message: 'Juda ko\'p login urinishlari. 15 daqiqadan keyin qayta urinib ko\'ring.'
  },
  skipSuccessfulRequests: true, // Muvaffaqiyatli loginlarni hisobga olmaslik
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

module.exports = {
  apiLimiter,
  loginLimiter,
  uploadLimiter,
  createLimiter
};
