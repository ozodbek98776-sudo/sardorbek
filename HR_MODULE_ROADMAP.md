# 🎯 HR MODULE - TO'LIQ REJALASHTIRISH VA ROADMAP

## 📋 UMUMIY MA'LUMOT

**Maqsad:** Admin panel uchun to'liq HR (Human Resources) moduli yaratish

**Asosiy Funksiyalar:**
1. ✅ Xodimlar boshqaruvi
2. ✅ Fixed maosh + KPI-based bonus tizimi
3. ✅ Admin tomonidan moslashuvchan KPI yaratish
4. ✅ Maosh hisoblash va to'lash
5. ✅ Davomat tizimi
6. ✅ Hisobotlar va analytics

---

## 🏗️ ARXITEKTURA

### Frontend Struktura:
```
client/src/pages/admin/hr/
├── HRDashboard.tsx              # Asosiy HR sahifasi (Overview)
├── Employees.tsx                # Xodimlar ro'yxati
├── EmployeeProfile.tsx          # Xodim profili
├── SalarySettings.tsx           # Maosh sozlamalari
├── KPITemplates.tsx             # KPI shablonlar (Admin yaratadi)
├── KPIManagement.tsx            # KPI boshqaruvi
├── Payroll.tsx                  # Maosh to'lash
├── Attendance.tsx               # Davomat
└── Reports.tsx                  # HR hisobotlar

client/src/components/hr/
├── EmployeeCard.tsx
├── SalaryModal.tsx
├── KPITemplateModal.tsx
├── KPIAssignModal.tsx
├── PayrollTable.tsx
├── AttendanceCalendar.tsx
├── PerformanceChart.tsx
└── HRStats.tsx
```

### Backend Struktura:
```
server/src/models/
├── Employee.js                  # Xodim modeli (User modelini kengaytirish)
├── SalarySetting.js             # Maosh sozlamalari
├── KPITemplate.js               # KPI shablonlar
├── KPIAssignment.js             # Xodimga biriktirilgan KPI
├── KPIRecord.js                 # KPI natijalar (oylik)
├── Payroll.js                   # Maosh to'lovlari
├── Attendance.js                # Davomat
└── AdvancePayment.js            # Avans to'lovlar

server/src/routes/
├── hr/
│   ├── employees.js
│   ├── salary.js
│   ├── kpi.js
│   ├── payroll.js
│   ├── attendance.js
│   └── reports.js

server/src/services/
├── SalaryCalculator.js          # Maosh hisoblash
├── KPICalculator.js             # KPI hisoblash
└── PayrollService.js            # Maosh to'lash xizmati
```

---

## 📊 DATA MODELS

### 1. Employee (Xodim)
```javascript
{
  _id: ObjectId,
  name: String,
  phone: String,
  role: String,              // cashier, helper
  login: String,
  password: String,
  
  // HR ma'lumotlar
  employeeId: String,        // Xodim ID (unique)
  hireDate: Date,            // Ishga qabul qilingan sana
  position: String,          // Lavozim
  department: String,        // Bo'lim
  
  // Shaxsiy ma'lumotlar
  birthDate: Date,
  address: String,
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // Hujjatlar
  passportSeries: String,
  passportNumber: String,
  inn: String,
  
  // Status
  status: String,            // active, inactive, terminated
  terminationDate: Date,
  terminationReason: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 2. SalarySetting (Maosh Sozlamalari)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  
  // Fixed maosh
  baseSalary: Number,        // Asosiy maosh
  
  // Bonus sozlamalari
  bonusEnabled: Boolean,
  maxBonus: Number,          // Maksimal bonus
  minBonus: Number,          // Minimal bonus
  
  // Qo'shimcha to'lovlar
  allowances: [{
    type: String,            // transport, meal, housing
    amount: Number,
    description: String
  }],
  
  // Chegirmalar
  deductions: [{
    type: String,            // tax, insurance, loan
    amount: Number,
    percentage: Number,
    description: String
  }],
  
  effectiveFrom: Date,       // Qachondan amal qiladi
  effectiveTo: Date,         // Qachongacha
  
  createdBy: ObjectId,       // ref: User (Admin)
  createdAt: Date,
  updatedAt: Date
}
```

