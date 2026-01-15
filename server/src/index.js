require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Telegram Bot import qilish
const { createPOSBot } = require('./telegram.bot');

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

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz')
  .then(async () => {
    console.log('MongoDB connected');

    // Telegram Bot ishga tushirish
    try {
      const posBot = createPOSBot();
      if (posBot) {
        await posBot.getBotInfo(); // Bot ma'lumotlarini ko'rsatish
        console.log('✅ POS Telegram Bot muvaffaqiyatli ishga tushdi');
      }
    } catch (botError) {
      console.error('❌ Telegram Bot ishga tushirishda xatolik:', botError);
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
app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
