# Modal Scroll Lock - Loyiha Standardi

## Muammo
Modal ochilganda orqa sahifa scroll bo'lib, foydalanuvchi tajribasi yomonlashadi.

## Yechim
Barcha modallarda `useModalScrollLock` hook'idan foydalanish.

## Hook Ishlash Prinsipi

```typescript
// client/src/hooks/useModalScrollLock.ts
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // 1. Hozirgi scroll pozitsiyasini saqlash
      const scrollY = window.scrollY;
      
      // 2. Body'ni fix qilish
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // 3. Modal yopilganda asl holatga qaytarish
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // 4. Scroll pozitsiyasini qaytarish
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
}
```

## Foydalanish

### 1. Hook'ni import qilish
```typescript
import { useModalScrollLock } from '../hooks/useModalScrollLock';
```

### 2. Modal komponentida ishlatish
```typescript
export function MyModal({ isOpen, onClose }: ModalProps) {
  // Modal scroll lock
  useModalScrollLock(isOpen);
  
  // ... qolgan kod
}
```

### 3. Bir nechta modal uchun
```typescript
export function MyPage() {
  const [showModal1, setShowModal1] = useState(false);
  const [showModal2, setShowModal2] = useState(false);
  
  // Ikkala modal uchun bitta hook
  useModalScrollLock(showModal1 || showModal2);
  
  // ... qolgan kod
}
```

## Yangilangan Modallar

### ✅ Umumiy Komponentlar
- [x] `Modal.tsx` - Umumiy modal komponenti
- [x] `ResponsiveModal.tsx` - Responsive modal
- [x] `AlertModal.tsx` - Alert modal

### ✅ Xarajatlar (Expenses)
- [x] `ExpenseModal.tsx` - Xarajat qo'shish/tahrirlash

### ✅ Kassa Modallari
- [x] `PaymentModal.tsx` - To'lov modali
- [x] `DebtPaymentModal.tsx` - Qarz to'lash
- [x] `ProductDetailModal.tsx` - Mahsulot tafsilotlari
- [x] `SavedReceiptsModal.tsx` - Saqlangan cheklar

### ✅ Boshqa Modallar
- [x] `FinanceHistoryModal.tsx` - Moliyaviy tarix
- [x] `ProductOrdersModal.tsx` - Mahsulot buyurtmalari
- [x] `PartnerPaymentModal.tsx` - Hamkor to'lovi

### ✅ Sahifalar
- [x] `Debts.tsx` - Qarzlar sahifasi

## Afzalliklari

1. **Yagona Yechim**: Barcha modallarda bir xil ishlaydi
2. **Scroll Pozitsiyasini Saqlash**: Modal yopilganda foydalanuvchi o'sha joyda qoladi
3. **Mobil Mos**: iOS va Android'da to'g'ri ishlaydi
4. **Oson Foydalanish**: Faqat bitta qator kod kerak
5. **Bir Nechta Modal**: Bir vaqtda bir nechta modal uchun ishlaydi

## Eslatma

Yangi modal yaratganda **ALBATTA** `useModalScrollLock` hook'idan foydalaning:

```typescript
import { useModalScrollLock } from '../hooks/useModalScrollLock';

export function NewModal({ isOpen, onClose }: Props) {
  useModalScrollLock(isOpen); // ⬅️ Bu qatorni qo'shish
  
  if (!isOpen) return null;
  
  return (
    <div className="modal">
      {/* Modal content */}
    </div>
  );
}
```

## Test Qilish

1. Modal ochish
2. Orqa sahifani scroll qilishga harakat qilish (scroll bo'lmasligi kerak)
3. Modal yopish
4. Scroll pozitsiyasi saqlanganligini tekshirish

## Muammolar va Yechimlar

### Muammo: Modal ichida scroll ishlamayapti
**Yechim**: Modal kontentiga `overflow-y-auto` class qo'shing

### Muammo: Bir nechta modal ochilganda scroll qaytmayapti
**Yechim**: Barcha modallar yopilgandan keyin scroll qaytadi (to'g'ri ishlaydi)

### Muammo: iOS'da scroll sakraydi
**Yechim**: Hook allaqachon `position: fixed` va scroll pozitsiyasini saqlash orqali hal qiladi
