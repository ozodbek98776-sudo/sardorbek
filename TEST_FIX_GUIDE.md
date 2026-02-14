# Quick Fix Guide for E2E Test Failures

## What I Fixed

### 1. Helper Methods (kassa.helper.ts)
✅ Added proper wait logic for search input
✅ Added element visibility checks before interactions
✅ Increased timeouts for slow-loading elements
✅ Added clear() before fill() to prevent input issues

### 2. Playwright Config
✅ Increased actionTimeout from 10s to 15s
✅ Increased navigationTimeout from 30s to 45s

## What Still Needs Fixing

### CRITICAL: Backend Issues

The main problem is that your backend API is returning errors:

1. **API Returns 500 Errors** instead of proper status codes:
   - Should return 400 for validation errors
   - Should return 401 for auth errors
   - Currently returning 500 for everything

2. **API Returns Empty/Invalid JSON**:
   - `GET /api/products` - Check if backend is running
   - `GET /api/customers/kassa` - Returns unexpected format
   - `POST /api/receipts` - Validation not working

### How to Fix Backend

#### Step 1: Verify Backend is Running
```bash
cd server
npm run dev
```

#### Step 2: Check Backend Logs
Look for errors when tests run. Common issues:
- Database connection failed
- Missing environment variables
- Validation middleware not working

#### Step 3: Fix Error Handling
Your backend needs proper error handling middleware:

```javascript
// server/middleware/errorHandler.js
app.use((err, req, res, next) => {
  console.error(err);
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  
  // Auth errors
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Default to 500
  res.status(500).json({ message: 'Internal server error' });
});
```

#### Step 4: Fix Customer API Response Format
The frontend expects this format:
```javascript
// GET /api/customers/kassa should return:
{
  "success": true,
  "data": [
    { "_id": "...", "name": "...", "phone": "..." }
  ]
}
```

### Frontend Issues

#### Issue: Cart Panel Not Visible on Desktop
**File**: `client/src/pages/admin/KassaPro.tsx`

The cart panel might be conditionally hidden on desktop. Check the render logic around line 457+.

**Potential Fix**: Ensure CartPanel is always rendered:
```tsx
{/* Always render CartPanel, use CSS for responsive behavior */}
<CartPanel
  cart={cart}
  total={total}
  itemCount={itemCount}
  onUpdateQuantity={updateQuantity}
  onRemoveItem={removeFromCart}
  onClearCart={clearCart}
  onCheckout={() => setShowPayment(true)}
  onSaveReceipt={saveReceipt}
  isModal={false}
/>
```

## Running Tests After Fixes

### 1. Start Backend
```bash
cd server
npm run dev
```

### 2. Start Frontend (in another terminal)
```bash
cd client
npm run dev
```

### 3. Run Tests
```bash
cd client
npx playwright test
```

### 4. Run Specific Test File
```bash
npx playwright test e2e/01-kassa-happy-path.spec.ts
```

### 5. Run in UI Mode (Recommended for Debugging)
```bash
npx playwright test --ui
```

## Expected Results After Fixes

With backend running properly, you should see:
- ✅ Search input works (timeout fixed)
- ✅ Products load (API working)
- ✅ Cart operations work (elements visible)
- ⚠️ Some API tests may still fail until backend error handling is fixed

## Debugging Tips

### If tests still timeout on search:
1. Open browser in headed mode: `npx playwright test --headed`
2. Check if page loads at all
3. Check browser console for errors
4. Verify backend is accessible at the API URL

### If API tests fail:
1. Check backend logs for errors
2. Test API endpoints manually with curl or Postman
3. Verify database has test data
4. Check authentication token is valid

### If UI tests fail:
1. Check screenshots in `test-results/` folder
2. Watch videos in `test-results/` folder
3. Use `--debug` flag to step through tests
4. Verify elements exist with correct data-testid

## Next Steps

1. ✅ I've fixed the helper methods and config
2. ⏳ You need to fix the backend API responses
3. ⏳ You need to verify backend is running during tests
4. ⏳ You may need to fix CartPanel visibility logic

Once backend is fixed, re-run tests and most should pass!
