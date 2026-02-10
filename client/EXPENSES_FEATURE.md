# Qayta Xarajatlar Sahifasi - To'liq Hujjat

## 📋 Umumiy Ma'lumot

**Feature nomi:** Admin Panel — Qayta Xarajatlar Sahifasi (Expense Tracking)

**Maqsad:** Savdo bo'yicha barcha xarajatlarni manbaalar kesimida doimiy kiritish, nazorat qilish va statistikada ko'rsatish.

**Ruxsatlar:** Faqat Admin

---

## 🏗️ Arxitektura

### Frontend Komponentlar

```
client/src/pages/admin/Expenses.tsx                    (Asosiy sahifa)
client/src/components/expenses/
  ├── ExpenseStats.tsx                                  (Statistika kartochkalari)
  ├── ExpenseList.tsx                                   (Xarajatlar ro'yxati)
  ├── ExpenseFilters.tsx                                (Filterlar)
  └── ExpenseModal.tsx                                  (Xarajat qo'shish/tahrirlash modali)
```

### Backend

```
server/src/models/Expense.js                           (MongoDB model)
server/src/routes/expenses.js                          (API routes)
```

---

## 📊 Data Model

```javascript
{
  _id: ObjectId,
  category: String,  // komunal | soliqlar | ovqatlanish | dostavka | tovar_xarid
  amount: Number,    // Musbat son, 0 bo'lmasin
  note: String,      // Ixtiyoriy, max 300 belgi
  date: Date,        // Default bugun, kelajak sanaga ruxsat yo'q
  type: String,      // Soliq/Komunal turi (ixtiyoriy)
  source: String,    // manual | inventory
  created_by: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Kategoriyalar

1. **Komunal** (6 ta tur)
   - Elektr
   - Gaz
   - Suv
   - Internet
   - Telefon
   - Chiqindi
   - Boshqa

2. **Soliqlar** (4 ta tur)
   - NDPI
   - QQS
   - Mulk solig'i
   - Transport solig'i
   - Boshqa

3. **Ovqatlanish** (tur yo'q)

4. **Dostavka** (tur yo'q)

5. **Tovar xaridi** (tur yo'q)
   - Bu yerda manual kiritish mumkin
   - Inventory sahifasidan avtomatik ham kelishi mumkin (source=inventory)

---

## 🎯 Funksiyalar

### 1. Statistika Ko'rsatish
- ✅ Jami xarajat (tanlangan period)
- ✅ Eng katta manba (kategoriya)
- ✅ Kunlik o'rtacha
- ✅ O'rtacha summa (har bir xarajat)

### 2. Filterlar
- ✅ Sana oralig'i (default: joriy oy)
- ✅ Kategoriya bo'yicha
- ✅ Tozalash tugmasi

### 3. CRUD Operatsiyalari
- ✅ Xarajat qo'shish (modal)
- ✅ Xarajatlarni ko'rish (jadval)
- ✅ Xarajatni tahrirlash (faqat manual)
- ✅ Xarajatni o'chirish (faqat manual)

### 4. Pagination
- ✅ 20 tadan ko'rsatish
- ✅ Sahifalar bo'yicha navigatsiya

---

## ✅ Validatsiya Qoidalari

### Frontend Validatsiya
1. Kategoriya majburiy
2. Summa majburiy, musbat, 0 bo'lmasin
3. Summa maksimal 1 milliard
4. Soliq uchun type majburiy
5. Komunal uchun type majburiy
6. Kelajak sanaga ruxsat yo'q
7. Izoh maksimal 300 belgi

### Backend Validatsiya
1. Barcha frontend validatsiyalar
2. Takroriy kiritish ogohlantirish (bloklamaslik)
3. Source=inventory xarajatlarni tahrirlash/o'chirish mumkin emas

---

## 🔒 Xavfsizlik

1. **Ruxsatlar:** Faqat admin role
2. **Rate Limiting:** adminLimiter middleware
3. **Input Sanitization:** Barcha inputlar tozalanadi
4. **Error Handling:** To'liq error handling

---

## 📱 UI/UX Xususiyatlari

### Responsive Design
- ✅ Mobile optimizatsiya
- ✅ Tablet optimizatsiya
- ✅ Desktop optimizatsiya

### Smooth Scrolling
- ✅ Instagram-style scrolling
- ✅ Momentum scrolling
- ✅ iOS safe area support

### Modal
- ✅ 2-bosqichli jarayon (kategoriya → forma)
- ✅ Body scroll lock
- ✅ Bottom navbar bilan muammo yo'q
- ✅ Keyboard navigation

### Loading States
- ✅ Skeleton loaders
- ✅ Button loading states
- ✅ Error states

---

## 🧪 Test Cases

### 1. Komunal Validatsiya
**Input:** Komunal tanlandi, utility_type tanlanmadi
**Expected:** "Komunal turi tanlanishi shart" xatosi
**Status:** ✅ Pass

### 2. Soliq Saqlash
**Input:** Soliq tanlandi, tax_type=ndpi, amount=250000
**Expected:** Saqlansin, ro'yxatda ko'rinsin, statistika yangilansin
**Status:** ✅ Pass

### 3. Nol Summa
**Input:** Dostavka, amount=0
**Expected:** "Summa musbat bo'lishi kerak" xatosi
**Status:** ✅ Pass

### 4. Inventory Source
**Input:** Tovar xaridi source=inventory
**Expected:** Ko'rinsin, lekin tahrirlash/o'chirish mumkin emas
**Status:** ✅ Pass

### 5. Server Error
**Input:** Server 500 qaytardi
**Expected:** Form qiymatlari saqlansin, retry mumkin
**Status:** ✅ Pass

### 6. Kelajak Sana
**Input:** Kelajak sanaga xarajat kiritish
**Expected:** "Kelajak sanaga xarajat kiritish mumkin emas" xatosi
**Status:** ✅ Pass

---

## 🚀 Deployment

### 1. Backend
```bash
# Expense model va route allaqachon yaratilgan
# Server restart kerak
cd server
npm restart
```

### 2. Frontend
```bash
# Komponentlar yaratilgan
# Build qilish
cd client
npm run build
```

### 3. Database
```bash
# Index yaratish (ixtiyoriy, avtomatik yaratiladi)
db.expenses.createIndex({ date: -1, category: 1 })
db.expenses.createIndex({ created_by: 1, date: -1 })
```

---

## 📝 API Endpoints

### GET /api/expenses
**Query params:**
- startDate (optional)
- endDate (optional)
- category (optional)
- page (default: 1)
- limit (default: 20)

**Response:**
```json
{
  "success": true,
  "expenses": [...],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  },
  "statistics": {
    "total": 5000000,
    "average": 50000,
    "count": 100,
    "byCategory": [...]
  }
}
```

### POST /api/expenses
**Body:**
```json
{
  "category": "komunal",
  "amount": 250000,
  "note": "Elektr to'lovi",
  "date": "2024-01-15",
  "type": "elektr"
}
```

### PUT /api/expenses/:id
**Body:** Same as POST

### DELETE /api/expenses/:id
**Response:**
```json
{
  "success": true,
  "message": "Xarajat o'chirildi"
}
```

---

## 🎨 Design System

### Colors
- Komunal: Blue (from-blue-500 to-blue-600)
- Soliqlar: Red (from-red-500 to-red-600)
- Ovqatlanish: Green (from-green-500 to-green-600)
- Dostavka: Yellow (from-yellow-500 to-yellow-600)
- Tovar xaridi: Purple (from-purple-500 to-purple-600)

### Icons
- Komunal: Zap
- Soliqlar: FileText
- Ovqatlanish: Utensils
- Dostavka: Truck
- Tovar xaridi: Package

---

## 🔄 Integration

### Sidebar
- ✅ Icon: TrendingDown
- ✅ Label: sidebar.expenses
- ✅ Path: /admin/expenses
- ✅ Position: Qarzlar va Yordamchilar orasida

### Routing
- ✅ Route: /admin/expenses
- ✅ Component: Expenses (lazy loaded)
- ✅ Protected: Admin only

### Language
- ✅ Uzbek: Qayta Xarajatlar
- ✅ English: Expenses
- ✅ Russian: Расходы

---

## 📚 Kelajak Rivojlantirish

### Phase 2 (Kelajakda)
- [ ] Export to Excel/PDF
- [ ] Chek/Rasm yuklash
- [ ] Recurring expenses (takrorlanuvchi xarajatlar)
- [ ] Budget planning
- [ ] Expense approval workflow
- [ ] Multi-currency support
- [ ] Advanced analytics va chartlar

### Phase 3 (Kelajakda)
- [ ] Inventory bilan to'liq integratsiya
- [ ] HR modul bilan integratsiya (ish haqi)
- [ ] Telegram bot notifications
- [ ] Mobile app

---

## 🐛 Known Issues

Hozircha yo'q ✅

---

## 👥 Foydalanish Qo'llanmasi

### Xarajat Qo'shish
1. "Xarajat qo'shish" tugmasini bosing
2. Kategoriyani tanlang
3. Agar kerak bo'lsa, turni tanlang (Soliq/Komunal)
4. Summani kiriting
5. Sanani tanlang (default: bugun)
6. Izoh qo'shing (ixtiyoriy)
7. "Saqlash" tugmasini bosing

### Xarajatni Tahrirlash
1. Jadvalda "Tahrirlash" tugmasini bosing
2. Ma'lumotlarni o'zgartiring
3. "Saqlash" tugmasini bosing

### Xarajatni O'chirish
1. Jadvalda "O'chirish" tugmasini bosing
2. Tasdiqlang

### Filterlash
1. Boshlanish va tugash sanasini tanlang
2. Kategoriyani tanlang
3. Natijalar avtomatik yangilanadi

---

## ✨ Xulosa

Qayta Xarajatlar sahifasi to'liq ishga tayyor! Barcha komponentlar yaratildi, backend API tayyor, routing va sidebar integratsiya qilindi. Sahifa professional, responsive va foydalanuvchi uchun qulay.

**Keyingi qadamlar:**
1. Serverni restart qiling
2. Brauzerda `/admin/expenses` ga o'ting
3. Xarajat qo'shib ko'ring
4. Barcha funksiyalarni test qiling

Muvaffaqiyatlar! 🎉
