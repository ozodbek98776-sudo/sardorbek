const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all categories (public - for kassa and helper)
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Create category (admin only)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, order } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Kategoriya nomi kiritilishi shart' });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res.status(400).json({ message: 'Bu kategoriya allaqachon mavjud' });
    }

    const category = new Category({
      name: name.trim(),
      order: order || 0
    });

    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:created', category);
    }

    res.status(201).json(category);
  } catch (err) {
    console.error('Create category error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Update category (admin only)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, order, isActive } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }

    // Check if new name already exists (excluding current category)
    if (name && name.trim() !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: name.trim(),
        _id: { $ne: req.params.id }
      });
      if (existingCategory) {
        return res.status(400).json({ message: 'Bu kategoriya nomi allaqachon mavjud' });
      }
    }

    if (name) category.name = name.trim();
    if (order !== undefined) category.order = order;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:updated', category);
    }

    res.json(category);
  } catch (err) {
    console.error('Update category error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }

    // Soft delete - just mark as inactive
    category.isActive = false;
    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:deleted', { _id: category._id });
    }

    res.json({ message: 'Kategoriya o\'chirildi' });
  } catch (err) {
    console.error('Delete category error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Reorder categories (admin only)
router.post('/reorder', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { categories } = req.body; // Array of { id, order }

    if (!Array.isArray(categories)) {
      return res.status(400).json({ message: 'Noto\'g\'ri ma\'lumot formati' });
    }

    // Update all categories order
    const updatePromises = categories.map(({ id, order }) =>
      Category.findByIdAndUpdate(id, { order }, { new: true })
    );

    await Promise.all(updatePromises);

    const updatedCategories = await Category.find({ isActive: true }).sort({ order: 1 });

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('categories:reordered', updatedCategories);
    }

    res.json(updatedCategories);
  } catch (err) {
    console.error('Reorder categories error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Add subcategory to category (admin only)
router.post('/:id/subcategories', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, order } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Bo\'lim nomi kiritilishi shart' });
    }

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }

    // Check if subcategory already exists
    const existingSubcategory = category.subcategories.find(
      sub => sub.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (existingSubcategory) {
      return res.status(400).json({ message: 'Bu bo\'lim allaqachon mavjud' });
    }

    category.subcategories.push({
      name: name.trim(),
      order: order || category.subcategories.length
    });

    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:updated', category);
    }

    res.status(201).json(category);
  } catch (err) {
    console.error('Add subcategory error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Update subcategory (admin only)
router.put('/:id/subcategories/:subId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, order } = req.body;

    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }

    const subcategory = category.subcategories.id(req.params.subId);
    if (!subcategory) {
      return res.status(404).json({ message: 'Bo\'lim topilmadi' });
    }

    // Check if new name already exists (excluding current subcategory)
    if (name && name.trim() !== subcategory.name) {
      const existingSubcategory = category.subcategories.find(
        sub => sub._id.toString() !== req.params.subId && 
               sub.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (existingSubcategory) {
        return res.status(400).json({ message: 'Bu bo\'lim nomi allaqachon mavjud' });
      }
    }

    if (name) subcategory.name = name.trim();
    if (order !== undefined) subcategory.order = order;

    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:updated', category);
    }

    res.json(category);
  } catch (err) {
    console.error('Update subcategory error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

// Delete subcategory (admin only)
router.delete('/:id/subcategories/:subId', authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Kategoriya topilmadi' });
    }

    const subcategory = category.subcategories.id(req.params.subId);
    if (!subcategory) {
      return res.status(404).json({ message: 'Bo\'lim topilmadi' });
    }

    subcategory.deleteOne();
    await category.save();

    // Emit socket event for real-time update
    if (req.app.get('io')) {
      req.app.get('io').emit('category:updated', category);
    }

    res.json({ message: 'Bo\'lim o\'chirildi', category });
  } catch (err) {
    console.error('Delete subcategory error:', err);
    res.status(500).json({ message: 'Server xatosi' });
  }
});

module.exports = router;
