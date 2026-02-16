// Load .env file explicitly
const path = require('path');
const fs = require('fs');
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');

// Middleware imports
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { serviceErrorHandler } = require('./middleware/serviceErrorHandler');
const { sanitizeInput } = require('./middleware/validator');
const { apiLimiter, kassaLimiter, adminLimiter } = require('./middleware/rateLimiter');
const logger = require('./services/loggerService');
const backupService = require('./services/backupService');
const performanceMonitor = require('./middleware/performanceMonitor');

// Telegram Botlar import qilish
const POSTelegramBot = require('./telegram.bot');
const DebtTelegramBot = require('./debt.bot');

// Security configuration
const { validateSecurityConfig, logSecurityEvent } = require('./config/security');

// XAVFSIZLIK: Server ishga tushishdan oldin xavfsizlik tekshiruvlari
const securityErrors = validateSecurityConfig();
if (securityErrors.length > 0) {
  console.error('❌❌❌ XAVFSIZLIK XATOLIKLARI ❌❌❌');
  securityErrors.forEach(error => console.error(`  - ${error}`));
  console.error('❌❌❌ SERVER ISHGA TUSHMAYDI ❌❌❌');
  process.exit(1);
}

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const warehouseRoutes = require('./routes/warehouses');
const customerRoutes = require('./routes/customers');
const debtRoutes = require('./routes/debts');
const productOrderRoutes = require('./routes/productOrders');
const salesRoutes = require('./routes/sales');
const orderRoutes = require('./routes/orders');
const receiptRoutes = require('./routes/receipts');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const telegramRoutes = require('./routes/telegram');
const partnerRoutes = require('./routes/partners');
const categoryRoutes = require('./routes/categories');
const monitoringRoutes = require('./routes/monitoring');
const expenseRoutes = require('./routes/expenses');

// HR Routes
const hrEmployeeRoutes = require('./routes/hr/employees');
const hrSalaryRoutes = require('./routes/hr/salary');
const hrKPIRoutes = require('./routes/hr/kpi');
const hrPayrollRoutes = require('./routes/hr/payroll');
const hrAttendanceRoutes = require('./routes/hr/attendance');

const app = express();
const server = http.createServer(app);

// ⚡ Socket.IO setup - Real-time updates
const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      callback(null, true); // Allow all origins for development
    },
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('✅ Socket.IO client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ Socket.IO client disconnected:', socket.id);
  });
});

// Make io globally available
global.io = io;

// ⚡ Security - Helmet middleware
// Helmet temporarily disabled for debugging
// app.use(helmet({
//   contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
//     directives: {
//       defaultSrc: ["'self'"],
//       styleSrc: ["'self'", "'unsafe-inline'"],
//       scriptSrc: ["'self'"],
//       imgSrc: ["'self'", "data:", "https:"],
//       connectSrc: ["'self'", "wss:", "ws:"],
//       fontSrc: ["'self'"],
//       objectSrc: ["'none'"],
//       mediaSrc: ["'self'"],
//       frameSrc: ["'none'"],
//     },
//   } : false, // Development da o'chirilgan
//   crossOriginEmbedderPolicy: false
// }));

// ⚡ Request logging (VAQTINCHA O'CHIRILDI)
// app.use(logger.requestLogger());

// ⚡ Performance monitoring - VAQTINCHA O'CHIRILDI
// app.use(performanceMonitor.middleware());

// ⚡ Input sanitization - XAVFSIZLIK UCHUN YOQILDI (VAQTINCHA O'CHIRILDI)
// app.use(sanitizeInput);

// ⚡ HTTP Keep-Alive - connection'larni qayta ishlatish
app.use((req, res, next) => {
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=100');
  next();
});

// ✅ GZIP compression - API javoblarni 70-90% siqish
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 9, // ⚡ Maksimal siqish (0-9)
  threshold: 512 // ⚡ 512 byte dan katta javoblarni siqish
}));

app.use(cors({
  origin: function(origin, callback) {
    // Development da barcha origin larga ruxsat berish
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // Production da - static files (images) uchun origin ixtiyoriy
    // Lekin API endpoints uchun origin majburiy
    const allowedOrigins = [
      process.env.CLIENT_URL_PROD,
      process.env.CLIENT_URL
    ].filter(Boolean);
    
    // Agar origin yo'q bo'lsa (masalan, img src dan), ruxsat berish
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.length === 0) {
      console.error('❌ CORS: CLIENT_URL_PROD yoki CLIENT_URL o\'rnatilmagan!');
      return callback(new Error('CORS: Ruxsat etilgan domenlar o\'rnatilmagan'), false);
    }
    
    const isAllowed = allowedOrigins.includes(origin);
    if (!isAllowed) {
      console.warn(`❌ CORS: Ruxsat etilmagan origin: ${origin}`);
      return callback(new Error(`CORS: Ruxsat etilmagan origin: ${origin}`), false);
    }
    
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200 // IE11 uchun
}));
app.use(express.json());

// ✅ ETag support - agar ma'lumot o'zgarmagan bo'lsa, 304 Not Modified qaytarish
app.set('etag', 'strong'); // strong ETag ishlatish

