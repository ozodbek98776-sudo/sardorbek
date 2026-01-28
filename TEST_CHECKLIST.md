# Test Qo'llanmasi - Barcha Funksiyalarni Sinash

## 🚀 Boshlash

### 1. Migratsiya (Eski rasmlarni yangi formatga o'tkazish)
```bash
cd sardorbek.biznesjon.uz/server
node migrate-images.js
```

### 2. Serverni ishga tushirish
```bash
# Terminal 1 - Server
cd sardorbek.biznesjon.uz/server
npm start

# Terminal 2 - Client
cd sardorbek.biznesjon.uz/client
npm run dev
```

---

## 📋 Test Ro'yxati

### ✅ ADMIN PANEL

#### 1. Login
- [ ] Admin login: `admin` / `admin123`
- [ ] Noto'g'ri parol bilan kirish (xatolik ko'rsatilishi kerak)
- [ ] Token saqlash va avtomatik login

#### 2. Dashboard
- [ ] Statistika ko'rsatilishi (jami tovarlar, kam qolgan, tugagan)
- [ ] Grafik ko'rsatilishi
- [ ] Oxirgi sotuvlar ro'yxati

#### 3. Mahsulotlar (Products)
- [ ] **Mahsulot qo'shish**
  - Kod, nom, narx, miqdor
  - Rasm yuklash (1-8 ta)
  - Rasm siqish ishlashi
  - Muvaffaqiyatli saqlash
  
- [ ] **Mahsulot tahrirlash**
  - Mavjud mahsulotni tahrirlash
  - Rasmlarni qo'shish/o'chirish
  - O'zgarishlar saqlanishi
  
- [ ] **Mahsulot o'chirish**
  - Tasdiqlash modali
  - Muvaffaqiyatli o'chirish
  
- [ ] **Qidiruv va filter**
  - Nom bo'yicha qidiruv
  - Kod bo'yicha qidiruv
  - Stok filtri (barchasi, kam qolgan, tugagan)
  
- [ ] **Pagination**
  - 20 tadan yuklash
  - Scroll qilganda keyingi 20 ta yuklash
  - Background loading

- [ ] **QR kod**
  - QR kod generatsiya
  - QR kod yuklab olish
  - QR kod chop etish

#### 4. Xodimlar (Staff)
- [ ] Yangi xodim qo'shish
- [ ] Xodim tahrirlash
- [ ] Xodim o'chirish
- [ ] Telefon raqam validatsiyasi

#### 5. Cheklar (Receipts)
- [ ] Barcha cheklar ro'yxati
- [ ] Chek tafsilotlari
- [ ] Chek o'chirish
- [ ] Filter va qidiruv

---

### ✅ KASSA PANEL

#### 1. Login
- [ ] Kassa login: `kassachi` / `kassa321`
- [ ] JWT token saqlash
- [ ] Avtomatik login

#### 2. Asosiy Sahifa (KassaMain)
- [ ] **Mahsulotlar ro'yxati**
  - Barcha mahsulotlar ko'rsatilishi
  - Rasmlar to'g'ri ko'rsatilishi (eski va yangi format)
  - Qidiruv ishlashi
  - Kategoriya filtri
  
- [ ] **Savatchaga qo'shish**
  - Mahsulot tanlash
  - Miqdorni o'zgartirish
  - Savatchadan o'chirish
  - Jami summa hisoblash
  
- [ ] **Chek yaratish**
  - To'lov turi tanlash (naqd, karta, qarz)
  - Mijoz telefon raqami
  - Chek saqlash
  - Telegram'ga yuborish
  
- [ ] **QR Scanner**
  - QR kod skanerlash
  - Mahsulotni topish
  - Savatchaga qo'shish

#### 3. Mahsulotlar (KassaProducts)
- [ ] **Mahsulotlar ro'yxati**
  - 20 tadan yuklash
  - Infinite scroll
  - Rasmlar ko'rsatilishi
  
- [ ] **Rasm yuklash** ⭐ YANGI
  - Rasm tanlash
  - Siqish (compression)
  - Serverga yuklash
  - Darhol ko'rinishi
  - Metadata saqlash (uploadedBy: 'cashier')
  
- [ ] **Rasm o'chirish** ⭐ YANGI
  - Faqat o'zi yuklagan rasmlarni o'chirish
  - Admin rasmlarini o'chira olmasligi
  - X tugma faqat kassa rasmlarida ko'rinishi
  - Tasdiqlash modali
  
- [ ] **Qidiruv va filter**
  - Nom/kod bo'yicha qidiruv
  - Stok filtri

#### 4. Cheklar (KassaReceipts)
- [ ] Kassa cheklarini ko'rish
- [ ] Chek tafsilotlari
- [ ] Chek o'chirish (faqat o'ziniki)

