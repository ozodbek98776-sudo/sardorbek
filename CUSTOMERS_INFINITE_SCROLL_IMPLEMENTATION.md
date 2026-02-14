# Mijozlar Sahifasi - Infinite Scroll Implementatsiyasi

## Qilingan O'zgarishlar

### 1. Pagination State Qo'shildi
```typescript
const [loadingMore, setLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const observerRef = useRef<IntersectionObserver | null>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);
```

### 2. fetchCustomers Funksiyasi Yangilandi
- `useCallback` bilan o'ralgan
- Pagination parametrlari qo'shildi: `pageNum` va `append`
- Backend API: `GET /customers?page=${pageNum}&limit=50`
- Har safar 50 ta mijoz yuklanadi
- `append=true` bo'lganda yangi mijozlar mavjudlariga qo'shiladi
- Console log qo'shildi: "📦 Loading customers page:", "✅ Loaded customers:"

### 3. loadMoreCustomers Callback Yaratildi
```typescript
const loadMoreCustomers = useCallback(() => {
  if (!loadingMore && hasMore && !loading) {
    const nextPage = currentPage + 1;
    console.log('🔄 Loading more customers, next page:', nextPage);
    fetchCustomers(nextPage, true);
  }
}, [loadingMore, hasMore, loading, currentPage, fetchCustomers]);
```

### 4. IntersectionObserver Qo'shildi
- Sahifa pastiga yetganda avtomatik yangi mijozlar yuklanadi
- `rootMargin: '200px'` - 200px qolganda yuklashni boshlaydi
- Faqat `loading=false` va `hasMore=true` bo'lganda ishlaydi

### 5. Loading Indikatorlar
```typescript
{/* Infinite Scroll Loading Indicator */}
{!loading && hasMore && (
  <div ref={loadMoreRef} className="flex justify-center py-8">
    {loadingMore && (
      <div className="flex items-center gap-3 text-brand-600">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">Yuklanmoqda...</span>
      </div>
    )}
  </div>
)}

{/* End of List Indicator */}
{!loading && !hasMore && customers.length > 0 && (
  <div className="flex justify-center py-6">
    <p className="text-sm text-slate-500">Barcha mijozlar yuklandi</p>
  </div>
)}
```

### 6. handleSubmit Yangilandi
Yangi mijoz qo'shilganda yoki tahrirlanganda:
```typescript
// Reset and reload from page 1
setCustomers([]);
setCurrentPage(1);
setHasMore(true);
fetchCustomers(1, false);
```

## Backend API

### Endpoint
```
GET /customers?page=1&limit=50
```

### Response Format
```json
{
  "success": true,
  "data": {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "pages": 3,
      "hasMore": true
    }
  }
}
```

### CustomerService.getCustomers()
- Pagination qo'llab-quvvatlaydi
- Default: `page=1, limit=20`
- Filters: `search`, `hasDebt`, `sortBy`, `sortOrder`
- Response: `createPaginationResponse()` orqali qaytariladi

## Funksiyalar Tartibi (Hoisting Error Oldini Olish)

1. **fetchCustomers** - useCallback (birinchi)
2. **loadMoreCustomers** - useCallback (fetchCustomers ga bog'liq)
3. **useEffect** - Initial load (fetchCustomers ga bog'liq)
4. **useEffect** - IntersectionObserver (loadMoreCustomers ga bog'liq)

## Ishlash Jarayoni

1. **Boshlang'ich yuklash**: 50 ta mijoz yuklanadi (page=1)
2. **Scroll qilish**: Foydalanuvchi pastga scroll qiladi
3. **200px qolganda**: IntersectionObserver trigger bo'ladi
4. **loadMoreCustomers**: Keyingi sahifa yuklanadi (page=2)
5. **Append**: Yangi mijozlar mavjudlariga qo'shiladi
6. **Takrorlash**: `hasMore=true` bo'lguncha davom etadi

## Xususiyatlar

✅ Har safar 50 ta mijoz yuklanadi
✅ Infinite scroll - avtomatik yuklash
✅ Loading indikatorlar
✅ "Barcha mijozlar yuklandi" xabari
✅ Console log debugging
✅ Hoisting error yo'q
✅ Memory efficient - faqat kerakli ma'lumotlar yuklanadi
✅ Backend pagination qo'llab-quvvatlaydi

## Test Qilish

1. Mijozlar sahifasini oching
2. 50 tadan ko'p mijoz bo'lishi kerak
3. Pastga scroll qiling
4. Yangi mijozlar avtomatik yuklanishini kuzating
5. Console loglarni tekshiring:
   - "📦 Loading customers page: 1"
   - "✅ Loaded customers: 50"
   - "🔍 Reached bottom, loading more customers..."
   - "🔄 Loading more customers, next page: 2"

## Muammolar va Yechimlar

### Muammo: Hoisting Error
**Yechim**: Funksiyalarni to'g'ri tartibda joylashtirish (fetchCustomers → loadMoreCustomers → useEffect)

### Muammo: Infinite Loop
**Yechim**: useCallback dependencies to'g'ri ko'rsatilgan

### Muammo: Duplicate Loading
**Yechim**: `loadingMore` va `hasMore` state orqali nazorat qilinadi
