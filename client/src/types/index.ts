export type UserRole = 'admin' | 'cashier' | 'helper';

export interface User {
  _id: string;
  name: string;
  login?: string; // Admin login
  phone: string;
  role: UserRole;
  createdAt: string;
}

export interface ProductImage {
  path: string;
  uploadedBy: 'admin' | 'cashier';
  uploadedAt: string;
}

// YANGI NARX TIZIMI TURLARI
export type PriceType = 'cost' | 'unit' | 'box' | 'discount1' | 'discount2' | 'discount3';
export type UnitType = 'dona' | 'kg' | 'metr' | 'litr' | 'karobka';

export interface ProductPrice {
  type: PriceType;
  amount: number;
  minQuantity?: number;
  discountPercent?: number;
  isActive: boolean;
}

export interface BoxInfo {
  unitsPerBox: number;
  boxWeight: number;
}

export interface Product {
  _id: string;
  name: string;
  description?: string;
  
  // YANGI NARX TIZIMI
  unit: UnitType;
  prices: ProductPrice[];
  boxInfo?: BoxInfo;
  
  // ESKI NARX FIELDLARI (backward compatibility uchun)
  costPrice?: number;
  unitPrice?: number;
  boxPrice?: number;
  price?: number;
  previousPrice?: number;
  currentPrice?: number;
  
  quantity: number;
  warehouse: string | { _id: string; name: string };
  isMainWarehouse?: boolean;
  category?: string;
  subcategory?: string;
  image?: string;
  images?: (string | ProductImage)[];
  minStock?: number;
  
  // ESKI TIZIM FIELDLARI (backward compatibility)
  pricingTiers?: {
    tier1?: { minQuantity: number; maxQuantity: number; discountPercent: number };
    tier2?: { minQuantity: number; maxQuantity: number; discountPercent: number };
    tier3?: { minQuantity: number; maxQuantity: number; discountPercent: number };
  };
  
  unitConversion?: {
    enabled: boolean;
    baseUnit: 'dona' | 'metr' | 'gram' | 'kg' | 'litr';
    conversionRate: number;
    packageCount: number;
    totalBaseUnits: number;
  };
  
  prices_old?: {
    perUnit: number;
    perMeter: number;
    perGram: number;
    perKg: number;
    perRoll: number;
    perBox: number;
  };
}

// KASSA UCHUN MAHSULOT TIPI
export interface KassaProduct extends Product {
  // Kassa uchun tez hisoblash
  unitPrice: number;
  boxPrice: number;
  costPrice: number;
  discountPrices: Array<{
    amount: number;
    minQuantity: number;
    discountPercent: number;
  }>;
}

// NARX HISOBLASH NATIJASI
export interface PriceCalculation {
  price: number;
  originalPrice: number;
  appliedDiscount?: {
    type: string;
    percent: number;
    minQuantity: number;
  };
  saleType: 'unit' | 'box';
  unit: UnitType;
}

export interface CartItem extends Product {
  cartQuantity: number;
  saleType?: 'unit' | 'box'; // Qanday sotilayotgani
  calculatedPrice?: number; // Hisoblangan narx (skidka bilan)
  appliedDiscount?: {
    type: string;
    percent: number;
    minQuantity: number;
  };
  
  // ESKI FIELDLAR (backward compatibility)
  selectedTier?: 'tier1' | 'tier2' | 'tier3' | null;
  discountedPrice?: number;
  paymentBreakdown?: {
    cash: number;
    click: number;
    card: number;
    partner?: number;
  };
  customMarkup?: number;
  originalPrice?: number;
}

export interface Receipt {
  _id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'click';
  cashier: User;
  customer?: Customer;
  status: 'pending' | 'approved' | 'rejected';
  createdBy: User;
  createdAt: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  debt: number;
}

export interface Debt {
  _id: string;
  customer?: Customer;
  creditorName?: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  originalDueDate?: string;
  status: 'pending_approval' | 'approved' | 'overdue' | 'paid' | 'blacklist';
  type: 'receivable' | 'payable';
  description?: string;
  collateral?: string;
  extensionCount?: number;
  extensionDays?: number;
  lastExtensionAt?: string;
  payments: Payment[];
  items?: DebtItem[];
  createdAt: string;
}

export interface DebtItem {
  product: Product;
  name?: string;
  quantity: number;
  price: number;
}

export interface Payment {
  amount: number;
  date: string;
  method: 'cash' | 'card';
}

export interface Warehouse {
  _id: string;
  name: string;
  address: string;
  products: Product[];
}

export interface Order {
  _id: string;
  customer: Customer;
  items: CartItem[];
  total: number;
  status: 'new' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid';
  createdAt: string;
}

export interface Stats {
  totalRevenue: number;
  todaySales: number;
  weekSales: number;
  monthSales: number;
  totalReceipts: number;
  totalProducts: number;
  lowStock: number;
  outOfStock: number;
}
