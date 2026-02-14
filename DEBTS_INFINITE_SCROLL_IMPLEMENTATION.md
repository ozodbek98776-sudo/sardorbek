# Qarz Daftarcha Sahifasi - Infinite Scroll Implementatsiyasi

## Qilingan O'zgarishlar

### Frontend (client/src/pages/admin/Debts.tsx)

#### 1. Pagination State Qo'shildi
```typescript
const [loadingMore, setLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const observerRef = useRef<IntersectionObserver | null>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);
```

#### 2. fetchDebts Funksiyasi Yangilandi
- `useCallback` bilan o'ralgan
- Pagination parametrlari qo'shildi: `pageNum` va `append`
- Backend API: `GET /debts?type=${debtType}&page=${pageNum}&limit=50`
- Har safar 50 ta qarz yuklanadi
- `append=true` bo'lganda yangi qarzlar mavjudlariga qo'shiladi
- Console log qo'shildi: "📦 Loading debts page:", "✅ Loaded debts:"

#### 3. loadMoreDebts Callback Yaratildi
```typescript
const loadMoreDebts = useCallback(() => {
  if (!loadingMore && hasMore && !loading) {
    const nextPage = currentPage + 1;
    console.log('🔄 Loading more debts, next page:', nextPage);
    fetchDebts(nextPage, true);
  }
}, [loadingMore, hasMore, loading, currentPage, fetchDebts]);
```

#### 4. IntersectionObserver Qo'shildi
- Sahifa pastiga yetganda avtomatik yangi qarzlar yuklanadi
- `rootMargin: '200px'` - 200px qolganda yuklashni boshlaydi
- Faqat `loading=false` va `hasMore=true` bo'lganda ishlaydi