### 3. KPITemplate (KPI Shablon)
```javascript
{
  _id: ObjectId,
  name: String,              // "Savdo hajmi", "Cheklar soni"
  code: String,              // "SALES_AMOUNT", "RECEIPT_COUNT"
  description: String,
  
  // KPI turi
  type: String,              // SALES_AMOUNT, RECEIPT_COUNT, AVERAGE_CHECK, 
                             // ATTENDANCE, ERROR_COUNT, CUSTOM
  
  // Hisoblash usuli
  calculationMethod: String, // PERCENTAGE, TARGET_BASED, RANGE_BASED, INVERSE
  
  // Parametrlar
  unit: String,              // so'm, dona, %, kun
  targetValue: Number,       // Maqsad qiymat
  minValue: Number,          // Minimal qiymat
  maxValue: Number,          // Maksimal qiymat
  
  // Og'irlik (bonus hisoblashda)
  weight: Number,            // 0-100 (foiz)
  
  // Bonus hisoblash
  bonusPerPoint: Number,     // Har bir ball uchun bonus
  maxBonusFromThis: Number,  // Bu KPI dan maksimal bonus
  
  // Qo'llaniladigan rollar
  applicableRoles: [String], // ['cashier', 'helper']
  
  // Status
  isActive: Boolean,
  
  createdBy: ObjectId,       // ref: User (Admin)
  createdAt: Date,
  updatedAt: Date
}
```

### 4. KPIAssignment (KPI Biriktirish)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  kpiTemplate: ObjectId,     // ref: KPITemplate
  
  // Shaxsiy maqsadlar (agar kerak bo'lsa)
  customTarget: Number,
  customWeight: Number,
  
  // Vaqt oralig'i
  startDate: Date,
  endDate: Date,
  
  isActive: Boolean,
  
  assignedBy: ObjectId,      // ref: User (Admin)
  createdAt: Date,
  updatedAt: Date
}
```

### 5. KPIRecord (KPI Natijalar)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  kpiTemplate: ObjectId,     // ref: KPITemplate
  
  // Vaqt davri
  period: String,            // "2024-01" (YYYY-MM)
  year: Number,
  month: Number,
  
  // Natijalar
  targetValue: Number,       // Maqsad
  actualValue: Number,       // Haqiqiy natija
  achievementRate: Number,   // Erishish foizi (0-100+)
  
  // Bonus
  bonusEarned: Number,       // Bu KPI dan olingan bonus
  
  // Hisoblash ma'lumotlari
  calculatedAt: Date,
  calculatedBy: String,      // 'auto' yoki admin ID
  
  // Izohlar
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 6. Payroll (Maosh To'lovi)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  
  // Vaqt davri
  period: String,            // "2024-01"
  year: Number,
  month: Number,
  
  // Maosh tarkibi
  baseSalary: Number,        // Asosiy maosh
  totalBonus: Number,        // Jami bonus (barcha KPI dan)
  allowances: Number,        // Qo'shimcha to'lovlar
  deductions: Number,        // Chegirmalar
  advancePayments: Number,   // Avans to'lovlar
  
  // Jami
  grossSalary: Number,       // Yalpi maosh (base + bonus + allowances)
  netSalary: Number,         // Sof maosh (gross - deductions - advance)
  
  // KPI breakdown
  kpiBreakdown: [{
    kpiTemplate: ObjectId,
    kpiName: String,
    targetValue: Number,
    actualValue: Number,
    achievementRate: Number,
    bonusEarned: Number
  }],
  
  // To'lov holati
  status: String,            // pending, paid, cancelled
  paymentDate: Date,
  paymentMethod: String,     // cash, bank_transfer
  
  // Izohlar
  notes: String,
  
  // Tasdiqlash
  approvedBy: ObjectId,      // ref: User (Admin)
  approvedAt: Date,
  
  createdBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 7. Attendance (Davomat)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  
  date: Date,                // Kun
  
  // Vaqt
  checkIn: Date,             // Kelgan vaqt
  checkOut: Date,            // Ketgan vaqt
  workHours: Number,         // Ishlagan soatlar
  
  // Status
  status: String,            // present, absent, late, half_day, sick, vacation
  
  // Kech qolish
  isLate: Boolean,
  lateMinutes: Number,
  
  // Izoh
  notes: String,
  
  // Tasdiqlash
  approvedBy: ObjectId,
  approvedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}
```

