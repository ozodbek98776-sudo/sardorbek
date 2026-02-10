const Payroll = require('../models/Payroll');
const SalaryCalculator = require('./SalaryCalculator');
const KPICalculator = require('./KPICalculator');
const Expense = require('../models/Expense');

class PayrollService {
  /**
   * Oylik payroll yaratish (bitta xodim uchun)
   */
  static async createMonthlyPayroll(employeeId, year, month, createdBy) {
    try {
      const period = `${year}-${String(month).padStart(2, '0')}`;
      
      // 1. Mavjudligini tekshirish
      const existing = await Payroll.findOne({ employee: employeeId, period });
      if (existing) {
        throw new Error('Bu oy uchun payroll allaqachon mavjud');
      }
      
      // 2. KPI larni hisoblash
      await KPICalculator.calculateMonthlyKPIs(employeeId, year, month);
      
      // 3. Maoshni hisoblash
      const salaryData = await SalaryCalculator.getSalaryBreakdown(employeeId, year, month);
      
      // 4. Payroll yaratish
      const payrollData = {
        employee: employeeId,
        period,
        year,
        month,
        baseSalary: salaryData.baseSalary,
        totalBonus: salaryData.totalBonus,
        allowances: salaryData.allowances,
        deductions: salaryData.deductions,
        advancePayments: salaryData.advancePayments,
        kpiBreakdown: salaryData.kpiBreakdown
      };
      
      // Hardcoded admin uchun createdBy ni employee ga o'rnatish
      if (createdBy === 'hardcoded-admin-id') {
        payrollData.createdBy = employeeId;
      } else {
        payrollData.createdBy = createdBy;
      }
      
      const payroll = new Payroll(payrollData);
      
      await payroll.save();
      
      return payroll;
    } catch (error) {
      console.error('Payroll yaratishda xatolik:', error);
      throw error;
    }
  }
  
  /**
   * Barcha xodimlar uchun oylik payroll yaratish
   */
  static async createAllEmployeesPayroll(year, month, createdBy) {
    const User = require('../models/User');
    
    const employees = await User.find({
      role: { $in: ['cashier', 'helper'] },
      status: 'active'
    });
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const employee of employees) {
      try {
        const payroll = await this.createMonthlyPayroll(
          employee._id,
          year,
          month,
          createdBy
        );
        
        results.success.push({
          employee: employee._id,
          name: employee.name,
          payroll: payroll._id,
          netSalary: payroll.netSalary
        });
      } catch (error) {
        results.failed.push({
          employee: employee._id,
          name: employee.name,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * Payroll ni tasdiqlash
   */
  static async approvePayroll(payrollId, adminId) {
    const payroll = await Payroll.findById(payrollId);
    
    if (!payroll) {
      throw new Error('Payroll topilmadi');
    }
    
    if (payroll.status !== 'pending') {
      throw new Error('Faqat pending holatdagi payroll ni tasdiqlash mumkin');
    }
    
    await payroll.approve(adminId);
    
    return payroll;
  }
  
  /**
   * Payroll ni to'langan deb belgilash va Expense ga qo'shish
   */
  static async markAsPaidAndCreateExpense(payrollId, paymentMethod = 'cash', adminId) {
    const payroll = await Payroll.findById(payrollId).populate('employee');
    
    if (!payroll) {
      throw new Error('Payroll topilmadi');
    }
    
    if (payroll.status !== 'approved') {
      throw new Error('Faqat tasdiqlangan payroll ni to\'lash mumkin');
    }
    
    // 1. Payroll ni to'langan deb belgilash
    await payroll.markAsPaid(paymentMethod);
    
    // 2. Expense ga qo'shish (ish haqi xarajati)
    const expense = new Expense({
      category: 'ish_haqi',  // Yangi kategoriya
      amount: payroll.netSalary,
      note: `${payroll.employee.name} - ${payroll.period} oylik maosh`,
      date: new Date(),
      source: 'payroll',
      metadata: {
        payrollId: payroll._id,
        employeeId: payroll.employee._id,
        employeeName: payroll.employee.name,
        period: payroll.period
      },
      created_by: adminId
    });
    
    await expense.save();
    
    return {
      payroll,
      expense
    };
  }
  
  /**
   * Payroll statistikasi
   */
  static async getPayrollStats(year, month) {
    const period = `${year}-${String(month).padStart(2, '0')}`;
    
    const payrolls = await Payroll.find({ period }).populate('employee');
    
    const stats = {
      totalEmployees: payrolls.length,
      totalBaseSalary: 0,
      totalBonus: 0,
      totalGross: 0,
      totalNet: 0,
      byStatus: {
        pending: 0,
        approved: 0,
        paid: 0,
        cancelled: 0
      },
      topEarners: []
    };
    
    payrolls.forEach(payroll => {
      stats.totalBaseSalary += payroll.baseSalary;
      stats.totalBonus += payroll.totalBonus;
      stats.totalGross += payroll.grossSalary;
      stats.totalNet += payroll.netSalary;
      stats.byStatus[payroll.status]++;
    });
    
    // Top earners
    stats.topEarners = payrolls
      .sort((a, b) => b.netSalary - a.netSalary)
      .slice(0, 5)
      .map(p => ({
        name: p.employee.name,
        netSalary: p.netSalary,
        bonus: p.totalBonus
      }));
    
    return stats;
  }
  
  /**
   * Payroll ni qayta hisoblash
   */
  static async recalculatePayroll(payrollId) {
    const payroll = await Payroll.findById(payrollId);
    
    if (!payroll) {
      throw new Error('Payroll topilmadi');
    }
    
    if (payroll.status !== 'pending') {
      throw new Error('Faqat pending holatdagi payroll ni qayta hisoblash mumkin');
    }
    
    // KPI larni qayta hisoblash
    await KPICalculator.calculateMonthlyKPIs(
      payroll.employee,
      payroll.year,
      payroll.month
    );
    
    // Maoshni qayta hisoblash
    const salaryData = await SalaryCalculator.getSalaryBreakdown(
      payroll.employee,
      payroll.year,
      payroll.month
    );
    
    // Payroll ni yangilash
    payroll.baseSalary = salaryData.baseSalary;
    payroll.totalBonus = salaryData.totalBonus;
    payroll.allowances = salaryData.allowances;
    payroll.deductions = salaryData.deductions;
    payroll.advancePayments = salaryData.advancePayments;
    payroll.kpiBreakdown = salaryData.kpiBreakdown;
    
    await payroll.save();
    
    return payroll;
  }
}

module.exports = PayrollService;
