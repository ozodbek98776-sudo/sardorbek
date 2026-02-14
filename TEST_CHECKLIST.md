# E2E Test Pre-Flight Checklist

## Before Running Tests

### ✅ Environment Setup

- [ ] Node.js is installed (v16+ recommended)
- [ ] MongoDB is running
- [ ] All dependencies are installed:
  ```bash
  cd server && npm install
  cd ../client && npm install
  ```

### ✅ Backend Setup

- [ ] Backend `.env` file exists with required variables:
  ```
  JWT_SECRET=<minimum 32 characters>
  MONGODB_URI=mongodb://localhost:27017/your-db
  PORT=3000
  NODE_ENV=development
  ```

- [ ] Backend server starts without errors:
  ```bash
  cd server
  npm run dev
  ```
  
- [ ] Backend responds to health check:
  ```bash
  curl http://localhost:3000/api/health
  ```

- [ ] Database has test data:
  - [ ] At least 10 products
  - [ ] At least 1 test user
  - [ ] Test user has admin role

### ✅ Frontend Setup

- [ ] Frontend `.env` file exists:
  ```
  VITE_API_URL=http://localhost:3000
  ```

- [ ] Frontend dev server starts:
  ```bash
  cd client
  npm run dev
  ```

- [ ] Frontend loads at `http://localhost:5173`

- [ ] Can login with test credentials

### ✅ Test Configuration

- [ ] Test `.env` file exists at `client/e2e/.env`:
  ```
  TEST_USER_LOGIN=admin
  TEST_USER_PASSWORD=your-password
  BASE_URL=http://localhost:5173
  API_URL=http://localhost:3000
  ```

- [ ] Test credentials are valid (can login manually)

- [ ] Playwright browsers are installed:
  ```bash
  cd client
  npx playwright install
  ```

## Running Tests

### Option 1: Run All Tests
```bash
cd client
npx playwright test
```

### Option 2: Run Specific Suite
```bash
npx playwright test e2e/01-kassa-happy-path.spec.ts
```

### Option 3: Run in UI Mode (Recommended)
```bash
npx playwright test --ui
```

### Option 4: Run in Debug Mode
```bash
npx playwright test --debug
```

## After Tests Run

### ✅ Check Results

- [ ] View HTML report:
  ```bash
  npx playwright show-report
  ```

- [ ] Check test results summary in terminal

- [ ] Review failed test screenshots in `test-results/`

- [ ] Watch failed test videos in `test-results/`

### ✅ If Tests Fail

1. **Check Backend Logs**
   - Look for errors in backend terminal
   - Check for database connection issues
   - Verify API endpoints are responding

2. **Check Frontend Console**
   - Open browser DevTools
   - Look for JavaScript errors
   - Check network tab for failed requests

3. **Check Test Output**
   - Read error messages carefully
   - Look at screenshots of failures
   - Watch videos to see what happened

4. **Common Issues**
   - [ ] Backend not running → Start backend
   - [ ] Frontend not running → Start frontend
   - [ ] Wrong credentials → Update `.env` files
   - [ ] Database empty → Seed test data
   - [ ] Port conflicts → Change ports in config

## Quick Troubleshooting

### Tests timeout on search input
✅ FIXED - Updated helper methods with better waits

### Tests fail with "element not found"
- Check if page loaded completely
- Verify element has correct `data-testid`
- Try increasing timeout in test

### API tests return 500 errors
- Check backend logs for actual error
- Verify database connection
- Test endpoint manually with curl

### Tests are very slow
- Check backend performance
- Verify database has indexes
- Check network connectivity
- Consider increasing timeouts

### Authentication fails
- Verify test user exists in database
- Check JWT_SECRET is set correctly
- Verify token generation works
- Try logging in manually first

## Success Criteria

### Minimum Passing Tests
- [ ] At least 50% of tests pass (35/69)
- [ ] All happy path tests pass (01-kassa-happy-path.spec.ts)
- [ ] No timeout errors on search input
- [ ] API tests return proper status codes

### Ideal Passing Tests
- [ ] At least 80% of tests pass (55/69)
- [ ] All functional tests pass (01-03)
- [ ] Most UI/UX tests pass (04)
- [ ] Performance tests meet criteria (05)
- [ ] API tests all pass (06)

## Need Help?

### Review These Documents
1. `TEST_FIXES_SUMMARY.md` - What was fixed
2. `TEST_FIX_GUIDE.md` - How to fix remaining issues
3. `TEST_FAILURES_ANALYSIS.md` - Detailed failure analysis

### Debug Commands
```bash
# Run single test in debug mode
npx playwright test e2e/01-kassa-happy-path.spec.ts:19 --debug

# Run with headed browser
npx playwright test --headed --workers=1

# Generate trace
npx playwright test --trace on

# Show trace
npx playwright show-trace trace.zip
```

### Check Logs
```bash
# Backend logs
cd server && npm run dev

# Frontend logs  
cd client && npm run dev

# Test logs
cd client && npx playwright test --reporter=list
```

Good luck! 🚀
