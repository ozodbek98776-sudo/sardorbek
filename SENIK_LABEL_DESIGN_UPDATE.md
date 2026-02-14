# Senik Label Design Update - Complete

## Summary
Updated the label printing design to match the new 2-row layout specification:
- **Row 1:** Large QR code + Full product name + Product code
- **Row 2:** 80% price section | 20% discount section with automatic discount calculation

## Changes Made

### 1. BatchQRPrint Component (`client/src/components/BatchQRPrint.tsx`)

#### New Function Added:
```typescript
const getDiscountInfo = (product: Product) => {
  const prices = (product as any).prices || [];
  const discounts = prices.filter((p: any) => p.type.startsWith('discount'));
  return discounts.sort((a: any, b: any) => a.minQuantity - b.minQuantity);
};
```
- Extracts discount information from product prices array
- Filters for discount types (discount1, discount2, discount3)
- Sorts by minimum quantity

#### Updated Label HTML Structure:
```html
<div class="label">
  <div class="row-1">
    <!-- QR Code + Product Info -->
  </div>
  <div class="row-2">
    <!-- Price (80%) | Discounts (20%) -->
  </div>
</div>
```

#### New CSS Styles:
- **Row 1 Layout:**
  - Flex container with QR code and info section
  - Border-bottom separator
  - QR code: Configurable size (default 18mm)
  - Product name: Full name (no truncation)
  - Product code: "Kod: [code]"

- **Row 2 Layout:**
  - 80% price section (left side)
  - 20% discount section (right side)
  - Vertical separator line between sections
  - Price: Large, bold font (8pt)
  - Discounts: Small font (3.5pt), shows up to 2 discount tiers
  - Format: "10+ = 5%" (quantity + discount percent)

#### Updated Product Interface:
```typescript
interface Product {
  _id: string;
  code: string;
  name: string;
  price: number;
  unit?: string;
  prices?: any[];  // Added for discount data
}
```

### 2. Products Page (`client/src/pages/admin/Products.tsx`)

#### Updated Data Passing:
- Single product label: Now includes `prices` array
- Batch products: Now includes `prices` array for each product
- Enables discount information to be displayed on labels

## Label Design Details

### Row 1 (Product Information)
- **QR Code:** Large, clear QR code linking to product page
- **Product Name:** Full product name (7pt, bold) - increased from 5.5pt
- **Product Code:** Formatted as "Kod: [code]" (5.5pt, bold) - increased from 4pt
- **Layout:** Horizontal flex with QR on left, info on right

### Row 2 (Pricing & Discounts)
- **Price Section (80%):** 
  - Large, bold price display (10pt) - increased from 8pt
  - Format: "[price] so'm"
  - Centered alignment
  - Right border separator

- **Discount Section (20%):**
  - Shows up to 2 discount tiers (4.5pt, bold) - increased from 3.5pt
  - Format: "[minQuantity]+ = [percent]%"
  - Example: "10+ = 5%" means 5% discount for 10+ items
  - Automatic calculation from product prices array
  - Compact display with better readability

## Discount Calculation

The system automatically extracts and displays discounts:
1. Reads `prices` array from product
2. Filters for discount types (discount1, discount2, discount3)
3. Sorts by minimum quantity (ascending)
4. Displays top 2 discounts on label
5. Format: "minQuantity+ = discountPercent%"

Example:
- If product has: 10+ = 5%, 50+ = 10%, 100+ = 15%
- Label shows: "10+ = 5%" and "50+ = 10%"

## Label Dimensions

Default settings (customizable):
- Width: 40mm
- Height: 30mm
- QR Size: 18mm
- Columns: 2 per page

## Font Size Updates

All text sizes have been increased for better readability:

| Element | Old Size | New Size | Change |
|---------|----------|----------|--------|
| Product Name | 5.5pt | 7pt | +1.5pt |
| Product Code | 4pt | 5.5pt | +1.5pt |
| Price | 8pt | 10pt | +2pt |
| Discounts | 3.5pt | 4.5pt | +1pt |

Font weights also increased:
- Product Code: Now bold (600 weight)
- Discount Rows: Now bold (700 weight)

## Features
- ✅ 2-row label layout
- ✅ Large QR code
- ✅ Full product name (no truncation)
- ✅ Product code display
- ✅ 80/20 price-discount split
- ✅ Automatic discount extraction
- ✅ Up to 2 discount tiers displayed
- ✅ Customizable label dimensions
- ✅ Print-ready format

## Testing Checklist
- [ ] Click QR button on product card
- [ ] Verify label shows 2 rows
- [ ] Check QR code is large and clear
- [ ] Verify product name is full (not truncated)
- [ ] Check product code displays correctly
- [ ] Verify price displays in 80% section
- [ ] Check discounts display in 20% section
- [ ] Test with products having 1, 2, 3 discounts
- [ ] Print labels and verify layout
- [ ] Test batch printing with multiple products
- [ ] Verify QR codes scan correctly
