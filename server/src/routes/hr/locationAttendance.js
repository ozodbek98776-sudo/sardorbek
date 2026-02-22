const express = require('express');
const router = express.Router();
const Attendance = require('../../models/Attendance');
const StoreLocation = require('../../models/StoreLocation');
const User = require('../../models/User');
const { auth } = require('../../middleware/auth');
const { isWithinRadius } = require('../../utils/geoUtils');

router.use(auth);

// Get today's attendance status for current user
router.get('/status', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).lean();

    const storeLocation = await StoreLocation.findOne({ isActive: true }).lean();

    res.json({
      success: true,
      data: {
        canCheckIn: !attendance,
        canCheckOut: attendance && attendance.checkIn && !attendance.checkOut,
        attendance,
        hasStoreLocation: !!storeLocation
      }
    });
  } catch (error) {
    console.error('Status olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Location-based check-in
router.post('/check-in', async (req, res) => {
  try {
    const { storeToken, latitude, longitude, accuracy } = req.body;

    if (!storeToken || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'Store token va GPS koordinatalar majburiy'
      });
    }

    // Find store location by token
    const store = await StoreLocation.findOne({ qrToken: storeToken, isActive: true });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Do'kon lokatsiyasi topilmadi yoki faol emas"
      });
    }

    // Check GPS distance
    const gpsCheck = isWithinRadius(latitude, longitude, store.latitude, store.longitude, store.allowedRadius);
    if (!gpsCheck.isWithin) {
      return res.status(403).json({
        success: false,
        message: `Siz do'kondan juda uzoqdasiz (${gpsCheck.distance}m). Ruxsat etilgan masofa: ${gpsCheck.allowedRadius}m`,
        distance: gpsCheck.distance,
        allowedRadius: gpsCheck.allowedRadius
      });
    }

    // Check duplicate today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Get employee - handle hardcoded admin
    let employeeId = req.user._id;
    if (req.user._id === 'hardcoded-admin-id') {
      return res.status(400).json({
        success: false,
        message: 'Hardcoded admin GPS check-in qila olmaydi'
      });
    }

    const existing = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bugun allaqachon check-in qilgansiz',
        attendance: existing
      });
    }

    // Calculate late status
    const now = new Date();
    const [startH, startM] = store.workStartTime.split(':').map(Number);
    const workStart = new Date(now);
    workStart.setHours(startH, startM, 0, 0);
    const isLate = now > workStart;
    const lateMinutes = isLate ? Math.round((now - workStart) / (1000 * 60)) : 0;

    const attendance = new Attendance({
      employee: employeeId,
      date: startOfDay,
      checkIn: now,
      status: isLate ? 'late' : 'present',
      isLate,
      lateMinutes,
      checkInMethod: 'location_qr',
      storeLocation: store._id,
      checkInLocation: {
        latitude,
        longitude,
        distance: gpsCheck.distance,
        accuracy: accuracy || 0
      }
    });

    await attendance.save();
    await attendance.populate('employee', 'name role position');

    res.status(201).json({
      success: true,
      message: `Check-in muvaffaqiyatli! ${isLate ? `(${lateMinutes} daqiqa kechikish)` : ''}`,
      data: {
        attendance,
        distance: gpsCheck.distance,
        isLate,
        lateMinutes
      }
    });
  } catch (error) {
    console.error('Location check-in xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Location-based check-out
router.post('/check-out', async (req, res) => {
  try {
    const { storeToken, latitude, longitude, accuracy } = req.body;

    if (!storeToken || latitude == null || longitude == null) {
      return res.status(400).json({
        success: false,
        message: 'Store token va GPS koordinatalar majburiy'
      });
    }

    const store = await StoreLocation.findOne({ qrToken: storeToken, isActive: true });
    if (!store) {
      return res.status(404).json({
        success: false,
        message: "Do'kon lokatsiyasi topilmadi"
      });
    }

    // Check GPS distance
    const gpsCheck = isWithinRadius(latitude, longitude, store.latitude, store.longitude, store.allowedRadius);
    if (!gpsCheck.isWithin) {
      return res.status(403).json({
        success: false,
        message: `Siz do'kondan juda uzoqdasiz (${gpsCheck.distance}m). Ruxsat etilgan masofa: ${gpsCheck.allowedRadius}m`,
        distance: gpsCheck.distance,
        allowedRadius: gpsCheck.allowedRadius
      });
    }

    // Find today's attendance
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    let employeeId = req.user._id;
    if (req.user._id === 'hardcoded-admin-id') {
      return res.status(400).json({
        success: false,
        message: 'Hardcoded admin GPS check-out qila olmaydi'
      });
    }

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: 'Bugun check-in qilmagansiz'
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Bugun allaqachon check-out qilgansiz'
      });
    }

    const now = new Date();
    attendance.checkOut = now;
    attendance.workHours = (now - attendance.checkIn) / (1000 * 60 * 60);
    attendance.checkOutLocation = {
      latitude,
      longitude,
      distance: gpsCheck.distance,
      accuracy: accuracy || 0
    };

    await attendance.save();
    await attendance.populate('employee', 'name role position');

    res.json({
      success: true,
      message: `Check-out muvaffaqiyatli! Ish soati: ${attendance.workHours.toFixed(1)} soat`,
      data: {
        attendance,
        workHours: attendance.workHours,
        distance: gpsCheck.distance
      }
    });
  } catch (error) {
    console.error('Location check-out xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
