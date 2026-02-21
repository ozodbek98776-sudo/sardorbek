# utils/ — Kontekst

## Vazifasi
Yordamchi funksiyalar — API, formatlash, narxlash, offline, sync.

## Qoidalar
- Har bir util alohida fayl, default export YO'Q — named export
- Pure function bo'lsin (side effect YO'Q, state YO'Q)
- `api.ts` — Axios instance, interceptorlar, token boshqaruvi
- `format.ts` — narx, sana, raqam formatlash
- `pricing.ts` — narx hisoblash logikasi

## Namuna
```ts
// utils/format.ts
export function formatPrice(price: number): string {
  return price.toLocaleString('uz-UZ') + ' so\'m';
}
```
