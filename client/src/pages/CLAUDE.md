# pages/ — Kontekst

## Vazifasi
Sahifa darajasidagi komponentlar — har bir route uchun bitta sahifa.

## Qoidalar
- Admin sahifalari `admin/` da, kassir `kassa/` da, yordamchi `helper/` da
- Barcha sahifalar lazy loading bilan import qilinsin (App.tsx da)
- API chaqiruvlari sahifa ichida, `utils/api.ts` Axios instance orqali
- Katta sahifalarda logikani custom hook ga chiqar

## Namuna
```tsx
// pages/admin/Products.tsx
export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  // API call, render...
}
```
