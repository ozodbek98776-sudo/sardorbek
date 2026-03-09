const express = require('express');
const { auth } = require('../middleware/auth');
const Contact = require('../models/Contact');

const router = express.Router();

// Barcha kontaktlarni olish
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const contacts = await Contact.find(filter).sort({ name: 1 }).lean();
    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kontaktlarni bulk import (bulkWrite - tez)
router.post('/import', auth, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'Kontaktlar ro\'yxati bo\'sh' });
    }

    console.log(`📱 Contacts import: ${contacts.length} ta kontakt`);

    const ops = contacts
      .filter(c => c.name && c.phone)
      .map(c => ({
        updateOne: {
          filter: { phone: c.phone },
          update: { $set: { name: c.name, phone: c.phone, createdBy: req.user._id } },
          upsert: true
        }
      }));

    if (ops.length === 0) {
      return res.status(400).json({ success: false, message: 'Yaroqli kontakt topilmadi' });
    }

    const result = await Contact.bulkWrite(ops, { ordered: false });
    const imported = (result.upsertedCount || 0) + (result.modifiedCount || 0);
    console.log(`✅ Contacts imported: ${imported} ta`);

    res.json({ success: true, data: { imported, total: ops.length } });
  } catch (error) {
    console.error('❌ Contacts import error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kontaktni o'chirish
router.delete('/:id', auth, async (req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Kontakt o\'chirildi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