### 8. AdvancePayment (Avans)
```javascript
{
  _id: ObjectId,
  employee: ObjectId,        // ref: Employee
  
  amount: Number,
  reason: String,
  
  // Qaytarish
  deductFromSalary: Boolean,
  deductionPeriod: String,   // "2024-01"
  
  // Status
  status: String,            // pending, approved, rejected, deducted
  
  // Tasdiqlash
  requestedAt: Date,
  approvedBy: ObjectId,
  approvedAt: Date,
  
  notes: String,
  
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 FUNKSIYALAR RO'YXATI

### PHASE 1: ASOSIY TUZILMA (1-hafta)

#### ✅ Task 1.1: Backend Models
- [x] Employee model yaratish
- [x] SalarySetting model yaratish
- [x] KPITemplate model yaratish
- [x] KPIAssignment model yaratish
- [x] KPIRecord model yaratish
- [x] Payroll model yaratish
- [x] Attendance model yaratish
- [x] AdvancePayment model yaratish

#### ✅ Task 1.2: Backend Routes va API
- [x] `/api/hr/employees` - CRUD
- [x] `/api/hr/salary` - Maosh sozlamalari
- [x] `/api/hr/kpi/templates` - KPI shablonlar
- [x] `/api/hr/kpi/assignments` - KPI biriktirish
- [x] `/api/hr/kpi/records` - KPI natijalar
- [x] `/api/hr/payroll` - Maosh to'lash
- [x] `/api/hr/attendance` - Davomat
- [ ] `/api/hr/advance` - Avans

#### ✅ Task 1.3: Backend Services
- [x] SalaryCalculator.js - Maosh hisoblash
- [x] KPICalculator.js - KPI hisoblash
- [x] PayrollService.js - Maosh to'lash xizmati

#### ✅ Task 1.4: Frontend - HR Dashboard
- [x] HRDashboard.tsx - Asosiy sahifa
- [x] HRStats.tsx - Statistika komponentlari
- [x] Quick actions va navigation

---

### PHASE 2: XODIMLAR VA MAOSH (1-hafta)

#### ✅ Task 2.1: Xodimlar Boshqaruvi
- [x] Employees.tsx - Xodimlar ro'yxati
- [ ] EmployeeProfile.tsx - Xodim profili
- [x] EmployeeModal.tsx - Xodim qo'shish/tahrirlash
- [x] EmployeeCard.tsx - Xodim kartochkasi

#### ✅ Task 2.2: Maosh Sozlamalari
- [ ] SalarySettings.tsx - Maosh sozlamalari sahifasi
- [ ] SalaryModal.tsx - Maosh belgilash modali
- [x] Fixed maosh belgilash (backend)
- [x] Bonus limitlari (backend)
- [x] Qo'shimcha to'lovlar (allowances) (backend)
- [x] Chegirmalar (deductions) (backend)

---

### PHASE 3: KPI TIZIMI (1-hafta)

#### ✅ Task 3.1: KPI Shablonlar
- [ ] KPITemplates.tsx - KPI shablonlar sahifasi
- [ ] KPITemplateModal.tsx - KPI yaratish modali
- [x] KPI turlari (backend)
- [x] Hisoblash usullari (backend)
- [x] Og'irlik va bonus parametrlari (backend)

#### ✅ Task 3.2: KPI Biriktirish
- [ ] KPIManagement.tsx - KPI boshqaruvi
- [ ] KPIAssignModal.tsx - Xodimga KPI biriktirish
- [x] Shaxsiy maqsadlar belgilash (backend)
- [x] KPI aktivlashtirish/o'chirish (backend)

#### ✅ Task 3.3: KPI Monitoring
- [ ] Real-time KPI tracking
- [ ] KPI progress bars
- [ ] KPI achievement charts
- [x] Avtomatik KPI hisoblash (backend service)

---

### PHASE 4: MAOSH TO'LASH (1-hafta)

#### ✅ Task 4.1: Payroll Sahifasi
- [x] Payroll.tsx - Maosh to'lash sahifasi
- [x] PayrollTable.tsx - Maosh jadvali
- [x] Oylik maosh hisoblash
- [x] Fixed + Bonus + Allowances - Deductions - Advance
- [x] Payslip yaratish (detail modal)

#### ⏳ Task 4.2: Avans Tizimi
- [ ] AdvancePaymentModal.tsx - Avans berish
- [ ] Avans so'rash (xodim tomonidan)
- [ ] Avans tasdiqlash (admin tomonidan)
- [x] Maoshdan avtomatik chegirish (backend)

#### ⏳ Task 4.3: To'lov Tarixi
- [x] Payment history table
- [x] Filterlar (oy, xodim, status)
- [ ] Export to Excel/PDF

---

### PHASE 5: DAVOMAT TIZIMI (3-4 kun)

#### ✅ Task 5.1: Davomat Sahifasi
- [ ] Attendance.tsx - Davomat sahifasi
- [ ] AttendanceCalendar.tsx - Kalendar ko'rinishi
- [ ] Kunlik check-in/check-out
- [ ] Kech qolish belgilash

#### ✅ Task 5.2: Davomat Hisoboti
- [ ] Oylik davomat hisoboti
- [ ] Davomat statistikasi
- [ ] Kech qolishlar ro'yxati

---

### PHASE 6: HISOBOTLAR VA ANALYTICS (3-4 kun)

#### ✅ Task 6.1: HR Hisobotlar
- [ ] Reports.tsx - Hisobotlar sahifasi
- [ ] Oylik maosh hisoboti
- [ ] KPI performance hisoboti
- [ ] Davomat hisoboti
- [ ] Xodimlar statistikasi

#### ✅ Task 6.2: Charts va Visualizations
- [ ] PerformanceChart.tsx - Performance chartlar
- [ ] Salary trends
- [ ] KPI achievement trends
- [ ] Attendance trends

#### ✅ Task 6.3: Export Funksiyalari
- [ ] Export to Excel
- [ ] Export to PDF
- [ ] Print payslips

---

### PHASE 7: INTEGRATSIYA (2-3 kun)

#### ✅ Task 7.1: Expenses Integratsiyasi
- [ ] Maosh to'lovlarini Expenses ga avtomatik qo'shish
- [ ] Ish haqi kategoriyasi
- [ ] Source: 'payroll'

#### ✅ Task 7.2: Receipts Integratsiyasi
- [ ] Xodim cheklari bilan KPI hisoblash
- [ ] Avtomatik KPI yangilash
- [ ] Real-time KPI tracking

#### ✅ Task 7.3: Sidebar va Routing
- [ ] HR menu qo'shish
- [ ] Routing sozlash
- [ ] Permissions (faqat admin)

---

### PHASE 8: QOSHIMCHA FUNKSIYALAR (Ixtiyoriy)

#### ✅ Task 8.1: Xodim Dashboard
- [ ] Xodim o'z KPI ni ko'radi
- [ ] O'z maoshini ko'radi
- [ ] Davomat tarixi
- [ ] Avans so'rash

#### ✅ Task 8.2: Notifications
- [ ] Maosh to'landi - notification
- [ ] KPI maqsadga yetdi - notification
- [ ] Avans tasdiqlandi - notification

#### ✅ Task 8.3: Mobile Optimization
- [ ] Responsive design
- [ ] Touch-friendly
- [ ] iOS optimization

---

## 📅 TIMELINE

### Umumiy Vaqt: 4-5 hafta

```
Week 1: Backend + HR Dashboard
Week 2: Xodimlar + Maosh Sozlamalari
Week 3: KPI Tizimi
Week 4: Payroll + Davomat
Week 5: Hisobotlar + Integratsiya + Testing
```

---

## 🎨 UI/UX DIZAYN

### Sidebar Struktura:
```
📊 Dashboard
🛒 Kassa (POS)
📦 Tovarlar
📁 Kategoriyalar
👥 Mijozlar
💳 Qarzlar
💰 Qayta Xarajatlar
👨‍💼 HR Moduli ⬅️ YANGI
  ├── 📊 Dashboard
  ├── 👥 Xodimlar
  ├── 💵 Maosh Sozlamalari
  ├── 🎯 KPI Boshqaruvi
  ├── 💰 Maosh To'lash
  ├── 📅 Davomat
  └── 📈 Hisobotlar
