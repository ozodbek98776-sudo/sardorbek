const BaseService = require('./BaseService');
const Customer = require('../../models/Customer');
const Debt = require('../../models/Debt');

/**
 * Customer Service
 * Mijoz bilan bog'liq barcha business logic
 */
class CustomerService extends BaseService {
  constructor() {
    super('CustomerService');
  }

  /**
   * Telefon raqamini normalize qilish
   */
  normalizePhoneNumber(phone) {
    if (!phone) return null;

    // Faqat raqamlarni qoldirish
    let cleaned = phone.replace(/\D/g, '');

    // Turli formatlarni standart formatga o'tkazish
    if (cleaned.startsWith('998')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('8') && cleaned.length === 10) {
      cleaned = '+998' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      cleaned = '+998' + cleaned;
    } else if (!cleaned.startsWith('+998') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    }

    // Validatsiya
    if (!/^\+998\d{9}$/.test(cleaned)) {
      throw this.createValidationError('Telefon raqam formati noto\'g\'ri. Masalan: +998901234567', 'phone');
    }

    return cleaned;
  }

  /**
   * Mijoz ma'lumotlarini validate qilish
   */
  validateCustomerData(data) {
    const { name, phone, email } = data;

    // Ism tekshirish
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw this.createValidationError('Mijoz ismi kamida 2 ta belgi bo\'lishi kerak', 'name');
    }

    // Telefon raqam tekshirish va normalize qilish
    const normalizedPhone = this.normalizePhoneNumber(phone);

