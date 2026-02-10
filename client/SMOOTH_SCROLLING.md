# 📱 Instagram-Style Smooth Scrolling

Loyihada Instagram kabi smooth scrolling va pull-to-refresh qo'shildi!

## 🎯 Qo'shilgan Features

### 1. **Smooth Scrolling**

#### Asosiy scroll class'lar:
```jsx
// Instagram-style smooth scrolling
<div className="scroll-smooth-instagram overflow-y-auto">
  {/* Content */}
</div>

// Momentum scrolling (iOS uchun)
<div className="momentum-scroll overflow-y-auto">
  {/* Content */}
</div>

// Scroll container
<div className="scroll-container">
  {/* Content */}
</div>
```

### 2. **Pull-to-Refresh** 🆕

Instagram kabi pull-to-refresh funksiyasi:

```jsx
import { PullToRefresh } from '../components/PullToRefresh';

function MyPage() {
  const handleRefresh = async () => {
    // Ma'lumotlarni yangilash
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="scroll-smooth-instagram overflow-y-auto">
        {/* Content */}
      </div>
    </PullToRefresh>
  );
}
```

#### Custom hook:
```jsx
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function MyComponent() {
  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: async () => {
      await fetchData();
    },
    threshold: 80, // Pull masofasi (px)
    resistance: 0.5, // Pull resistance (0-1)
    enabled: true
  });

  return (
    <div>
      {isRefreshing && <p>Yangilanmoqda...</p>}
      {/* Content */}
    </div>
  );
}
```

#### Scroll snap (Stories kabi):
```jsx
// Vertical snap scrolling
<div className="scroll-snap-y overflow-y-auto">
  <div className="scroll-snap-center h-screen">Story 1</div>
  <div className="scroll-snap-center h-screen">Story 2</div>
  <div className="scroll-snap-center h-screen">Story 3</div>
</div>

// Mandatory snap (har doim snap qiladi)
<div className="scroll-snap-y-mandatory overflow-y-auto">
  {/* Content */}
</div>
```

#### Snap alignment:
```jsx
<div className="scroll-snap-start">Top ga snap</div>
<div className="scroll-snap-center">Center ga snap</div>
<div className="scroll-snap-end">Bottom ga snap</div>
```

## 📝 Misol: Product Grid

```jsx
// KassaPro.tsx yoki Products.tsx da
<PullToRefresh onRefresh={async () => await fetchProducts()}>
  <div className="scroll-smooth-instagram overflow-y-auto h-screen pb-20">
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  </div>
</PullToRefresh>
```

## 📝 Misol: Modal Scroll

```jsx
// Modal ichida smooth scroll
<div className="modal-content momentum-scroll overflow-y-auto max-h-[70vh]">
  {/* Modal content */}
</div>
```

## 📝 Misol: Stories-style Scroll

```jsx
// Instagram stories kabi
<div className="scroll-snap-y-mandatory overflow-y-auto h-screen">
  {stories.map(story => (
    <div key={story.id} className="scroll-snap-center h-screen flex items-center justify-center">
      <img src={story.image} alt={story.title} />
    </div>
  ))}
</div>
```

## 🎨 CSS Features

### Avtomatik qo'shilgan:
- ✅ `scroll-behavior: smooth` - smooth scrolling
- ✅ `-webkit-overflow-scrolling: touch` - iOS momentum
- ✅ `overscroll-behavior: contain` - bounce effect
- ✅ `transform: translate3d(0,0,0)` - GPU acceleration
- ✅ `will-change: scroll-position` - performance

### iOS Safari uchun:
- ✅ Momentum scrolling
- ✅ Smooth deceleration
- ✅ Hardware acceleration
- ✅ No jank/lag

## 🚀 Performance

Barcha scroll container'lar GPU-accelerated:
- Hardware acceleration
- 60 FPS smooth scrolling
- Minimal CPU usage
- Battery efficient

## 💡 Best Practices

1. **Katta list'lar uchun:**
```jsx
<PullToRefresh onRefresh={fetchData}>
  <div className="scroll-smooth-instagram overflow-y-auto">
    {/* Virtualization ishlatish tavsiya etiladi */}
  </div>
</PullToRefresh>
```

2. **Modal'lar uchun:**
```jsx
<div className="momentum-scroll overflow-y-auto max-h-[80vh]">
  {/* Modal content */}
</div>
```

3. **Stories/Reels uchun:**
```jsx
<div className="scroll-snap-y-mandatory overflow-y-auto h-screen">
  {/* Full-screen content */}
</div>
```

4. **Pull-to-refresh sozlamalari:**
```jsx
<PullToRefresh 
  onRefresh={fetchData}
  threshold={100}  // Pull masofasi (default: 80px)
  enabled={true}   // Yoqish/o'chirish
>
  {children}
</PullToRefresh>
```

## 🎯 Qayerda ishlatish kerak?

✅ **Ishlatish kerak:**
- Product grid'lar
- Modal content
- List'lar
- Feed'lar
- Stories/Reels

❌ **Ishlatmaslik kerak:**
- Kichik dropdown'lar
- Tooltip'lar
- Qisqa content

## 🔧 Troubleshooting

Agar scroll smooth bo'lmasa:
1. `scroll-smooth-instagram` class qo'shing
2. `overflow-y-auto` borligini tekshiring
3. Container'ga height bering
4. iOS'da test qiling

## 📱 Browser Support

- ✅ iOS Safari 13+
- ✅ Chrome 61+
- ✅ Firefox 68+
- ✅ Edge 79+
- ✅ Safari 14+

---

**Yaratildi:** 2024
**Maqsad:** Instagram-style smooth scrolling experience
