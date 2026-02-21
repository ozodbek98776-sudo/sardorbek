# models/ — Kontekst

## Vazifasi
Mongoose schema va modellar — MongoDB kolleksiyalari uchun.

## Qoidalar
- Har bir model alohida fayl, PascalCase nom
- Schema validatsiya: `required`, `enum`, `min/max` ishlatilsin
- Index qo'shishni unutma (tez-tez query qilinadigan fieldlar)
- `timestamps: true` doim qo'shilsin
- Ref ishlatganda populate uchun index bo'lsin

## Namuna
```js
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true }
}, { timestamps: true });
module.exports = mongoose.model('Product', productSchema);
```