    // Email tekshirish (ixtiyoriy)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw this.createValidationError('Email formati noto\'g\'ri', 'email');
    }

    return {
      name: name.trim(),
      phone: normalizedPhone,
      email: email ? email.trim().toLowerCase() : null
    };
  }

  /**
   * Mijoz yaratish
   */
  async createCustomer(customerData, user) {
    return this.executeOperation(async () => {
      // Ma'lumotlarni validate qilish
      const validatedData = this.validateCustomerData(customerData);

      // Telefon raqam unique ekanligini tekshirish
      const existingCustomer = await Customer.findOne({ phone: validatedData.phone });
      if (existingCustomer) {
        throw this.createValidationError(`Bu telefon raqam allaqachon ro'yxatdan o'tgan: ${validatedData.phone}`, 'phone');
      }

      // Mijoz yaratish
      const newCustomerData = {
        ...validatedData,
        address: customerData.address || ''
      };

      // createdBy - faqat real ObjectId bo'lsa qo'shamiz
      if (user._id && user._id !== 'hardcoded-admin-id') {
        newCustomerData.createdBy = user._id;
      }

      const customer = new Customer(newCustomerData);

      await customer.save();

      this.logOperation('Customer created', {
        customerId: customer._id,
        name: customer.name,
        phone: customer.phone,
        userId: user._id
      });

      return {
        success: true,
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          address: customer.address,
          totalPurchases: customer.totalPurchases,
          totalBalls: customer.totalBalls,
          debt: customer.debt,
          createdAt: customer.createdAt
        }
      };
    }, 'createCustomer', { name: customerData.name, phone: customerData.phone, userId: user._id });
  }

  /**
   * Mijozni telefon raqam bo'yicha qidirish
   */
  async findCustomerByPhone(phone) {
    return this.executeOperation(async () => {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      
      const customer = await Customer.findOne({ phone: normalizedPhone }).lean();
      
      if (!customer) {
        throw this.createNotFoundError('Mijoz', normalizedPhone);
      }

      this.logOperation('Customer found by phone', {
        customerId: customer._id,
        phone: normalizedPhone
      });

      return customer;
    }, 'findCustomerByPhone', { phone });
  }

  /**
   * Mijoz qarzini yangilash
   */
  async updateCustomerDebt(customerId, debtChange, operation = 'manual') {
    return this.executeOperation(async () => {
      const customer = await Customer.findById(customerId);
      
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      const oldDebt = customer.debt;
      const newDebt = oldDebt + debtChange;

      if (newDebt < 0) {
        throw this.createBusinessError(
          `Mijoz qarzi manfiy bo'lishi mumkin emas. Mavjud qarz: ${oldDebt}, O'zgarish: ${debtChange}`
        );
      }

      customer.debt = newDebt;
      await customer.save();

      this.logOperation('Customer debt updated', {
        customerId,
        customerName: customer.name,
        oldDebt,
        newDebt,
        debtChange,
        operation
      });

      return {
        success: true,
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          debt: customer.debt
        }
      };
    }, 'updateCustomerDebt', { customerId, debtChange, operation });
  }

  /**
   * Mijoz xaridini yangilash
   */
  async updateCustomerPurchase(customerId, purchaseAmount) {
    return this.executeOperation(async () => {
      const customer = await Customer.findById(customerId);
      
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      // Ball hisoblash - har 1,000,000 = 1 ball
      const earnedBalls = Math.floor(purchaseAmount / 1000000);

      const oldPurchases = customer.totalPurchases;
      const oldBalls = customer.totalBalls;

      customer.totalPurchases += purchaseAmount;
      customer.totalBalls += earnedBalls;

      await customer.save();

      this.logOperation('Customer purchase updated', {
        customerId,
        customerName: customer.name,
        purchaseAmount,
        earnedBalls,
        oldPurchases,
        newPurchases: customer.totalPurchases,
        oldBalls,
        newBalls: customer.totalBalls
      });

      return {
        success: true,
        customer: {
          _id: customer._id,
          name: customer.name,
          totalPurchases: customer.totalPurchases,
          totalBalls: customer.totalBalls,
          earnedBalls
        }
      };
    }, 'updateCustomerPurchase', { customerId, purchaseAmount });
  }

  /**
   * Mijozlar ro'yxatini olish
   */
  async getCustomers(filters = {}, pagination = {}) {
    return this.executeOperation(async () => {
      const { page = 1, limit = 20 } = pagination;
      const { search, hasDebt, sortBy = 'createdAt', sortOrder = 'desc' } = filters;

      // Pagination validate qilish
      const paginationData = this.validatePagination(page, limit);

      // Query yaratish
      const query = {};

      // Qidiruv
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      // Qarzli mijozlar
      if (hasDebt === true) {
        query.debt = { $gt: 0 };
      } else if (hasDebt === false) {
        query.debt = { $lte: 0 };
      }

      // Sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      // Ma'lumotlarni olish
      const [customers, total] = await Promise.all([
        Customer.find(query)
          .select('name phone email address totalPurchases totalBalls debt createdAt')
          .sort(sort)
          .skip(paginationData.skip)
          .limit(paginationData.limit)
          .lean(),
        Customer.countDocuments(query)
      ]);

      this.logOperation('Customers retrieved', {
        filters,
        pagination: paginationData,
        resultCount: customers.length,
        totalCount: total
      });

      return this.createPaginationResponse(customers, total, paginationData.page, paginationData.limit);
    }, 'getCustomers', { filters, pagination });
  }

  /**
   * Mijoz statistikasini olish
   */
  async getCustomerStats() {
    return this.executeOperation(async () => {
      const stats = await Customer.aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            totalDebt: { $sum: '$debt' },
            totalPurchases: { $sum: '$totalPurchases' },
            totalBalls: { $sum: '$totalBalls' },
            customersWithDebt: {
              $sum: {
                $cond: [{ $gt: ['$debt', 0] }, 1, 0]
              }
            },
            averageDebt: { $avg: '$debt' },
            averagePurchases: { $avg: '$totalPurchases' }
          }
        }
      ]);

      const result = stats[0] || {
        totalCustomers: 0,
        totalDebt: 0,
        totalPurchases: 0,
        totalBalls: 0,
        customersWithDebt: 0,
        averageDebt: 0,
        averagePurchases: 0
      };

      this.logOperation('Customer stats calculated', result);
      return result;
    }, 'getCustomerStats');
  }

  /**
   * Mijozni ID bo'yicha topish
   */
  async findCustomerById(customerId) {
    return this.executeOperation(async () => {
      const customer = await Customer.findById(customerId).lean();
      
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      this.logOperation('Customer found by ID', {
        customerId,
        name: customer.name
      });

      return customer;
    }, 'findCustomerById', { customerId });
  }

  /**
   * Mijoz qarz tarixini olish
   */
  async getCustomerDebtHistory(customerId) {
    return this.executeOperation(async () => {
      const Debt = require('../../models/Debt');
      const Receipt = require('../../models/Receipt');

      // Mijozni topish
      const customer = await Customer.findById(customerId).lean();
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      // Qarzlar tarixini olish
      const debts = await Debt.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Cheklar tarixini olish
      const receipts = await Receipt.find({ customer: customerId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Statistika
      const totalDebts = await Debt.countDocuments({ customer: customerId });
      const activeDebts = await Debt.countDocuments({ 
        customer: customerId, 
        status: { $in: ['approved', 'overdue'] } 
      });
      const totalPurchases = await Receipt.countDocuments({ customer: customerId });
      
      // Jami xaridlar summasi
      const purchaseStats = await Receipt.aggregate([
        { $match: { customer: customerId } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]);
      const totalPurchaseAmount = purchaseStats.length > 0 ? purchaseStats[0].total : 0;

      // To'langan qarz summasi
      const paidDebtStats = await Debt.aggregate([
        { $match: { customer: customerId } },
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]);
      const totalPaid = paidDebtStats.length > 0 ? paidDebtStats[0].total : 0;

      this.logOperation('Customer debt history retrieved', {
        customerId,
        debtsCount: debts.length,
        receiptsCount: receipts.length
      });

      return {
        customer,
        debts,
        receipts,
        totalDebt: customer.debt || 0,
        totalPaid,
        totalPurchases: totalPurchaseAmount,
        purchaseCount: totalPurchases,
        stats: {
          totalDebts,
          activeDebts,
          totalPurchases,
          totalDebt: customer.debt || 0,
          totalBalls: customer.totalBalls || 0
        }
      };
    }, 'getCustomerDebtHistory', { customerId });
  }

  /**
   * Mijozni yangilash
   */
  async updateCustomer(customerId, updateData, user) {
    return this.executeOperation(async () => {
      // Ma'lumotlarni validate qilish
      const validatedData = this.validateCustomerData(updateData);

      // Mijoz mavjudligini tekshirish
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      // Telefon raqam unique ekanligini tekshirish (agar o'zgartirilayotgan bo'lsa)
      if (validatedData.phone && validatedData.phone !== customer.phone) {
        const existingCustomer = await Customer.findOne({ 
          phone: validatedData.phone,
          _id: { $ne: customerId }
        });
        if (existingCustomer) {
          throw this.createValidationError(`Bu telefon raqam allaqachon ishlatilgan: ${validatedData.phone}`, 'phone');
        }
      }

      // Mijozni yangilash
      const updatedCustomer = await Customer.findByIdAndUpdate(
        customerId,
        validatedData,
        { new: true }
      ).lean();

      this.logOperation('Customer updated', {
        customerId,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        userId: user._id
      });

      return {
        success: true,
        customer: updatedCustomer
      };
    }, 'updateCustomer', { customerId, userId: user._id });
  }

  /**
   * Mijozni o'chirish
   */
  async deleteCustomer(customerId, user) {
    return this.executeOperation(async () => {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      // Mijozning barcha qarzlarini o'chirish
      const Debt = require('../../models/Debt');
      const deletedDebts = await Debt.deleteMany({ customer: customerId });

      // Mijozni o'chirish
      await Customer.findByIdAndDelete(customerId);

      this.logOperation('Customer deleted', {
        customerId,
        customerName: customer.name,
        deletedDebtsCount: deletedDebts.deletedCount,
        userId: user._id
      });

      return {
        success: true,
        message: 'Mijoz va uning barcha qarzlari o\'chirildi',
        deletedDebtsCount: deletedDebts.deletedCount
      };
    }, 'deleteCustomer', { customerId, userId: user._id });
  }
}

module.exports = CustomerService;