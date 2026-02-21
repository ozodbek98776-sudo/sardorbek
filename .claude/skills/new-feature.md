# Yangi Feature Qo'shish

## Qachon ishlatilsin
"yangi sahifa", "yangi komponent", "yangi funksiya", "feature qo'sh", "modul qo'sh"

## Qadamlar
1. Qaysi rolga tegishli aniqlash (admin/cashier/helper)
2. Server: Model yaratish (agar yangi data kerak bo'lsa)
3. Server: Route yaratish + auth middleware qo'shish
4. Client: TypeScript type/interface yaratish (`types/index.ts`)
5. Client: API funksiya qo'shish (`utils/api.ts` yoki alohida fayl)
6. Client: Sahifa/Komponent yaratish
7. Client: Route qo'shish (`App.tsx` da lazy import)
8. Test yozish (vitest unit yoki playwright e2e)

## Shablon — Server Route
```js
const router = require('express').Router();
const { auth, admin } = require('../middleware/auth');
const Model = require('../models/ModelName');

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await Model.find()
      .skip((page - 1) * limit).limit(Number(limit))
      .sort({ createdAt: -1 });
    const total = await Model.countDocuments();
    res.json({ success: true, data, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
```

## Shablon — Client Sahifa
```tsx
import { useState, useEffect } from 'react';
import api from '../../utils/api';

interface Item { _id: string; name: string; }

export default function NewPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/new-endpoint').then(r => {
      setItems(r.data.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-4">Yuklanmoqda...</div>;
  return <div className="p-4">{/* UI */}</div>;
}
```

## Checklist
- [ ] Model schema to'g'ri (required, index, timestamps)
- [ ] Route auth middleware bor
- [ ] Pagination qo'shilgan
- [ ] Client type yaratilgan
- [ ] Lazy import App.tsx da
- [ ] Error handling bor

## TOKEN TEJASH
- Faqat yangi fayllarni ko'rsat
- Mavjud fayllardagi o'zgarishlarni diff sifatida ko'rsat
