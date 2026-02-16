# Senik Label Layout - Eng Mukammal Variant Tahlili

## 🎯 Hozirgi Layout (2-Qatorli)
```
┌─────────────────────────────────────────┐
│ ROW 1: QR + Mahsulot ma'lumotlari       │
│ ┌──────────┬──────────────────────────┐ │
│ │   QR     │ Nomi (7pt)               │ │
│ │ (18mm)   │ Kod (5.5pt)              │ │
│ └──────────┴──────────────────────────┘ │
├─────────────────────────────────────────┤
│ ROW 2: Narx (80%) | Chegirma (20%)      │
│ ┌──────────────────┬──────────────────┐ │
│ │ 50,000 so'm      │ 10+ = 5%         │ │
│ │ (10pt, bold)     │ 50+ = 10%        │ │
│ └──────────────────┴──────────────────┘ │
└─────────────────────────────────────────┘
```

**Afzalliklari:**
- ✅ Sodda va tushunarlı
- ✅ QR kod katta va aniq
- ✅ Narx va chegirma ko'rinadi
- ✅ Chop etishda yaxshi ko'rinadi

**Kamchiliklari:**
- ❌ Chegirma joyda kam (20% - juda kichik)
- ❌ Mahsulot nomi qisqartirilishi mumkin
- ❌ Kod va narx o'rtasida bo'sh joy
- ❌ Chegirma 2 ta qatordan ko'p bo'lsa, o'qish qiyin

---

## 💡 VARIANT 1: 3-Qatorli Layout (Optimal)
```
┌─────────────────────────────────────────┐
│ ROW 1: QR + Mahsulot nomi (60% + 40%)   │
│ ┌──────────┬──────────────────────────┐ │
│ │   QR     │ Mahsulot nomi (8pt)      │ │
│ │ (20mm)   │ Kod: 12345 (5pt)         │ │
│ └──────────┴──────────────────────────┘ │
├─────────────────────────────────────────┤
│ ROW 2: Narx (Katta va bold)              │
│ ┌─────────────────────────────────────┐ │
│ │ 50,000 so'm (12pt, bold)            │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ROW 3: Chegirma (Agar mavjud bo'lsa)    │
│ ┌─────────────────────────────────────┐ │
│ │ 10+ = 5% | 50+ = 10% | 100+ = 15%   │ │
│ │ (4pt, compact)                      │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Afzalliklari:**
- ✅ Har bir qator o'z vazifasiga ega
- ✅ Narx juda ko'rinadi (12pt)
- ✅ Chegirma ko'proq joy oladi
- ✅ Mahsulot nomi to'liq ko'rinadi
- ✅ Kod aniq ko'rinadi

**Kamchiliklari:**
- ❌ Label bo'yi ko'proq kerak (41mm → 50mm)
- ❌ Chegirma bo'lmasa, bo'sh joy qoladi

---

## 💡 VARIANT 2: Kompakt 2-Qatorli (Kichik labellar uchun)
```
┌──────────────────────────────┐
│ ROW 1: QR + Nomi + Kod       │
│ ┌────────┬──────────────────┐│
│ │  QR    │ Nomi (7pt)       ││
│ │(15mm)  │ Kod (4.5pt)      ││
│ └────────┴──────────────────┘│
├──────────────────────────────┤
│ ROW 2: Narx + Chegirma       │
│ ┌────────────┬──────────────┐│
│ │ 50,000 so'm│ 10+ = 5%     ││
│ │ (11pt)     │ (4pt)        ││
│ └────────────┴──────────────┘│
└──────────────────────────────┘
```

**Afzalliklari:**
- ✅ Kichik labellar uchun ideal (40x30mm)
- ✅ Kompakt va samarali
- ✅ Chop etishda tez

**Kamchiliklari:**
- ❌ Mahsulot nomi qisqartirilishi mumkin
- ❌ Chegirma ko'p bo'lsa, o'qish qiyin

---

## 💡 VARIANT 3: Premium Layout (Katta labellar uchun)
```
┌─────────────────────────────────────────────┐
│ ROW 1: QR (Katta) + Mahsulot ma'lumotlari   │
│ ┌──────────────┬──────────────────────────┐ │
│ │              │ Mahsulot nomi (9pt)      │ │
│ │     QR       │ Kod: 12345 (6pt)         │ │
│ │  (25mm)      │ Kategoriya (5pt)         │ │
│ │              │ Birlik: dona (5pt)       │ │
│ └──────────────┴──────────────────────────┘ │
├─────────────────────────────────────────────┤
│ ROW 2: Narx (Juda katta)                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 50,000 so'm (14pt, bold, blue)          │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ ROW 3: Chegirma (Batafsil)                  │
│ ┌─────────────────────────────────────────┐ │
│ │ 10+ = 5% | 50+ = 10% | 100+ = 15%       │ │
│ │ (5pt, green background)                 │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Afzalliklari:**
- ✅ Juda professional ko'rinadi
- ✅ Barcha ma'lumot ko'rinadi
- ✅ Kategoriya va birlik ko'rsatiladi
- ✅ Chegirma aniq ko'rinadi

**Kamchiliklari:**
- ❌ Katta labellar kerak (100x150mm yoki A4)
- ❌ Chop etishda ko'p qog'oz sarflanadi

---

