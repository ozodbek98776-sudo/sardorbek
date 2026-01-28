# Migratsiyani Ishga Tushirish

## To'g'ri buyruqlar:

### Windows CMD uchun:
```cmd
cd C:\Users\Ozodbek\Desktop\sardorbek.biznesjon.uz-backup-20260126-090727\sardorbek.biznesjon.uz\server
node migrate-images.js
```

### Yoki qisqaroq:
```cmd
cd sardorbek.biznesjon.uz\server
node migrate-images.js
```

## Agar xatolik chiqsa:

### 1. Papkani tekshirish:
```cmd
dir sardorbek.biznesjon.uz\server
```

### 2. Fayl borligini tekshirish:
```cmd
dir sardorbek.biznesjon.uz\server\migrate-images.js
```

### 3. To'g'ri papkaga o'tish:
```cmd
cd C:\Users\Ozodbek\Desktop\sardorbek.biznesjon.uz-backup-20260126-090727\sardorbek.biznesjon.uz
```

## Migratsiya kerak emasmi?

Agar database'da eski formatdagi rasmlar bo'lmasa, migratsiya qilish shart emas. Yangi yuklangan rasmlar avtomatik yangi formatda saqlanadi.

## Test qilish:

Migratsiyasiz ham test qilishingiz mumkin:
1. Serverni ishga tushiring
2. Kassa panelga kiring
3. Mahsulotga rasm yuklang
4. Rasm yuklash va o'chirish ishlashini tekshiring
