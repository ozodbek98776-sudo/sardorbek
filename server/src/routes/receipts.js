const express = require('express');
const Receipt = require('../models/Receipt');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const { auth, authorize } = require('../middleware/auth');
const telegramService = require('../services/telegramService');
// const { getPOSBot } = require('../telegram.bot'); // POS Bot import qilish - vaqtincha o'chirildi

const router = express.Router();

// Kassir cheklari uchun yangi endpoint - to'lovsiz chek yaratish
router.post('/helper-receipt', auth, async (req, res) => {
  try {
    const { items } = req.body;

    // Faqat kassir va admin ruxsat etiladi
    if (!['cashier', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat etilmagan' });
    }

    // Mahsulot miqdorlarini tekshirish
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(400).json({ message: `Mahsulot topilmadi: ${item.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Yetarli mahsulot yo'q: ${item.name}. Mavjud: ${product.quantity}, Kerak: ${item.quantity}`
        });
      }
    }

    // Jami summani hisoblash
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
      paymentMethod: 'cash', // Default
      status: 'completed',
      isReturn: false,
      createdBy: req.user._id,
      helperId: req.user._id, // Chekni chiqargan kassir
      isPaid: false, // To'lov yo'q
      receiptType: 'helper_receipt' // Kassir cheki
    });

    await receipt.save();

    // Mahsulot miqdorlarini kamaytirish
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Kassirga bonus hisoblash va qo'shish
    const kassir = await require('../models/User').findById(req.user._id);
    if (kassir && kassir.bonusPercentage > 0) {
      const bonusAmount = (totalAmount * kassir.bonusPercentage) / 100;

      // Kassir statistikasini yangilash
      await require('../models/User').findByIdAndUpdate(req.user._id, {
        $inc: {
          totalEarnings: totalAmount,
          totalBonus: bonusAmount
        }
      });

      console.log(`Kassir ${kassir.name} ga ${bonusAmount} so'm bonus qo'shildi (${kassir.bonusPercentage}% dan ${totalAmount} so'm)`);
    }

    res.status(201).json({
      success: true,
      receipt: {
        _id: receipt._id,
        items: receipt.items,
        total: receipt.total,
        helperId: receipt.helperId,
        createdAt: receipt.createdAt
      }
    });
  } catch (error) {
    console.error('Helper receipt creation error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Atomic transaction endpoint - print va database o'zgarishlarini birgalikda amalga oshirish
router.post('/kassa-atomic', async (req, res) => {
  try {
    const { items, total, paymentMethod, customer, receiptNumber, printSuccess } = req.body;

    // Print muvaffaqiyatsiz bo'lsa, transaction bekor qilinadi
    if (!printSuccess) {
      return res.status(400).json({
        success: false,
        message: 'Print muvaffaqiyatsiz - transaction bekor qilindi'
      });
    }

    // Mahsulot miqdorlarini tekshirish
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Mahsulot topilmadi: ${item.name}`
        });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Yetarli mahsulot yo'q: ${item.name}. Mavjud: ${product.quantity}, Kerak: ${item.quantity}`
        });
      }
    }

    // Atomic transaction boshlanishi
    const receiptData = {
      items: items.map(item => ({
        product: item.product,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.quantity
      })),
      total,
      paymentMethod,
      customer: customer || null,
      receiptNumber: receiptNumber || `CHK-${Date.now()}`,
      status: 'completed',
      isPaid: true,
      printStatus: 'printed', // Print muvaffaqiyatli
      createdAt: new Date()
    };

    const receipt = new Receipt(receiptData);
    await receipt.save();

    // Mahsulot miqdorlarini yangilash
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Mijoz statistikasini yangilash
    if (customer) {
      try {
        const customerData = await Customer.findById(customer);

        if (customerData) {
          // Ball hisoblash - har 1,000,000 = 1 ball
          const earnedBalls = Math.floor(total / 1000000);
          
          // Statistikani va ballni yangilash
          await Customer.findByIdAndUpdate(
            customer,
            { $inc: { totalPurchases: total, totalBalls: earnedBalls } }
          );

          // Qarz to'lovi logikasi (agar kerak bo'lsa)
          if (customerData.debt > 0) {
            const paymentAmount = Math.min(total, customerData.debt);

            await Customer.findByIdAndUpdate(
              customer,
              { $inc: { debt: -paymentAmount } }
            );

            console.log(`Customer ${customerData.name}: ${paymentAmount} so'm qarzdan ayrildi`);
          }

          // Faqat mijozga POS Bot orqali chek yuborish
          if (customerData.telegramChatId) {
            try {
              const updatedCustomer = await Customer.findById(customer);

              // Faqat POS Bot orqali yuborish - vaqtincha o'chirildi
              /*
              const posBot = getPOSBot();
              /*
              if (posBot) {
                await posBot.sendReceiptToCustomer({
                  customer: updatedCustomer,
                  items: items,
                  total: total,
                  paymentMethod: paymentMethod,
                  receiptNumber: receiptNumber || `CHK-${Date.now()}`
                });
                console.log(`✅ Atomic POS Bot: Chek ${customerData.name} ga yuborildi`);
              } else {
                console.log(`❌ Atomic: POS Bot mavjud emas`);
              }
              */
            } catch (telegramError) {
              console.error('❌ Atomic POS Bot xatosi:', telegramError);
            }
          } else {
            console.log(`❌ Atomic: Mijoz ${customerData.name} da telegram ID yo'q`);
          }
        }
      } catch (customerError) {
        console.error('Customer processing error:', customerError);
      }
    }

    res.status(201).json({
      success: true,
      receipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        total: receipt.total,
        items: receipt.items,
        createdAt: receipt.createdAt
      }
    });

  } catch (error) {
    console.error('Atomic transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Atomic transaction xatosi',
      error: error.message
    });
  }
});

