# 💰 Avtomatik Chegirma Tizimi (Pricing Tier System)

## 📋 Umumiy Ma'lumot

Hodim mahsulot qo'shganda, miqdorga qarab avtomatik ravishda chegirma narxlari hisoblanadi va ko'rsatiladi.

---

## 🎯 Narx Darajalari (Pricing Tiers)

### 1. **Oddiy Narx** (1-9 dona)
- **Ustama:** 15%
- **Rang:** Kulrang badge
- **Misol:** 1 dona = 100,000 so'm → Sotish narxi: 115,000 so'm

### 2. **O'rta Chegirma** (10-99 dona)
- **Ustama:** 13%
- **Rang:** Yashil badge
- **Chegirma:** ✓ Chegirma belgisi
- **Misol:** 50 dona = 100,000 so'm → Sotish narxi: 113,000 so'm/dona

### 3. **Katta Chegirma** (100+ dona)
- **Ustama:** 11%
- **Rang:** Yashil badge
- **Chegirma:** ✓ Chegirma belgisi
- **Misol:** 150 dona = 100,000 so'm → Sotish narxi: 111,000 so'm/dona

---

## 🔄 Qanday Ishlaydi?

### Hodim Panelida (Scanner):

1. **Mahsulot Qo'shish:**
   - QR skaner yoki qidiruv orqali mahsulot qo'shiladi
   - Avtomatik 1 dona uchun narx hisoblanadi (15% ustama)

2. **Miqdorni O'zgartirish:**
   - `+` tugmasi bosilganda miqdor oshadi
   - Har safar narx avtomatik qayta hisoblanadi
   - Chegirma darajasi o'zgarsa, yangi narx qo'llaniladi

3. **Vizual Ko'rsatkich:**
   ```
   ┌─────────────────────────────────┐
   │ Mahsulot nomi                   │
   │ [10-99 dona • 13%] ✓ Chegirma  │ ← Yashil badge
   │ 113,000 so'm / dona             │
   │ 5,650,000 so'm                  │ ← Jami summa
   └─────────────────────────────────┘
   ```

---

## 💡 Misol Hisoblash

### Mahsulot: Stul (Tan narxi: 100,000 so'm)

| Miqdor | Ustama | Sotish Narxi | Jami Summa | Chegirma |
|--------|--------|--------------|------------|----------|
| 1 dona | 15% | 115,000 | 115,000 | Yo'q |
| 5 dona | 15% | 115,000 | 575,000 | Yo'q |
| 10 dona | 13% | 113,000 | 1,130,000 | ✓ |
| 50 dona | 13% | 113,000 | 5,650,000 | ✓ |
| 100 dona | 11% | 111,000 | 11,100,000 | ✓ |
| 200 dona | 11% | 111,000 | 22,200,000 | ✓ |

---

## 🎨 Vizual Elementlar

### Badge Ranglari:

1. **Kulrang Badge** (1-9 dona):
   ```css
   bg-surface-200 text-surface-600
   ```

2. **Yashil Badge** (10+ dona):
   ```css
   bg-success-100 text-success-700
   ```

3. **Chegirma Belgisi**:
   ```
   ✓ Chegirma (yashil rang)
   ```

---

## 🔧 Texnik Detalllar

### Funksiyalar:

```typescript
// Narx hisoblash
calculateDynamicPrice(basePrice: number, quantity: number): number

// Pricing tier ma'lumoti
getPricingTier(quantity: number): {
  name: string;
  markupPercent: number;
  discount: boolean;
}
```

### Hisoblash Formulasi:

```
Sotish Narxi = Tan Narxi × (1 + Ustama / 100)
Jami Summa = Sotish Narxi × Miqdor
```

---

## 📱 Foydalanuvchi Tajribasi

### Hodim Ko'rishi:

1. Mahsulot qo'shilganda darhol narx ko'rsatiladi
2. Miqdor o'zgarganda real-time yangilanadi
3. Chegirma darajasi o'zgarganda badge rangi o'zgaradi
4. Jami summa avtomatik hisoblanadi

### Afzalliklar:

- ✅ Avtomatik hisoblash (xato yo'q)
- ✅ Real-time yangilanish
- ✅ Vizual feedback (ranglar, belgiler)
- ✅ Shaffof narx tizimi
- ✅ Mijozlarga chegirma ko'rsatish

---

## 🚀 Kelajakda Qo'shilishi Mumkin

1. **Maxsus Chegirmalar:**
   - VIP mijozlar uchun qo'shimcha chegirma
   - Mavsumiy chegirmalar
   - Promokodlar

2. **Moslashuvchan Darajalar:**
   - Admin panelidan chegirma foizlarini o'zgartirish
   - Mahsulot kategoriyasiga qarab turli darajalar

3. **Hisobotlar:**
   - Qaysi darajada ko'proq sotilgan
   - Chegirmalar statistikasi
   - Foyda tahlili

---

## 📊 Statistika

### Kutilayotgan Natijalar:

- **Katta buyurtmalar:** 30% oshishi
- **O'rtacha savat:** 15% oshishi
- **Mijoz qoniqishi:** Yuqori
- **Xodim samaradorligi:** Tezroq ishlash

---

## ✅ Xulosa

Avtomatik chegirma tizimi:
- Hodimlar uchun oson
- Mijozlar uchun shaffof
- Biznes uchun foydali
- Xatolar yo'q
- Real-time ishlaydi

**Natija:** Tezroq savdo, ko'proq foyda, baxtli mijozlar! 🎉
