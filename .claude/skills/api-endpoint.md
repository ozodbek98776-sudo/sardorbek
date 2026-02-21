# Yangi API Endpoint

## Qachon ishlatilsin
"endpoint qo'sh", "API yarat", "route qo'sh", "backend", "server API"

## Qadamlar
1. Model bormi tekshir, yo'q bo'lsa yarat
2. Route fayl yaratish (`server/src/routes/`)
3. `server/src/index.js` da route ni register qilish
4. Client da API funksiya qo'shish

## Shablon — CRUD Route
```js
const router = require('express').Router();
const { auth, admin } = require('../middleware/auth');
const Model = require('../models/ModelName');

// GET all (paginated)
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
    const [data, total] = await Promise.all([
      Model.find(filter).skip((page - 1) * limit).limit(Number(limit)).sort({ createdAt: -1 }),
      Model.countDocuments(filter)
    ]);
    res.json({ success: true, data, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// POST create
router.post('/', auth, admin, async (req, res) => {
  try {
    const item = await Model.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PUT update
router.put('/:id', auth, admin, async (req, res) => {
  try {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Topilmadi' });
    res.json({ success: true, data: item });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE
router.delete('/:id', auth, admin, async (req, res) => {
  try {
    await Model.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "O'chirildi" });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
```

## index.js ga qo'shish
```js
const newRoutes = require('./routes/newRoute');
app.use('/api/new-route', newRoutes);
```

## Checklist
- [ ] Auth middleware to'g'ri
- [ ] Pagination bor
- [ ] Error handling bor
- [ ] index.js da registered
- [ ] Client API funksiya yaratilgan

## TOKEN TEJASH
- CRUD bo'lsa to'liq shablon, partial bo'lsa faqat kerakli method
