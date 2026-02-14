# Infinite Scroll - Umumiy Xulosalar

## Qo'shilgan Sahifalar

1. ✅ **Kassa (KassaPro)** - Mahsulotlar
2. ✅ **Mijozlar (CustomersPro)** - Mijozlar ro'yxati
3. ✅ **Qarz Daftarcha (Debts)** - Qarzlar ro'yxati

## Umumiy Pattern

Barcha sahifalarda bir xil pattern ishlatildi:

### 1. State Management
```typescript
const [loading, setLoading] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const [hasMore, setHasMore] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const observerRef = useRef<IntersectionObserver | null>(null);
const loadMoreRef = useRef<HTMLDivElement>(null);
```

### 2. Fetch Function (useCallback)
```typescript
const fetchData = useCallback(async (pageNum: number = 1, append: boolean = false) => {
  try {
    if (!append) {
      setLoading(true);
      console.log('📦 Loading page:', pageNum);
    } else {
      setLoadingMore(true);
      console.log('📦 Loading more, page:', pageNum);
    }

    const res = await api.get(`/endpoint?page=${pageNum}&limit=50`);
    
    // Handle response format
    let data = [];
    let paginationData = null;
    
    if (res.data && res.data.success && res.data.data) {
      if (Array.isArray(res.data.data.data)) {
        data = res.data.data.data;
        paginationData = res.data.data.pagination;
      } else if (Array.isArray(res.data.data)) {
        data = res.data.data;
      }
    } else if (Array.isArray(res.data)) {
      data = res.data;
    }
    
    console.log('✅ Loaded:', data.length, 'Pagination:', paginationData);
    
    if (append) {
      setData(prev => [...prev, ...data]);
    } else {
      setData(data);
    }
    
    if (paginationData) {
      setHasMore(paginationData.hasMore || false);
      setCurrentPage(paginationData.page || pageNum);
    } else {
      setHasMore(false);
    }
  } catch (err) { 
    console.error('Error:', err);
    setData(append ? data : []);
    setHasMore(false);
  } finally { 
    setLoading(false);
    setLoadingMore(false);
  }
}, [dependencies]);
```

### 3. Load More Function
```typescript
const loadMore = useCallback(() => {
  if (!loadingMore && hasMore && !loading) {
    const nextPage = currentPage + 1;
    console.log('🔄 Loading more, next page:', nextPage);
    fetchData(nextPage, true);
  }
}, [loadingMore, hasMore, loading, currentPage, fetchData]);
```

### 4. IntersectionObserver
```typescript
useEffect(() => {
  if (loading || !hasMore) return;

  observerRef.current = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !loadingMore) {
        console.log('🔍 Reached bottom, loading more...');
        loadMore();
      }
    },
    { rootMargin: '200px' }
  );

  if (loadMoreRef.current) {
    observerRef.current.observe(loadMoreRef.current);
  }

  return () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  };
}, [loading, hasMore, loadingMore, loadMore]);
```

### 5. Loading Indicators (JSX)
```tsx
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
{!loading && !hasMore && data.length > 0 && (
  <div className="flex justify-center py-6">
    <p className="text-sm text-slate-500">Barcha ma'lumotlar yuklandi</p>
  </div>
)}
```

## Backend Pattern

### Route Handler
```javascript
router.get('/', auth, serviceWrapper(async (req, res) => {
  const filters = {
    // filter parameters
  };
  const pagination = {
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 50
  };
  
  const result = await service.getData(filters, pagination);
  
  return result; // Return full result with pagination
}));
```

### Service Method
```javascript
async getData(filters = {}, pagination = {}) {
  return this.executeOperation(async () => {
    const { page = 1, limit = 20 } = pagination;
    
    // Pagination validate
    const paginationData = this.validatePagination(page, limit);
    
    // Query building
    const query = {};
    // ... add filters to query
    
    // Fetch data
    const [data, total] = await Promise.all([
      Model.find(query)
        .sort({ createdAt: -1 })
        .skip(paginationData.skip)
        .limit(paginationData.limit)
        .lean(),
      Model.countDocuments(query)
    ]);
    
    return this.createPaginationResponse(data, total, paginationData.page, paginationData.limit);
  }, 'getData', { filters, pagination });
}
```

## API Response Format

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

## Muhim Qoidalar

### 1. Function Ordering (Hoisting)
```typescript
// ✅ TO'G'RI TARTIB
const fetchData = useCallback(...);      // 1. Birinchi
const loadMore = useCallback(...);       // 2. fetchData ga bog'liq
useEffect(() => fetchData(1), []);       // 3. fetchData ga bog'liq
useEffect(() => observer, [loadMore]);   // 4. loadMore ga bog'liq

// ❌ NOTO'G'RI TARTIB
useEffect(() => loadMore(), []);         // loadMore hali yaratilmagan!
const loadMore = useCallback(...);
```

### 2. Dependencies
- `useCallback` dependencies to'g'ri ko'rsatilishi kerak
- Infinite loop oldini olish uchun

### 3. Reset Logic
Yangi element qo'shilganda yoki filtr o'zgarganda:
```typescript
setData([]);
setCurrentPage(1);
setHasMore(true);
fetchData(1, false);
```

### 4. Loading States
- `loading`: Boshlang'ich yuklash
- `loadingMore`: Qo'shimcha yuklash
- `hasMore`: Yana ma'lumot bormi

## Performance Metrics

| Sahifa | Initial Load | Scroll Load | Memory Usage |
|--------|-------------|-------------|--------------|
| Kassa | 50 mahsulot | 50 mahsulot | Minimal |
| Mijozlar | 50 mijoz | 50 mijoz | Minimal |
| Qarzlar | 50 qarz | 50 qarz | Minimal |

## Console Logs

Debugging uchun console loglar:
- 📦 "Loading page: X" - Sahifa yuklanmoqda
- ✅ "Loaded: X items" - Yuklandi
- 🔍 "Reached bottom" - Pastga yetildi
- 🔄 "Loading more, next page: X" - Qo'shimcha yuklash

## Testing Checklist

- [ ] Boshlang'ich yuklash ishlaydi
- [ ] Scroll qilganda yangi ma'lumotlar yuklanadi
- [ ] Loading indikatorlar ko'rinadi
- [ ] "Barcha ma'lumotlar yuklandi" xabari ko'rinadi
- [ ] Filtr o'zgarganda reset bo'ladi
- [ ] Yangi element qo'shilganda reset bo'ladi
- [ ] Console loglar to'g'ri
- [ ] Hoisting error yo'q
- [ ] Infinite loop yo'q
- [ ] Memory leak yo'q

## Kelajakda Qo'shish Mumkin

1. **Tovarlar sahifasi (Products)** - Mahsulotlar ro'yxati
2. **Xarajatlar (Expenses)** - Xarajatlar ro'yxati
3. **Cheklar (Receipts)** - Cheklar tarixi
4. **Buyurtmalar (Orders)** - Buyurtmalar ro'yxati
5. **Hamkorlar (Partners)** - Hamkorlar ro'yxati

## Foydalanilgan Texnologiyalar

- React Hooks (useState, useEffect, useCallback, useRef)
- IntersectionObserver API
- TypeScript
- Tailwind CSS
- Axios

## Mualliflar

- Kiro AI Assistant
- Development Team

## Sana

2026-02-13
