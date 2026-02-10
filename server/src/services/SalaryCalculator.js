const SalarySetting = require('../models/SalarySetting');
const KPIRecord = require('../models/KPIRecord');
const AdvancePayment = require('../models/AdvancePayment');

class SalaryCalculator {
  /**
   * Xodim uchun oylik maoshni hisoblash
   */
  static async calculateMonthlySalary(employeeId, year, month) {
    try {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      
      // 1. Salary Setting olish
      const salarySetting = await SalarySetting.getActiveSetting(employeeId);
      
      if (!salarySetting) {
        throw new Error('Xodim uchun maosh sozlamalari topilmadi');
      }
      
      // 2. Base Salary
      const baseSalary = salarySetting.baseSalary;
      
      // 3. KPI Bonus hisoblash
      const totalBonus = await this.calculateKPIBonus(
        employeeId, 
        year, 
        month, 
        salarySetting.maxBonus
      );
      
      // 4. Allowances (qo'shimcha to'lovlar)
      const allowances = salarySetting.totalAllowances;
      
      // 5. Deductions (chegirmalar)
      const deductions = this.calculateDeductions(salarySetting, baseSalary);
      
      // 6. Advance Payments (avanslar)
      const advancePayments = await AdvancePayment.getTotalAdvances(employeeId, period);
      
      // 7. Gross Salary
      const grossSalary = baseSalary + totalBonus + allowances;
      
      // 8. Net Salary
      const netSalary = grossSalary - deductions - advancePayments;
      
      return {
        baseSalary,
        totalBonus,
        allowances,
        deductions,
        advancePayments,
        grossSalary,
        netSalary,
        period,
        year,
        month
      };
    } catch (error) {
      console.error('Maosh hisoblashda xatolik:', error);
      throw error;
    }
  }
  
  /**
   * KPI bonusni hisoblash
   */
  static async calculateKPIBonus(employeeId, year, month, maxBonus) {
    const kpiRecords = await KPIRecord.getMonthlyRecords(employeeId, year, month);
    
    if (kpiRecords.length === 0) {
      return 0;
    }
    
    // Barcha KPI lardan olingan bonusni yig'ish
    const totalBonus = kpiRecords.reduce((sum, record) => sum + record.bonusEarned, 0);
    
    // Maksimal bonusdan oshmasligi kerak
    return Math.min(totalBonus, maxBonus);
  }
  
  /**
   * Chegirmalarni hisoblash
   */
  static calculateDeductions(salarySetting, baseSalary) {
    let totalDeductions = 0;
    
    salarySetting.deductions.forEach(deduction => {
      if (deduction.percentage) {
        // Foiz bo'yicha
        totalDeductions += (baseSalary * deduction.percentage) / 100;
      } else if (deduction.amount) {
        // Fix summa
        totalDeductions += deduction.amount;
      }
    });
    
    return totalDeductions;
  }
  
  /**
   * Maosh breakdown (tafsilotlar)
   */
  static async getSalaryBreakdown(employeeId, year, month) {
    const salary = await this.calculateMonthlySalary(employeeId, year, month);
    const kpiRecords = await KPIRecord.getMonthlyRecords(employeeId, year, month);
    const salarySetting = await SalarySetting.getActiveSetting(employeeId);
    
    return {
      ...salary,
      kpiBreakdown: kpiRecords.map(record => ({
        kpiName: record.metadata.kpiName,
        kpiCode: record.metadata.kpiCode,
        targetValue: record.targetValue,
        actualValue: record.actualValue,
        achievementRate: record.achievementRate,
        bonusEarned: record.bonusEarned,
        weight: record.metadata.weight
      })),
      allowancesBreakdown: salarySetting.allowances,
      deductionsBreakdown: salarySetting.deductions
    };
  }
  
  /**
   * Yillik maosh statistikasi
   */
  static async getYearlySalaryStats(employeeId, year) {
    const Payroll = require('../models/Payroll');
    
    const payrolls = await Payroll.find({
      employee: employeeId,
      year,
      status: 'paid'
    }).sort({ month: 1 });
    
    const stats = {
      totalBaseSalary: 0,
      totalBonus: 0,
      totalAllowances: 0,
      totalDeductions: 0,
      totalAdvances: 0,
      totalGross: 0,
      totalNet: 0,
      monthlyData: []
    };
    
    payrolls.forEach(payroll => {
      stats.totalBaseSalary += payroll.baseSalary;
      stats.totalBonus += payroll.totalBonus;
      stats.totalAllowances += payroll.allowances;
      stats.totalDeductions += payroll.deductions;
      stats.totalAdvances += payroll.advancePayments;
      stats.totalGross += payroll.grossSalary;
      stats.totalNet += payroll.netSalary;
      
      stats.monthlyData.push({
        month: payroll.month,
        period: payroll.period,
        baseSalary: payroll.baseSalary,
        bonus: payroll.totalBonus,
        net: payroll.netSalary
      });
    });
    
    stats.averageMonthly = stats.monthlyData.length > 0 
      ? stats.totalNet / stats.monthlyData.length 
      : 0;
    
    return stats;
  }
}

module.exports = SalaryCalculator;
