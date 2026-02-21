# components/ — Kontekst

## Vazifasi
Qayta ishlatiladigan UI komponentlar — modallar, headerlar, QR, kassa komponentlari.

## Qoidalar
- Har bir komponent alohida `.tsx` fayl
- Props uchun interface yaratilsin (inline type YO'Q)
- Tailwind class ishlatilsin, inline style YO'Q
- Modal komponentlar `useModalCleanup` hook ishlatsin
- Katta komponentlarni `kassa/`, `common/`, `expenses/` papkalarga ajrat

## Namuna
```tsx
interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}
export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  // ...
}
```
