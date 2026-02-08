const express = require('express');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const warehouses = await Warehouse.find();
    const warehousesWithCount = await Promise.all(
      warehouses.map(async (w) => {
        const productCount = await Product.countDocuments({ warehouse: w._id });
        return { ...w.toObject(), productCount };
      })
    );
    res.json(warehousesWithCount);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const warehouseData = { ...req.body };
    
    // createdBy - faqat real ObjectId bo'lsa qo'shamiz
    if (req.user._id && req.user._id !== 'hardcoded-admin-id') {
      warehouseData.createdBy = req.user._id;
    }
    
    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!warehouse) return res.status(404).json({ message: 'Ombor topilmadi' });
    res.json(warehouse);
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndDelete(req.params.id);
    if (!warehouse) return res.status(404).json({ message: 'Ombor topilmadi' });
    res.json({ message: 'Ombor o\'chirildi' });
  } catch (error) {
    res.status(500).json({ message: 'Server xatosi', error: error.message });
  }
});

module.exports = router;
