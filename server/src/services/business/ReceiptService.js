const BaseService = require('./BaseService');
const Receipt = require('../../models/Receipt');
const Product = require('../../models/Product');
const Customer = require('../../models/Customer');
const User = require('../../models/User');
const Debt = require('../../models/Debt');

/**
 * Receipt Service
 * Chek bilan bog'liq barcha business logic
 */
class ReceiptService extends BaseService {
  constructor() {
    super('ReceiptService');
  }

  /**
   * Mahsulot miqdorlarini tekshirish
   */
  async validateProductAvailability(items) {
    const validationErrors = [];

    for (const item of items) {
      const product = await Product.findById(item.productId || item.product);
      
      if (!product) {
        validationErrors.push(`Mahsulot topilmadi: ${item.name}`);
        continue;
      }

      if (product.quantity < item.quantity) {
        validationErrors.push(
          `Yetarli mahsulot yo'q: ${item.name}. Mavjud: ${product.quantity}, Kerak: ${item.quantity}`
        );
      }
    }

    if (validationErrors.length > 0) {
      throw this.createValidationError(validationErrors.join('; '));
    }

    return true;
  }

  /**
   * Jami summani hisoblash
   */
  calculateTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw this.createValidationError('Items bo\'sh bo\'lmasligi kerak');
    }

    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 0;
      return sum + (price * quantity);
    }, 0);
  }

  /**
   * Bonus miqdorini hisoblash
   */
  calculateBonus(amount, bonusPercentage) {
    if (!amount || !bonusPercentage) return 0;
    return (amount * bonusPercentage) / 100;
  }

  /**
   * Mahsulot miqdorlarini yangilash
   */
  async updateProductQuantities(items, isReturn = false) {
    const operations = [];

    for (const item of items) {
      const quantityChange = isReturn ? item.quantity : -item.quantity;
      operations.push(
        Product.findByIdAndUpdate(
          item.productId || item.product,
          { $inc: { quantity: quantityChange } }
        )
      );
    }

    await Promise.all(operations);
    this.logOperation('Product quantities updated', { 
      itemsCount: items.length, 
      isReturn 
    });
  }

  /**
   * Kassir bonusini yangilash
   */
  async updateHelperBonus(helperId, totalAmount, bonusAmount) {
    if (!helperId || !bonusAmount) return;

    await User.findByIdAndUpdate(helperId, {
      $inc: {
        totalEarnings: totalAmount,
        totalBonus: bonusAmount
      }
    });

    this.logOperation('Helper bonus updated', {
      helperId,
      totalAmount,
      bonusAmount
    });
  }

  /**
   * Helper receipt yaratish
   */
  async createHelperReceipt(data, user) {
    return this.executeOperation(async () => {
      const { items, customer, customerName, isRegularCustomer } = data;

      // Ruxsatni tekshirish
      if (!['cashier', 'admin'].includes(user.role)) {
        throw this.createPermissionError('Faqat kassir va admin ruxsat etilgan');
      }

      // Mahsulot mavjudligini tekshirish
      await this.validateProductAvailability(items);

      // Jami summani hisoblash
      const totalAmount = this.calculateTotal(items);

      // Chek yaratish
      const receipt = new Receipt({
        items: items.map(item => ({
          product: item.productId,
          name: item.name,
          code: item.code || '',
          price: item.price,
          quantity: item.quantity
        })),
        total: totalAmount,
        paymentMethod: 'cash',
        status: 'completed',
        isReturn: false,
        createdBy: user._id,
        helperId: user._id,
        isPaid: false,
        receiptType: 'helper_receipt',
        customer: customer || null,
        customerName: customerName || (isRegularCustomer ? 'Oddiy mijoz' : null),
        isRegularCustomer: isRegularCustomer || false
      });

      await receipt.save();

      // Mahsulot miqdorlarini kamaytirish
      await this.updateProductQuantities(items);

      // Kassir bonusini hisoblash va yangilash
      const kassir = await User.findById(user._id);
      if (kassir && kassir.bonusPercentage > 0) {
        const bonusAmount = this.calculateBonus(totalAmount, kassir.bonusPercentage);
        await this.updateHelperBonus(user._id, totalAmount, bonusAmount);
      }

      // Socket.IO notification
      if (global.io) {
        global.io.emit('receipt:created', {
          _id: receipt._id,
          total: receipt.total,
          helperId: receipt.helperId,
          createdAt: receipt.createdAt
        });
      }

      return {
        success: true,
        receipt: {
          _id: receipt._id,
          items: receipt.items,
          total: receipt.total,
          helperId: receipt.helperId,
          createdAt: receipt.createdAt
        }
      };
    }, 'createHelperReceipt', { userId: user._id, itemsCount: items.length });
  }

  /**
   * Kassa receipt yaratish
   */
  async createKassaReceipt(data) {
    return this.executeOperation(async () => {
      const { 
        items, 
        total, 
        paymentMethod, 
        customer, 
        receiptNumber, 
        paidAmount, 
        remainingAmount 
      } = data;

      // Mahsulot mavjudligini tekshirish
      await this.validateProductAvailability(items);

      const receiptData = {
        items: items.map(item => ({
          product: item.product,
          name: item.name,
          code: item.code,
          price: item.price,
          quantity: item.quantity,
          paymentBreakdown: item.paymentBreakdown || { cash: 0, click: 0, card: 0 }
        })),
        total,
        paymentMethod,
        customer: customer || null,
        receiptNumber: receiptNumber || `CHK-${Date.now()}`,
        paidAmount: paidAmount || total,
        remainingAmount: remainingAmount || 0,
        status: 'completed',
        isPaid: (paidAmount || total) >= total,
        createdBy: new (require('mongoose')).Types.ObjectId(),
        createdAt: new Date()
      };

      const receipt = new Receipt(receiptData);
      await receipt.save();

      // Mahsulot miqdorlarini yangilash
      await this.updateProductQuantities(items);

      return receipt;
    }, 'createKassaReceipt', { itemsCount: items.length, total });
  }

  /**
   * Receipt ni o'chirish (faqat helper receipt)
   */
  async deleteHelperReceipt(receiptId, user) {
    return this.executeOperation(async () => {
      // Chekni topish
      const receipt = await Receipt.findById(receiptId);
      
      if (!receipt) {
        throw this.createNotFoundError('Chek', receiptId);
      }

      // Faqat helper_receipt turini o'chirish mumkin
      if (receipt.receiptType !== 'helper_receipt') {
        throw this.createBusinessError('Faqat xodim chekini o\'chirish mumkin');
      }

      // Mahsulot miqdorlarini qaytarish (rollback)
      await this.updateProductQuantities(receipt.items, true);

      // Agar xodimga bonus berilgan bo'lsa, uni qaytarish
      if (receipt.helperId) {
        const helper = await User.findById(receipt.helperId);
        if (helper && helper.bonusPercentage > 0) {
          const bonusAmount = this.calculateBonus(receipt.total, helper.bonusPercentage);
          
          await User.findByIdAndUpdate(receipt.helperId, {
            $inc: {
              totalEarnings: -receipt.total,
              totalBonus: -bonusAmount
            }
          });

          this.logOperation('Helper bonus reverted', {
            helperId: receipt.helperId,
            bonusAmount
          });
        }
      }

      // Chekni o'chirish
      await Receipt.findByIdAndDelete(receiptId);

      return {
        success: true,
        message: 'Chek muvaffaqiyatli o\'chirildi',
        deletedReceipt: {
          _id: receipt._id,
          receiptNumber: receipt.receiptNumber,
          total: receipt.total
        }
      };
    }, 'deleteHelperReceipt', { receiptId, userId: user._id });
  }

  /**
   * Helper statistikasini olish
   */
  async getHelpersStats() {
    return this.executeOperation(async () => {
      // Bitta aggregate query bilan barcha statistikani olish
      const receiptsStats = await Receipt.aggregate([
        {
          $match: {
            receiptType: 'helper_receipt'
          }
        },
        {
          $group: {
            _id: '$helperId',
            receiptCount: { $sum: 1 },
            totalAmount: { $sum: '$total' }
          }
        }
      ]);

      // Stats map qilish
      const statsMap = {};
      receiptsStats.forEach(stat => {
        if (stat._id) {
          statsMap[stat._id.toString()] = {
            receiptCount: stat.receiptCount,
            totalAmount: stat.totalAmount
          };
        }
      });

      // Barcha kassirlarni olish
      const helpers = await User.find({
        role: { $in: ['cashier', 'helper'] }
      }).select('_id name role bonusPercentage totalEarnings totalBonus');

      // Statistika bilan birlashtirish
      const helpersWithStats = helpers.map(helper => {
        const stats = statsMap[helper._id.toString()] || { receiptCount: 0, totalAmount: 0 };
        return {
          _id: helper._id,
          name: helper.name,
          role: helper.role,
          receiptCount: stats.receiptCount,
          totalAmount: stats.totalAmount,
          bonusPercentage: helper.bonusPercentage || 0,
          totalEarnings: helper.totalEarnings || 0,
          totalBonus: helper.totalBonus || 0
        };
      });

      return helpersWithStats;
    }, 'getHelpersStats');
  }

  /**
   * Receipt ni ID bo'yicha olish
   */
  async getReceiptById(receiptId) {
    return this.executeOperation(async () => {
      const receipt = await Receipt.findById(receiptId)
        .populate('customer', 'name phone')
        .populate('createdBy', 'name role')
        .populate('helperId', 'name role')
        .populate('items.product', 'name code images')
        .lean();

      if (!receipt) {
        throw this.createNotFoundError('Chek', receiptId);
      }

      // Format receipt data
      return {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber || `CHK-${receipt._id.toString().slice(-6).toUpperCase()}`,
        items: receipt.items.map(item => ({
          product: {
            _id: item.product._id,
            name: item.product.name || item.name,
            code: item.product.code || item.code,
            images: item.product.images || []
          },
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: receipt.total,
        paymentMethod: receipt.paymentMethod,
        customer: receipt.customer ? {
          name: receipt.customer.name,
          phone: receipt.customer.phone
        } : (receipt.customerName ? {
          name: receipt.customerName
        } : null),
        createdBy: receipt.createdBy ? {
          name: receipt.createdBy.name,
          role: receipt.createdBy.role
        } : null,
        createdAt: receipt.createdAt,
        status: receipt.status
      };
    }, 'getReceiptById', { receiptId });
  }
}

module.exports = ReceiptService;