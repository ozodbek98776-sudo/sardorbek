# 👆 Professional Swipe Navigation - Foydalanish Qo'llanmasi

## 🎯 Xususiyatlar

### ✅ Nima Qo'shildi?

1. **Full-Screen Swipe Navigation**
   - Ekranning **istalgan joyidan** o'nga swipe qilsangiz → **orqaga qaytadi**
   - Professional iOS/Android uslubida
   - Smooth va responsive animatsiyalar

2. **Smart Detection**
   - Input maydonlarida yozayotganda ishlamaydi
   - Modal va dialog oynalarda ishlamaydi
   - Vertikal scroll bilan konflikt qilmaydi
   - Scrollable elementlarda faqat edge swipe

3. **Velocity-Based Navigation**
   - Tez swipe qilsangiz kam masofa kerak
   - Sekin swipe qilsangiz ko'proq masofa kerak
   - Natural va intuitive his

## 📱 Qanday Ishlaydi?

### O'ngga Swipe (Orqaga Qaytish)
```
Ekranning istalgan joyidan boshlab:
┌─────────────────┐
│  ←──────────    │  O'ngga swipe
│                 │  = Orqaga qaytish
│                 │
└─────────────────┘
```

### Minimal Masofa
- **Default**: 80px (professional feel)
- **Tez swipe**: 48px (60% of threshold)
- **Sekin swipe**: 80px (100% of threshold)

## 🔧 Konfiguratsiya

### Default Settings (SwipeNavigator.tsx)
```typescript
useBackSwipe({
  threshold: 80,           // Minimal 80px surish kerak
  edgeThreshold: 30,       // Edge mode uchun
  disableOnInput: true,    // Inputlarda ishlamaydi
  fullScreenSwipe: true    // Ekranning istalgan joyidan
});
```

### Custom Settings (Agar kerak bo'lsa)
```typescript
// Faqat ekran chetlaridan
useBackSwipe({
  fullScreenSwipe: false,  // Edge mode
  threshold: 60
});

// Inputlarda ham ishlashi
useBackSwipe({
  disableOnInput: false
});

// Katta threshold (kam sensitive)
useBackSwipe({
  threshold: 120
});
```

## 🎨 CSS Animatsiyalar

### Page Transitions
```css
.page-transition {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Swipe Indicator (Optional)
```html
<div class="swipe-indicator">
  ←
</div>
```

## 🚫 Qayerda Ishlamaydi?

1. **Input maydonlarda** - yozayotganda
2. **Modal oynalarda** - `.modal`, `.overlay`, `[role="dialog"]`
3. **Scrollable elementlarda** - faqat edge swipe
4. **`.no-swipe` class bilan** - maxsus bloklash

### Maxsus Bloklash
```html
<!-- Bu elementda swipe ishlamaydi -->
<div class="no-swipe">
  <input type="text" />
</div>
```

## 📊 Performance

### Optimizatsiyalar
- ✅ `will-change` CSS property
- ✅ `requestAnimationFrame` for smooth navigation
- ✅ Passive event listeners (where possible)
- ✅ Touch event optimization
- ✅ Minimal re-renders

### Browser Support
- ✅ Chrome/Edge (Android & Desktop)
- ✅ Safari (iOS & macOS)
- ✅ Firefox (Android & Desktop)
- ✅ Samsung Internet
- ✅ Opera Mobile

## 🧪 Test Qilish

### Desktop da Test
1. Chrome DevTools ochish (F12)
2. Device Toolbar yoqish (Ctrl+Shift+M)
3. Mobile device tanlash
4. Touch events simulatsiya qilish

### Real Device da Test
1. Telefonda loyihani ochish
2. Istalgan sahifaga kirish
3. Ekranning istalgan joyidan o'nga swipe qilish
4. Orqaga qaytishni tekshirish

## 🔍 Debugging

### Console Logs
```typescript
// useBackSwipe.ts da debug uchun
console.log('Swipe started:', { startX, startY });
console.log('Swipe ended:', { deltaX, deltaY, velocity });
console.log('Navigation triggered:', direction);
```

### Event Monitoring
```javascript
// Browser console da
window.addEventListener('touchstart', (e) => {
  console.log('Touch start:', e.touches[0].clientX);
});

window.addEventListener('touchend', (e) => {
  console.log('Touch end:', e.changedTouches[0].clientX);
});
```

## 🎯 Best Practices

### ✅ Do's
- Ekranning istalgan joyidan swipe qiling
- Natural va smooth harakatlar
- Vertikal scroll bilan aralashtirib yubormang
- Input maydonlarida yozayotganda swipe qilmang

### ❌ Don'ts
- Juda qisqa swipe (80px dan kam)
- Diagonal swipe (vertikal + gorizontal)
- Modal ochiq bo'lganda swipe
- Input focus bo'lganda swipe

## 🚀 Kelajakda Qo'shilishi Mumkin

1. **Visual Feedback**
   - Swipe progress indicator
   - Haptic feedback (vibration)
   - Edge glow effect

2. **Advanced Features**
   - Swipe to refresh
   - Swipe between tabs
   - Custom swipe actions

3. **Accessibility**
   - Keyboard shortcuts
   - Screen reader support
   - Reduced motion support

## 📝 Changelog

### v1.0.0 (2026-01-30)
- ✅ Full-screen swipe navigation
- ✅ Smart input detection
- ✅ Velocity-based threshold
- ✅ Smooth animations
- ✅ Professional iOS/Android feel

## 🤝 Muallif

**Senior Developer Implementation**
- Professional touch interactions
- Optimized performance
- Production-ready code
- Comprehensive documentation

---

**Savol yoki muammo bo'lsa:**
- Code ni tekshiring: `useBackSwipe.ts`
- CSS ni tekshiring: `index.css`
- Component ni tekshiring: `SwipeNavigator.tsx`