---

## 🔍 Maxsus Test Stsenariylari

### Rasm Yuklash va O'chirish (Yangi Funksiya)

#### Test 1: Admin rasm yuklaydi
1. Admin panelga kiring
2. Mahsulot qo'shing/tahrirlang
3. Rasm yuklang
4. Tekshiring: `uploadedBy: 'admin'` bo'lishi kerak

#### Test 2: Kassa rasm yuklaydi
1. Kassa panelga kiring
2. Mahsulotlar bo'limiga o'ting
3. Mahsulot kodining yonidagi yashil tugmani bosing
4. Rasm yuklang
5. Tekshiring: 
   - Rasm darhol ko'rinishi kerak
   - Loading tez tugashi kerak
   - `uploadedBy: 'cashier'` bo'lishi kerak

#### Test 3: Kassa o'z rasmini o'chiradi
1. Kassa panelda mahsulot ustiga hover qiling
2. Qizil X tugma ko'rinishi kerak (faqat kassa rasmlari uchun)
3. X tugmani bosing
4. Tasdiqlash modalini tasdiqlang
5. Tekshiring: Rasm o'chirilishi kerak

#### Test 4: Kassa admin rasmini o'chira olmaydi
1. Admin panel orqali mahsulotga rasm yuklang
2. Kassa panelda o'sha mahsulotni oching
3. Tekshiring: X tugma ko'rinmasligi kerak
4. Agar API orqali o'chirishga urinsa: 403 xatolik

#### Test 5: Eski va yangi format birgalikda
1. Migratsiya qilmasdan test qiling
2. Eski formatdagi rasmlar ko'rinishi kerak
3. Yangi yuklangan rasmlar yangi formatda bo'lishi kerak
4. Ikkalasi ham to'g'ri ishlashi kerak

---

## 🐛 Kuzatish Kerak Bo'lgan Xatoliklar

### Client-side
- [ ] Console'da xatoliklar yo'q
- [ ] Network tab'da 404/500 xatoliklar yo'q
- [ ] Rasmlar yuklanmasa, fallback icon ko'rsatilishi
- [ ] Loading state'lar to'g'ri ishlashi

### Server-side
- [ ] Server console'da xatoliklar yo'q
- [ ] MongoDB'ga ulanish ishlashi
- [ ] File upload ishlashi
- [ ] Authorization to'g'ri ishlashi

### Performance
- [ ] Rasmlar siqilishi (80% quality)
- [ ] Pagination tez ishlashi
- [ ] Infinite scroll smooth bo'lishi
- [ ] API response vaqti < 1s

---

## 📊 Natijalar

### ✅ Ishlayotgan funksiyalar:
- 

### ❌ Xatoliklar:
- 

### ⚠️ Yaxshilash kerak:
- 

---

## 🔧 Muammolarni Hal Qilish

### Agar rasmlar ko'rinmasa:
1. `.env` faylini tekshiring: `VITE_UPLOADS_URL=http://localhost:8000`
2. Server ishlab turganini tekshiring
3. `uploads/products` papkasi mavjudligini tekshiring
4. Rasm yo'llari to'g'ri ekanligini tekshiring

### Agar rasm yuklash ishlamasa:
1. Server console'ni tekshiring
2. Network tab'da request'ni tekshiring
3. File size'ni tekshiring (juda katta bo'lmasin)
4. File format'ni tekshiring (JPG, PNG, WebP)

### Agar rasm o'chirish ishlamasa:
1. Kim yuklagan ekanligini tekshiring (uploadedBy)
2. Authorization token'ni tekshiring
3. Server console'da xatoliklarni tekshiring

---

## 📝 Qo'shimcha Eslatmalar

1. **Migratsiya**: Eski rasmlarni yangi formatga o'tkazish uchun `migrate-images.js` ni ishga tushiring
2. **Backup**: Test qilishdan oldin database backup oling
3. **Browser Cache**: Test qilishda browser cache'ni tozalang
4. **Mobile**: iPhone 15'da ham test qiling
5. **Network**: Slow 3G'da ham test qiling (DevTools)

---

Omad! 🚀
