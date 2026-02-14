const BaseService = require('./BaseService');
const Debt = require('../../models/Debt');
const Customer = require('../../models/Customer');
const User = require('../../models/User');

/**
 * Debt Service
 * Qarz bilan bog'liq barcha business logic
 */
class DebtService extends BaseService {
  constructor() {
    super('DebtService');
  }

  /**
   * Qarz ma'lumotlarini validate qilish
   */
  validateDebtData(data) {
    const { type, customer, creditorName, amount, dueDate } = data;

    // Type tekshirish
    if (!['receivable', 'payable'].includes(type)) {
      throw this.createValidationError('Qarz turi receivable yoki payable bo\'lishi kerak', 'type');
    }

    // Amount tekshirish
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw this.createValidationError('Qarz summasi 0 dan katta bo\'lishi kerak', 'amount');
    }

    // Receivable uchun customer kerak
    if (type === 'receivable' && !customer) {
      throw this.createValidationError('Receivable qarz uchun mijoz ko\'rsatilishi kerak', 'customer');
    }

    // Payable uchun creditorName kerak
    if (type === 'payable' && !creditorName) {
      throw this.createValidationError('Payable qarz uchun kreditor ismi ko\'rsatilishi kerak', 'creditorName');
    }

    // Due date tekshirish - o'tmishda ham bo'lishi mumkin (eski qarzlar uchun)
    let parsedDueDate;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        throw this.createValidationError('Noto\'g\'ri muddat formati', 'dueDate');
      }
    } else {
      // Default: 30 kun
      parsedDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }

    return {
      type,
      customer,
      creditorName,
      amount: numAmount,
      dueDate: parsedDueDate
    };
  }

  /**
   * Yangi qarz yaratish
   */
  async createDebt(debtData, user) {
    return this.executeOperation(async () => {
      const validatedData = this.validateDebtData(debtData);

      // Agar receivable bo'lsa, mijoz mavjudligini tekshirish
      if (validatedData.type === 'receivable') {
        const customer = await Customer.findById(validatedData.customer);
        if (!customer) {
          throw this.createNotFoundError('Mijoz', validatedData.customer);
        }
      }

      // Qarz yaratish
      const newDebtData = {
        type: validatedData.type,
        customer: validatedData.customer,
        creditorName: validatedData.creditorName,
        amount: validatedData.amount,
        paidAmount: 0,
        dueDate: validatedData.dueDate,
        originalDueDate: validatedData.dueDate,
        description: debtData.description || `${validatedData.type === 'receivable' ? 'Mijoz' : 'Kreditor'} qarzi`,
        collateral: debtData.collateral || '',
        status: user.role === 'admin' ? 'approved' : 'pending_approval'
      };

      // createdBy - faqat real ObjectId bo'lsa qo'shamiz
      if (user._id && user._id !== 'hardcoded-admin-id') {
        newDebtData.createdBy = user._id;
      }

      const debt = new Debt(newDebtData);

      await debt.save();

      // Agar admin tomonidan yaratilgan va receivable bo'lsa, mijoz qarzini yangilash
      if (debt.status === 'approved' && debt.type === 'receivable') {
        await Customer.findByIdAndUpdate(debt.customer, {
          $inc: { debt: debt.amount }
        });
      }

      // Populate qilib qaytarish
      await debt.populate([
        { path: 'customer', select: 'name phone' },
        { path: 'createdBy', select: 'name role' }
      ]);

      this.logOperation('Debt created', {
        debtId: debt._id,
        type: debt.type,
        amount: debt.amount,
        status: debt.status,
        userId: user._id
      });

      return {
        success: true,
        debt: {
          _id: debt._id,
          type: debt.type,
          customer: debt.customer,
          creditorName: debt.creditorName,
          amount: debt.amount,
          paidAmount: debt.paidAmount,
          dueDate: debt.dueDate,
          status: debt.status,
          description: debt.description,
          createdBy: debt.createdBy,
          createdAt: debt.createdAt
        }
      };
    }, 'createDebt', { type: debtData.type, amount: debtData.amount, userId: user._id });
  }

  /**
   * Qarzni tasdiqlash (faqat admin)
   */
  async approveDebt(debtId, user) {
    return this.executeOperation(async () => {
      if (user.role !== 'admin') {
        throw this.createPermissionError('Faqat admin qarzni tasdiqlashi mumkin');
      }

      const debt = await Debt.findById(debtId);
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      if (debt.status !== 'pending_approval') {
        throw this.createBusinessError('Bu qarz allaqachon ko\'rib chiqilgan');
      }

      debt.status = 'approved';
      debt.approvedBy = user._id;
      debt.approvedAt = new Date();
      await debt.save();

      // Agar receivable bo'lsa, mijoz qarzini yangilash
      if (debt.type === 'receivable' && debt.customer) {
        await Customer.findByIdAndUpdate(debt.customer, {
          $inc: { debt: debt.amount }
        });
      }

      await debt.populate([
        { path: 'customer', select: 'name phone' },
        { path: 'createdBy', select: 'name role' }
      ]);

      this.logOperation('Debt approved', {
        debtId: debt._id,
        amount: debt.amount,
        approvedBy: user._id
      });

      return {
        success: true,
        debt
      };
    }, 'approveDebt', { debtId, userId: user._id });
  }

  /**
   * Qarzni rad etish (faqat admin)
   */
  async rejectDebt(debtId, reason, user) {
    return this.executeOperation(async () => {
      if (user.role !== 'admin') {
        throw this.createPermissionError('Faqat admin qarzni rad etishi mumkin');
      }

      const debt = await Debt.findById(debtId);
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      if (debt.status !== 'pending_approval') {
        throw this.createBusinessError('Bu qarz allaqachon ko\'rib chiqilgan');
      }

      // Qarzni o'chirish (rad etilgan qarzlar saqlanmaydi)
      debt.description = `${debt.description || ''} [RAD ETILDI: ${reason || 'Sabab ko\'rsatilmagan'}]`;
      await debt.deleteOne();

      this.logOperation('Debt rejected and deleted', {
        debtId: debt._id,
        amount: debt.amount,
        reason,
        rejectedBy: user._id
      });

      return {
        success: true,
        message: 'Qarz rad etildi va o\'chirildi'
      };
    }, 'rejectDebt', { debtId, reason, userId: user._id });
  }

  /**
   * Qarzga to'lov qo'shish
   */
  async addPayment(debtId, paymentData, user) {
    return this.executeOperation(async () => {
      const { amount, method = 'cash', note = '' } = paymentData;

      // Amount validate qilish
      const paymentAmount = parseFloat(amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw this.createValidationError('To\'lov summasi 0 dan katta bo\'lishi kerak', 'amount');
      }

      const debt = await Debt.findById(debtId);
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      if (debt.status !== 'approved') {
        throw this.createBusinessError('Faqat tasdiqlangan qarzga to\'lov qo\'shish mumkin');
      }

      const remainingAmount = debt.amount - debt.paidAmount;
      if (paymentAmount > remainingAmount) {
        throw this.createBusinessError(
          `To\'lov summasi qarz qoldiqidan katta bo\'lishi mumkin emas. Qoldiq: ${remainingAmount}`
        );
      }

      // To'lov qo'shish
      debt.payments.push({
        amount: paymentAmount,
        method,
        note,
        date: new Date(),
        processedBy: user._id
      });

      debt.paidAmount += paymentAmount;

      // Agar to'liq to'langan bo'lsa, status ni o'zgartirish
      if (debt.paidAmount >= debt.amount) {
        debt.status = 'paid';
        debt.paidAt = new Date();
      }

      await debt.save();

      // Agar receivable bo'lsa, mijoz qarzini kamaytirish
      if (debt.type === 'receivable' && debt.customer) {
        await Customer.findByIdAndUpdate(debt.customer, {
          $inc: { debt: -paymentAmount }
        });
      }

      await debt.populate([
        { path: 'customer', select: 'name phone' },
        { path: 'createdBy', select: 'name role' }
      ]);

      this.logOperation('Payment added to debt', {
        debtId: debt._id,
        paymentAmount,
        totalPaid: debt.paidAmount,
        remainingAmount: debt.amount - debt.paidAmount,
        status: debt.status,
        userId: user._id
      });

      return {
        success: true,
        debt,
        payment: {
          amount: paymentAmount,
          method,
          note,
          remainingAmount: debt.amount - debt.paidAmount,
          isFullyPaid: debt.status === 'paid'
        }
      };
    }, 'addPayment', { debtId, paymentAmount: paymentData.amount, userId: user._id });
  }

  /**
   * Qarzlar ro'yxatini olish
   */
  async getDebts(filters = {}, pagination = {}) {
    return this.executeOperation(async () => {
      const { page = 1, limit = 20 } = pagination;
      const { status, type, customerId, overdue, search } = filters;

      // Pagination validate qilish
      const paginationData = this.validatePagination(page, limit);

      // Query yaratish
      const query = {};

      if (status) query.status = status;
      if (type) query.type = type;
      if (customerId) query.customer = customerId;

      // Muddati o'tgan qarzlar
      if (overdue === true) {
        query.dueDate = { $lt: new Date() };
        query.status = { $in: ['approved', 'overdue'] };
      }

      // Qidiruv
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { creditorName: { $regex: search, $options: 'i' } }
        ];
      }

      // Sort
      const sort = { createdAt: -1 };

      // Ma'lumotlarni olish
      const [debts, total] = await Promise.all([
        Debt.find(query)
          .populate('customer', 'name phone')
          .populate('createdBy', 'name role')
          .sort(sort)
          .skip(paginationData.skip)
          .limit(paginationData.limit)
          .lean(),
        Debt.countDocuments(query)
      ]);

      this.logOperation('Debts retrieved', {
        filters,
        pagination: paginationData,
        resultCount: debts.length,
        totalCount: total
      });

      return this.createPaginationResponse(debts, total, paginationData.page, paginationData.limit);
    }, 'getDebts', { filters, pagination });
  }

  /**
   * Qarz statistikasini olish
   */
  async getDebtStats(filters = {}) {
    return this.executeOperation(async () => {
      const { type } = filters;
      const typeFilter = type ? { type } : {};

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const stats = await Debt.aggregate([
        { $match: typeFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
            },
            pendingApproval: {
              $sum: { $cond: [{ $eq: ['$status', 'pending_approval'] }, 1, 0] }
            },
            paid: {
              $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
            },
            blacklist: {
              $sum: { $cond: [{ $eq: ['$status', 'blacklist'] }, 1, 0] }
            },
            overdue: {
              $sum: { 
                $cond: [
                  { 
                    $and: [
                      { $lt: ['$dueDate', today] },
                      { $ne: ['$status', 'paid'] }
                    ]
                  }, 
                  1, 
                  0
                ] 
              }
            },
            todayDue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$dueDate', today] },
                      { $lt: ['$dueDate', tomorrow] },
                      { $ne: ['$status', 'paid'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            totalAmount: {
              $sum: { $subtract: ['$amount', '$paidAmount'] }
            },
            totalPaid: { $sum: '$paidAmount' },
            averageAmount: { $avg: '$amount' }
          }
        }
      ]);

      const result = stats[0] || {
        total: 0,
        approved: 0,
        pendingApproval: 0,
        paid: 0,
        blacklist: 0,
        overdue: 0,
        todayDue: 0,
        totalAmount: 0,
        totalPaid: 0,
        averageAmount: 0
      };

      this.logOperation('Debt stats calculated', { ...result, filters });
      return result;
    }, 'getDebtStats', { filters });
  }

  /**
   * Mijozning qarzlar tarixini olish
   */
  async getCustomerDebts(customerId, pagination = {}) {
    return this.executeOperation(async () => {
      const { page = 1, limit = 20 } = pagination;
      const paginationData = this.validatePagination(page, limit);

      // Mijoz mavjudligini tekshirish
      const customer = await Customer.findById(customerId);
      if (!customer) {
        throw this.createNotFoundError('Mijoz', customerId);
      }

      // Qarzlar tarixini olish
      const [debts, total] = await Promise.all([
        Debt.find({ customer: customerId })
          .select('amount paidAmount dueDate status description type payments createdAt')
          .sort({ createdAt: -1 })
          .skip(paginationData.skip)
          .limit(paginationData.limit)
          .lean(),
        Debt.countDocuments({ customer: customerId })
      ]);

      this.logOperation('Customer debts retrieved', {
        customerId,
        customerName: customer.name,
        pagination: paginationData,
        resultCount: debts.length,
        totalCount: total
      });

      return {
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          totalDebt: customer.debt
        },
        ...this.createPaginationResponse(debts, total, paginationData.page, paginationData.limit)
      };
    }, 'getCustomerDebts', { customerId, pagination });
  }

  /**
   * Qarzni yangilash
   */
  async updateDebt(debtId, updateData, user) {
    return this.executeOperation(async () => {
      const debt = await Debt.findById(debtId);
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      const { type, customer, creditorName, amount, dueDate, description, collateral } = updateData;

      // Agar receivable bo'lsa va mijoz o'zgargan bo'lsa, eski mijozdan qarzni ayirish
      if (debt.type === 'receivable' && debt.customer) {
        const oldRemaining = debt.amount - debt.paidAmount;
        const newRemaining = amount - debt.paidAmount;
        const diff = newRemaining - oldRemaining;
        
        if (diff !== 0) {
          await Customer.findByIdAndUpdate(debt.customer, { $inc: { debt: diff } });
        }
      }

      // Ma'lumotlarni yangilash
      debt.amount = amount;
      debt.dueDate = dueDate;
      debt.description = description;
      debt.collateral = collateral;

      if (type === 'payable') {
        debt.creditorName = creditorName;
      } else {
        debt.customer = customer;
      }

      await debt.save();

      this.logOperation('Debt updated', {
        debtId,
        amount,
        type: debt.type,
        userId: user._id
      });

      return {
        success: true,
        debt
      };
    }, 'updateDebt', { debtId, amount: updateData.amount, userId: user._id });
  }

  /**
   * Qarzni o'chirish
   */
  async deleteDebt(debtId, user) {
    return this.executeOperation(async () => {
      const debt = await Debt.findById(debtId).populate('customer', 'name phone');
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      // Agar qarz tasdiqlangan bo'lsa, mijozning umumiy qarzidan ayirish
      if (debt.status === 'approved' && debt.customer) {
        const remainingAmount = debt.amount - debt.paidAmount;
        await Customer.findByIdAndUpdate(debt.customer._id, {
          $inc: { debt: -remainingAmount }
        });
      }

      await Debt.findByIdAndDelete(debtId);

      this.logOperation('Debt deleted', {
        debtId,
        customerName: debt.customer?.name,
        amount: debt.amount,
        userId: user._id
      });

      return {
        success: true,
        message: 'Qarz o\'chirildi'
      };
    }, 'deleteDebt', { debtId, userId: user._id });
  }

  /**
   * Qarzga muddat berish
   */
  async extendDebt(debtId, days, user) {
    return this.executeOperation(async () => {
      if (!days || days <= 0) {
        throw this.createValidationError('Noto\'g\'ri kun soni', 'days');
      }

      const debt = await Debt.findById(debtId);
      if (!debt) {
        throw this.createNotFoundError('Qarz', debtId);
      }

      if (debt.status === 'paid') {
        throw this.createBusinessError('To\'langan qarzga muddat berib bo\'lmaydi');
      }

      // Maksimal 3 marta muddat berish mumkin
      if (debt.extensionCount >= 3) {
        throw this.createBusinessError('Maksimal 3 marta muddat berish mumkin');
      }

      // Dastlabki muddatni saqlash (birinchi marta muddat berilganda)
      if (!debt.originalDueDate) {
        debt.originalDueDate = debt.dueDate;
      }

      // Yangi muddatni hisoblash
      const currentDueDate = new Date(debt.dueDate);
      currentDueDate.setDate(currentDueDate.getDate() + days);

      debt.dueDate = currentDueDate;
      debt.extensionCount = (debt.extensionCount || 0) + 1;
      debt.extensionDays = (debt.extensionDays || 0) + days;
      debt.lastExtensionAt = new Date();

      // Agar qarz muddati o'tgan bo'lsa, approved holatiga qaytarish
      if (debt.status === 'overdue') {
        debt.status = 'approved';
      }

      await debt.save();

      // Populate qilib qaytarish
      if (debt.customer) {
        await debt.populate('customer', 'name phone');
      }

      this.logOperation('Debt extended', {
        debtId,
        days,
        newDueDate: debt.dueDate,
        extensionCount: debt.extensionCount,
        userId: user._id
      });

      return {
        success: true,
        debt
      };
    }, 'extendDebt', { debtId, days, userId: user._id });
  }

  /**
   * Noma'lum mijozli qarzlarni o'chirish
   */
  async cleanupUnknownDebts(user) {
    return this.executeOperation(async () => {
      // customer maydoni null yoki mavjud bo'lmagan qarzlarni topish
      const unknownDebts = await Debt.find({
        $or: [
          { customer: null },
          { customer: { $exists: false } }
        ]
      });

      if (unknownDebts.length === 0) {
        return {
          success: true,
          message: 'Noma\'lum mijozli qarzlar yo\'q',
          deletedCount: 0
        };
      }

      // Qarzlarni o'chirish
      const result = await Debt.deleteMany({
        $or: [
          { customer: null },
          { customer: { $exists: false } }
        ]
      });

      this.logOperation('Unknown debts cleaned up', {
        deletedCount: result.deletedCount,
        userId: user._id
      });

      return {
        success: true,
        message: `${result.deletedCount} ta noma'lum qarz o'chirildi`,
        deletedCount: result.deletedCount
      };
    }, 'cleanupUnknownDebts', { userId: user._id });
  }
}

module.exports = DebtService;