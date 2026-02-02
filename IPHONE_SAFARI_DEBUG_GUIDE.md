# 🍎 iPhone Safari - Debugging Guide

## 📱 iPhone'da Xatoliklarni Topish

### 1. Safari Web Inspector Yoqish

**iPhone'da:**
1. Settings → Safari → Advanced
2. "Web Inspector" ni yoqing ✅

**Mac'da:**
1. Safari → Preferences → Advanced
2. "Show Develop menu" ni belgilang ✅

### 2. iPhone'ni Mac'ga Ulash

1. iPhone'ni USB orqali Mac'ga ulang
2. iPhone'da "Trust This Computer" ni bosing
3. Mac Safari'da: Develop → [iPhone nomi] → [Sahifa]

### 3. Console Loglarni Ko'rish

```javascript
// iPhone Safari console'da ko'rinadi:
🍎 Safari browser aniqlandi
📦 Sahifa 1: 20 ta mahsulot keldi
⚡ Sahifa 1: 20/20 ta maxsulot 234ms da yuklandi
📊 Pagination: Sahifa 1/5, Jami: 100
💰 Client-side jami qiymat: 15000000
```

---

## 🔍 Keng Tarqalgan Muammolar

### Muammo 1: `requestIdleCallback is not defined`

**Sabab:** Safari'da `requestIdleCallback` yo'q

**Yechim:** ✅ Polyfill qo'shildi
```typescript
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(scheduleStats, { timeout: 2000 });
} else {
  setTimeout(scheduleStats, 100); // Safari fallback
}
```

### Muammo 2: Touch Events Ishlamaydi

**Sabab:** Safari'da touch event'lar boshqacha ishlaydi

**Yechim:** ✅ Passive event listeners
```typescript
window.addEventListener('touchstart', handler, { passive: true });
window.addEventListener('touchmove', handler, { passive: false });
```

### Muammo 3: Scroll Muammolari

**Sabab:** Safari'da `-webkit-overflow-scrolling` kerak

**Yechim:** ✅ CSS'da qo'shilgan
```css
body {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: none;
}
```

### Muammo 4: Safe Area Insets

**Sabab:** iPhone notch va home indicator

**Yechim:** ✅ CSS variables
```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
}

body {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
}
```

### Muammo 5: Network Errors

**Sabab:** Safari'da ba'zan CORS yoki network muammolari

**Yechim:** ✅ Maxsus error handling
```typescript
if (isSafari && err.message?.includes('Network')) {
  errorMsg = 'Internet aloqasini tekshiring. Safari\'da ba\'zan aloqa muammolari bo\'lishi mumkin.';
}
```

---

## 🛠️ Debugging Commands

### Console'da Test Qilish

```javascript
// Safari detection
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
console.log('Safari:', isSafari);

// requestIdleCallback mavjudmi?
console.log('requestIdleCallback:', typeof requestIdleCallback);

// Touch support
console.log('Touch:', 'ontouchstart' in window);

// Safe area insets
console.log('Top inset:', getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'));
```

### Network Requests Monitor

```javascript
// Fetch interceptor
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('📡 Fetch:', args[0]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('✅ Response:', response.status);
      return response;
    })
    .catch(error => {
      console.error('❌ Fetch error:', error);
      throw error;
    });
};
```

---

## 📊 Performance Monitoring

### Memory Usage

```javascript
// Safari Performance API
if (performance.memory) {
  console.log('Memory:', {
    used: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    total: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
  });
}
```

### Load Time

```javascript
// Page load time
window.addEventListener('load', () => {
  const loadTime = performance.now();
  console.log('⏱️ Page loaded in:', loadTime.toFixed(2) + 'ms');
});
```

---

## 🔧 Safari-Specific Fixes

### 1. Disable Zoom on Input Focus

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

### 2. Prevent Bounce Scroll

```css
body {
  overscroll-behavior: none;
  position: fixed;
  width: 100%;
}
```

### 3. Fix 100vh Issue

```css
/* Safari'da 100vh muammosi */
.full-height {
  height: 100vh;
  height: -webkit-fill-available;
}
```

### 4. Smooth Scrolling

```css
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}
```

---

## 🚨 Emergency Debugging

### Agar Hech Narsa Ko'rinmasa:

1. **Safari Console'ni Oching:**
   - Mac Safari → Develop → [iPhone] → [Page]

2. **Xatolarni Ko'ring:**
   ```javascript
   // Console'da
   window.onerror = function(msg, url, line, col, error) {
     console.error('Global error:', { msg, url, line, col, error });
   };
   ```

3. **Network Tab'ni Tekshiring:**
   - Failed requests bormi?
   - CORS errors bormi?
   - Timeout errors bormi?

4. **Elements Tab'ni Tekshiring:**
   - DOM to'g'ri render bo'ldimi?
   - CSS styles qo'llanildimi?

---

## ✅ Checklist

iPhone Safari'da test qilishdan oldin:

- [ ] Web Inspector yoqilgan
- [ ] iPhone Mac'ga ulangan
- [ ] Safari Develop menu ochiq
- [ ] Console loglar ko'rinadi
- [ ] Network requests monitor qilinadi
- [ ] Touch events test qilingan
- [ ] Scroll smooth ishlaydi
- [ ] Safe area insets to'g'ri

---

## 📝 Keng Tarqalgan Console Messages

### Normal (✅):
```
🍎 Safari browser aniqlandi - maxsus optimizatsiyalar faol
📦 Sahifa 1: 20 ta mahsulot keldi
⚡ Sahifa 1: 20/20 ta maxsulot 234ms da yuklandi
💰 Client-side jami qiymat: 15000000
```

### Warning (⚠️):
```
⚠️ Mahsulot ID yo'q: {...}
⚠️ Mahsulot nomi yo'q: 123abc
⚠️ Sahifa 1: 2 ta invalid mahsulot o'tkazib yuborildi
```

### Error (❌):
```
❌ Mahsulotlarni yuklashda xatolik: Network Error
Error details: { message: "...", response: {...}, status: 500 }
```

---

## 🆘 Yordam

Agar muammo hal bo'lmasa:

1. Safari console loglarini screenshot qiling
2. Network tab'ni tekshiring
3. Error stack trace'ni ko'ring
4. iPhone model va iOS versiyasini ayting

**Texnik yordam:** Dasturchi bilan bog'laning
