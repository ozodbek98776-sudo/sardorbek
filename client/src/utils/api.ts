import axios from 'axios';
import { OfflineHandler } from './offlineHandler';
import { API_BASE_URL } from '../config/api';

// ⚡ PERFORMANCE OPTIMIZED API CLIENT
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json'
  },
  timeout: 30000 // Reduced to 30 seconds for better UX
});

// ⚡ Add request timing for performance monitoring
api.interceptors.request.use((config: any) => {
  config.metadata = { startTime: Date.now() };
  
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  
  // ⚡ Smart timeout based on endpoint
  if (config.url?.includes('/products/kassa')) {
    config.timeout = 15000; // 15 seconds for kassa - fast response needed
  } else if (config.url?.includes('/products')) {
    config.timeout = 45000; // 45 seconds for admin products
  } else if (config.url?.includes('/expenses')) {
    config.timeout = 45000; // 45 seconds for expenses - may have large datasets
  }
  
  // ⚡ Note: Accept-Encoding is automatically handled by browser
  // Don't set it manually as it's a forbidden header
  
  // ⚡ Cache control for different endpoints
  if (config.url?.includes('/kassa') || config.url?.includes('/categories')) {
    // Allow short-term caching for frequently accessed data
    config.headers['Cache-Control'] = 'max-age=30'; // 30 seconds cache
  } else {
    // No cache for dynamic data
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  
  return config;
});

// ⚡ RESPONSE INTERCEPTOR - Optimized
api.interceptors.response.use(
  (response: any) => {
    // ⚡ Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const duration = Date.now() - response.config.metadata?.startTime;
      if (duration > 1000) {
        console.warn(`⚠️ Slow API call: ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  (error: any) => {
    // ⚡ Enhanced error handling
    if (error.code === 'ECONNABORTED') {
      console.error('🔴 Request timeout:', error.config?.url);
      return Promise.reject(new Error('So\'rov vaqti tugadi. Iltimos, qayta urinib ko\'ring.'));
    }
    
    if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
      console.error('🔴 Network error - server connection failed');
      return Promise.reject(new Error('Server bilan aloqa yo\'q. Iltimos, internetni tekshiring.'));
    }
    
    // Handle connection refused
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Connection refused - server port 8000 da ishlamayapti');
      return Promise.reject(new Error('Server ishlamayapti. Iltimos, serverni ishga tushiring.'));
    }
    
    // Handle server offline errors (503 from Service Worker)
    if (OfflineHandler.isServerOfflineError(error)) {
      console.warn('Server is offline:', error.response.data.message);
      return Promise.reject(error);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - token yaroqsiz');
      // Token va user ni o'chirish
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // AuthContext ga xatolikni qaytarish (u o'zi navigate qiladi)
      // Faqat login sahifasida bo'lmasa, redirect qilish
      if (!window.location.pathname.includes('/login')) {
        // Redirect qilish o'rniga, error qaytarish
        // AuthContext da catch qilinadi va user null bo'ladi
        console.log('🔄 AuthContext 401 xatolikni handle qiladi');
      }
    }
    
    // Handle specific HTTP errors
    if (error.response?.status === 429) {
      return Promise.reject(new Error('Juda ko\'p so\'rov yuborildi. Biroz kuting.'));
    }
    
    if (error.response?.status >= 500) {
      return Promise.reject(new Error('Server xatosi. Iltimos, qayta urinib ko\'ring.'));
    }
    
    return Promise.reject(error);
  }
);

export default api;

// ========== YANGI NARX TIZIMI API FUNKSIYALARI ==========

// Mahsulot narxini hisoblash
export const calculateProductPrice = async (productId: string, quantity: number, saleType: 'unit' | 'box' = 'unit') => {
  try {
    const response = await api.post('/products/calculate-price', {
      productId,
      quantity,
      saleType
    });
    return response.data;
  } catch (error) {
    console.error('Calculate price error:', error);
    throw error;
  }
};

// Mahsulot narxlarini yangilash
export const updateProductPrices = async (productId: string, pricesData: any) => {
  try {
    const response = await api.put(`/products/${productId}/prices`, pricesData);
    return response.data;
  } catch (error) {
    console.error('Update prices error:', error);
    throw error;
  }
};

// Mahsulotning barcha narxlarini olish
export const getProductPrices = async (productId: string) => {
  try {
    const response = await api.get(`/products/${productId}/prices`);
    return response.data;
  } catch (error) {
    console.error('Get prices error:', error);
    throw error;
  }
};

// Narx turlari va o'lchov birliklarini olish
export const getPriceConfig = async () => {
  try {
    const response = await api.get('/products/config/price-types');
    return response.data;
  } catch (error) {
    console.error('Get price config error:', error);
    throw error;
  }
};

// Mahsulot yaratish (yangi format)
export const createProductNew = async (productData: {
  code?: string;
  name: string;
  unit: string;
  costPrice?: number;
  unitPrice: number;
  boxPrice?: number;
  boxUnitsPerBox?: number;
  discountPrices?: Array<{
    amount: number;
    minQuantity: number;
    discountPercent: number;
  }>;
  quantity: number;
  description?: string;
  category?: string;
  warehouse?: string;
  images?: string[];
}) => {
  try {
    const response = await api.post('/products', productData);
    return response.data;
  } catch (error) {
    console.error('Create product error:', error);
    throw error;
  }
};

// Kassa uchun mahsulot qidirish (yangi format)
export const searchProductsForKassa = async (searchQuery?: string) => {
  try {
    const url = searchQuery 
      ? `/products/kassa?search=${encodeURIComponent(searchQuery)}`
      : '/products/kassa';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error('Search products for kassa error:', error);
    throw error;
  }
};

// HELPER FUNKSIYALAR - Frontend uchun

// Mahsulotdan tan narxini olish
export const getCostPrice = (product: any): number => {
  if (Array.isArray(product.prices)) {
    const costPrice = product.prices.find((p: any) => p.type === 'cost' && p.isActive);
    return costPrice ? costPrice.amount : 0;
  }
  return product.costPrice || 0;
};

// Mahsulotdan dona/kg/metr narxini olish
export const getUnitPrice = (product: any): number => {
  if (Array.isArray(product.prices)) {
    const unitPrice = product.prices.find((p: any) => p.type === 'unit' && p.isActive);
    return unitPrice ? unitPrice.amount : 0;
  }
  return product.price || product.unitPrice || 0;
};

// Mahsulotdan karobka narxini olish
export const getBoxPrice = (product: any): number => {
  if (Array.isArray(product.prices)) {
    const boxPrice = product.prices.find((p: any) => p.type === 'box' && p.isActive);
    return boxPrice ? boxPrice.amount : 0;
  }
  return product.boxPrice || 0;
};

// Mahsulotdan skidka narxlarini olish
export const getDiscountPrices = (product: any): Array<{amount: number, minQuantity: number, discountPercent: number}> => {
  if (Array.isArray(product.prices)) {
    return product.prices
      .filter((p: any) => p.type.startsWith('discount') && p.isActive)
      .sort((a: any, b: any) => a.minQuantity - b.minQuantity);
  }
  return [];
};

// Miqdorga qarab eng yaxshi narxni hisoblash (frontend da)
export const calculateBestPriceLocal = (product: any, quantity: number, saleType: 'unit' | 'box' = 'unit') => {
  let basePrice = 0;
  let appliedDiscount = null;

  // Sotish turiga qarab asosiy narxni aniqlash
  switch(saleType) {
    case 'unit':
      basePrice = getUnitPrice(product);
      break;
    case 'box':
      basePrice = getBoxPrice(product);
      // Agar karobka narxi yo'q bo'lsa, dona narxini karobka miqdoriga ko'paytirish
      if (!basePrice && product.boxInfo?.unitsPerBox > 0) {
        basePrice = getUnitPrice(product) * product.boxInfo.unitsPerBox;
      }
      break;
    default:
      basePrice = getUnitPrice(product);
  }

  // Skidka narxlarini tekshirish
  const discountPrices = getDiscountPrices(product);
  for (const discount of discountPrices) {
    if (quantity >= discount.minQuantity) {
      const discountedPrice = basePrice * (1 - discount.discountPercent / 100);
      if (discountedPrice < basePrice) {
        basePrice = discountedPrice;
        appliedDiscount = {
          type: 'discount',
          percent: discount.discountPercent,
          minQuantity: discount.minQuantity
        };
      }
    }
  }

  return {
    price: Math.round(basePrice),
    originalPrice: saleType === 'unit' ? getUnitPrice(product) : getBoxPrice(product),
    appliedDiscount,
    saleType,
    unit: product.unit || 'dona'
  };
};
