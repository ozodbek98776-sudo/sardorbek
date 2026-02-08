const express = require('express');
const { auth } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const serviceFactory = require('../services/business/ServiceFactory');
const { serviceWrapper } = require('../middleware/serviceErrorHandler');

const router = express.Router();

// Service larni olish
const customerService = serviceFactory.customer;

// Kassa uchun yangi mijoz qo'shish (auth talab qiladi - XAVFSIZLIK)
router.post('/kassa', auth, checkPermission('customers', 'create'), serviceWrapper(async (req, res) => {
  const result = await customerService.createCustomer(req.body, req.user);
  return result;
}));

// Kassa uchun mijozlarni olish (auth talab qiladi - XAVFSIZLIK)
router.get('/kassa', auth, checkPermission('customers', 'read'), serviceWrapper(async (req, res) => {
  const result = await customerService.getCustomers(req.query, { page: 1, limit: 100 });
  return result.data; // Return only the data array for backward compatibility
}));

router.get('/', auth, checkPermission('customers', 'read'), serviceWrapper(async (req, res) => {
  const result = await customerService.getCustomers(req.query, { page: 1, limit: 100 });
  return result; // Return the full result object with data and pagination
}));

router.get('/:id', auth, checkPermission('customers', 'read'), serviceWrapper(async (req, res) => {
  const customer = await customerService.findCustomerById(req.params.id);
  return customer;
}));

// Mijoz statistikasi
router.get('/:id/stats', auth, checkPermission('customers', 'read'), serviceWrapper(async (req, res) => {
  const stats = await customerService.getCustomerDebtHistory(req.params.id);
  return stats;
}));

router.post('/', auth, checkPermission('customers', 'create'), serviceWrapper(async (req, res) => {
  const result = await customerService.createCustomer(req.body, req.user);
  return result;
}));

router.put('/:id', auth, checkPermission('customers', 'update'), serviceWrapper(async (req, res) => {
  const result = await customerService.updateCustomer(req.params.id, req.body, req.user);
  return result;
}));

router.delete('/:id', auth, checkPermission('customers', 'delete'), serviceWrapper(async (req, res) => {
  const result = await customerService.deleteCustomer(req.params.id, req.user);
  return result;
}));

module.exports = router;
