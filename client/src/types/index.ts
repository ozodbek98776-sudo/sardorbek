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

export interface Product {
  _id: string;
  code: string;
  name: string;
  description?: string;
  costPrice?: number; // Tan narxi
  unitPrice?: number; // Dona narxi
  boxPrice?: number; // Karobka narxi
  price: number;
  previousPrice?: number; // Oldingi narxi
  currentPrice?: number; // Hozirgi narxi
  quantity: number;
  warehouse: string | { _id: string; name: string };
  isMainWarehouse?: boolean;
  category?: string;
  image?: string;
  images?: (string | ProductImage)[]; // Eski format (string) yoki yangi format (object)
  minStock?: number;
  
  // O'lchov birliklari
  unit?: 'dona' | 'metr' | 'rulon' | 'karobka' | 'gram' | 'kg' | 'litr';
  
  // Foizli chegirmalar (miqdorga qarab)
  pricingTiers?: {
    tier1?: { minQuantity: number; maxQuantity: number; discountPercent: number };
    tier2?: { minQuantity: number; maxQuantity: number; discountPercent: number };
    tier3?: { minQuantity: number; maxQuantity: number; discountPercent: number };
  };
  
  // Rulon/Karobka uchun qo'shimcha ma'lumotlar
  unitConversion?: {
    enabled: boolean;
    baseUnit: 'dona' | 'metr' | 'gram' | 'kg' | 'litr';
    conversionRate: number; // 1 rulon = X metr
    packageCount: number; // Nechta rulon/karobka bor
    totalBaseUnits: number; // Jami metr/dona
  };
  
  // Turli narxlar
  prices?: {
    perUnit: number; // Dona narxi
    perMeter: number; // Metr narxi
    perGram: number; // Gram narxi
    perKg: number; // Kg narxi
    perRoll: number; // Rulon narxi
    perBox: number; // Karobka narxi
  };
}

export interface CartItem extends Product {
  cartQuantity: number;
  selectedTier?: 'tier1' | 'tier2' | 'tier3' | null; // Tanlangan narx darajasi
  discountedPrice?: number; // Skidka qilingan narx
  paymentBreakdown?: {
    cash: number;     // Naqt pul miqdori
    click: number;    // Click miqdori
    card: number;     // Karta miqdori
    partner?: number; // Hamkor to'lovi miqdori
  };
  customMarkup?: number; // Qo'lda belgilangan foiz
  originalPrice?: number; // Asl narx (kelishtirilganda)
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
  code?: string;
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
