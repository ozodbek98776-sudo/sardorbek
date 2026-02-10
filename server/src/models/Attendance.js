const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  // Vaqt
  checkIn: Date,
  checkOut: Date,
  workHours: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'sick', 'vacation', 'holiday'],
    default: 'present',
    index: true
  },
  
  // Kech qolish
  isLate: {
    type: Boolean,
    default: false
  },
  lateMinutes: {
    type: Number,
    default: 0
  },
  
  // Izoh
  notes: String,
  
  // Tasdiqlash
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexlar
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, status: 1 });
attendanceSchema.index({ employee: 1, status: 1 });

// Pre-save hook - workHours hisoblash
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    const diff = this.checkOut - this.checkIn;
    this.workHours = diff / (1000 * 60 * 60); // Soatlarga aylantirish
  }
  next();
});

// Static method - oylik davomat statistikasi
attendanceSchema.statics.getMonthlyStats = async function(employeeId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const records = await this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  const stats = {
    totalDays: records.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    sick: 0,
    vacation: 0,
    totalWorkHours: 0,
    totalLateMinutes: 0
  };
  
  records.forEach(record => {
    stats.totalWorkHours += record.workHours;
    stats.totalLateMinutes += record.lateMinutes;
    
    switch (record.status) {
      case 'present':
        stats.present++;
        break;
      case 'absent':
        stats.absent++;
        break;
      case 'late':
        stats.late++;
        break;
      case 'half_day':
        stats.halfDay++;
        break;
      case 'sick':
        stats.sick++;
        break;
      case 'vacation':
        stats.vacation++;
        break;
    }
  });
  
  stats.attendanceRate = stats.totalDays > 0 
    ? ((stats.present + stats.late + stats.halfDay) / stats.totalDays) * 100 
    : 0;
  
  return stats;
};

module.exports = mongoose.model('Attendance', attendanceSchema);