```

### Color Scheme:
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Danger: Red (#EF4444)
- HR Accent: Purple (#8B5CF6)

---

## 🔒 XAVFSIZLIK

1. **Ruxsatlar:** Faqat admin role
2. **Rate Limiting:** adminLimiter middleware
3. **Data Encryption:** Sensitive ma'lumotlar shifrlangan
4. **Audit Log:** Barcha o'zgarishlar log qilinadi
5. **Backup:** Kunlik avtomatik backup

---

## 📝 TESTING

### Unit Tests:
- [ ] SalaryCalculator tests
- [ ] KPICalculator tests
- [ ] PayrollService tests

### Integration Tests:
- [ ] API endpoint tests
- [ ] Database tests

### E2E Tests:
- [ ] User flow tests
- [ ] Critical path tests

---

## 🚀 DEPLOYMENT

### Pre-deployment Checklist:
- [ ] All tests passing
- [ ] Database migrations
- [ ] Environment variables
- [ ] Backup strategy
- [ ] Monitoring setup

### Deployment Steps:
1. Database backup
2. Run migrations
3. Deploy backend
4. Deploy frontend
5. Smoke tests
6. Monitor logs

---

## 📚 DOCUMENTATION

### User Documentation:
- [ ] Admin guide
- [ ] Employee guide
- [ ] FAQ

### Technical Documentation:
- [ ] API documentation
- [ ] Database schema
- [ ] Architecture diagram
- [ ] Deployment guide

---

## ✅ SUCCESS CRITERIA

1. ✅ Admin maosh va KPI belgilashi mumkin
2. ✅ KPI avtomatik hisoblanadi
3. ✅ Maosh to'g'ri hisoblangan
4. ✅ Davomat nazorat qilinadi
5. ✅ Hisobotlar to'liq va aniq
6. ✅ Tizim tez va barqaror ishlaydi
7. ✅ Mobile-friendly
8. ✅ Xavfsiz va himoyalangan

---

## 🎯 KEYINGI QADAMLAR

1. **Tasdiqlash:** Ushbu rejani ko'rib chiqing
2. **Prioritetlash:** Qaysi phase birinchi?
3. **Boshlash:** Birinchi taskni boshlaymiz!

---

**Savol:** Qaysi phase dan boshlashni xohlaysiz? 

Men tavsiya qilaman:
1. Phase 1 (Backend Models) - Asos
2. Phase 2 (Xodimlar + Maosh) - Asosiy funksiya
3. Phase 3 (KPI) - Eng muhim qism

Rozi bo'lsangiz, darhol Phase 1 ni boshlaymiz! 🚀
