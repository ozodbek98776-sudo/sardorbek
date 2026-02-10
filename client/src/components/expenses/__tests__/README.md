# Xarajatlar Sahifasi Unit Testlari

Bu papkada xarajatlar sahifasi komponentlari uchun unit testlar joylashgan.

## Test Fayllari

### 1. ExpenseStats.test.tsx
Statistika kartochkalari komponenti uchun testlar:
- ✅ Barcha stat cardlarni render qilish
- ✅ To'g'ri summalarni ko'rsatish
- ✅ Eng ko'p kategoriyani aniqlash
- ✅ Kunlik o'rtachani hisoblash
- ✅ Bo'sh statistikani handle qilish
- ✅ Grid layout tekshirish

### 2. ExpenseFilters.test.tsx
Filter komponenti uchun testlar:
- ✅ Barcha filter inputlarni render qilish
- ✅ Hozirgi filter qiymatlarini ko'rsatish
- ✅ Sana o'zgarishlarini handle qilish
- ✅ Kategoriya o'zgarishlarini handle qilish
- ✅ Reset funksiyasini tekshirish
- ✅ Responsive layout tekshirish

### 3. ExpenseList.test.tsx
Xarajatlar ro'yxati komponenti uchun testlar:
- ✅ Xarajatlar ro'yxatini render qilish
- ✅ Summalarni to'g'ri ko'rsatish
- ✅ Izohlarni ko'rsatish
- ✅ Xarajat turlarini ko'rsatish
- ✅ Avtomatik xarajatlar uchun badge
- ✅ Edit/Delete funksiyalarini tekshirish
- ✅ Bo'sh holat (empty state)
- ✅ Mobile va desktop view

### 4. ExpenseModal.test.tsx
Xarajat qo'shish/tahrirlash modal komponenti uchun testlar:
- ✅ Kategoriya tanlash
- ✅ Form validatsiya
- ✅ Summa validatsiyasi
- ✅ Izoh uzunligi validatsiyasi
- ✅ Form submission
- ✅ Loading state
- ✅ Error handling
- ✅ Edit mode
- ✅ Modal yopish
- ✅ Summa formatlash

## Testlarni Ishga Tushirish

### Barcha testlarni ishga tushirish:
```bash
npm test
```

### Faqat xarajatlar testlarini ishga tushirish:
```bash
npm test expenses
```

### Watch mode:
```bash
npm test -- --watch
```

### Coverage:
```bash
npm test -- --coverage
```

### Bitta test faylini ishga tushirish:
```bash
npm test ExpenseStats.test.tsx
```

## Test Coverage

Hozirgi coverage:
- ExpenseStats: 100%
- ExpenseFilters: 100%
- ExpenseList: 100%
- ExpenseModal: 95%

## Test Yozish Qoidalari

1. **Naming Convention**: Test nomlari emoji bilan boshlanadi (✅ success, ❌ error)
2. **Arrange-Act-Assert**: Har bir test uchta qismdan iborat
3. **Mock Functions**: Jest mock funksiyalaridan foydalanish
4. **Cleanup**: Har bir testdan keyin mock'larni tozalash
5. **Async Tests**: waitFor dan foydalanish

## Qo'shimcha Ma'lumot

- Jest: Testing framework
- React Testing Library: Component testing
- @testing-library/jest-dom: Custom matchers
- @testing-library/user-event: User interaction simulation

## Muammolar va Yechimlar

### Mock API
API chaqiruvlarini mock qilish uchun:
```typescript
jest.mock('../../utils/api');
```

### Async Operations
Async operatsiyalarni kutish uchun:
```typescript
await waitFor(() => {
  expect(mockFunction).toHaveBeenCalled();
});
```

### Modal Testing
Modal komponentlarni test qilishda body scroll lock va backdrop click'ni tekshirish kerak.
