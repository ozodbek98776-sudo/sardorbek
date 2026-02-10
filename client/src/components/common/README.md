# Universal Components Library

Admin panel uchun universal va qayta ishlatilishi mumkin bo'lgan komponentlar kutubxonasi.

## 📦 Komponentlar Ro'yxati

### 1. **StatCard** - Statistika kartochkasi
Statistik ma'lumotlarni ko'rsatish uchun - faqat title, count va icon.

```tsx
<StatCard
  title="Jami Mijozlar"
  value="1,234"
  icon={Users}
  color="blue"
  onClick={() => console.log('clicked')}
/>
```

**Props:**
- `title` - Qisqa sarlavha (masalan: "Jami", "Bugun", "Aktiv")
- `value` - Qiymat (raqam yoki matn)
- `icon` - Lucide icon
- `color` - Rang (blue, green, purple, orange, red, cyan, indigo)
- `onClick` - Click handler (optional)
- `loading` - Yuklanish holati (optional)

---

### 2. **UniversalPageHeader** - Sahifa header
Barcha sahifalar uchun universal header.

```tsx
<UniversalPageHeader
  title="Mijozlar"
  subtitle="Barcha mijozlar ro'yxati"
  icon={Users}
  showSearch
  searchValue={search}
  onSearchChange={setSearch}
  filterOptions={[
    { value: 'all', label: 'Barchasi' },
    { value: 'active', label: 'Faol' }
  ]}
  filterValue={filter}
  onFilterChange={setFilter}
  actions={
    <ActionButton icon={Plus} onClick={handleAdd}>
      Qo'shish
    </ActionButton>
  }
/>
```

---

### 3. **DataTable** - Universal jadval
Ma'lumotlarni jadval ko'rinishida ko'rsatish.

```tsx
<DataTable
  columns={[
    { key: 'name', label: 'Ism', sortable: true },
    { key: 'phone', label: 'Telefon' },
    { 
      key: 'status', 
      label: 'Status',
      render: (item) => <Badge variant="success">{item.status}</Badge>
    }
  ]}
  data={customers}
  keyExtractor={(item) => item.id}
  onRowClick={(item) => console.log(item)}
  sortBy="name"
  sortOrder="asc"
  onSort={handleSort}
/>
```

---

### 4. **Card** - Universal karta
Kontent uchun karta komponenti.

```tsx
<Card
  title="Mijoz ma'lumotlari"
  subtitle="Asosiy ma'lumotlar"
  headerAction={<button>Edit</button>}
  footer={<button>Save</button>}
  padding="md"
  hover
>
  <p>Content here...</p>
</Card>
```

---

### 5. **Modal** - Universal modal
Modal oynalar uchun.

```tsx
<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Yangi mijoz"
  size="md"
  footer={
    <div className="flex gap-3">
      <button onClick={() => setShowModal(false)}>Bekor qilish</button>
      <button onClick={handleSave}>Saqlash</button>
    </div>
  }
>
  <form>...</form>
</Modal>
```

---

### 6. **ActionButton** - Action tugma
Barcha action tugmalar uchun.

```tsx
<ActionButton
  icon={Plus}
  variant="primary"
  size="md"
  onClick={handleClick}
  loading={isLoading}
>
  Qo'shish
</ActionButton>
```

**Variants:** primary, secondary, success, danger, warning

---

### 7. **Badge** - Badge
Status va kategoriyalarni ko'rsatish.

```tsx
<Badge variant="success" size="md">
  Faol
</Badge>
```

**Variants:** default, primary, success, warning, danger, info

---

### 8. **EmptyState** - Bo'sh holat
Ma'lumot yo'q holatini ko'rsatish.

```tsx
<EmptyState
  icon={Users}
  title="Mijozlar topilmadi"
  description="Hozircha mijozlar yo'q. Birinchi mijozni qo'shing."
  action={
    <ActionButton icon={Plus} onClick={handleAdd}>
      Mijoz qo'shish
    </ActionButton>
  }
/>
```

---

### 9. **LoadingSpinner** - Yuklanish
Yuklanish holatini ko'rsatish.

```tsx
<LoadingSpinner size="lg" text="Yuklanmoqda..." />
<LoadingSpinner fullScreen />
```

---

### 10. **Pagination** - Sahifalash
Sahifalash uchun.

```tsx
<Pagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  showPageNumbers
/>
```

---

### 11. **SearchInput** - Qidiruv
Qidiruv input.

```tsx
<SearchInput
  value={search}
  onChange={setSearch}
  placeholder="Qidirish..."
  debounce={300}
/>
```

---

### 12. **FilterDropdown** - Filter
Filter dropdown.

```tsx
<FilterDropdown
  options={[
    { value: 'all', label: 'Barchasi' },
    { value: 'active', label: 'Faol' }
  ]}
  value={filter}
  onChange={setFilter}
/>
```

---

## 🎨 Dizayn Tizimi

Barcha komponentlar bir xil dizayn tizimidan foydalanadi:

- **Ranglar:** brand (purple), blue, green, orange, red, cyan, indigo
- **Border radius:** rounded-xl (12px), rounded-2xl (16px)
- **Shadows:** shadow-sm, shadow-lg, shadow-xl
- **Transitions:** duration-200, duration-300
- **Spacing:** 4px grid (p-4, p-6, p-8)

---

## 📝 Ishlatish

```tsx
import {
  StatCard,
  UniversalPageHeader,
  DataTable,
  Card,
  Modal,
  ActionButton,
  Badge,
  EmptyState,
  LoadingSpinner,
  Pagination
} from '@/components/common';
```

---

## ✅ Afzalliklar

1. **Bir xil dizayn** - Barcha sahifalarda bir xil ko'rinish
2. **Qayta ishlatish** - Kod takrorlanmaydi
3. **Oson o'zgartirish** - Bir joyda o'zgartirish barcha joyda ta'sir qiladi
4. **TypeScript** - To'liq type safety
5. **Responsive** - Mobile va desktop uchun moslashgan
6. **Accessibility** - Keyboard navigation va screen reader support
