# routes/ — Kontekst

## Vazifasi
Express REST API endpointlar — har bir resurs uchun alohida fayl.

## Qoidalar
- `router.get/post/put/delete` pattern
- Auth middleware: `auth` (login talab), `admin` (faqat admin), `adminOrCashier`
- Validatsiya: `middleware/validator.js` da sanitize
- Javob formati: `{ success: true/false, data, message }`
- Pagination: `?page=1&limit=20` — doim limit qo'y

## Namuna
```js
const router = require('express').Router();
const { auth, admin } = require('../middleware/auth');
router.get('/', auth, async (req, res) => {
  const data = await Model.find().limit(20);
  res.json({ success: true, data });
});
module.exports = router;
```
