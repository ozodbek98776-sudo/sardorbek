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

// Kontaktlarni bulk import
router.post('/import', auth, async (req, res) => {
  try {
    const { contacts } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'Kontaktlar ro\'yxati bo\'sh' });
    }

    const results = { imported: 0, skipped: 0, errors: 0, details: [] };

    for (const c of contacts) {
      if (!c.name || !c.phone) {
        results.errors++;
        results.details.push({ name: c.name, phone: c.phone, status: 'error', message: 'Ism yoki telefon yo\'q' });
        continue;
      }
      try {
        await Contact.findOneAndUpdate(
          { phone: c.phone },
          { name: c.name, phone: c.phone, createdBy: req.user._id },
          { upsert: true, new: true }
        );
        results.imported++;
        results.details.push({ name: c.name, phone: c.phone, status: 'success' });
      } catch (err) {
        if (err.code === 11000) {
          results.skipped++;
          results.details.push({ name: c.name, phone: c.phone, status: 'exists', message: 'Allaqachon mavjud' });
        } else {
          results.errors++;
          results.details.push({ name: c.name, phone: c.phone, status: 'error', message: err.message });
        }
      }
    }

    res.json({ success: true, data: results });
  } catch (error) {
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