// Kassa uchun chek yaratish (auth talab qilmaydi)
router.post('/kassa', async (req, res) => {
  try {
    const { items, total, paymentMethod, customer, receiptNumber, paidAmount, remainingAmount } = req.body;

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
      createdBy: new (require('mongoose')).Types.ObjectId(), // Dummy user ID for kassa
      createdAt: new Date()
    };

    const receipt = new Receipt(receiptData);
    await receipt.save();

    // Mahsulot miqdorlarini yangilash
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: -item.quantity } }
      );
    }

    // Mijoz statistikasini yangilash va Telegram chek yuborish
    if (customer) {
      try {
        // Mijoz ma'lumotlarini olish
        const customerData = await Customer.findById(customer);

        if (customerData) {
          // Ball hisoblash - har 1,000,000 = 1 ball
          const earnedBalls = Math.floor(total / 1000000);
          
          // Statistikani va ballni yangilash
          await Customer.findByIdAndUpdate(
            customer,
            { $inc: { totalPurchases: total, totalBalls: earnedBalls } }
          );

          // Qoldiq summa qarz sifatida qo'shish (agar to'liq to'lanmagan bo'lsa)
          if (remainingAmount && remainingAmount > 0) {
            await Customer.findByIdAndUpdate(
              customer,
              { $inc: { debt: remainingAmount } }
            );
            console.log(`✅ Mijoz ${customerData.name} ga ${remainingAmount} so'm qarz qo'shildi`);
          }

          // Agar mijozning qarzi bo'lsa, xarid summasini qarzdan ayirish
          if (customerData.debt > 0) {
            const paymentAmount = Math.min(paidAmount || total, customerData.debt); // Qarzdan ko'p ayrib bo'lmaydi

            // Mijozning umumiy qarzini kamaytirish
            await Customer.findByIdAndUpdate(
              customer,
              { $inc: { debt: -paymentAmount } }
            );

            // Qarz to'lovlarini topish va yangilash
            const debts = await require('../models/Debt').find({
              customer: customer,
              type: 'receivable',
              status: 'approved',
              $expr: { $lt: ['$paidAmount', '$amount'] } // To'liq to'lanmagan qarzlar
            }).sort({ createdAt: 1 }); // Eng eski qarzdan boshlab

            let remainingPayment = paymentAmount;

            for (const debt of debts) {
              if (remainingPayment <= 0) break;

              const debtBalance = debt.amount - debt.paidAmount;
              const paymentForThisDebt = Math.min(remainingPayment, debtBalance);

              // Qarzga to'lov qo'shish
              debt.payments.push({
                amount: paymentForThisDebt,
                method: paymentMethod,
                date: new Date(),
                note: 'Xarid orqali avtomatik to\'lov'
              });

              debt.paidAmount += paymentForThisDebt;

              if (debt.paidAmount >= debt.amount) {
                debt.status = 'paid';
              }

              await debt.save();
              remainingPayment -= paymentForThisDebt;
            }

            console.log(`Customer ${customerData.name}: ${paymentAmount} so'm qarzdan ayrildi`);

            // Mijozga qarz to'lovi haqida Telegram xabari
            if (customerData.telegramChatId) {
              try {
                // Yangilangan qarz miqdorini olish
                const updatedCustomer = await Customer.findById(customer);

                await telegramService.sendDebtPaymentToCustomer({
                  customer: customerData,
                  amount: paymentAmount,
                  remainingDebt: updatedCustomer.debt
                });

                console.log(`Debt payment notification sent to ${customerData.name}`);
              } catch (debtNotificationError) {
                console.error('Debt payment notification error:', debtNotificationError);
              }
            }
          }

          // Mijozga telegram orqali chek yuborish
          if (customerData.telegramChatId) {
            console.log(`Sending receipt to customer ${customerData.name} via Telegram...`);

            // Yangilangan mijoz ma'lumotlarini olish (qarz kamaygandan keyin)
            const updatedCustomer = await Customer.findById(customer);

            try {
              // TelegramService orqali POS Bot bilan chek yuborish
              await telegramService.sendReceiptToCustomerViaPOSBot({
                customer: updatedCustomer,
                items: items,
                total: total,
                paidAmount: paidAmount || total,
                remainingAmount: remainingAmount || 0,
                paymentMethod: paymentMethod,
                receiptNumber: receiptNumber || `CHK-${Date.now()}`
              });
              console.log(`✅ POS Bot: Chek ${customerData.name} ga yuborildi`);
            } catch (telegramError) {
              console.error('❌ POS Bot chek yuborishda xatolik:', telegramError);
            }
          } else {
            console.log(`❌ Mijoz ${customerData.name} da telegram ID yo'q`);
          }
        }
      } catch (telegramError) {
        console.error('Customer processing error:', telegramError);
        // Xatolik chek yaratishni to'xtatmasin
      }
    }

    res.status(201).json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassirlar ro'yxati va ularning cheklari statistikasi - OPTIMIZED
