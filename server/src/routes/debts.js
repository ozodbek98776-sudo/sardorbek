const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const serviceFactory = require('../services/business/ServiceFactory');
const { serviceWrapper } = require('../middleware/serviceErrorHandler');

const router = express.Router();

// Service larni olish
const debtService = serviceFactory.debt;

// Kassa uchun qarzlarni olish - faqat tasdiqlangan qarzlar
router.get('/kassa', auth, serviceWrapper(async (req, res) => {
  const filters = {
    status: req.query.status || 'approved',
    type: req.query.type
  };
  const result = await debtService.getDebts(filters);
  return result.data;
}));

// Kassa uchun qarz o'chirish
router.delete('/kassa/:id', auth, serviceWrapper(async (req, res) => {
  const result = await debtService.deleteDebt(req.params.id, req.user);
  return result;
}));

// Kassa uchun yangi qarz qo'shish
router.post('/kassa', auth, serviceWrapper(async (req, res) => {
  const result = await debtService.createDebt(req.body, req.user);
  return result;
}));

// Mijozning qarzlar tarixini olish
router.get('/customer/:customerId', serviceWrapper(async (req, res) => {
  const result = await debtService.getCustomerDebts(req.params.customerId);
  return result.data; // Return only the data array for backward compatibility
}));

router.get('/', auth, serviceWrapper(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  };
  
  console.log('📊 Debts GET request - filters:', filters, 'pagination:', pagination);
  console.log('📊 User:', req.user);
  
  const result = await debtService.getDebts(filters, pagination);
  console.log('📊 Debts result:', {
    dataLength: result.data?.length,
    totalCount: result.pagination?.total,
    hasMore: result.pagination?.hasMore,
    firstItem: result.data?.[0]
  });
  
  return result; // Return full result with pagination
}));

router.get('/stats', auth, serviceWrapper(async (req, res) => {
  const filters = { type: req.query.type };
  const result = await debtService.getDebtStats(filters);
  return result;
}));

router.post('/', auth, authorize('admin', 'cashier'), serviceWrapper(async (req, res) => {
  const result = await debtService.createDebt(req.body, req.user);
  
  // ⚡ Socket.IO - Real-time update for statistics
  if (global.io && result.success) {
    global.io.emit('debt:created', result.debt);
    console.log('📡 Socket emit: debt:created');
  }
  
  return result;
}));

router.put('/:id', auth, authorize('admin', 'cashier'), serviceWrapper(async (req, res) => {
  const result = await debtService.updateDebt(req.params.id, req.body, req.user);
  
  // ⚡ Socket.IO - Real-time update for statistics
  if (global.io && result.success) {
    global.io.emit('debt:updated', result.debt);
    console.log('📡 Socket emit: debt:updated');
  }
  
  return result;
}));

router.delete('/:id', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.deleteDebt(req.params.id, req.user);
  return result;
}));

// Qarzni tasdiqlash (faqat admin)
router.post('/:id/approve', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.approveDebt(req.params.id, req.user);
  return result;
}));

// Qarzni rad etish (faqat admin)
router.post('/:id/reject', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.rejectDebt(req.params.id, req.body.reason, req.user);
  return result;
}));

// Tasdiqlashni kutayotgan qarzlar soni (admin uchun notification)
router.get('/pending-approvals/count', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.getPendingApprovalsCount();
  return result;
}));

// Qarzga muddat berish (faqat admin)
router.post('/:id/extend', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.extendDebt(req.params.id, req.body.days, req.user);
  return result;
}));

// Noma'lum mijozli qarzlarni o'chirish (faqat admin)
router.delete('/cleanup/unknown', auth, authorize('admin'), serviceWrapper(async (req, res) => {
  const result = await debtService.cleanupUnknownDebts(req.user);
  return result;
}));

// Qarzga to'lov qilish
router.post('/:id/payment', auth, serviceWrapper(async (req, res) => {
  const result = await debtService.addPayment(req.params.id, req.body, req.user);
  return result;
}));

module.exports = router;