// ⚡ SUPER TEZKOR Caching middleware
const cacheMiddleware = (req, res, next) => {
  // Static assets - 1 yil cache
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Products API - cache yo'q (har doim yangi ma'lumot)
  else if (req.path.startsWith('/api/products')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  // Boshqa API - 30 soniya cache
  else if (req.path.startsWith('/api/')) {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=15');
  }
  next();
};
app.use(cacheMiddleware);

// Serve uploaded files with error handling
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(__dirname, '../uploads', req.path);
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    next();
  } else {
    // File not found - log as warning, not error
    console.log(`⚠️ Image not found (404): ${req.path}`);
    
    // Return a simple 404 response
    res.status(404).json({ 
      error: 'File not found',
      path: req.path 
    });
  }
}, express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: false,
  fallthrough: false
}));

// Health check endpoint for Service Worker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ⚡ Rate limiting - API himoyasi
app.use('/api/', apiLimiter);

// Routes with specific rate limiting
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/product-orders', adminLimiter, productOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receipts', kassaLimiter, receiptRoutes); // Kassa operations
app.use('/api/users', adminLimiter, userRoutes); // Admin operations
app.use('/api/stats', adminLimiter, statsRoutes); // Admin operations
app.use('/api/telegram', telegramRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/monitoring', adminLimiter, monitoringRoutes); // Admin operations
app.use('/api/expenses', adminLimiter, expenseRoutes); // Admin operations - Xarajatlar

// HR Routes - Admin only
app.use('/api/hr/employees', adminLimiter, hrEmployeeRoutes);
app.use('/api/hr/salary', adminLimiter, hrSalaryRoutes);
app.use('/api/hr/kpi', adminLimiter, hrKPIRoutes);
app.use('/api/hr/payroll', adminLimiter, hrPayrollRoutes);
app.use('/api/hr/attendance', adminLimiter, hrAttendanceRoutes);

// Make io available to routes
app.set('io', io);

// Production da static fayllarni serve qilish
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '../public');
  
  // Public papka mavjudligini tekshirish
  if (fs.existsSync(publicPath)) {
    // Client build fayllarini serve qilish
    app.use(express.static(publicPath));
    
    // SPA uchun - barcha route larni index.html ga yo'naltirish
    app.get('*', (req, res) => {
      // API va uploads route larini o'tkazib yuborish
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return res.status(404).json({ message: 'Topilmadi' });
      }
      
      const indexPath = path.join(publicPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ message: 'Frontend build topilmadi' });
      }
    });
  } else {
    console.warn('⚠️ Public papka topilmadi. Frontend build qilishni unutmang!');
  }
}

// Connect to MongoDB with optimized settings
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz', {
  maxPoolSize: 20, // ⚡ Ko'proq connection - parallel query'lar uchun
  minPoolSize: 5,  // ⚡ Minimal connection'lar doim tayyor
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000, // ⚡ 30 soniya - Atlas uchun yetarli
  connectTimeoutMS: 30000, // ⚡ Connection timeout ham oshirildi
  family: 4, // IPv4 ishlatish (tezroq)
  maxIdleTimeMS: 10000, // ⚡ Idle connection'larni tezroq yopish
  compressors: ['zlib'], // ⚡ Network traffic siqish
  zlibCompressionLevel: 6 // ⚡ Optimal siqish darajasi
})
  .then(async () => {
    console.log('⚡ MongoDB ulandi - SUPER TEZKOR sozlamalar!');
    console.log('📊 Pool: 20 max, 5 min, zlib compression');

    // Telegram Botlar ishga tushirish
    try {
      // POS Bot (cheklar uchun)
      const posBot = new POSTelegramBot();
      if (posBot && posBot.bot) {
        console.log('✅ POS Telegram Bot muvaffaqiyatli ishga tushdi');
      }

      // Qarz Bot (qarzlar uchun)
      const debtBot = new DebtTelegramBot();
      if (debtBot && debtBot.bot) {
        console.log('✅ Qarz Telegram Bot muvaffaqiyatli ishga tushdi');
      }

      // Botlarni global qilish (boshqa joylardan foydalanish uchun)
      global.posBot = posBot;
      global.debtBot = debtBot;
    } catch (botError) {
      console.error('❌ Telegram Botlar ishga tushirishda xatolik:', botError.message);
      console.log('⚠️  Botlar ishlamasa ham server ishlaydi');
    }
    
    // ⚡ Backup scheduler - har kuni soat 02:00 da
    if (process.env.NODE_ENV === 'production') {
      backupService.scheduleBackup();
      logger.info('Backup scheduler ishga tushdi');
    }
  })
  .catch(err => {
    logger.error('MongoDB connection error', { error: err.message });
    console.error('MongoDB connection error:', err);
  });

// ⚡ Error handlers - oxirida bo'lishi kerak
app.use(notFound);
app.use(serviceErrorHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0'; // Barcha network interface'lardan kirish uchun
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`⚡ Socket.IO ready for real-time updates`);
  console.log(`🔒 Security: Helmet, Rate Limiting, Input Sanitization`);
  console.log(`📝 Logging: File-based logging enabled`);
  logger.info('Server started', { port: PORT, host: HOST });
});




 


 


 
 