## 💡 VARIANT 4: Dinamik Layout (Chegirmaga qarab)
```
CHEGIRMA BO'LMASA:
┌─────────────────────────────────────────┐
│ ROW 1: QR + Nomi + Kod                  │
│ ┌──────────┬──────────────────────────┐ │
│ │   QR     │ Nomi (8pt)               │ │
│ │ (18mm)   │ Kod (5.5pt)              │ │
│ └──────────┴──────────────────────────┘ │
├─────────────────────────────────────────┤
│ ROW 2: Narx (Katta - 12pt)              │
│ ┌─────────────────────────────────────┐ │
│ │ 50,000 so'm                         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

CHEGIRMA BO'LSA:
┌─────────────────────────────────────────┐
│ ROW 1: QR + Nomi + Kod                  │
│ ┌──────────┬──────────────────────────┐ │
│ │   QR     │ Nomi (7pt)               │ │
│ │ (18mm)   │ Kod (5pt)                │ │
│ └──────────┴──────────────────────────┘ │
├─────────────────────────────────────────┤
│ ROW 2: Narx (70%) | Chegirma (30%)      │
│ ┌──────────────────┬──────────────────┐ │
│ │ 50,000 so'm      │ 10+ = 5%         │ │
│ │ (11pt)           │ 50+ = 10%        │ │
│ │                  │ (4.5pt)          │ │
│ └──────────────────┴──────────────────┘ │
└─────────────────────────────────────────┘
```

**Afzalliklari:**
- ✅ Chegirmaga qarab o'zgaradi
- ✅ Chegirma bo'lmasa, narx katta bo'ladi
- ✅ Chegirma bo'lsa, kompakt bo'ladi
- ✅ Juda smart va flexible

**Kamchiliklari:**
- ❌ Kod murakkab (conditional rendering)
- ❌ Dizayn inconsistent bo'lishi mumkin

---

## 🏆 TAVSIYA: VARIANT 1 (3-Qatorli) - ENG MUKAMMAL

### Sabablari:
1. **Balansli** - Har bir qator o'z vazifasiga ega
2. **O'qish oson** - Yuqoridan pastga ketma-ket o'qiladi
3. **Flexible** - Chegirma bo'lsa-bo'lmasa, yaxshi ko'rinadi
4. **Professional** - Biznes uchun mos
5. **Chop etishda yaxshi** - Printer'da aniq ko'rinadi
6. **Scalable** - Turli o'lchamdagi labellar uchun mos

### Optimal O'lchamlar:
- **Kichik**: 40mm x 35mm (2 qatorli)
- **Standart**: 57mm x 50mm (3 qatorli) ← **TAVSIYA**
- **Katta**: 100mm x 80mm (3 qatorli)

### Font Sizes (3-Qatorli uchun):
| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Mahsulot nomi | 8pt | 700 | #000 |
| Kod | 5pt | 600 | #333 |
| Narx | 12pt | 900 | #0066CC |
| Chegirma | 4pt | 600 | #666 |

---

## 📋 VARIANT 1 UCHUN CSS

```css
.label {
  width: 57mm;
  height: 50mm;
  padding: 1mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: white;
  page-break-inside: avoid;
}

/* ROW 1: QR + Mahsulot ma'lumotlari */
.label-row-1 {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.5mm;
  flex: 0 0 auto;
  padding-bottom: 1mm;
  border-bottom: 0.5pt solid #ddd;
}

.qr-code {
  width: 20mm;
  height: 20mm;
  flex: 0 0 auto;
  image-rendering: pixelated;
}

.product-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5mm;
}

.product-name {
  font-size: 8pt;
  font-weight: 700;
  color: #000;
  line-height: 1.1;
  word-break: break-word;
}

.product-code {
  font-size: 5pt;
  font-weight: 600;
  color: #333;
}

/* ROW 2: Narx */
.label-row-2 {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 1mm 0;
  border-bottom: 0.5pt solid #ddd;
}

.product-price {
  font-size: 12pt;
  font-weight: 900;
  color: #0066CC;
  line-height: 1;
}

/* ROW 3: Chegirma */
.label-row-3 {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding-top: 0.5mm;
}

.discount-info {
  font-size: 4pt;
  font-weight: 600;
  color: #666;
  text-align: center;
  line-height: 1.2;
}
```

---

## 🔄 VARIANT 4 (Dinamik) - AGAR ADVANCED BO'LISHNI XOHLASANGIZ

Chegirmaga qarab o'zgaradigan layout - eng smart variant.

```typescript
const getDiscountInfo = (product: Product) => {
  const prices = (product as any).prices || [];
  const discounts = prices.filter((p: any) => p.type.startsWith('discount'));
  return discounts.sort((a: any, b: any) => a.minQuantity - b.minQuantity);
};

const hasDiscounts = getDiscountInfo(product).length > 0;

// Chegirmaga qarab font size o'zgaradi
const productNameSize = hasDiscounts ? '7pt' : '8pt';
const priceSize = hasDiscounts ? '11pt' : '12pt';
```

---

## 📊 TAQQOSLASH JADVALI

| Xususiyat | Variant 1 | Variant 2 | Variant 3 | Variant 4 |
|-----------|----------|----------|----------|----------|
| Qatorlar | 3 | 2 | 3 | 2-3 |
| O'lcham | 57x50mm | 40x30mm | 100x80mm | 57x50mm |
| Narx ko'rinishi | Yaxshi | Yaxshi | Juda yaxshi | Yaxshi |
| Chegirma ko'rinishi | Yaxshi | Qisqa | Juda yaxshi | Yaxshi |
| Kod ko'rinishi | Aniq | Kichik | Aniq | Aniq |
| Chop etish | Tez | Tez | Sekin | Tez |
| Professional | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Murakkablik | Oddiy | Oddiy | Murakkab | O'rta |

---

## ✅ TAVSIYA QILGAN VARIANT: 1 (3-Qatorli)

**Sabab:** Balansli, professional, va barcha o'lchamdagi labellar uchun mos.

**Keyingi qadam:** Kodda implement qilish uchun tayyor!
