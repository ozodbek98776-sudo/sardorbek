const express = require('express');
const router = express.Router();
const Attendance = require('../../models/Attendance');
const User = require('../../models/User');
const { auth } = require('../../middleware/auth');
const { adminOnly } = require('../../middleware/permissions');

router.use(auth);
router.use(adminOnly);

// Davomat ro'yxatini olish
router.get('/', async (req, res) => {
  try {
    const { employee, startDate, endDate, status } = req.query;
    
    const filter = {};
    
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const attendances = await Attendance.find(filter)
      .populate('employee', 'name role')
      .populate('approvedBy', 'name')
      .sort({ date: -1 })
      .lean();
    
    res.json({
      success: true,
      attendances,
      total: attendances.length
    });
  } catch (error) {
    console.error('Davomat ro\'yxatini olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Oylik davomat statistikasi
router.get('/stats', async (req, res) => {
  try {
    const { employee, year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ 
        success: false, 
        message: 'Year va month majburiy' 
      });
    }
    
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    
    const filter = {
      date: { $gte: startDate, $lte: endDate }
    };
    
    if (employee) filter.employee = employee;
    
    const attendances = await Attendance.find(filter)
      .populate('employee', 'name role')
      .lean();
    
    // Statistika hisoblash
    const stats = {
      total: attendances.length,
      present: attendances.filter(a => a.status === 'present').length,
      absent: attendances.filter(a => a.status === 'absent').length,
      late: attendances.filter(a => a.isLate).length,
      halfDay: attendances.filter(a => a.status === 'half_day').length,
      sick: attendances.filter(a => a.status === 'sick').length,
      vacation: attendances.filter(a => a.status === 'vacation').length,
      totalWorkHours: attendances.reduce((sum, a) => sum + (a.workHours || 0), 0),
      totalLateMinutes: attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0)
    };
    
    res.json({
      success: true,
      stats,
      attendances
    });
  } catch (error) {
    console.error('Davomat statistikasini olishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Davomat qo'shish
router.post('/', async (req, res) => {
  try {
    const { 
      employee, 
      date, 
      checkIn, 
      checkOut, 
      status, 
      notes 
    } = req.body;
    
    if (!employee || !date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Xodim va sana majburiy' 
      });
    }
    
    // Xodim mavjudligini tekshirish
    const emp = await User.findById(employee);
    if (!emp) {
      return res.status(404).json({ 
        success: false, 
        message: 'Xodim topilmadi' 
      });
    }
    
    // Shu kun uchun davomat mavjudligini tekshirish
    const existingDate = new Date(date);
    const startOfDay = new Date(existingDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(existingDate.setHours(23, 59, 59, 999));
    
    const existing = await Attendance.findOne({
      employee,
      date: { $gte: startOfDay, $lte: endOfDay }
    });
    
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bu kun uchun davomat allaqachon mavjud' 
      });
    }
    
    // Ish soatlarini hisoblash
    let workHours = 0;
    let isLate = false;
    let lateMinutes = 0;
    
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      workHours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // soatlarda
      
      // Kech qolishni tekshirish (9:00 dan keyin)
      const workStartTime = new Date(checkInTime);
      workStartTime.setHours(9, 0, 0, 0);
      
      if (checkInTime > workStartTime) {
        isLate = true;
        lateMinutes = (checkInTime - workStartTime) / (1000 * 60); // daqiqalarda
      }
    }
    
    const attendance = new Attendance({
      employee,
      date: new Date(date),
      checkIn: checkIn ? new Date(checkIn) : undefined,
      checkOut: checkOut ? new Date(checkOut) : undefined,
      workHours,
      status: status || 'present',
      isLate,
      lateMinutes,
      notes
    });
    
    await attendance.save();
    await attendance.populate('employee', 'name role');
    
    res.status(201).json({
      success: true,
      message: 'Davomat saqlandi',
      attendance
    });
  } catch (error) {
    console.error('Davomat qo\'shishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Davomat tahrirlash
router.put('/:id', async (req, res) => {
  try {
    const { checkIn, checkOut, status, notes } = req.body;
    
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Davomat topilmadi' 
      });
    }
    
    // Yangilash
    if (checkIn) attendance.checkIn = new Date(checkIn);
    if (checkOut) attendance.checkOut = new Date(checkOut);
    if (status) attendance.status = status;
    if (notes !== undefined) attendance.notes = notes;
    
    // Ish soatlarini qayta hisoblash
    if (attendance.checkIn && attendance.checkOut) {
      attendance.workHours = (attendance.checkOut - attendance.checkIn) / (1000 * 60 * 60);
      
      const workStartTime = new Date(attendance.checkIn);
      workStartTime.setHours(9, 0, 0, 0);
      
      if (attendance.checkIn > workStartTime) {
        attendance.isLate = true;
        attendance.lateMinutes = (attendance.checkIn - workStartTime) / (1000 * 60);
      } else {
        attendance.isLate = false;
        attendance.lateMinutes = 0;
      }
    }
    
    await attendance.save();
    await attendance.populate('employee', 'name role');
    
    res.json({
      success: true,
      message: 'Davomat yangilandi',
      attendance
    });
  } catch (error) {
    console.error('Davomat yangilashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Davomat tasdiqlash
router.post('/:id/approve', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Davomat topilmadi' 
      });
    }
    
    attendance.approvedBy = req.user._id;
    attendance.approvedAt = new Date();
    
    await attendance.save();
    await attendance.populate('employee', 'name role');
    
    res.json({
      success: true,
      message: 'Davomat tasdiqlandi',
      attendance
    });
  } catch (error) {
    console.error('Davomat tasdiqlashda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Davomat o'chirish
router.delete('/:id', async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) {
      return res.status(404).json({ 
        success: false, 
        message: 'Davomat topilmadi' 
      });
    }
    
    await attendance.deleteOne();
    
    res.json({
      success: true,
      message: 'Davomat o\'chirildi'
    });
  } catch (error) {
    console.error('Davomat o\'chirishda xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// ============ QR ATTENDANCE ENDPOINTS ============

// QR check-in (auth kerak emas - planshet/kiosk uchun, lekin admin token kerak)
router.post('/qr-checkin', async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token majburiy' });
    }

    // Find employee by QR token
    const employee = await User.findOne({ qrToken, status: 'active' });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi yoki faol emas' });
    }

    // Check if already checked in today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const existing = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${employee.name} bugun allaqachon check-in qilgan (${new Date(existing.checkIn).toLocaleTimeString('uz-UZ')})`,
        attendance: existing
      });
    }

    const now = new Date();
    // Late check: 09:00 dan keyin
    const workStart = new Date(now);
    workStart.setHours(9, 0, 0, 0);
    const isLate = now > workStart;
    const lateMinutes = isLate ? Math.round((now - workStart) / (1000 * 60)) : 0;

    const attendance = new Attendance({
      employee: employee._id,
      date: startOfDay,
      checkIn: now,
      status: isLate ? 'late' : 'present',
      isLate,
      lateMinutes
    });

    await attendance.save();
    await attendance.populate('employee', 'name role position');

    res.status(201).json({
      success: true,
      message: `${employee.name} check-in qildi!`,
      attendance,
      isLate,
      lateMinutes
    });
  } catch (error) {
    console.error('QR check-in xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// QR check-out
router.post('/qr-checkout', async (req, res) => {
  try {
    const { qrToken } = req.body;

    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token majburiy' });
    }

    const employee = await User.findOne({ qrToken, status: 'active' });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }

    // Find today's attendance
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      return res.status(400).json({
        success: false,
        message: `${employee.name} bugun check-in qilmagan`
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: `${employee.name} bugun allaqachon check-out qilgan (${new Date(attendance.checkOut).toLocaleTimeString('uz-UZ')})`
      });
    }

    const now = new Date();
    attendance.checkOut = now;
    attendance.workHours = (now - attendance.checkIn) / (1000 * 60 * 60);

    await attendance.save();
    await attendance.populate('employee', 'name role position');

    res.json({
      success: true,
      message: `${employee.name} check-out qildi! Ish soati: ${attendance.workHours.toFixed(1)} soat`,
      attendance
    });
  } catch (error) {
    console.error('QR check-out xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// QR token generate/regenerate for employee
router.post('/qr-generate/:employeeId', async (req, res) => {
  try {
    const employee = await User.findById(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Xodim topilmadi' });
    }

    employee.qrToken = 'QR-' + employee._id.toString() + '-' + Date.now().toString(36);
    await employee.save();

    res.json({
      success: true,
      qrToken: employee.qrToken,
      employee: { _id: employee._id, name: employee.name, role: employee.role }
    });
  } catch (error) {
    console.error('QR generate xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

// Get today's attendance (QR dashboard uchun)
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const attendances = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('employee', 'name role position').sort({ checkIn: -1 }).lean();

    // All active employees
    const allEmployees = await User.find({ status: 'active', role: { $ne: 'admin' } })
      .select('name role position').lean();

    const checkedInIds = attendances.map(a => a.employee._id.toString());
    const notCheckedIn = allEmployees.filter(e => !checkedInIds.includes(e._id.toString()));

    res.json({
      success: true,
      attendances,
      notCheckedIn,
      summary: {
        total: allEmployees.length,
        present: attendances.filter(a => a.checkIn).length,
        checkedOut: attendances.filter(a => a.checkOut).length,
        absent: notCheckedIn.length,
        late: attendances.filter(a => a.isLate).length
      }
    });
  } catch (error) {
    console.error('Bugungi davomat xatolik:', error);
    res.status(500).json({ success: false, message: 'Serverda xatolik' });
  }
});

module.exports = router;
