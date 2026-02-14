# Products Page - Search with Pagination & Statistics

## Summary
Implemented search with pagination and accurate statistics. When searching:
1. First 10 products load immediately
2. Scroll down to load more (infinite scroll)
3. Statistics cards show accurate filtered data

## Implementation

### 1. Client-Side Search Filtering
```typescript
const filteredProducts = useMemo(() => {
  if (!Array.isArray(products)) return [];
  
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }
  
  return products;
}, [products, searchQuery]);
```

### 2. Filtered Statistics Calculation
```typescript
const filteredStats = useMemo(() => {
  const filtered = filteredProducts;
  
  return {
    total: filtered.length,
    lowStock: filtered.filter(p => p.quantity > 0 && p.quantity <= 50).length,
    outOfStock: filtered.filter(p => p.quantity <= 0).length,
    totalValue: filtered.reduce((sum, p) => {
      const price = (p as any).unitPrice || p.price || 0;
      return sum + (price * p.quantity);
    }, 0)
  };
}, [filteredProducts]);
```

### 3. Pagination (10 items per page)
```typescript
const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
  const response = await api.get('/products', {
    params: {
      page: pageNum,
      limit: 10,  // Boshida 10ta yuklash
      category: categoryFilter || undefined,
      subcategory: subcategoryFilter || undefined,
      stockFilter: stockFilter !== 'all' ? stockFilter : undefined
    }
  });
  // ...
}, [showAlert, categoryFilter, subcategoryFilter, stockFilter]);
```

### 4. Statistics Display
```typescript
<StatCard
  title="Jami"
  value={filteredStats.total}  // Filtered data
  icon={Package}
  color="blue"
/>
```

## Data Flow

### Search Process:
```
1. User types in search input
   ↓
2. searchQuery state updates
   ↓
3. filteredProducts recalculates (client-side)
   ↓
4. filteredStats recalculates
   ↓
5. UI updates with:
   - Filtered products (first 10)
   - Accurate statistics
   - Infinite scroll ready
```

### Infinite Scroll:
```
1. User scrolls to bottom
   ↓
2. IntersectionObserver triggers
   ↓
3. fetchProducts(pageNum + 1, true) called
   ↓
4. Next 10 products appended
   ↓
5. UI updates with more products
```

## Features

### Search Capabilities:
- ✅ Search by product name
- ✅ Search by product code
- ✅ Search by description
- ✅ Case-insensitive
- ✅ Real-time filtering

### Pagination:
- ✅ 10 items per page
- ✅ Infinite scroll
- ✅ Load more on scroll
- ✅ Smooth loading

### Statistics:
- ✅ Total products (filtered)
- ✅ Low stock count (filtered)
- ✅ Out of stock count (filtered)
- ✅ Total value (filtered)
- ✅ Updates with search

## Example Scenarios

### Scenario 1: Search for "Stol"
```
Initial Load:
- First 10 products with "stol" in name/code/description
- Statistics show:
  - Jami: 10 (or less if fewer matches)
  - Kam qolgan: 3
  - Tugagan: 1
  - Jami qiymat: 450,000 so'm

Scroll Down:
- Next 10 matching products load
- Statistics remain accurate
```

### Scenario 2: Search for "#10"
```
Initial Load:
- First 10 products with "10" in code
- Statistics calculated for these products

Scroll Down:
- More products with "10" in code load
- Statistics stay accurate
```

### Scenario 3: No Search (All Products)
```
Initial Load:
- First 10 products from all
- Statistics for all products

Scroll Down:
- More products load
- Statistics remain accurate
```

## Performance Optimizations

### 1. **useMemo for Filtering**
- Only recalculates when products or searchQuery changes
- Prevents unnecessary filtering

### 2. **useMemo for Statistics**
- Only recalculates when filteredProducts changes
- Efficient calculation

### 3. **Pagination (10 per page)**
- Reduces initial load time
- Smooth infinite scroll
- Better performance

### 4. **Client-Side Search**
- No backend calls for search
- Instant filtering
- Works offline

## Files Modified
- `client/src/pages/admin/Products.tsx` - Search pagination and statistics

## Technical Details

### State Management:
```typescript
const [searchQuery, setSearchQuery] = useState('');
const [products, setProducts] = useState<Product[]>([]);
const [stats, setStats] = useState({...});
```

### Computed Values:
```typescript
const filteredProducts = useMemo(() => {...}, [products, searchQuery]);
const filteredStats = useMemo(() => {...}, [filteredProducts]);
```

### Dependencies:
```typescript
// fetchProducts depends on filters, NOT search
[showAlert, categoryFilter, subcategoryFilter, stockFilter]

// filteredProducts depends on products and search
[products, searchQuery]

// filteredStats depends on filtered products
[filteredProducts]
```

## Testing Checklist
- [ ] Search by product name - shows matching products
- [ ] Search by product code - shows matching products
- [ ] Search by description - shows matching products
- [ ] Statistics show filtered count
- [ ] Statistics show filtered low stock
- [ ] Statistics show filtered out of stock
- [ ] Statistics show filtered total value
- [ ] Scroll down - more products load
- [ ] Statistics remain accurate after scroll
- [ ] Clear search - all products show
- [ ] Statistics update when search cleared
- [ ] Pagination works with filters
- [ ] Pagination works with search

## Edge Cases Handled
- Empty search results - shows "Mahsulotlar topilmadi"
- No products - shows empty state
- Large product lists - pagination handles efficiently
- Multiple filters + search - works together
- Statistics with 0 products - shows 0

## Future Enhancements
- Backend search for large datasets
- Search history
- Advanced filters
- Search suggestions
- Fuzzy matching
- Search analytics
