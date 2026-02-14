import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { useCategories } from '../../hooks/useCategories';
import { useSocket } from '../../hooks/useSocket';
import { formatNumber } from '../../utils/format';
import { getDiscountPrices } from '../../utils/pricing';
import { 
  cacheProducts, 
  getCachedProducts,
  clearProductsCache
} from '../../utils/indexedDbService';

// Yangi komponentlar
import { KassaHeader } from '../../components/kassa/KassaHeader';
import { KassaTabs } from '../../components/kassa/KassaTabs';
import { SearchBar } from '../../components/kassa/SearchBar';
import { CategoryFilter } from '../../components/kassa/CategoryFilter';
import { ProductGrid } from '../../components/kassa/ProductGrid';
import { CartPanel } from '../../components/kassa/CartPanel';
import { PaymentModal, PaymentData } from '../../components/kassa/PaymentModal';
import { SavedReceiptsModal } from '../../components/kassa/SavedReceiptsModal';
import { ReceiptPrintModal } from '../../components/kassa/ReceiptPrintModal';
import { ProductDetailModal } from '../../components/kassa/ProductDetailModal';
import { DebtPaymentModal } from '../../components/kassa/DebtPaymentModal';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

export default function KassaProNew() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const { showAlert, AlertComponent } = useAlert();
  const { categories } = useCategories();
  const socket = useSocket();
  
  // State
  const [activeTab, setActiveTab] = useState<'products' | 'receipts'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Barcha tovarlar
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]); // Ko'rsatiladigan tovarlar
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>(''); // Bo'lim filtri
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [helperReceipts, setHelperReceipts] = useState<any[]>([]);
  
  // Statistics state - DB dagi jami mahsulotlar soni
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  
  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [showReceiptPrint, setShowReceiptPrint] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [showDebtPayment, setShowDebtPayment] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false); // Mobile cart modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  
  // Computed values - Discount'ni hisobga olgan jami narx
  const calculateDiscountedPrice = (product: any, quantity: number): number => {
    const prices = product.prices;
    let basePrice = product.price || 0;
    
    if (Array.isArray(prices) && prices.length > 0) {
      const unitPrice = prices.find((p: any) => p.type === 'unit');
      if (unitPrice?.amount) {
        basePrice = unitPrice.amount;
      }
    }
    
    if (!Array.isArray(prices) || prices.length === 0) {
      return basePrice;
    }
    
    const discounts = prices.filter((p: any) => p.type && p.type.startsWith('discount') && p.minQuantity && p.minQuantity <= quantity);
    
    if (discounts.length === 0) {
      return basePrice;
    }
    
    const bestDiscount = discounts.reduce((best: any, current: any) => 
      current.minQuantity > best.minQuantity ? current : best
    );
    
    const discountedPrice = basePrice * (1 - (bestDiscount.discountPercent || 0) / 100);
    
    return discountedPrice;
  };
  
  const total = cart.reduce((sum, item) => {
    const discountedPrice = calculateDiscountedPrice(item, item.cartQuantity);
    return sum + discountedPrice * item.cartQuantity;
  }, 0);
  
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  
  // Fetch functions - oldinroq e'lon qilish
  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    try {
      console.log(`📦 Mahsulotlar yuklanmoqda... Sahifa: ${pageNum}, Kategoriya: ${selectedCategory || 'Barchasi'}`);
      
      if (navigator.onLine) {
        // Backend'dan pagination bilan olish
        const params = new URLSearchParams({
          kassaView: 'true',
          page: pageNum.toString(),
          limit: '50'
        });
        
        // ✅ SABAB 8 FIX: Kategoriya parametrini qo'shish
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
        
        const res = await api.get(`/products?${params.toString()}`);
        
        // Yangi format: { products: [...], pagination: {...} }
        let productsData = [];
        let paginationData = null;
        
        if (res.data.products && Array.isArray(res.data.products)) {
          // Yangi format
          productsData = res.data.products;
          paginationData = res.data.pagination;
        } else if (Array.isArray(res.data)) {
          // Eski format (barcha mahsulotlar)
          productsData = res.data;
        }
        
        // Narxlarni to'g'ri formatga keltirish
        const normalizedProducts = productsData.map((product: any) => {
          const price = Array.isArray(product.prices) && product.prices.length > 0
            ? (product.prices.find((p: any) => p.type === 'unit')?.amount || product.unitPrice || product.price || 0)
            : (product.unitPrice || product.price || 0);
          
          return {
            ...product,
            price
          };
        });
        
        if (append) {
          // Qo'shimcha mahsulotlarni qo'shish (infinite scroll)
          setAllProducts(prev => [...prev, ...normalizedProducts]);
          setProducts(prev => [...prev, ...normalizedProducts]);
          setDisplayedProducts(prev => [...prev, ...normalizedProducts]);
        } else {
          // Birinchi yuklash
          setAllProducts(normalizedProducts);
          setProducts(normalizedProducts);
          setDisplayedProducts(normalizedProducts);
          
          // Cache'ga saqlash (faqat birinchi sahifa)
          cacheProducts(normalizedProducts).catch(err => 
            console.warn('Cache saqlashda xato:', err)
          );
        }
        
        // Pagination ma'lumotlarini saqlash
        if (paginationData) {
          setPage(paginationData.page);
          setHasMore(paginationData.hasMore);
          console.log(`✅ Yuklandi: ${normalizedProducts.length} ta mahsulot. Yana bor: ${paginationData.hasMore}`);
        } else {
          // Eski format - barcha mahsulotlar yuklangan
          setPage(1);
          setHasMore(false);
          console.log(`✅ Yuklandi: ${normalizedProducts.length} ta mahsulot (barcha)`);
        }
      } else {
        // Offline - cache'dan olish
        console.log('📡 Offline rejim - cache\'dan yuklash...');
        const cached = await getCachedProducts();
        const cachedData = cached as Product[];
        
        if (cachedData.length > 0) {
          // Cache'dan yuklangan ma'lumotlarni normalize qilish
          const normalizedCached = cachedData.map((product: any) => {
            const price = Array.isArray(product.prices) && product.prices.length > 0
              ? (product.prices.find((p: any) => p.type === 'unit')?.amount || product.unitPrice || product.price || 0)
              : (product.unitPrice || product.price || 0);
            
            return {
              ...product,
              price
            };
          });
          
          setAllProducts(normalizedCached);
          setProducts(normalizedCached);
          setDisplayedProducts(normalizedCached);
          setPage(1);
          setHasMore(false);
          
          console.log(`📦 Cache'dan yuklandi: ${normalizedCached.length} ta mahsulot`);
        } else {
          console.warn('⚠️ Cache bo\'sh');
          setAllProducts([]);
          setProducts([]);
          setDisplayedProducts([]);
        }
      }
    } catch (err) {
      console.error('❌ Mahsulotlarni yuklashda xato:', err);
      
      // Xato bo'lsa cache'dan olish
      try {
        const cached = await getCachedProducts();
        if (cached.length > 0) {
          // Cache'dan yuklangan ma'lumotlarni normalize qilish
          const normalizedCached = cached.map((product: any) => {
            const price = Array.isArray(product.prices) && product.prices.length > 0
              ? (product.prices.find((p: any) => p.type === 'unit')?.amount || product.unitPrice || product.price || 0)
              : (product.unitPrice || product.price || 0);
            
            return {
              ...product,
              price
            };
          });
          
          const cachedData = normalizedCached as Product[];
          setAllProducts(cachedData);
          setProducts(cachedData);
          setDisplayedProducts(cachedData);
          setPage(1);
          setHasMore(false);
          
          console.log(`📦 Xato, cache'dan yuklandi: ${cachedData.length} ta mahsulot`);
        }
      } catch (cacheErr) {
        console.error('❌ Cache xatosi:', cacheErr);
      }
    }
  }, [selectedCategory]);
  
  // ⚡ Fetch statistics - DB dagi jami mahsulotlar soni (search bo'yicha)
  const fetchStats = useCallback(async (searchTerm: string = '') => {
    try {
      console.log(`📊 Fetching stats for search: "${searchTerm}"`);
      
      const response = await api.get('/products/search-stats', {
        params: {
          search: searchTerm || undefined
        }
      });
      
      console.log(`📊 Stats response:`, response.data);
      
      setStats({
        total: response.data.total || 0,
        lowStock: response.data.lowStock || 0,
        outOfStock: response.data.outOfStock || 0,
        totalValue: response.data.totalValue || 0
      });
      
      console.log(`📊 Statistics updated (search: "${searchTerm}"):`, response.data);
    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
    }
  }, []);
  
  // loadMoreProducts funksiyasini oldinroq e'lon qilish
  const loadMoreProducts = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    console.log(`⬇️ Qo'shimcha mahsulotlar yuklanmoqda... Sahifa: ${page + 1}`);
    setLoadingMore(true);
    
    // Backend'dan keyingi sahifani olish
    fetchProducts(page + 1, true).finally(() => {
      setLoadingMore(false);
    });
  }, [loadingMore, hasMore, page, fetchProducts]);
  
  // Category o'zgartirilganda mahsulotlarni qayta yuklash
  useEffect(() => {
    console.log('🔄 Category o\'zgartirildi:', selectedCategory);
    setPage(1);
    setHasMore(true);
    setDisplayedProducts([]);
    fetchProducts(1, false);
  }, [selectedCategory, fetchProducts]);
  
  // Infinite scroll observer (OPTIMIZED)
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log('👀 Scroll pastga yetdi, yangi mahsulotlar yuklanmoqda...');
          loadMoreProducts();
        }
      },
      { threshold: 0.1, rootMargin: '200px' } // 200px oldindan yuklash
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreProducts]);
  
  // Fetch data - BIRINCHI YUKLASH
  useEffect(() => {
    console.log('🚀 KassaPro useEffect - ma\'lumotlar yuklanmoqda...');
    
    const initializeData = async () => {
      try {
        // 1. Cache'ni tozalash (xato bo'lsa ham davom etish)
        try {
          await clearProductsCache();
          console.log('✅ Cache tozalandi');
        } catch (cacheErr) {
          console.warn('⚠️ Cache tozalashda xato, davom etish:', cacheErr);
        }
        
        // 2. Backend'dan yangi ma'lumotlarni olish
        await fetchProducts();
        
        // 3. Boshqa ma'lumotlarni yuklash
        fetchStats('');
        fetchCustomers();
        fetchHelperReceipts();
        loadSavedReceipts();
      } catch (err) {
        console.error('❌ Initialization xatosi:', err);
      }
    };
    
    initializeData();
    
    // Auto-refresh o'chirildi - Socket.IO event'lar yetarli
  }, [fetchProducts, fetchStats]);
  
  // Socket.IO - Real-time updates + Cache update
  useEffect(() => {
    if (!socket) return;
    
    console.log('🔌 Socket.IO listeners registering...');
    
    // Narxlarni normalize qilish funksiyasi
    const normalizeProduct = (product: any) => {
      const price = Array.isArray(product.prices) && product.prices.length > 0
        ? (product.prices.find((p: any) => p.type === 'unit')?.amount || product.unitPrice || product.price || 0)
        : (product.unitPrice || product.price || 0);
      
      return {
        ...product,
        price
      };
    };
    
    // Statistics'ni yangilash funksiyasi
    const updateStats = () => {
      fetchStats(searchQuery);
    };
    
    socket.on('product:updated', (updatedProduct: Product) => {
      console.log('🔄 Socket event received - product:updated:', updatedProduct._id);
      console.log('📦 Updated product prices:', updatedProduct.prices);
      const normalizedProduct = normalizeProduct(updatedProduct);
      console.log('✅ Normalized price:', normalizedProduct.price);
      
      setProducts(prev => {
        const updated = prev.map(p => p._id === normalizedProduct._id ? normalizedProduct : p);
        console.log('✅ Products state updated with normalized price:', normalizedProduct.price);
        return updated;
      });
      setAllProducts(prev => {
        const updated = prev.map(p => p._id === normalizedProduct._id ? normalizedProduct : p);
        console.log('✅ AllProducts state updated');
        return updated;
      });
      
      // Search results'ni yangilash
      setSearchResults(prev => {
        const updated = prev.map(p => p._id === normalizedProduct._id ? normalizedProduct : p);
        if (updated.length > 0) {
          console.log('✅ SearchResults state updated');
        }
        return updated;
      });
      
      // Search bo'lmasa, displayedProducts'ni yangilash
      if (!searchQuery || searchQuery.length === 0) {
        setDisplayedProducts(prev => {
          const updated = prev.map(p => p._id === normalizedProduct._id ? normalizedProduct : p);
          console.log('✅ DisplayedProducts state updated');
          // Cache'ni update qilish
          cacheProducts(updated as any).catch(err => console.warn('Cache update xatosi:', err));
          return updated;
        });
      }
      
      // Cart'dagi mahsulotni ham yangilash
      setCart(prev => prev.map(item => {
        if (item._id === normalizedProduct._id) {
          console.log('🛒 Cart item updated:', item._id, 'old price:', item.price, 'new price:', normalizedProduct.price);
          return {
            ...item,
            ...normalizedProduct,
            // prices array'ni ham yangilash
            prices: normalizedProduct.prices
          };
        }
        return item;
      }));
      
      // Statistics cardlarini yangilash
      updateStats();
    });
    
    socket.on('product:created', (newProduct: Product) => {
      console.log('✨ Socket event received - product:created:', newProduct._id);
      console.log('📦 New product data:', newProduct);
      const normalizedProduct = normalizeProduct(newProduct);
      
      setProducts(prev => [normalizedProduct, ...prev]);
      setAllProducts(prev => [normalizedProduct, ...prev]);
      
      // Agar search bo'lsa, search results'ni yangilash
      setSearchResults(prev => {
        // Agar yangi mahsulot search queryga mos kelsa, qo'shish
        if (searchQuery && searchQuery.length > 0) {
          const searchTerm = searchQuery.trim().toLowerCase();
          const matches = 
            normalizedProduct.name.toLowerCase().includes(searchTerm) ||
            normalizedProduct.code.toLowerCase().includes(searchTerm);
          
          if (matches) {
            console.log('✅ New product matches search query, adding to results');
            return [normalizedProduct, ...prev];
          }
        }
        return prev;
      });
      
      // Search bo'lmasa, displayedProducts'ni yangilash
      if (!searchQuery || searchQuery.length === 0) {
        setDisplayedProducts(prev => {
          // ✅ SABAB 7 FIX: Kategoriya filtri bo'lsa, yangi mahsulot kategoriyaga mos kelishini tekshirish
          if (selectedCategory && normalizedProduct.category !== selectedCategory) {
            console.log(`⚠️ New product category (${normalizedProduct.category}) doesn't match selected category (${selectedCategory}), not adding to displayedProducts`);
            return prev;
          }
          
          const updated = [normalizedProduct, ...prev];
          // Cache'ni update qilish
          cacheProducts(updated as any).catch(err => console.warn('Cache update xatosi:', err));
          return updated;
        });
      }
      
      // Cache tozalash va mahsulotlarni qayta yuklash
      clearProductsCache().catch(err => console.warn('Cache tozalashda xato:', err));
      
      // Statistics cardlarini yangilash
      updateStats();
    });
    
    socket.on('product:deleted', (data: { _id: string }) => {
      console.log('🗑️ Socket event received - product:deleted:', data._id);
      setProducts(prev => prev.filter(p => p._id !== data._id));
      setAllProducts(prev => prev.filter(p => p._id !== data._id));
      
      // Search results'ni yangilash
      setSearchResults(prev => prev.filter(p => p._id !== data._id));
      
      // Search bo'lmasa, displayedProducts'ni yangilash
      if (!searchQuery || searchQuery.length === 0) {
        setDisplayedProducts(prev => {
          const updated = prev.filter(p => p._id !== data._id);
          // Cache'ni update qilish
          cacheProducts(updated as any).catch(err => console.warn('Cache update xatosi:', err));
          return updated;
        });
      }
      
      // Statistics cardlarini yangilash
      updateStats();
    });
    
    return () => {
      console.log('🔌 Socket.IO listeners removing...');
      socket.off('product:updated');
      socket.off('product:created');
      socket.off('product:deleted');
    };
  }, [socket, searchQuery, fetchStats, selectedCategory]);
  
  
  const fetchCustomers = async () => {
    try {
      console.log('📞 fetchCustomers boshlandi...');
      const res = await api.get('/customers/kassa');
      console.log('📥 Customers API javobi (raw):', res);
      console.log('📥 Customers API javobi (data):', res.data);
      
      // Backend yangi formatda javob qaytaradi
      let customersData = [];
      
      // Turli formatlarni tekshirish
      if (res.data && res.data.success && res.data.data) {
        // Format 1: { success: true, data: [...] }
        console.log('Format 1: success wrapper');
        customersData = Array.isArray(res.data.data) ? res.data.data : [];
      } else if (Array.isArray(res.data)) {
        // Format 2: to'g'ridan-to'g'ri array
        console.log('Format 2: direct array');
        customersData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        // Format 3: { data: [...] }
        console.log('Format 3: data wrapper');
        customersData = res.data.data;
      } else {
        console.warn('⚠️ Unexpected customers API response format:', res.data);
        customersData = [];
      }
      
      console.log('✅ Customers yuklandi:', customersData.length, 'ta');
      console.log('✅ Customers ma\'lumotlari:', customersData);
      setCustomers(customersData);
    } catch (err: any) {
      console.error('❌ Error fetching customers:', err);
      console.error('❌ Error response:', err.response?.data);
      setCustomers([]); // Xato bo'lsa bo'sh array
    }
  };
  
  const fetchHelperReceipts = async () => {
    try {
      const res = await api.get('/receipts/kassa');
      setHelperReceipts(res.data || []);
    } catch (err) {
      console.error('Error fetching helper receipts:', err);
    }
  };
  
  const loadSavedReceipts = () => {
    const saved = localStorage.getItem('savedReceipts');
    if (saved) setSavedReceipts(JSON.parse(saved));
  };
  
  // Search - Backend-dan qidiruv
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      fetchStats(''); // JAMI mahsulotlar soni
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Backend-dan qidiruv
      const params: any = {
        search: query,
        limit: 20 // Faqat 20 ta natija
      };
      
      // ✅ SABAB 9 FIX: Kategoriya parametrini qo'shish
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      
      const response = await api.get('/products/kassa', {
        params
      });
      
      let resultsData = [];
      if (response.data.products && Array.isArray(response.data.products)) {
        resultsData = response.data.products;
      } else if (Array.isArray(response.data)) {
        resultsData = response.data;
      }
      
      setSearchResults(resultsData);
      console.log(`🔍 Backend qidiruv: "${query}" - ${resultsData.length} ta natija`);
    } catch (error) {
      console.error('❌ Qidiruv xatosi:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
    
    // Statistics-ni yangilash (search bo'yicha)
    fetchStats(query);
  }, [fetchStats, selectedCategory]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300); // Debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Cart functions
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.quantity <= 0) {
      showAlert(`${product.name} tugagan!`, 'Ogohlantirish', 'warning');
      return;
    }
    
    const existingInCart = cart.find(p => p._id === product._id);
    const currentCartQuantity = existingInCart ? existingInCart.cartQuantity : 0;
    
    if (currentCartQuantity + quantity > product.quantity) {
      showAlert(`Maksimal: ${product.quantity} ta`, 'Ogohlantirish', 'warning');
      return;
    }
    
    // Asosiy narxni olish (skidka qo'llanmagan)
    const basePrice = product.price || 0;
    
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      const newQuantity = existing ? existing.cartQuantity + quantity : quantity;
      const discountedPrice = calculateDiscountedPrice(product, newQuantity);
      
      if (existing) {
        return prev.map(p => 
          p._id === product._id 
            ? {...p, cartQuantity: newQuantity, discountedPrice, price: basePrice} 
            : p
        );
      }
      return [...prev, {...product, cartQuantity: newQuantity, discountedPrice, price: basePrice}];
    });
  };
  
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };
  
  const updateQuantity = (id: string, quantity: number) => {
    setCart(prev => prev.map(p => {
      if (p._id === id) {
        const newQuantity = Math.max(1, quantity);
        const discountedPrice = calculateDiscountedPrice(p, newQuantity);
        // price o'zgarmasin, faqat discountedPrice yangilash
        return {...p, cartQuantity: newQuantity, discountedPrice};
      }
      return p;
    }));
  };
  
  const clearCart = () => {
    if (confirm('Savatni tozalashni xohlaysizmi?')) {
      setCart([]);
    }
  };
  
  // Save receipt
  const saveReceipt = () => {
    if (cart.length === 0) {
      showAlert("Chek bo'sh", 'Ogohlantirish', 'warning');
      return;
    }
    
    const newSaved: SavedReceipt = {
      id: Date.now().toString(),
      items: [...cart],
      total,
      savedAt: new Date().toLocaleString()
    };
    
    const updated = [...savedReceipts, newSaved];
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
    setCart([]);
    showAlert('Chek saqlandi!', 'Muvaffaqiyat', 'success');
  };
  
  // Payment
  const handlePayment = async (data: PaymentData) => {
    console.log('💰 handlePayment boshlandi:', data);
    
    const { customer, cashAmount, cardAmount, clickAmount, debtAmount, discount = 0 } = data;
    
    // Validatsiya
    if (cart.length === 0) {
      showAlert('Savat bo\'sh!', 'Xatolik', 'danger');
      return;
    }
    
    if (cashAmount + cardAmount + clickAmount <= 0) {
      showAlert('To\'lov summasi 0 dan katta bo\'lishi kerak!', 'Xatolik', 'danger');
      return;
    }
    
    let finalPaymentMethod: 'cash' | 'card' | 'click' | 'mixed';
    const paymentCount = [cashAmount > 0, cardAmount > 0, clickAmount > 0].filter(Boolean).length;
    
    if (paymentCount > 1) {
      finalPaymentMethod = 'mixed';
    } else if (cashAmount > 0) {
      finalPaymentMethod = 'cash';
    } else if (cardAmount > 0) {
      finalPaymentMethod = 'card';
    } else {
      finalPaymentMethod = 'click';
    }
    
    const finalTotal = total - discount;
    
    const saleData = {
      items: cart.map(item => ({
        product: item._id,
        name: item.name,
        code: item.code,
        price: calculateDiscountedPrice(item, item.cartQuantity),
        quantity: item.cartQuantity
      })),
      total: finalTotal,
      discount,
      paidAmount: cashAmount + cardAmount + clickAmount,
      cashAmount,
      cardAmount,
      clickAmount,
      paymentMethod: finalPaymentMethod,
      customer: customer?._id
    };
    
    console.log('📤 Serverga yuborilayotgan ma\'lumot:', JSON.stringify(saleData, null, 2));
    console.log('📦 Cart ma\'lumotlari:', cart);
    
    try {
      const response = await api.post('/receipts', saleData);
      console.log('✅ Server javobi:', response.data);
      
      // Save receipt data
      const receiptData = response.data.data || response.data;
      setCurrentReceipt(receiptData);
      
      // Clear cart
      setCart([]);
      setShowPayment(false);
      
      // Show receipt print modal
      setShowReceiptPrint(true);
      
      fetchProducts();
      
      if (debtAmount > 0 && customer) {
        showAlert(`To'lov qabul qilindi! Qarz: ${debtAmount} so'm`, 'Muvaffaqiyat', 'success');
      } else {
        showAlert('Chek saqlandi!', 'Muvaffaqiyat', 'success');
      }
    } catch (err: any) {
      console.error('❌ To\'lov xatosi:', err);
      console.error('❌ Xato tafsilotlari:', err.response?.data);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };
  
  // Create customer
  const handleCreateCustomer = async (name: string, phone: string) => {
    try {
      const response = await api.post('/customers/kassa', { name, phone });
      
      if (response.data.success) {
        const newCustomer = response.data.customer;
        setCustomers(prev => [...prev, newCustomer]);
        showAlert('Yangi mijoz qo\'shildi!', 'Muvaffaqiyat', 'success');
      }
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.existingCustomer) {
        showAlert('Bu mijoz allaqachon mavjud', 'Ma\'lumot', 'info');
      } else {
        showAlert(err.response?.data?.message || 'Mijoz qo\'shishda xatolik', 'Xatolik', 'danger');
      }
    }
  };
  
  // QR Print
  const printQRCodes = async (products: Product[]) => {
    // TODO: Implement QR printing
    showAlert('QR print funksiyasi qo\'shilmoqda...', 'Ma\'lumot', 'info');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      
      {/* Header - Responsive */}
      <KassaHeader
        savedReceiptsCount={savedReceipts.length}
        onOpenSavedReceipts={() => setShowSavedReceipts(true)}
        onOpenDebtPayment={() => setShowDebtPayment(true)}
        onMenuOpen={onMenuToggle}
      />
      
      {/* Main Content - Fully Responsive */}
      <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          {/* Desktop: Side by side | Mobile: Stacked with fixed cart */}
          <div className="h-full flex flex-col lg:flex-row lg:gap-4 lg:p-4">
            
            {/* Left: Products/Receipts - Scrollable */}
            <div className="flex-1 overflow-y-auto lg:overflow-y-auto px-3 py-3 lg:px-0 lg:py-0 space-y-3 lg:space-y-4">
              {/* Tabs */}
              <KassaTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                receiptsCount={helperReceipts.length}
              />
              
              {activeTab === 'products' ? (
                <>
                  {/* Search */}
                  <SearchBar
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    results={searchResults}
                    isSearching={isSearching}
                    showResults={searchQuery.length > 0}
                    onProductSelect={(product) => {
                      setSelectedProductForDetail(product);
                      setShowProductDetail(true);
                      setSearchQuery('');
                    }}
                    onClose={() => setSearchQuery('')}
                    stats={stats}
                  />
                  
                  {/* Category Filter with Section Select - Responsive */}
                  <div className="space-y-2 lg:space-y-3">
                    {/* Category Filter with Subcategories */}
                    <div className="w-full">
                      <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        selectedSubcategory={selectedSection}
                        onCategoryChange={setSelectedCategory}
                        onSubcategoryChange={setSelectedSection}
                      />
                    </div>
                  </div>
                  
                  {/* Products Grid */}
                  <ProductGrid
                    products={displayedProducts}
                    selectedCategory={selectedCategory}
                    selectedSection={selectedSection}
                    onProductClick={(product) => {
                      setSelectedProductForDetail(product);
                      setShowProductDetail(true);
                    }}
                    onCategoryClick={(product) => {
                      setSelectedCategory(product.category || '');
                    }}
                    onQRPrint={(product) => printQRCodes([product])}
                    loadMoreRef={loadMoreRef}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                  />
                </>
              ) : (
                <div className="space-y-4">
                  {helperReceipts.length === 0 ? (
                    <div className="bg-white rounded-xl p-8 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <ShoppingCart className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-1">Cheklar topilmadi</p>
                      <p className="text-sm text-slate-400">Hozircha hech qanday chek yo'q</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {helperReceipts.map((receipt: any) => (
                        <div 
                          key={receipt._id} 
                          className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow border border-slate-100"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-semibold text-slate-800">
                                Chek #{receipt.receiptNumber || receipt._id.slice(-6)}
                              </p>
                              <p className="text-sm text-slate-500">
                                {new Date(receipt.createdAt).toLocaleString('uz-UZ', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-800">
                                {formatNumber(receipt.total)} so'm
                              </p>
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                receipt.paymentMethod === 'cash' 
                                  ? 'bg-green-100 text-green-700'
                                  : receipt.paymentMethod === 'card'
                                  ? 'bg-blue-100 text-blue-700'
                                  : receipt.paymentMethod === 'transfer'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {receipt.paymentMethod === 'cash' ? 'Naqd' :
                                 receipt.paymentMethod === 'card' ? 'Karta' :
                                 receipt.paymentMethod === 'transfer' ? 'O\'tkazma' : 'Qarz'}
                              </span>
                            </div>
                          </div>
                          
                          {receipt.customer && (
                            <div className="mb-3 pb-3 border-b border-slate-100">
                              <p className="text-sm text-slate-600">
                                <span className="font-medium">Mijoz:</span> {receipt.customer.name}
                              </p>
                              {receipt.customer.phone && (
                                <p className="text-sm text-slate-500">{receipt.customer.phone}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-500 uppercase">Mahsulotlar:</p>
                            {receipt.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-600">
                                  {item.product?.name || item.name} × {item.quantity}
                                </span>
                                <span className="font-medium text-slate-800">
                                  {formatNumber(item.price * item.quantity)} so'm
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          {receipt.helper && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <p className="text-xs text-slate-500">
                                <span className="font-medium">Yordamchi:</span> {receipt.helper.name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Right: Cart - Responsive (Fixed on mobile, sidebar on desktop) */}
            <div className="lg:w-[360px] lg:flex-shrink-0">
              {/* Mobile: Hidden - faqat floating button */}
              
              {/* Desktop: Sticky sidebar cart */}
              <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
                <CartPanel
                  cart={cart}
                  total={total}
                  itemCount={itemCount}
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                  onSave={saveReceipt}
                  onCheckout={() => setShowPayment(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile: Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <ShoppingCart className="w-6 h-6" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium">{itemCount} ta</span>
            <span className="text-sm font-bold">{formatNumber(total)} so'm</span>
          </div>
        </button>
      )}
      
      {/* Mobile: Cart Modal */}
      {showCartModal && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50" 
            onClick={() => setShowCartModal(false)} 
          />
          
          <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
              <CartPanel
                cart={cart}
                total={total}
                itemCount={itemCount}
                onQuantityChange={updateQuantity}
                onRemove={removeFromCart}
                onClear={clearCart}
                onSave={() => {
                  saveReceipt();
                  setShowCartModal(false);
                }}
                onCheckout={() => {
                  setShowCartModal(false);
                  setShowPayment(true);
                }}
                isModal={true}
              />
            </div>
          </div>
        </>
      )}
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        cart={cart}
        customers={customers}
        onPayment={handlePayment}
        onCreateCustomer={handleCreateCustomer}
      />
      
      {/* Saved Receipts Modal */}
      <SavedReceiptsModal
        isOpen={showSavedReceipts}
        onClose={() => setShowSavedReceipts(false)}
        receipts={savedReceipts}
        onLoad={(receipt) => {
          setCart(receipt.items);
          showAlert('Chek yuklandi!', 'Muvaffaqiyat', 'success');
        }}
        onDelete={(id) => {
          const updated = savedReceipts.filter(r => r.id !== id);
          setSavedReceipts(updated);
          localStorage.setItem('savedReceipts', JSON.stringify(updated));
          showAlert('Chek o\'chirildi', 'Ma\'lumot', 'info');
        }}
      />
      
      {/* Receipt Print Modal */}
      <ReceiptPrintModal
        isOpen={showReceiptPrint}
        onClose={() => setShowReceiptPrint(false)}
        receipt={currentReceipt}
      />
      
      {/* Debt Payment Modal */}
      <DebtPaymentModal
        isOpen={showDebtPayment}
        onClose={() => setShowDebtPayment(false)}
        onPaymentSuccess={() => {
          showAlert('Qarz to\'lovi qabul qilindi!', 'Muvaffaqiyat', 'success');
        }}
      />
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showProductDetail}
        onClose={() => {
          setShowProductDetail(false);
          setSelectedProductForDetail(null);
        }}
        product={selectedProductForDetail}
        onAddToCart={(product, quantity) => {
          addToCart(product, quantity);
          showAlert(`${product.name} (${quantity} ta) qo'shildi`, 'Muvaffaqiyat', 'success');
        }}
      />
    </div>
  );
}
