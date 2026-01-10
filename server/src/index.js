require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Telegram Bot import qilish - vaqtincha o'chirildi
// const { createPOSBot } = require('./telegram.bot');

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
  origin: [
    process.env.CLIENT_URL || 'http://localhost:5173',
    process.env.CLIENT_URL_PROD || 'https://sardor-furnitura.your-domain.com'
  ],
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

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/universal_uz')
  .then(async () => {
    console.log('MongoDB connected');

    // Telegram Bot ishga tushirish - vaqtincha o'chirildi
    /*
    try {
      const posBot = createPOSBot();
      if (posBot) {
        await posBot.getBotInfo(); // Bot ma'lumotlarini ko'rsatish
        console.log('✅ POS Telegram Bot muvaffaqiyatli ishga tushdi');
      }
    } catch (botError) {
      console.error('❌ Telegram Bot ishga tushirishda xatolik:', botError);
    }
    */

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
