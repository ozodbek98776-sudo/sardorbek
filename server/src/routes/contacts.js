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

    const valid = contacts.filter(c => c.name && c.phone);
    console.log(`📱 Contacts import: ${contacts.length} jami, ${valid.length} yaroqli`);

    if (valid.length === 0) {
      return res.status(400).json({ success: false, message: 'Yaroqli kontakt topilmadi' });
    }

    // Dublikat telefonlarni olib tashlash (oxirgi qolsin)
    const phoneMap = new Map();
    for (const c of valid) {
      phoneMap.set(c.phone, c);
    }
    const unique = Array.from(phoneMap.values());
    console.log(`📱 Unique contacts: ${unique.length}`);

    // Batch insertMany — duplikatlarni skip qilish
    let imported = 0;
    const BATCH = 500;
    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH).map(c => ({
        name: c.name,
        phone: c.phone,
        createdBy: req.user._id
      }));
      try {
        const result = await Contact.insertMany(batch, { ordered: false });
        imported += result.length;
      } catch (err) {
        // Duplikat xatolarni skip, qolganlarni hisoblash
        if (err.insertedDocs) {
          imported += err.insertedDocs.length;
        } else if (err.result && err.result.nInserted) {
          imported += err.result.nInserted;
        }
      }
    }

    const totalInDB = await Contact.countDocuments();
    console.log(`✅ Imported: ${imported}, Total in DB: ${totalInDB}`);

    res.json({ success: true, data: { imported, total: unique.length, totalInDB } });
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