router.get('/helpers-stats', auth, authorize('admin'), async (req, res) => {
  try {
    const User = require('../models/User');
    
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
      statsMap[stat._id.toString()] = {
        receiptCount: stat.receiptCount,
        totalAmount: stat.totalAmount
      };
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

    res.json(helpersWithStats);
  } catch (error) {
    console.error('Helpers stats error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Muayyan kassirning barcha cheklari - CARD VIEW UCHUN
router.get('/helper/:helperId/receipts', auth, authorize('admin'), async (req, res) => {
  try {
    const { helperId } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    const receipts = await Receipt.find({
      helperId: helperId,
      receiptType: 'helper_receipt',
      ...dateFilter
    })
      .populate('helperId', 'name role')
      .populate('items.product', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Performance optimization

    const total = await Receipt.countDocuments({
      helperId: helperId,
      receiptType: 'helper_receipt',
      ...dateFilter
    });

    // Card format uchun ma'lumotlarni formatlash
    const formattedReceipts = receipts.map(receipt => ({
      _id: receipt._id,
      receiptNumber: receipt.receiptNumber || `CHK-${receipt._id.toString().slice(-6)}`,
      items: receipt.items.map(item => ({
        name: item.name,
        code: item.code,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      })),
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      isPaid: receipt.isPaid,
      status: receipt.status,
      helper: {
        _id: receipt.helperId._id,
        name: receipt.helperId.name,
        role: receipt.helperId.role
      },
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt
    }));

    res.json({
      success: true,
      receipts: formattedReceipts,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Helper receipts error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Kassa paneli uchun cheklar ro'yxati - hodimlar tomonidan yaratilgan cheklar
router.get('/kassa', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Faqat kassir va admin ko'rishi mumkin
    if (!['cashier', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat etilmagan' });
    }

    // Date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Hodimlar tomonidan yaratilgan cheklar
    const receipts = await Receipt.find({
      receiptType: 'helper_receipt',
      ...dateFilter
    })
      .populate('createdBy', 'name role')
      .populate('items.product', 'name code')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Receipt.countDocuments({
      receiptType: 'helper_receipt',
      ...dateFilter
    });

    // Format data for kassa panel
    const formattedReceipts = receipts.map(receipt => ({
      _id: receipt._id,
      receiptNumber: receipt.receiptNumber || `CHK-${receipt._id.toString().slice(-6).toUpperCase()}`,
      items: receipt.items.map(item => ({
        product: {
          _id: item.product?._id || item.product,
          name: item.name,
          code: item.code || ''
        },
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount: receipt.total,
      paymentMethod: receipt.paymentMethod || 'cash',
      customer: receipt.customer || null,
      createdBy: {
        name: receipt.createdBy?.name || 'Noma\'lum',
        role: receipt.createdBy?.role || 'helper'
      },
      createdAt: receipt.createdAt,
      status: receipt.status || 'completed'
    }));

    res.json(formattedReceipts);
  } catch (error) {
    console.error('Kassa receipts error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

// Barcha xodimlar cheklari - CARD VIEW
router.get('/all-helper-receipts', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, helperId, startDate, endDate, search } = req.query;

    // Filter yaratish
    const filter = { receiptType: 'helper_receipt' };
    
    if (helperId) {
      filter.helperId = helperId;
    }
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Chek raqami yoki mahsulot nomi bo'yicha qidiruv
    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }

    const receipts = await Receipt.find(filter)
      .populate('helperId', 'name role bonusPercentage')
      .populate('items.product', 'name code images')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Receipt.countDocuments(filter);

    // Card format uchun ma'lumotlarni formatlash
    const formattedReceipts = receipts.map(receipt => ({
      _id: receipt._id,
      receiptNumber: receipt.receiptNumber || `CHK-${receipt._id.toString().slice(-6).toUpperCase()}`,
      items: receipt.items.map(item => ({
        _id: item._id,
        name: item.name,
        code: item.code,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price,
        image: item.product?.images?.[0] || null
      })),
      itemsCount: receipt.items.length,
      totalQuantity: receipt.items.reduce((sum, item) => sum + item.quantity, 0),
      total: receipt.total,
      paymentMethod: receipt.paymentMethod,
      isPaid: receipt.isPaid,
      status: receipt.status,
      helper: receipt.helperId ? {
        _id: receipt.helperId._id,
        name: receipt.helperId.name,
        role: receipt.helperId.role,
        bonusPercentage: receipt.helperId.bonusPercentage || 0
      } : null,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
      // Bonus hisoblash
      bonusAmount: receipt.helperId?.bonusPercentage 
        ? (receipt.total * receipt.helperId.bonusPercentage) / 100 
        : 0
    }));

    res.json({
      success: true,
      receipts: formattedReceipts,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        limit: parseInt(limit)
      },
      summary: {
        totalReceipts: total,
        totalAmount: receipts.reduce((sum, r) => sum + r.total, 0),
        totalItems: receipts.reduce((sum, r) => sum + r.items.length, 0)
      }
    });
  } catch (error) {
    console.error('All helper receipts error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Xodim chekini o'chirish - FAQAT ADMIN
router.delete('/helper-receipt/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Chekni topish
    const receipt = await Receipt.findById(id);
    
    if (!receipt) {
      return res.status(404).json({ 
        success: false, 
        message: 'Chek topilmadi' 
      });
    }

    // Faqat helper_receipt turini o'chirish mumkin
    if (receipt.receiptType !== 'helper_receipt') {
      return res.status(403).json({ 
        success: false, 
        message: 'Faqat xodim chekini o\'chirish mumkin' 
      });
    }

    // Mahsulot miqdorlarini qaytarish (rollback)
    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } } // Qaytarib qo'shish
      );
    }

    // Agar xodimga bonus berilgan bo'lsa, uni qaytarish
    if (receipt.helperId) {
      const helper = await require('../models/User').findById(receipt.helperId);
      if (helper && helper.bonusPercentage > 0) {
        const bonusAmount = (receipt.total * helper.bonusPercentage) / 100;
        
        await require('../models/User').findByIdAndUpdate(receipt.helperId, {
          $inc: {
            totalEarnings: -receipt.total,
            totalBonus: -bonusAmount
          }
        });

        console.log(`Xodim ${helper.name} dan ${bonusAmount} so'm bonus ayrildi`);
      }
    }

    // Chekni o'chirish
    await Receipt.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'Chek muvaffaqiyatli o\'chirildi',
      deletedReceipt: {
        _id: receipt._id,
        receiptNumber: receipt.receiptNumber,
        total: receipt.total
      }
    });

  } catch (error) {
    console.error('Delete helper receipt error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server xatosi', 
      error: error.message 
    });
  }
});

// Chekni o'chirish - Kassa va Admin uchun
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Faqat kassir va admin ruxsat etiladi
    if (!['cashier', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Ruxsat etilmagan' });
    }

    // Chekni topish
    const receipt = await Receipt.findById(id);
    
    if (!receipt) {
      return res.status(404).json({ message: 'Chek topilmadi' });
    }

    // Faqat helper_receipt turini o'chirish mumkin
    if (receipt.receiptType !== 'helper_receipt') {
      return res.status(403).json({ message: 'Faqat xodim chekini o\'chirish mumkin' });
    }

    // Mahsulot miqdorlarini qaytarish (rollback)
    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { quantity: item.quantity } }
      );
    }

    // Agar xodimga bonus berilgan bo'lsa, uni qaytarish
    if (receipt.helperId) {
      const helper = await require('../models/User').findById(receipt.helperId);
      if (helper && helper.bonusPercentage > 0) {
        const bonusAmount = (receipt.total * helper.bonusPercentage) / 100;
        
        await require('../models/User').findByIdAndUpdate(receipt.helperId, {
          $inc: {
            totalEarnings: -receipt.total,
            totalBonus: -bonusAmount
          }
        });

        console.log(`Xodim ${helper.name} dan ${bonusAmount} so'm bonus ayrildi`);
      }
    }

    // Chekni o'chirish
    await Receipt.findByIdAndDelete(id);

    res.json({ 
      success: true, 
      message: 'Chek muvaffaqiyatli o\'chirildi'
    });

  } catch (error) {
    console.error('Delete receipt error:', error);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    const receipts = await Receipt.find(query)
      .populate('createdBy', 'name role')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(receipts);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

/**
 * Bulk sync endpoint for offline sales
 * Receives array of sales from offline POS
 * IMPORTANT: This endpoint must be idempotent - handle duplicate offlineIds
 */
router.post('/bulk', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const { sales } = req.body;

    if (!sales || !Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ success: false, message: 'No sales provided' });
    }

    const results = [];
    const errors = [];

    for (const sale of sales) {
      try {
        // Check if this offline sale was already synced (by offlineId in metadata)
        const existingReceipt = await Receipt.findOne({ 'metadata.offlineId': sale.offlineId });
        if (existingReceipt) {
          // Already synced, skip but mark as success
          results.push({ offlineId: sale.offlineId, status: 'already_synced' });
          continue;
        }

        // Create receipt from offline sale
        const receipt = new Receipt({
          items: sale.items,
          total: sale.total,
          paymentMethod: sale.paymentMethod || 'cash',
          customer: sale.customer,
          status: 'completed',
          isReturn: sale.isReturn || false,
          createdBy: req.user._id,
          createdAt: sale.createdAt ? new Date(sale.createdAt) : new Date(),
          metadata: { offlineId: sale.offlineId, syncedAt: new Date() }
        });

        // Update product quantities (skip stock check for offline sales)
        for (const item of sale.items) {
          const quantityChange = sale.isReturn ? item.quantity : -item.quantity;
          await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
        }

        await receipt.save();
        results.push({ offlineId: sale.offlineId, status: 'synced', receiptId: receipt._id });

      } catch (itemError) {
        errors.push({ offlineId: sale.offlineId, error: itemError.message });
      }
    }

    // Return success even if some items failed - client will retry failed ones
    res.json({
      success: true,
      synced: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    console.log('📥 POST /receipts so\'rovi keldi');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('User:', req.user);
    
    const { items, total, paidAmount, cashAmount, cardAmount, paymentMethod, customer, isReturn } = req.body;
    const isHelper = req.user.role === 'helper';

    // To'langan summani hisoblash
    const actualPaidAmount = paidAmount || total;
    const debtAmount = total - actualPaidAmount;

    console.log(`💰 To'lov ma'lumotlari:`);
    console.log(`   - Jami: ${total} so'm`);
    console.log(`   - To'langan: ${actualPaidAmount} so'm`);
    console.log(`   - Qarz: ${debtAmount} so'm`);
    console.log(`   - Mijoz ID: ${customer || 'yo\'q'}`);

    // Check stock availability before sale (not for returns)
    if (!isReturn && !isHelper) {
      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          console.error(`❌ Mahsulot topilmadi: ${item.product}`);
          return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
        }
        if (product.quantity < item.quantity) {
          console.error(`❌ Yetarli mahsulot yo'q: ${product.name}`);
          return res.status(400).json({
            message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}`
          });
        }
      }
    }

    console.log('✅ Mahsulot tekshiruvi muvaffaqiyatli');

    const receipt = new Receipt({
      items,
      total,
      paidAmount: actualPaidAmount,
      cashAmount: cashAmount || 0,
      cardAmount: cardAmount || 0,
      paymentMethod,
      customer,
      status: isHelper ? 'pending' : 'completed',
      isReturn: isReturn || false,
      createdBy: req.user._id,
      receiptType: isHelper ? 'helper_receipt' : 'direct_sale' // Xodim cheki yoki to'g'ridan-to'g'ri sotuv
    });

    if (!isHelper) {
      for (const item of items) {
        // If return mode, add to stock; otherwise subtract
        const quantityChange = isReturn ? item.quantity : -item.quantity;
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: quantityChange } });
      }
    }

    await receipt.save();
    console.log(`✅ Chek saqlandi: ${receipt._id}`);

    // Agar qarz bo'lsa va mijoz tanlangan bo'lsa, qarzni yaratish yoki yangilash
    if (debtAmount > 0 && customer && !isReturn) {
      try {
        const Debt = require('../models/Debt');
        
        console.log(`📝 Qarz yaratish boshlandi:`);
        console.log(`   - Mijoz ID: ${customer}`);
        console.log(`   - Qarz summasi: ${debtAmount} so'm`);
        console.log(`   - Jami summa: ${total} so'm`);
        console.log(`   - To'langan: ${actualPaidAmount} so'm`);
        
        // Mijozni tekshirish
        const customerData = await Customer.findById(customer);
        if (!customerData) {
          console.error(`❌ Mijoz topilmadi: ${customer}`);
          throw new Error('Mijoz topilmadi');
        }
        console.log(`✅ Mijoz topildi: ${customerData.name} (${customerData.phone})`);
        
        // Mijozning mavjud qarzini tekshirish
        const existingDebts = await Debt.find({
          customer: customer,
          status: { $in: ['pending', 'approved', 'pending_approval'] }
        }).sort({ createdAt: -1 });

        console.log(`📊 Mavjud qarzlar soni: ${existingDebts.length}`);

        if (existingDebts && existingDebts.length > 0) {
          // Mavjud qarzga qo'shish
          const existingDebt = existingDebts[0];
          const oldAmount = existingDebt.amount;
          existingDebt.amount += debtAmount;
          existingDebt.description = `${existingDebt.description}\nChek #${receipt.receiptNumber || receipt._id}: +${debtAmount} so'm`;
          await existingDebt.save();
          
          console.log(`✅ Mavjud qarzga qo'shildi: ${oldAmount} + ${debtAmount} = ${existingDebt.amount} so'm`);
        } else {
          // Yangi qarz yaratish - dueDate 30 kun keyingi sana
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30); // 30 kun muddat
          
          console.log(`📅 Qarz muddati: ${dueDate.toLocaleDateString('uz-UZ')}`);
          
          const newDebt = new Debt({
            customer: customer,
            amount: debtAmount,
            paidAmount: 0,
            dueDate: dueDate,
            originalDueDate: dueDate,
            description: `Chek #${receipt.receiptNumber || receipt._id} uchun qarz`,
            type: 'receivable',
            status: 'approved', // Avtomatik tasdiqlangan
            createdBy: req.user._id
          });
          await newDebt.save();
          
          console.log(`✅ Yangi qarz yaratildi:`);
          console.log(`   - Qarz ID: ${newDebt._id}`);
          console.log(`   - Summa: ${debtAmount} so'm`);
          console.log(`   - Muddat: ${dueDate.toLocaleDateString('uz-UZ')}`);
          console.log(`   - Status: ${newDebt.status}`);
        }

        // Mijozning umumiy qarzini yangilash
        const customerBefore = await Customer.findById(customer);
        const oldDebt = customerBefore.debt || 0;
        
        await Customer.findByIdAndUpdate(customer, {
          $inc: { debt: debtAmount }
        });
        
        const customerAfter = await Customer.findById(customer);
        console.log(`✅ Mijoz qarzi yangilandi: ${oldDebt} + ${debtAmount} = ${customerAfter.debt} so'm`);
        console.log(`✅ Qarz yaratish muvaffaqiyatli tugadi!`);

      } catch (debtError) {
        console.error('❌ Qarz yaratishda xatolik:', debtError);
        console.error('Xatolik tafsilotlari:', debtError.message);
        console.error('Stack:', debtError.stack);
        // Qarz yaratish xatosi chek yaratishni to'xtatmasin
      }
    }

    // Send telegram notification if customer is selected
    if (customer && !isReturn) {
      try {
        const customerData = await Customer.findById(customer);
        if (customerData) {
          await telegramService.sendPurchaseNotification(
            customerData,
            items,
            total,
            paymentMethod
          );
        }
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
        // Don't fail the receipt creation if telegram fails
      }
    }

    console.log('✅ Chek muvaffaqiyatli yaratildi va javob yuborilmoqda');
    res.status(201).json(receipt);
  } catch (error) {
    console.error('❌❌❌ POST /receipts XATOSI ❌❌❌');
    console.error('Xato:', error);
    console.error('Xato xabari:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/approve', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    // Check stock availability before approving
    for (const item of receipt.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ message: `Tovar topilmadi: ${item.name}` });
      }
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          message: `Yetarli tovar yo'q: ${item.name}. Mavjud: ${product.quantity}, So'ralgan: ${item.quantity}`
        });
      }
    }

    receipt.status = 'approved';
    receipt.processedBy = req.user._id;

    for (const item of receipt.items) {
      await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
    }

    await receipt.save();
    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id/reject', auth, authorize('admin', 'cashier'), async (req, res) => {
  try {
    const receipt = await Receipt.findById(req.params.id);
    if (!receipt) return res.status(404).json({ message: 'Chek topilmadi' });
    if (receipt.status !== 'pending') return res.status(400).json({ message: 'Bu chek allaqachon ko\'rib chiqilgan' });

    receipt.status = 'rejected';
    receipt.processedBy = req.user._id;
    await receipt.save();

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
