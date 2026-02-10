# 🧪 Unit Tests

## Test Qo'llanma

### Test Ishga Tushirish

```bash
# Barcha testlarni ishga tushirish
npm test

# Watch mode (development)
npm run test:watch

# Coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

### Test Fayllari

#### 1. **products.test.js** - Mahsulotlar API
- ✅ Mahsulot yaratish (oddiy va chegirmali)
- ✅ Mahsulotlarni olish (pagination, filter, search)
- ✅ Statistika (cache bilan)
- ✅ Mahsulot yangilash va o'chirish
- ✅ Stock filter (low, out)

#### 2. **pricing.test.js** - Narx Hisoblash
- ✅ Chegirma hisoblash (5%, 10%, 15%, 50%, 100%)
- ✅ Eng yaxshi narxni tanlash
- ✅ Miqdorga qarab chegirma
- ✅ Edge cases (0%, manfiy qiymatlar)

#### 3. **hr-kpi.test.js** - HR/KPI Sistema
- ✅ KPI yaratish
- ✅ Kunlik tekshirish
- ✅ Oylik bonus hisoblash
- ✅ Takroriy tekshirish
- ✅ Turli oylar uchun hisoblash

### Test Ma'lumotlar Bazasi

Testlar alohida test database ishlatadi:
```
mongodb://localhost:27017/kassa-test
```

Yoki `.env.test` faylida:
```
MONGO_URI_TEST=mongodb://localhost:27017/kassa-test
```

### Coverage

Minimal coverage requirements:
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

### Test Yozish Qoidalari

1. **Har bir test mustaqil bo'lishi kerak**
   ```javascript
   beforeEach(async () => {
     await Model.deleteMany({});
   });
   ```

2. **Descriptive test names**
   ```javascript
   it('✅ Yangi mahsulot yaratish', async () => {
     // test code
   });
   ```

3. **Arrange-Act-Assert pattern**
   ```javascript
   // Arrange
   const data = { name: 'Test' };
   
   // Act
   const result = await api.post('/endpoint').send(data);
   
   // Assert
   expect(result.status).toBe(201);
   ```

4. **Mock external dependencies**
   ```javascript
   jest.mock('../src/middleware/auth');
   ```

### Debugging

```bash
# Node inspector bilan
node --inspect-brk node_modules/.bin/jest --runInBand

# Bitta test file
npm test -- products.test.js

# Bitta test case
npm test -- -t "Yangi mahsulot yaratish"
```

### CI/CD Integration

GitHub Actions yoki boshqa CI/CD da:
```yaml
- name: Run tests
  run: npm test
  
- name: Upload coverage
  run: npm run test:coverage
```

## Qo'shimcha Testlar

Keyingi qadamlar:
- [ ] Customer API tests
- [ ] Receipt/Order tests
- [ ] Authentication tests
- [ ] Warehouse tests
- [ ] Integration tests
- [ ] E2E tests
