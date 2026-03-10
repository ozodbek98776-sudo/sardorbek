const router = require('express').Router();
const Settings = require('../models/Settings');
const { auth } = require('../middleware/auth');

// GET exchange rate (public - barcha foydalanuvchilar uchun)
router.get('/exchange-rate', async (req, res) => {
  try {
    const setting = await Settings.findOne({ key: 'usdToUzsRate' });
    res.json({ success: true, rate: setting ? setting.value : 12000 });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT exchange rate (faqat admin)
router.put('/exchange-rate', auth, async (req, res) => {
  try {
    const { rate } = req.body;
    if (!rate || rate <= 0) return res.status(400).json({ success: false, message: 'Kurs noto\'g\'ri' });

    const setting = await Settings.findOneAndUpdate(
      { key: 'usdToUzsRate' },
      { value: rate, updatedBy: req.user._id },
      { upsert: true, new: true }
    );

    // Real-time barcha clientlarga yuborish
    if (global.io) {
      global.io.emit('exchange-rate:updated', { rate });
    }

    res.json({ success: true, rate: setting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
