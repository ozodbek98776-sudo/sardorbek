# Debt Management System

A clean, reliable, and scalable debt management module for the shop management system.

## 🎯 Core Features

### 1. **Customer-Only Debt Page**
- Shows ONLY customers with remaining debt
- Clean, searchable customer list
- No products, sales creation, or admin buttons on main page
- Click customer to open detailed modal

### 2. **Smart Customer Search**
- Real-time search by customer name or phone number
- Case-insensitive and debounced for performance
- Filters customers with debt > 0 automatically

### 3. **Customer Debt Modal**
- Shows detailed debt information for selected customer
- Product filter (search purchased products only)
- Read-only view - no editing capabilities
- Auto-calculated totals and remaining debt

### 4. **Admin Sales Creation**
- Separate admin interface for creating sales/debt entries
- Product search with auto-fill pricing
- Automatic debt calculation: `remainingDebt = totalPrice - paidAmount`

## 🏗️ Architecture

### Database Schema

#### Customer Model
```javascript
{
  name: String,
  phone: String,
  createdAt: Date
}
```

#### Product Model
```javascript
{
  name: String,
  price: Number,
  code: String,
  // ... other fields
}
```

#### Sale Model (New)
```javascript
{
  customerId: ObjectId (ref Customer),
  productId: ObjectId (ref Product),
  quantity: Number,
  totalPrice: Number,
  paidAmount: Number,
  remainingDebt: Number (auto-calculated),
  createdAt: Date
}
```

### Backend API Endpoints

#### Debt Management
- `GET /api/debts/customers-with-debt?search=` - Get customers with remaining debt
- `GET /api/debts/customers/:id/details` - Get customer debt details
- `GET /api/debts/customers/:id/products?search=` - Filter customer's purchased products

#### Sales Management (Admin)
- `POST /api/sales` - Create new sale/debt entry
- `POST /api/sales/:id/payment` - Add payment to existing sale
- `GET /api/sales` - Get all sales (admin only)

#### Product Search (Admin)
- `GET /api/products?search=&limit=10` - Search products with limit

## 🔧 Business Logic

### Automatic Calculations
All debt calculations are performed on the backend:

```javascript
// Auto-calculated before saving
remainingDebt = totalPrice - paidAmount

// Customer's total debt = sum of all remainingDebt values
customerTotalDebt = Σ(sale.remainingDebt) where customerId = customer._id
```

### MongoDB Aggregation
Uses efficient aggregation pipelines for:
- Finding customers with debt
- Calculating customer totals
- Filtering purchased products

## 🎨 Frontend Components

### KassaDebts.tsx (Main Debt Page)
- **Location**: `/client/src/pages/kassa/KassaDebts.tsx`
- **Purpose**: Customer-only debt viewing interface
- **Features**:
  - Debounced search
  - Customer list with debt amounts
  - Modal for detailed view
  - Product filtering within modal

### Sales.tsx (Admin Interface)
- **Location**: `/client/src/pages/admin/Sales.tsx`
- **Purpose**: Admin sales creation interface
- **Features**:
  - Customer search and selection
  - Product search with auto-pricing
  - Real-time total calculations
  - Recent sales list

## 🚀 Usage

### For Cashiers (Debt Viewing)
1. Navigate to Debt page
2. Search for customers by name or phone
3. Click customer to view detailed debt information
4. Use product filter to find specific purchases
5. View totals and payment history

### For Admins (Sales Creation)
1. Navigate to Admin Sales page
2. Search and select customer
3. Search and select product (price auto-fills)
4. Enter quantity and paid amount
5. System calculates remaining debt automatically
6. Create sale entry

## 🔍 Key Benefits

### Performance
- Debounced search prevents excessive API calls
- MongoDB aggregation for efficient queries
- Limited product search results (max 10)

### User Experience
- Clean, minimal UI
- Mobile-friendly design
- Real-time calculations
- Clear debt visualization

### Data Integrity
- All calculations on backend
- Automatic debt computation
- Consistent data structure
- Proper error handling

## 🛠️ Development

### Running the System
```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev

# Seed sample data (optional)
cd server
node src/scripts/seedDebtData.js
```

### Testing the API
```bash
# Get customers with debt
curl "http://localhost:5000/api/debts/customers-with-debt"

# Get customer details
curl "http://localhost:5000/api/debts/customers/{customerId}/details"

# Create a sale (requires auth)
curl -X POST "http://localhost:5000/api/sales" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "customerId": "...",
    "productId": "...",
    "quantity": 2,
    "paidAmount": 100000
  }'
```

## 📝 File Structure

```
server/src/
├── models/
│   ├── Sale.js              # New sale model
│   ├── Customer.js          # Existing customer model
│   └── Product.js           # Existing product model
├── services/
│   └── debtService.js       # Business logic layer
├── controllers/
│   └── debtController.js    # Request handlers
├── routes/
│   ├── debts.js            # Updated debt routes
│   └── sales.js            # New sales routes
└── scripts/
    └── seedDebtData.js     # Sample data seeder

client/src/
├── pages/
│   ├── kassa/
│   │   └── KassaDebts.tsx  # Main debt viewing page
│   └── admin/
│       └── Sales.tsx       # Admin sales creation
└── types/
    └── index.ts            # Updated type definitions
```

## ✅ Requirements Compliance

- ✅ **Core Rule**: Debt page shows ONLY customers
- ✅ **Customer Search**: Debounced, case-insensitive, name + phone
- ✅ **Customer List**: Name, phone, total debt, click for modal
- ✅ **Modal View**: Customer details, product filter, read-only
- ✅ **Product Search**: Admin-only, limited results, auto-pricing
- ✅ **Business Logic**: Backend calculations, automatic debt computation
- ✅ **Database Schema**: Clean Customer/Product/Sale structure
- ✅ **API Requirements**: Efficient endpoints with aggregation
- ✅ **Frontend**: Minimal UI, mobile-friendly, no unnecessary elements
- ✅ **Code Quality**: Clean architecture, scalable structure, clear naming

## 🎉 Summary

This debt management system provides a clean, efficient solution for tracking customer debts with:

- **Separation of Concerns**: Debt viewing vs. sales creation
- **Automatic Calculations**: No manual debt computation
- **Efficient Queries**: MongoDB aggregation for performance
- **Clean UI**: Minimal, focused interfaces
- **Scalable Architecture**: Service layer, proper error handling
- **Type Safety**: Full TypeScript support

The system follows all specified requirements while maintaining clean code practices and optimal user experience.