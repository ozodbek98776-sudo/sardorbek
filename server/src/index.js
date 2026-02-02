require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const http = require('http');
const { Server } = require('socket.io');

// Telegram Botlar import qilish
const POSTelegramBot = require('./telegram.bot');
const DebtTelegramBot = require('./debt.bot');

const authRoutes = require('./routes/auth');
const kassaAuthRoutes = require('./routes/kassaAuth');
const productRoutes = require('./routes/products');
const warehouseRoutes = require('./routes/warehouses');
const customerRoutes = require('./routes/customers');
const debtRoutes = require('./routes/debts');
const salesRoutes = require('./routes/sales');
const orderRoutes = require('./routes/orders');
const receiptRoutes = require('./routes/receipts');
const userRoutes = require('./routes/users');
const statsRoutes = require('./routes/stats');
const telegramRoutes = require('./routes/telegram');
const partnerRoutes = require('./routes/partners');

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
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // Allow localhost and local network IPs
    const allowedPatterns = [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
      /^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/, // Local network
      /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/,  // Local network
      /^https?:\/\/.*\.your-domain\.com$/     // Production
    ];
    
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true
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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  etag: false
}));

// Health check endpoint for Service Worker
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kassa-auth', kassaAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/debts', debtRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/partners', partnerRoutes);

// Production da static fayllarni serve qilish
if (process.env.NODE_ENV === 'production') {
  // Client build fayllarini serve qilish
  app.use(express.static(path.join(__dirname, '../public')));
  
  // SPA uchun - barcha route larni index.html ga yo'naltirish
  app.get('*', (req, res) => {
    // API route larini o'tkazib yuborish
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ message: 'API endpoint topilmadi' });
    }
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

// Connect to MongoDB with optimized settings
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz', {
  maxPoolSize: 20, // ⚡ Ko'proq connection - parallel query'lar uchun
  minPoolSize: 5,  // ⚡ Minimal connection'lar doim tayyor
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
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

    // Drop old indexes to fix unique constraint issues
    try {
      const collection = mongoose.connection.collection('users');
      await collection.dropIndex('email_1').catch(() => { });
      await collection.dropIndex('phone_1').catch(() => { });
      console.log('Cleaned up old indexes');
    } catch (e) {
      // Indexes might not exist, ignore
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0'; // Barcha network interface'lardan kirish uchun
server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`⚡ Socket.IO ready for real-time updates`);
});




 


 


 
 