#### 5. Loading Indikatorlar
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
{!loading && !hasMore && debts.length > 0 && (
  <div className="flex justify-center py-6">
    <p className="text-sm text-slate-500">Barcha qarzlar yuklandi</p>
  </div>
)}
```

#### 6. handleSubmit va handlePayment Yangilandi
Yangi qarz qo'shilganda, tahrirlanganda yoki to'lov qilinganda:
```typescript
// Reset and reload from page 1
setDebts([]);
setCurrentPage(1);
setHasMore(true);
fetchDebts(1, false);
```

#### 7. useEffect Dependencies
```typescript
useEffect(() => {
  setDebts([]);
  setCurrentPage(1);
  setHasMore(true);
  fetchDebts(1, false);
  fetchCustomers();
  fetchStats();
}, [debtType, fetchDebts]);
```

### Backend (server/src/routes/debts.js)

#### Route Yangilandi
```javascript
router.get('/', auth, serviceWrapper(async (req, res) => {
  const filters = {
    status: req.query.status,
    type: req.query.type
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  };
  
  const result = await debtService.getDebts(filters, pagination);
  
  return result; // Return full result with pagination
}));
```

**O'zgarishlar:**
- `page` va `limit` query parametrlarini qabul qiladi
- `pagination` obyektini `debtService.getDebts()` ga uzatadi
- To'liq natijani qaytaradi (data + pagination)

## Backend API

### Endpoint
```
GET /debts?type=receivable&page=1&limit=50
```

### Query Parameters
- `type`: 'receivable' | 'payable' (majburiy emas)
- `status`: 'approved' | 'pending_approval' | 'paid' | 'overdue' | 'blacklist' (majburiy emas)
- `page`: sahifa raqami (default: 1)
- `limit`: sahifadagi elementlar soni (default: 50)

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

### DebtService.getDebts()
- Pagination qo'llab-quvvatlaydi
- Default: `page=1, limit=20`
- Filters: `status`, `type`, `customerId`, `overdue`, `search`
- Response: `createPaginationResponse()` orqali qaytariladi

## Funksiyalar Tartibi (Hoisting Error Oldini Olish)

1. **fetchDebts** - useCallback (birinchi)
2. **loadMoreDebts** - useCallback (fetchDebts ga bog'liq)
3. **useEffect** - Initial load (fetchDebts ga bog'liq)
4. **useEffect** - IntersectionObserver (loadMoreDebts ga bog'liq)

## Ishlash Jarayoni

1. **Boshlang'ich yuklash**: 50 ta qarz yuklanadi (page=1)
2. **Scroll qilish**: Foydalanuvchi pastga scroll qiladi
3. **200px qolganda**: IntersectionObserver trigger bo'ladi
4. **loadMoreDebts**: Keyingi sahifa yuklanadi (page=2)
5. **Append**: Yangi qarzlar mavjudlariga qo'shiladi
6. **Takrorlash**: `hasMore=true` bo'lguncha davom etadi

## Xususiyatlar

✅ Har safar 50 ta qarz yuklanadi
✅ Infinite scroll - avtomatik yuklash
✅ Loading indikatorlar
✅ "Barcha qarzlar yuklandi" xabari
✅ Console log debugging
✅ Hoisting error yo'q
✅ Memory efficient - faqat kerakli ma'lumotlar yuklanadi
✅ Backend pagination qo'llab-quvvatlaydi
✅ debtType o'zgarganda reset qilinadi
✅ Yangi qarz qo'shilganda yoki to'lov qilinganda reset qilinadi

## Qarz Turlari

1. **Menga qarzdor (receivable)**: Mijozlar qarzi
2. **Men qarzdorman (payable)**: Kreditorlarga qarz

Har bir tur uchun alohida pagination ishlaydi.

## Test Qilish

1. Qarz daftarcha sahifasini oching
2. 50 tadan ko'p qarz bo'lishi kerak
3. Pastga scroll qiling
4. Yangi qarzlar avtomatik yuklanishini kuzating
5. Console loglarni tekshiring:
   - "📦 Loading debts page: 1"
   - "✅ Loaded debts: 50"
   - "🔍 Reached bottom, loading more debts..."
   - "🔄 Loading more debts, next page: 2"
6. "Menga qarzdor" va "Men qarzdorman" o'rtasida o'tishni test qiling
7. Yangi qarz qo'shishni test qiling (reset bo'lishi kerak)
8. To'lov qilishni test qiling (reset bo'lishi kerak)

## Muammolar va Yechimlar

### Muammo: Hoisting Error
**Yechim**: Funksiyalarni to'g'ri tartibda joylashtirish (fetchDebts → loadMoreDebts → useEffect)

### Muammo: Infinite Loop
**Yechim**: useCallback dependencies to'g'ri ko'rsatilgan

### Muammo: Duplicate Loading
**Yechim**: `loadingMore` va `hasMore` state orqali nazorat qilinadi

### Muammo: debtType o'zgarganda eski ma'lumotlar ko'rinadi
**Yechim**: useEffect da `setDebts([])` qo'shildi

### Muammo: Backend pagination qaytarmaydi
**Yechim**: Backend route yangilandi - to'liq natija qaytariladi

## Qo'shimcha Xususiyatlar

### Arxiv Ko'rinishi
- To'langan qarzlar alohida ko'rinishda
- Infinite scroll arxivda ham ishlaydi

### Filtrlar
- Status filtri: all, approved, today, overdue, blacklist
- Qidiruv: mijoz ismi, telefon raqami
- Har bir filtr uchun alohida pagination

### Statistika
- Jami qarzlar
- Aktiv qarzlar
- Muddati o'tgan qarzlar
- To'langan qarzlar (arxiv)
- Qora ro'yxat
- Jami qarz summasi

## Performance

- **Initial Load**: ~50 qarz (tez)
- **Scroll Load**: ~50 qarz (tez)
- **Memory**: Faqat ko'rsatilgan qarzlar xotirada
- **Network**: Faqat kerakli ma'lumotlar yuklanadi
