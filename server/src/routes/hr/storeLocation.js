const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const StoreLocation = require('../../models/StoreLocation');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

router.use(auth);
router.use(adminOnly);

// Get store location
router.get('/', async (req, res) => {
  try {
    const location = await StoreLocation.findOne({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Store location olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Create store location
router.post('/', async (req, res) => {
  try {
    const { name, latitude, longitude, allowedRadius, address, workStartTime } = req.body;

    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'Nom, latitude va longitude majburiy'
      });
    }

    // Deactivate existing locations
    await StoreLocation.updateMany({}, { isActive: false });

    const locationData = {
      name,
      latitude,
      longitude,
      allowedRadius: allowedRadius || 30,
      address,
      workStartTime: workStartTime || '09:00'
    };
    // Only set createdBy if it's a valid ObjectId
    if (req.user._id && req.user._id !== 'hardcoded-admin-id') {
      locationData.createdBy = req.user._id;
    }
    const location = new StoreLocation(locationData);

    await location.save();

    res.status(201).json({
      success: true,
      message: "Do'kon lokatsiyasi saqlandi",
      data: location
    });
  } catch (error) {
    console.error('Store location yaratishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Update store location
router.put('/:id', async (req, res) => {
  try {
    const { name, latitude, longitude, allowedRadius, address, workStartTime } = req.body;

    const location = await StoreLocation.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Lokatsiya topilmadi' });
    }

    if (name) location.name = name;
    if (latitude != null) location.latitude = latitude;
    if (longitude != null) location.longitude = longitude;
    if (allowedRadius != null) location.allowedRadius = allowedRadius;
    if (address !== undefined) location.address = address;
    if (workStartTime) location.workStartTime = workStartTime;

    await location.save();

    res.json({
      success: true,
      message: 'Lokatsiya yangilandi',
      data: location
    });
  } catch (error) {
    console.error('Store location yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Regenerate QR token
router.post('/:id/regenerate-token', async (req, res) => {
  try {
    const location = await StoreLocation.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Lokatsiya topilmadi' });
    }

    location.qrToken = 'STORE-' + crypto.randomBytes(16).toString('hex');
    await location.save();

    res.json({
      success: true,
      message: 'QR token yangilandi',
      data: { qrToken: location.qrToken }
    });
  } catch (error) {
    console.error('Token regenerate xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
