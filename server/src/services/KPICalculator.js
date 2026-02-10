const KPITemplate = require('../models/KPITemplate');
const KPIAssignment = require('../models/KPIAssignment');
const KPIRecord = require('../models/KPIRecord');
const Receipt = require('../models/Receipt');

class KPICalculator {
  /**
   * Xodim uchun oylik KPI larni hisoblash
   */
  static async calculateMonthlyKPIs(employeeId, year, month) {
    try {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      
      // Faol KPI assignmentlarni olish
      const assignments = await KPIAssignment.getActiveAssignments(employeeId);
      
      if (assignments.length === 0) {
        console.log(`Xodim ${employeeId} uchun faol KPI topilmadi`);
        return [];
      }
      
      const results = [];
      
      for (const assignment of assignments) {
        const kpiTemplate = assignment.kpiTemplate;
        
        // Actual value ni hisoblash
        const actualValue = await this.calculateActualValue(
          employeeId,
          kpiTemplate.type,
          year,
          month
        );
        
        // Target value (custom yoki default)
        const targetValue = assignment.customTarget || kpiTemplate.targetValue;
        
        // Achievement rate hisoblash
        const achievementRate = kpiTemplate.calculateAchievement(actualValue);
        
        // Bonus hisoblash
        const maxBonus = assignment.customMaxBonus || kpiTemplate.maxBonusFromThis;
        const bonusEarned = (achievementRate / 100) * maxBonus;
        
        // KPI Record yaratish yoki yangilash
        let record = await KPIRecord.findOne({
          employee: employeeId,
          kpiTemplate: kpiTemplate._id,
          period
        });
        
        if (record) {
          // Mavjud recordni yangilash
          record.targetValue = targetValue;
          record.actualValue = actualValue;
          record.achievementRate = achievementRate;
          record.bonusEarned = bonusEarned;
          record.calculatedAt = new Date();
          record.calculatedBy = 'auto';
        } else {
          // Yangi record yaratish
          record = new KPIRecord({
            employee: employeeId,
            kpiTemplate: kpiTemplate._id,
            period,
            year,
            month,
            targetValue,
            actualValue,
            achievementRate,
            bonusEarned,
            calculatedBy: 'auto',
            metadata: {
              kpiName: kpiTemplate.name,
              kpiCode: kpiTemplate.code,
              kpiType: kpiTemplate.type,
              weight: assignment.customWeight || kpiTemplate.weight
            }
          });
        }
        
        await record.save();
        results.push(record);
      }
      
      return results;
    } catch (error) {
      console.error('KPI hisoblashda xatolik:', error);
      throw error;
    }
  }
  
  /**
   * Actual value ni hisoblash (KPI turiga qarab)
   */
  static async calculateActualValue(employeeId, kpiType, year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    switch (kpiType) {
      case 'SALES_AMOUNT':
        return await this.calculateSalesAmount(employeeId, startDate, endDate);
        
      case 'RECEIPT_COUNT':
        return await this.calculateReceiptCount(employeeId, startDate, endDate);
        
      case 'AVERAGE_CHECK':
        return await this.calculateAverageCheck(employeeId, startDate, endDate);
        
      case 'ATTENDANCE':
        return await this.calculateAttendanceRate(employeeId, year, month);
        
      case 'ERROR_COUNT':
        return await this.calculateErrorCount(employeeId, startDate, endDate);
        
      default:
        return 0;
    }
  }
  
  /**
   * Savdo hajmini hisoblash
   */
  static async calculateSalesAmount(employeeId, startDate, endDate) {
    const receipts = await Receipt.find({
      user: employeeId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    });
    
    return receipts.reduce((sum, receipt) => sum + receipt.total, 0);
  }
  
  /**
   * Cheklar sonini hisoblash
   */
  static async calculateReceiptCount(employeeId, startDate, endDate) {
    return await Receipt.countDocuments({
      user: employeeId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    });
  }
  
  /**
   * O'rtacha chekni hisoblash
   */
  static async calculateAverageCheck(employeeId, startDate, endDate) {
    const receipts = await Receipt.find({
      user: employeeId,
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    });
    
    if (receipts.length === 0) return 0;
    
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    return totalAmount / receipts.length;
  }
  
  /**
   * Davomat foizini hisoblash
   */
  static async calculateAttendanceRate(employeeId, year, month) {
    const Attendance = require('../models/Attendance');
    const stats = await Attendance.getMonthlyStats(employeeId, year, month);
    return stats.attendanceRate || 0;
  }
  
  /**
   * Xatolar sonini hisoblash
   */
  static async calculateErrorCount(employeeId, startDate, endDate) {
    // Bu yerda xatolar logini tekshirish kerak
    // Hozircha 0 qaytaramiz
    return 0;
  }
  
  /**
   * Barcha xodimlar uchun KPI hisoblash
   */
  static async calculateAllEmployeesKPIs(year, month) {
    const User = require('../models/User');
    const employees = await User.find({ 
      role: { $in: ['cashier', 'helper'] },
      status: 'active'
    });
    
    const results = [];
    
    for (const employee of employees) {
      try {
        const kpiRecords = await this.calculateMonthlyKPIs(employee._id, year, month);
        results.push({
          employee: employee._id,
          name: employee.name,
          kpiCount: kpiRecords.length,
          totalBonus: kpiRecords.reduce((sum, record) => sum + record.bonusEarned, 0)
        });
      } catch (error) {
        console.error(`Xodim ${employee.name} uchun KPI hisoblashda xatolik:`, error);
      }
    }
    
    return results;
  }
}

module.exports = KPICalculator;
