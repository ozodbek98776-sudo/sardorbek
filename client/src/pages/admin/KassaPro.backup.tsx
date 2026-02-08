import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package2, Banknote, Delete, AlertTriangle, User, UserCircle, ChevronDown, Wifi, WifiOff, RefreshCw, ScanLine,
  ShoppingCart, DollarSign, Receipt, Clock, TrendingUp, Scan, Menu, Home, Users, FileText, Filter
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';
import { useAlert } from '../../hooks/useAlert';
import { useOffline } from '../../hooks/useOffline';
import { Html5Qrcode } from 'html5-qrcode';
import QRScanner from '../../components/QRScanner';
import { 
  cacheProducts, 
  getCachedProducts,
  saveOfflineSale,
  markSalesAsSynced,
  deleteSyncedSales
} from '../../utils/indexedDbService';
import { useCategories } from '../../hooks/useCategories';
import { useSocket } from '../../hooks/useSocket';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

// Debounce hook - professional search uchun
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Fuzzy search - professional qidiruv algoritmi
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  // Exact match - eng yuqori ball
  if (textLower === queryLower) return 100;
  
  // Starts with - yuqori ball
  if (textLower.startsWith(queryLower)) return 90;
  
  // Contains - o'rtacha ball
  if (textLower.includes(queryLower)) return 70;
  
  // Fuzzy match - harflar ketma-ketligi
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score : 0;
}

export default function KassaPro() {
  const navigate = useNavigate();
  const { showAlert, AlertComponent } = useAlert();
  const { isOnline, pendingCount, isSyncing, manualSync } = useOffline();
  const { categories } = useCategories();
  const socket = useSocket(); // ⚡ Socket.IO hook
  const [activeTab, setActiveTab] = useState<'products' | 'receipts'>('products');
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [displayCount, setDisplayCount] = useState(5);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedProductForCategory, setSelectedProductForCategory] = useState<Product | null>(null);
  const [selectedCategoryForProduct, setSelectedCategoryForProduct] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed' | null>(null);
  const [showPaymentInput, setShowPaymentInput] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [helperReceipts, setHelperReceipts] = useState<any[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [productDetailQuantity, setProductDetailQuantity] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const productsContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounced search query - 300ms kechikish
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Professional search with fuzzy matching
  const performSearch = useCallback((query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    // Fuzzy search bilan mahsulotlarni qidirish
    const results = products
      .map(product => {
        const nameScore = fuzzySearch(query, product.name);
        const codeScore = fuzzySearch(query, product.code);
        const maxScore = Math.max(nameScore, codeScore);
        
        return { product, score: maxScore };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20) // Faqat eng yaxshi 20 ta natija
      .map(item => item.product);

    setSearchResults(results);
    setIsSearching(false);
  }, [products]);

  // Debounced search effect
  useEffect(() => {
    performSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performSearch]);

  // Keyboard shortcuts - Ctrl+K yoki Cmd+K qidiruv uchun
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K yoki Cmd+K - qidiruvni ochish
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      
      // Escape - qidiruvni yopish
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchHelperReceipts();
    loadSavedReceipts();
    
    // Tasdiqlangan chekni localStorage dan yuklash
    const pendingReceipt = localStorage.getItem('pendingReceipt');
    if (pendingReceipt) {
      try {
        const receipt = JSON.parse(pendingReceipt);
        
        // Mijozni tanlash
        if (receipt.customer) {
          setSelectedCustomer(receipt.customer);
        }
        
        // Mahsulotlarni savatga qo'shish
        if (receipt.items && receipt.items.length > 0) {
          const cartItems = receipt.items.map((item: any) => ({
            _id: item.product || item._id,
            name: item.name,
            code: item.code || '',
            price: item.price,
            cartQuantity: item.quantity,
            quantity: 999 // Tasdiqlangan chek uchun stock tekshiruvi yo'q
          }));
          setCart(cartItems);
        }
        
        // localStorage ni tozalash
        localStorage.removeItem('pendingReceipt');
        
        // To'lov oynasini ochish
        setTimeout(() => {
          setShowPayment(true);
        }, 500);
        
        showAlert('Chek yuklandi! To\'lov qilishingiz mumkin.', 'Muvaffaqiyat', 'success');
      } catch (err) {
        console.error('Error loading pending receipt:', err);
        localStorage.removeItem('pendingReceipt');
      }
    }
  }, []);

  // ⚡ Socket.IO - Real-time product updates
  useEffect(() => {
    if (!socket) return;

    // Mahsulot yangilanganda
    socket.on('product:updated', (updatedProduct: Product) => {
      console.log('📡 KassaPro: Mahsulot yangilandi', updatedProduct);
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    });

    // Mahsulot qo'shilganda
    socket.on('product:created', (newProduct: Product) => {
      console.log('📡 KassaPro: Yangi mahsulot qo\'shildi', newProduct);
      setProducts(prev => [newProduct, ...prev]);
    });

    // Mahsulot o'chirilganda
    socket.on('product:deleted', (data: { _id: string }) => {
      console.log('📡 KassaPro: Mahsulot o\'chirildi', data._id);
      setProducts(prev => prev.filter(p => p._id !== data._id));
    });

    return () => {
      socket.off('product:updated');
      socket.off('product:created');
      socket.off('product:deleted');
    };
  }, [socket]);

  // Mahsulotlar yuklanganida displayedProducts ni yangilash
  useEffect(() => {
    let filtered = products;
    
    // Kategoriya bo'yicha filtrlash
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    setDisplayedProducts(filtered.slice(0, displayCount));
  }, [products, displayCount, selectedCategory]);

  // Mahsulotlarni kategoriya bo'yicha guruhlash
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    products.forEach(product => {
      const category = product.category || 'Boshqa';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
    
    return grouped;
  }, [products]);

  // Infinite scroll uchun
  useEffect(() => {
    const container = productsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Foydalanuvchi pastga yaqinlashganda keyingi 5 ta mahsulotni yuklash
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && displayCount < products.length) {
        setDisplayCount(prev => Math.min(prev + 5, products.length));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [displayCount, products.length]);

  // Modal ochilganda body scroll ni bloklash
  useEffect(() => {
    if (showProductDetail || showPayment || showSavedReceipts) {
      // Body scroll ni bloklash
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px';
      // Orqa fonni to'liq bloklash
      document.body.style.pointerEvents = 'none';
      
      // Modal uchun pointer-events ni yoqish
      const modals = document.querySelectorAll('[data-modal="true"]');
      modals.forEach(modal => {
        (modal as HTMLElement).style.pointerEvents = 'auto';
      });
    } else {
      // Body scroll ni qayta yoqish
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.pointerEvents = '';
    }

    // Cleanup
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.pointerEvents = '';
    };
  }, [showProductDetail, showPayment, showSavedReceipts]);

  const fetchProducts = async () => {
    setIsLoadingProducts(true);
    try {
      if (navigator.onLine) {
        // ⚡ ULTRA TEZKOR - faqat minimal ma'lumotlar
        const res = await api.get('/products?kassaView=true&limit=1000');
        const productsData = res.data;
        const products = Array.isArray(productsData) ? productsData : [];
        setProducts(products);
        await cacheProducts(products);
      } else {
        const cached = await getCachedProducts();
        setProducts(cached as Product[]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        setProducts(cached as Product[]);
      }
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Mahsulot rasmini to'g'ri formatda olish
  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      let imagePath = typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as any).path;
      
      // Agar imagePath to'liq URL bo'lsa, faqat path qismini olish
      if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        try {
          const url = new URL(imagePath);
          imagePath = url.pathname;
        } catch (e) {
          console.warn('Invalid image URL:', imagePath);
        }
      }
      
      // Agar imagePath / bilan boshlanmasa, qo'shish
      if (imagePath && !imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
      }
      
      return imagePath ? `${UPLOADS_URL}${imagePath}` : null;
    }
    return null;
  };

  const fetchCustomers = async () => {
    try {
      // Auth talab qilmaydigan endpoint
      const res = await api.get('/customers/kassa');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchHelperReceipts = async () => {
    setLoadingReceipts(true);
    try {
      const res = await api.get('/receipts/kassa');
      setHelperReceipts(res.data || []);
    } catch (err) {
      console.error('Error fetching helper receipts:', err);
      showAlert('Cheklar yuklanmadi', 'Xatolik', 'danger');
    } finally {
      setLoadingReceipts(false);
    }
  };

  const loadReceiptToCart = (receipt: any) => {
    // Chekni savatga yuklash
    const cartItems = receipt.items.map((item: any) => ({
      _id: item.product?._id || item.product,
      name: item.product?.name || item.name,
      code: item.product?.code || item.code || '',
      price: item.price,
      cartQuantity: item.quantity,
      quantity: 999 // Stock tekshiruvi yo'q
    }));
    
    setCart(cartItems);
    setActiveTab('products'); // Mahsulotlar tabiga o'tish
    showAlert('Chek savatga yuklandi!', 'Muvaffaqiyat', 'success');
  };

  const loadSavedReceipts = () => {
    const saved = localStorage.getItem('savedReceipts');
    if (saved) setSavedReceipts(JSON.parse(saved));
  };

  const handleSaveProductCategory = async () => {
    if (!selectedProductForCategory || !selectedCategoryForProduct) {
      showAlert('Kategoriya tanlanmagan!', 'Xatolik', 'warning');
      return;
    }

    try {
      const response = await api.put(`/products/${selectedProductForCategory._id}/category`, {
        category: selectedCategoryForProduct
      });

      if (response.data) {
        // Yangilangan mahsulotni olish
        const updatedProduct = response.data;
        
        // Mahsulotlar ro'yxatini yangilash
        setProducts(prev => prev.map(p => 
          p._id === updatedProduct._id 
            ? updatedProduct
            : p
        ));
        
        // Kategoriya filtriga o'tish
        setSelectedCategory(selectedCategoryForProduct);
        
        // Display count ni reset qilish
        setDisplayCount(5);
        
        showAlert(`Kategoriya saqlandi: ${selectedCategoryForProduct}`, 'Muvaffaqiyat', 'success');
        
        // Modalni yopish
        setShowCategoryModal(false);
        setSelectedProductForCategory(null);
        setSelectedCategoryForProduct('');
      }
    } catch (err: any) {
      console.error('Kategoriya saqlashda xatolik:', err);
      showAlert(err.response?.data?.message || 'Kategoriya saqlanmadi!', 'Xatolik', 'danger');
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      showAlert('Ism va telefon raqamini kiriting!', 'Ogohlantirish', 'warning');
      return;
    }

    try {
      console.log('📤 Yangi mijoz yaratish so\'rovi:', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim()
      });
      
      // Auth talab qilmaydigan endpoint
      const response = await api.post('/customers/kassa', {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim()
      });
      
      console.log('✅ Mijoz yaratish javobi:', response.data);
      
      if (response.data.success) {
        const newCustomer = response.data.customer;
        setCustomers(prev => [...prev, newCustomer]);
        setSelectedCustomer(newCustomer);
        setShowNewCustomerForm(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        showAlert('Yangi mijoz qo\'shildi!', 'Muvaffaqiyat', 'success');
        console.log('✅ Mijoz muvaffaqiyatli qo\'shildi:', newCustomer);
      }
    } catch (err: any) {
      console.error('❌ Mijoz yaratishda xatolik:', err);
      console.error('Xato tafsilotlari:', err.response?.data);
      
      if (err.response?.status === 400 && err.response?.data?.existingCustomer) {
        // Agar mijoz mavjud bo'lsa, uni tanlash
        const existingCustomer = err.response.data.existingCustomer;
        setSelectedCustomer(existingCustomer);
        setShowNewCustomerForm(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        showAlert('Bu mijoz allaqachon mavjud. Tanlandi.', 'Ma\'lumot', 'info');
        console.log('ℹ️ Mavjud mijoz tanlandi:', existingCustomer);
      } else {
        showAlert(err.response?.data?.message || 'Mijoz qo\'shishda xatolik', 'Xatolik', 'danger');
      }
    }
  };

  const total = cart.reduce((sum, item) => {
    // Agar skidka tanlangan bo'lsa, skidka qilingan narxni ishlatish
    const itemPrice = item.discountedPrice || item.price;
    return sum + itemPrice * item.cartQuantity;
  }, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const addToCart = (product: Product) => {
    // Mahsulot miqdorini tekshirish
    if (product.quantity <= 0) {
      showAlert(`${product.name} tugagan! Mavjud emas.`, 'Ogohlantirish', 'warning');
      return;
    }

    // Savatchadagi miqdorni tekshirish
    const existingInCart = cart.find(p => p._id === product._id);
    const currentCartQuantity = existingInCart ? existingInCart.cartQuantity : 0;
    
    if (currentCartQuantity >= product.quantity) {
      showAlert(`${product.name} - maksimal miqdor: ${product.quantity}`, 'Ogohlantirish', 'warning');
      return;
    }

    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: p.cartQuantity + 1} : p);
      }
      return [...prev, {...product, cartQuantity: 1}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleQRScan = (product: Product) => {
    addToCart(product);
    showAlert(`${product.name} savatga qo'shildi`, 'Muvaffaqiyat', 'success');
    setShowQRScanner(false);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    // 0 yoki manfiy bo'lsa ham o'chirmaslik, faqat yangilash
    setCart(prev => prev.map(p => p._id === id ? {...p, cartQuantity: Math.max(0, quantity)} : p));
  };

  const applyPricingTier = (itemId: string, tier: 'tier1' | 'tier2' | 'tier3' | null) => {
    setCart(prev => prev.map(item => {
      if (item._id !== itemId) return item;
      
      if (!tier || !item.pricingTiers || !item.pricingTiers[tier]) {
        // Skidka yo'q - asl narxni qaytarish
        return {
          ...item,
          selectedTier: null,
          discountedPrice: undefined
        };
      }
      
      const tierData = item.pricingTiers[tier];
      const discountPercent = tierData.discountPercent;
      const discountedPrice = item.price * (1 - discountPercent / 100);
      
      return {
        ...item,
        selectedTier: tier,
        discountedPrice
      };
    }));
  };

  const handlePayment = async () => {
    if (cart.length === 0) return;

    // To'langan summani hisoblash
    const totalPaid = cashAmount + cardAmount;
    const debtAmount = total - totalPaid;

    // Agar qarz bo'lsa va mijoz tanlanmagan bo'lsa
    if (debtAmount > 0 && !selectedCustomer) {
      showAlert('Qarzga sotish uchun mijozni tanlang yoki yangi mijoz qo\'shing!', 'Ogohlantirish', 'warning');
      return;
    }

    // To'lov usulini aniqlash
    let finalPaymentMethod: 'cash' | 'card' | 'mixed';
    if (cashAmount > 0 && cardAmount > 0) {
      finalPaymentMethod = 'mixed';
    } else if (cashAmount > 0) {
      finalPaymentMethod = 'cash';
    } else {
      finalPaymentMethod = 'card';
    }

    const saleData = {
      items: cart.map(item => ({
        product: item._id,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.cartQuantity
      })),
      total,
      paidAmount: totalPaid,
      cashAmount,
      cardAmount,
      paymentMethod: finalPaymentMethod,
      isReturn: isReturnMode,
      customer: selectedCustomer?._id
    };

    try {
      if (navigator.onLine) {
        console.log('📤 Chek yuborish boshlandi:', saleData);
        const response = await api.post('/receipts', saleData);
        console.log('✅ Server javobi:', response.data);
        
        // Server o'zi qarzni yaratadi, biz faqat xabar beramiz
        if (debtAmount > 0 && selectedCustomer) {
          showAlert(`To'lov qabul qilindi! Qarz: ${formatNumber(debtAmount)} so'm`, 'Muvaffaqiyat', 'success');
        } else {
          showAlert(isReturnMode ? 'Qaytarish muvaffaqiyatli!' : 'Chek saqlandi!', 'Muvaffaqiyat', 'success');
        }
        
        // Chekni print qilish
        printReceipt(response.data, finalPaymentMethod, totalPaid, debtAmount, cashAmount, cardAmount);
        
        // Tozalash
        setCart([]);
        setShowPayment(false);
        setShowPaymentInput(false);
        setPaymentMethod(null);
        setIsReturnMode(false);
        setCashAmount(0);
        setCardAmount(0);
        setPaidAmount(0);
        setSelectedCustomer(null);
        fetchProducts();
      } else {
        // Offline rejim
        showAlert('Internet aloqasi yo\'q. Iltimos, internetni yoqing.', 'Xatolik', 'danger');
      }
    } catch (err: any) {
      console.error('❌ Xatolik:', err);
      console.error('Xato tafsilotlari:', err.response?.data);
      
      // Xato xabarini ko'rsatish
      const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      showAlert(errorMessage, 'Xatolik', 'danger');
    }
  };

  const printReceipt = (receipt: any, method: string, paidAmount?: number, debtAmount?: number, cashAmount?: number, cardAmount?: number) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return;

    const actualPaidAmount = paidAmount || receipt.total;
    const actualDebtAmount = debtAmount || 0;
    const actualCashAmount = cashAmount || 0;
    const actualCardAmount = cardAmount || 0;

    let paymentMethodText = '';
    if (method === 'mixed') {
      paymentMethodText = `Naqd: ${formatNumber(actualCashAmount)} so'm, Karta: ${formatNumber(actualCardAmount)} so'm`;
    } else if (method === 'cash') {
      paymentMethodText = 'Naqd pul';
    } else {
      paymentMethodText = 'Karta';
    }

    // Skidka ma'lumotlarini hisoblash
    let totalDiscount = 0;
    let totalOriginalPrice = 0;
    
    const itemsWithDiscount = cart.map(item => {
      const currentPrice = item.discountedPrice || item.price;
      const originalPrice = item.price;
      const itemDiscount = (originalPrice - currentPrice) * item.cartQuantity;
      
      totalDiscount += itemDiscount;
      totalOriginalPrice += originalPrice * item.cartQuantity;
      
      return {
        ...item,
        currentPrice,
        originalPrice,
        hasDiscount: !!item.discountedPrice,
        discountPercent: item.selectedTier && item.pricingTiers?.[item.selectedTier]?.discountPercent || 0
      };
    });

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Chek</title>
        <style>
          body { font-family: monospace; margin: 0; padding: 10px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-weight: bold; font-size: 14px; }
          .items { margin: 10px 0; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .item { margin: 8px 0; }
          .item-header { display: flex; justify-content: space-between; font-weight: bold; }
          .item-details { font-size: 10px; color: #666; margin-top: 2px; }
          .discount-badge { color: #d00; font-weight: bold; }
          .original-price { text-decoration: line-through; color: #999; }
          .total { font-weight: bold; font-size: 14px; text-align: right; margin: 10px 0; }
          .discount-summary { background: #f0f0f0; padding: 8px; margin: 10px 0; border-radius: 4px; }
          .payment-info { margin: 10px 0; border-top: 1px dashed #000; padding-top: 10px; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; }
          .debt-warning { color: #d00; font-weight: bold; text-align: center; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CHEK</div>
          <div>${new Date().toLocaleString('uz-UZ')}</div>
        </div>
        
        <div class="items">
          ${itemsWithDiscount.map((item: any) => `
            <div class="item">
              <div class="item-header">
                <span>${item.name}</span>
                <span>${formatNumber(item.currentPrice * item.cartQuantity)} so'm</span>
              </div>
              <div class="item-details">
                ${item.quantity} x ${formatNumber(item.currentPrice)} so'm
                ${item.hasDiscount ? `
                  <br>
                  <span class="discount-badge">-${item.discountPercent}% skidka</span>
                  <span class="original-price">(${formatNumber(item.originalPrice)} so'm)</span>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        
        ${totalDiscount > 0 ? `
          <div class="discount-summary">
            <div style="display: flex; justify-content: space-between; margin: 3px 0;">
              <span>Asl narx:</span>
              <span>${formatNumber(totalOriginalPrice)} so'm</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 3px 0; color: #d00; font-weight: bold;">
              <span>Skidka:</span>
              <span>-${formatNumber(totalDiscount)} so'm</span>
            </div>
          </div>
        ` : ''}
        
        <div class="total">
          Jami: ${formatNumber(receipt.total)} so'm
        </div>
        
        <div class="payment-info">
          ${method === 'mixed' ? `
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span>Naqd:</span>
              <span>${formatNumber(actualCashAmount)} so'm</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 5px 0;">
              <span>Karta:</span>
              <span>${formatNumber(actualCardAmount)} so'm</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; margin: 5px 0; font-weight: bold;">
            <span>To'landi:</span>
            <span>${formatNumber(actualPaidAmount)} so'm</span>
          </div>
          ${actualDebtAmount > 0 ? `
            <div class="debt-warning">
              Qarz: ${formatNumber(actualDebtAmount)} so'm
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          To'lov: ${paymentMethodText}
          ${totalDiscount > 0 ? `<br>Siz ${formatNumber(totalDiscount)} so'm tejadingiz!` : ''}
          <br>
          Raxmat!
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const printQRCodes = async (products: Product[]) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      alert('Popup bloklangan. Iltimos, popup ga ruxsat bering.');
      return;
    }

    // QR kodlarni generatsiya qilish
    const qrPromises = products.map(async (product) => {
      try {
        const QRCodeModule = await import('qrcode');
        const QRCodeLib = QRCodeModule.default || QRCodeModule;
        const productUrl = `${window.location.origin}/product/${product._id}`;
        const dataUrl = await QRCodeLib.toDataURL(productUrl, {
          width: 300,
          margin: 1,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        return { product, qrDataUrl: dataUrl };
      } catch (err) {
        console.error('QR generation error:', err);
        return { product, qrDataUrl: '' };
      }
    });

    const qrData = await Promise.all(qrPromises);

    // Label HTML yaratish
    let labelsHtml = '';
    qrData.forEach(({ product, qrDataUrl }) => {
      labelsHtml += `
        <div class="label">
          <div class="top-section">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" class="qr-code" />
            </div>
            <div class="info-box">
              <div class="product-code">Kod: ${product.code}</div>
              <div class="product-name">${product.name}</div>
            </div>
          </div>
          <div class="bottom-section">
            <div class="price-box">
              <span class="price-value">${formatNumber(product.price)}</span>
              <span class="price-currency">so'm</span>
            </div>
          </div>
        </div>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label</title>
        <style>
          @page {
            size: 60mm 40mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label {
            width: 60mm;
            height: 40mm;
            padding: 2mm;
            background: white;
            display: flex;
            flex-direction: column;
            page-break-after: always;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .top-section {
            display: flex;
            gap: 2mm;
            flex: 1;
          }
          .qr-box {
            width: 22mm;
            height: 22mm;
            flex-shrink: 0;
          }
          .qr-code {
            width: 22mm;
            height: 22mm;
            display: block;
            image-rendering: pixelated;
          }
          .info-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .product-code {
            font-size: 7pt;
            font-weight: 600;
            color: #666;
            margin-bottom: 1mm;
          }
          .product-name {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
          }
          .bottom-section {
            margin-top: 1.5mm;
          }
          .price-box {
            padding: 1.5mm;
            text-align: center;
            background: #f0f0f0;
            border-radius: 1mm;
          }
          .price-value {
            font-size: 14pt;
            font-weight: 900;
            color: #000;
            letter-spacing: -0.5px;
          }
          .price-currency {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-left: 1mm;
          }
          @media print {
            body { background: white; }
          }
          @media screen {
            body { background: #e5e7eb; padding: 10mm; }
            .label { 
              margin-bottom: 5mm;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border: 1px solid #ddd;
            }
          }
        </style>
      </head>
      <body>
        ${labelsHtml}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 200);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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

  const loadSavedReceipt = (receipt: SavedReceipt) => {
    setCart(receipt.items);
    const updated = savedReceipts.filter(r => r.id !== receipt.id);
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
    setShowSavedReceipts(false);
  };

  const deleteSavedReceipt = (id: string) => {
    const updated = savedReceipts.filter(r => r.id !== id);
    setSavedReceipts(updated);
    localStorage.setItem('savedReceipts', JSON.stringify(updated));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100 pb-20 lg:pb-0">
      {AlertComponent}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between">
          {/* Left: Hamburger + Title */}
          <div className="flex items-center gap-3">
            {/* Hamburger Button - Only on mobile */}
            <button 
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors active:scale-95 flex-shrink-0 flex sm:hidden"
              title="Menyuni ochish"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
              <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg lg:text-xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                Kassa (POS)
              </h1>
            </div>
          </div>

          {/* Right: Saqlangan Button */}
          <button 
            onClick={() => setShowSavedReceipts(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-100 to-blue-100 hover:from-purple-200 hover:to-blue-200 rounded-xl text-sm font-bold text-purple-700 transition-all shadow-md hover:shadow-lg"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Saqlangan</span>
            {savedReceipts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold shadow-md">
                {savedReceipts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          
          {/* Products/Receipts - Second (Bottom on mobile) */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3 lg:space-y-4 order-2 lg:order-1">
            {/* Tabs */}
            <div className="flex gap-2 bg-white p-2 rounded-xl border-2 border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab('products')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                  activeTab === 'products'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Package2 className="w-4 h-4" />
                Mahsulotlar
              </button>
              <button
                onClick={() => setActiveTab('receipts')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold text-xs sm:text-sm transition-all ${
                  activeTab === 'receipts'
                    ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-4 h-4" />
                Cheklar
                {helperReceipts.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold">
                    {helperReceipts.length}
                  </span>
                )}
              </button>
            </div>

            {/* Search Bar - Only for products tab */}
            {activeTab === 'products' && (
              <>
                <div className="relative group">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Mahsulot qidirish... (Ctrl+K)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSearch(true)}
                    className="w-full pl-9 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 text-xs sm:text-sm transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setShowSearch(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Category Filter - Horizontal Scrollable */}
                <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border-2 border-slate-200">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <button
                      onClick={() => setSelectedCategory('')}
                      className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                        selectedCategory === '' 
                          ? 'bg-brand-500 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Barchasi
                    </button>
                    {categories.map(category => (
                      <button
                        key={category._id}
                        onClick={() => setSelectedCategory(category.name)}
                        className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                          selectedCategory === category.name 
                            ? 'bg-brand-500 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Results / Products Grid */}
                {showSearch && searchQuery ? (
                  <div className="bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        {searchResults.length} ta natija
                      </span>
                      <button
                        onClick={() => {
                          setShowSearch(false);
                          setSearchQuery('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Yopish (Esc)
                      </button>
                    </div>
                <div className="max-h-64 sm:max-h-96 overflow-y-auto thin-scrollbar">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {searchResults.slice(0, 10).map(product => (
                        <button
                          key={product._id}
                          onClick={() => { 
                            setSelectedProductForDetail(product);
                            setProductDetailQuantity(0);
                            setShowProductDetail(true);
                            setShowSearch(false); 
                            setSearchQuery(''); 
                          }}
                          disabled={product.quantity <= 0}
                          className={`w-full flex items-center gap-2 sm:gap-4 p-2 sm:p-4 hover:bg-slate-50 transition-colors text-left ${product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl border-2 border-brand-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            {product.quantity <= 0 && (
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                                <span className="text-white text-[8px] font-bold">TUGAGAN</span>
                              </div>
                            )}
                            {product.images && product.images.length > 0 ? (
                              <img 
                                src={`${UPLOADS_URL}${product.images[0]}`}
                                alt={product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<svg class="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                  }
                                }}
                              />
                            ) : (
                              <Package2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-[10px] sm:text-xs">{product.name}</p>
                            <p className="text-[9px] sm:text-[10px] text-slate-500">Kod: {product.code}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-brand-600 text-[10px] sm:text-xs">{formatNumber(product.price)} so'm</p>
                            <p className={`text-[9px] sm:text-[10px] font-semibold ${product.quantity <= 0 ? 'text-red-600' : product.quantity <= 10 ? 'text-orange-600' : 'text-green-600'}`}>
                              {product.quantity} ta
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 sm:p-8 text-center text-slate-500">
                      <Package2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                      <p className="text-xs sm:text-sm">Mahsulot topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Kategoriyalar bo'yicha mahsulotlar - har biri alohida scroll bilan */
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto thin-scrollbar pb-32">
                <div className="space-y-6 pb-8">
                {!selectedCategory ? (
                  /* Barcha kategoriyalar - har biri alohida scroll */
                  Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                    <div key={category} className="space-y-3">
                      {/* Kategoriya header */}
                      <div className="flex items-center justify-between px-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                          <div className="w-1 h-6 bg-brand-500 rounded-full"></div>
                          {category}
                          <span className="text-sm text-slate-500 font-normal">({categoryProducts.length})</span>
                        </h3>
                        <button
                          onClick={() => setSelectedCategory(category)}
                          className="text-xs sm:text-sm text-brand-600 hover:text-brand-700 font-semibold transition-colors"
                        >
                          Barchasini ko'rish →
                        </button>
                      </div>
                      
                      {/* Gorizontal scroll - kategoriya mahsulotlari */}
                      <div className="overflow-x-auto thin-scrollbar pb-2 scroll-smooth snap-x snap-mandatory">
                        <div className="flex gap-3 sm:gap-4 px-2 pr-4" style={{ minWidth: 'min-content' }}>
                          {categoryProducts.map(product => (
                            <div
                              key={product._id}
                              className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-2xl transition-all duration-300 overflow-hidden relative flex-shrink-0 snap-start"
                              style={{ width: '160px' }}
                            >
                              {/* Action tugmalari */}
                              <div className="absolute top-2 right-2 flex gap-1 z-20">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedProductForCategory(product);
                                    setSelectedCategoryForProduct(product.category || '');
                                    setShowCategoryModal(true);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                                  title="Kategoriya"
                                >
                                  <Filter className="w-3.5 h-3.5 text-white drop-shadow-lg" />
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    printQRCodes([product]);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
                                  title="QR Print"
                                >
                                  <Scan className="w-3.5 h-3.5 text-white drop-shadow-lg" />
                                </button>
                              </div>

                              {/* Mahsulot kartasi */}
                              <button
                                onClick={() => {
                                  setSelectedProductForDetail(product);
                                  setProductDetailQuantity(0);
                                  setShowProductDetail(true);
                                }}
                                disabled={product.quantity <= 0}
                                className={`w-full text-left ${product.quantity <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {/* Rasm */}
                                <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                                  {product.quantity <= 0 && (
                                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                                      <div className="bg-red-500 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-lg">
                                        TUGAGAN
                                      </div>
                                    </div>
                                  )}
                                  
                                  {product.images && product.images.length > 0 ? (
                                    <img 
                                      src={`${UPLOADS_URL}${product.images[0]}`}
                                      alt={product.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent && !parent.querySelector('svg')) {
                                          const icon = document.createElement('div');
                                          icon.className = 'flex items-center justify-center w-full h-full';
                                          icon.innerHTML = '<svg class="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                          parent.appendChild(icon);
                                        }
                                      }}
                                    />
                                  ) : (
                                    <Package2 className="w-10 h-10 text-slate-300" />
                                  )}
                                  
                                  {/* Stock badge */}
                                  <div className="absolute bottom-1.5 left-1.5">
                                    {product.quantity <= 0 ? (
                                      <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-md shadow-lg">
                                        0 ta
                                      </span>
                                    ) : product.quantity <= 10 ? (
                                      <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] font-bold rounded-md shadow-lg animate-pulse">
                                        {product.quantity} ta
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-green-500 text-white text-[9px] font-bold rounded-md shadow-lg">
                                        {product.quantity} ta
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Ma'lumotlar */}
                                <div className="p-2.5">
                                  <h3 className="font-bold text-slate-900 text-[11px] mb-0.5 truncate group-hover:text-brand-600 transition-colors">
                                    {product.name}
                                  </h3>
                                  <p className="text-[9px] text-slate-500 mb-1.5 font-mono">
                                    #{product.code}
                                  </p>
                                  <div>
                                    <p className="text-[8px] text-slate-500 mb-0.5">Narxi</p>
                                    <p className="font-bold text-brand-600 text-xs">
                                      {formatNumber(product.price)}
                                      <span className="text-[9px] ml-0.5">so'm</span>
                                    </p>
                                  </div>
                                </div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Bitta kategoriya tanlangan - vertikal scroll */
                  <div 
                    ref={productsContainerRef}
                    className="max-h-[calc(100vh-250px)] overflow-y-auto thin-scrollbar pb-32"
                  >
                    {displayedProducts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 px-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4">
                          <Package2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700 mb-2">
                          Bu kategoriyada mahsulot yo'q
                        </h3>
                        <p className="text-sm text-slate-500 text-center mb-4">
                          "{selectedCategory}" kategoriyasida hozircha mahsulot mavjud emas
                        </p>
                        <button
                          onClick={() => setSelectedCategory('')}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
                        >
                          Barcha mahsulotlar
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4 pb-16">
                        {displayedProducts.map(product => (
                    <div
                      key={product._id}
                      className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-400 hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
                    >
                      {/* Action tugmalari - yuqori o'ng burchak */}
                      <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                        {/* Kategoriya tugmasi */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProductForCategory(product);
                            setSelectedCategoryForProduct(product.category || '');
                            setShowCategoryModal(true);
                          }}
                          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Kategoriya"
                        >
                          <Filter className="w-4 h-4 text-white drop-shadow-lg" />
                        </button>
                        
                        {/* QR Print tugmasi */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            printQRCodes([product]);
                          }}
                          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 active:scale-95"
                          title="QR Print"
                        >
                          <Scan className="w-4 h-4 text-white drop-shadow-lg" />
                        </button>
                      </div>

                      {/* Mahsulot kartasi - click qilish mumkin */}
                      <button
                        onClick={() => {
                          setSelectedProductForDetail(product);
                          setProductDetailQuantity(0);
                          setShowProductDetail(true);
                        }}
                        disabled={product.quantity <= 0}
                        className={`w-full text-left ${product.quantity <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {/* Rasm qismi */}
                        <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                          {/* Tugagan overlay */}
                          {product.quantity <= 0 && (
                            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-10">
                              <div className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                                TUGAGAN
                              </div>
                            </div>
                          )}
                          
                          {/* Mahsulot rasmi */}
                          {product.images && product.images.length > 0 ? (
                            <img 
                              src={`${UPLOADS_URL}${product.images[0]}`}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent && !parent.querySelector('svg')) {
                                  const icon = document.createElement('div');
                                  icon.className = 'flex items-center justify-center w-full h-full';
                                  icon.innerHTML = '<svg class="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                  parent.appendChild(icon);
                                }
                              }}
                            />
                          ) : (
                            <Package2 className="w-12 h-12 sm:w-16 sm:h-16 text-slate-300" />
                          )}
                          
                          {/* Stock badge - pastki chap burchak */}
                          <div className="absolute bottom-2 left-2">
                            {product.quantity <= 0 ? (
                              <span className="px-2 py-1 bg-red-500 text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-lg">
                                0 ta
                              </span>
                            ) : product.quantity <= 10 ? (
                              <span className="px-2 py-1 bg-orange-500 text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-lg animate-pulse">
                                {product.quantity} ta
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-500 text-white text-[9px] sm:text-xs font-bold rounded-lg shadow-lg">
                                {product.quantity} ta
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Ma'lumotlar qismi */}
                        <div className="p-3 sm:p-4">
                          {/* Mahsulot nomi */}
                          <h3 className="font-bold text-slate-900 text-xs sm:text-sm mb-1 truncate group-hover:text-brand-600 transition-colors">
                            {product.name}
                          </h3>
                          
                          {/* Kod */}
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-2 font-mono">
                            #{product.code}
                          </p>
                          
                          {/* Narx - katta va ko'zga tashlanadigan */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5">Narxi</p>
                              <p className="font-bold text-brand-600 text-sm sm:text-base">
                                {formatNumber(product.price)}
                                <span className="text-[10px] sm:text-xs ml-1">so'm</span>
                              </p>
                            </div>
                            
                            {/* Hover effekt - qo'shish belgisi */}
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110 shadow-lg">
                              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                      </div>
                    )}
                  </div>
                )}
                </div>
              </div>
            )}
              </>
            )}

            {/* Receipts Tab */}
            {activeTab === 'receipts' && (
              <div className="bg-white rounded-xl border-2 border-slate-200 shadow-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Hodimlardan kelgan cheklar</h3>
                  <button
                    onClick={fetchHelperReceipts}
                    disabled={loadingReceipts}
                    className="p-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingReceipts ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingReceipts ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : helperReceipts.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Cheklar yo'q</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto thin-scrollbar">
                    {helperReceipts.map((receipt: any) => (
                      <div key={receipt._id} className="border-2 border-slate-200 rounded-xl p-4 hover:border-brand-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-slate-900">Chek #{receipt.receiptNumber || receipt._id.slice(-6)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
                            </p>
                            {receipt.createdBy && (
                              <p className="text-xs text-brand-600 font-medium mt-1">
                                👤 Hodim: {receipt.createdBy.name}
                              </p>
                            )}
                            {receipt.customer && (
                              <p className="text-xs text-green-600 font-medium mt-1">
                                🛒 Mijoz: {receipt.customer.name || 'Oddiy mijoz'}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => loadReceiptToCart(receipt)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Yuklash
                          </button>
                        </div>

                        <div className="space-y-2 mb-3">
                          {receipt.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm bg-slate-50 p-2 rounded-lg">
                              <span className="text-slate-700">{item.name} × {item.quantity}</span>
                              <span className="font-semibold text-slate-900">{formatNumber(item.price * item.quantity)} so'm</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                          <span className="text-sm font-medium text-slate-600">Jami:</span>
                          <span className="text-xl font-bold text-brand-600">{formatNumber(receipt.totalAmount || receipt.total)} so'm</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cart - First (Top on mobile) */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <div className="bg-white rounded-lg sm:rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden">
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-3 sm:px-6 py-3 sm:py-4 text-white">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h2 className="text-sm sm:text-base font-bold">Savat</h2>
                </div>
                <p className="text-[10px] sm:text-xs text-brand-100">{itemCount} ta mahsulot</p>
              </div>

              {/* Cart Items */}
              <div className="max-h-48 sm:max-h-64 overflow-y-auto divide-y divide-slate-100 thin-scrollbar">
                {cart.length === 0 ? (
                  <div className="p-4 sm:p-8 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                    <p className="text-[10px] sm:text-xs">Savat bo'sh</p>
                  </div>
                ) : (
                  cart.map(item => {
                    const product = products.find(p => p._id === item._id);
                    const isLowStock = product && item.cartQuantity > product.quantity;
                    const currentPrice = item.discountedPrice || item.price;
                    const hasPricingTiers = item.pricingTiers && (item.pricingTiers.tier1 || item.pricingTiers.tier2 || item.pricingTiers.tier3);
                    
                    return (
                    <div key={item._id} className="p-2 sm:p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-900 text-[10px] sm:text-xs truncate">{item.name}</p>
                            {isLowStock && (
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[8px] font-semibold rounded whitespace-nowrap">
                                Kam!
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-slate-500">{item.code}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Pricing Tiers - 3 ta narx */}
                      {hasPricingTiers && (
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          {item.pricingTiers?.tier1 && (
                            <button
                              onClick={() => applyPricingTier(item._id, item.selectedTier === 'tier1' ? null : 'tier1')}
                              className={`px-1.5 py-1 rounded text-[9px] font-semibold transition-all ${
                                item.selectedTier === 'tier1'
                                  ? 'bg-green-500 text-white shadow-md'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              -{item.pricingTiers.tier1.discountPercent}%
                            </button>
                          )}
                          {item.pricingTiers?.tier2 && (
                            <button
                              onClick={() => applyPricingTier(item._id, item.selectedTier === 'tier2' ? null : 'tier2')}
                              className={`px-1.5 py-1 rounded text-[9px] font-semibold transition-all ${
                                item.selectedTier === 'tier2'
                                  ? 'bg-blue-500 text-white shadow-md'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              }`}
                            >
                              -{item.pricingTiers.tier2.discountPercent}%
                            </button>
                          )}
                          {item.pricingTiers?.tier3 && (
                            <button
                              onClick={() => applyPricingTier(item._id, item.selectedTier === 'tier3' ? null : 'tier3')}
                              className={`px-1.5 py-1 rounded text-[9px] font-semibold transition-all ${
                                item.selectedTier === 'tier3'
                                  ? 'bg-purple-500 text-white shadow-md'
                                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                              }`}
                            >
                              -{item.pricingTiers.tier3.discountPercent}%
                            </button>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={item.cartQuantity === 0 ? '' : item.cartQuantity}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Bo'sh qoldirish mumkin
                              if (value === '') {
                                updateQuantity(item._id, 0);
                                return;
                              }
                              // Faqat raqamlar
                              const numValue = parseInt(value);
                              if (!isNaN(numValue) && numValue >= 0) {
                                updateQuantity(item._id, numValue);
                              }
                            }}
                            onBlur={(e) => {
                              // Agar bo'sh bo'lsa yoki 0 bo'lsa, 1 ga o'rnatish
                              if (item.cartQuantity === 0 || e.target.value === '') {
                                updateQuantity(item._id, 1);
                              }
                            }}
                            onClick={(e) => e.currentTarget.select()}
                            placeholder="1"
                            className="w-14 text-center text-xs font-bold bg-slate-100 border-2 border-slate-200 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 rounded-lg py-1.5 cursor-pointer hover:bg-slate-50 transition-colors"
                          />
                        </div>
                        <div className="text-right">
                          {item.discountedPrice && (
                            <p className="text-[9px] text-slate-400 line-through">{formatNumber(item.price * item.cartQuantity)} so'm</p>
                          )}
                          <p className="font-bold text-brand-600 text-xs">{formatNumber(currentPrice * item.cartQuantity)} so'm</p>
                        </div>
                      </div>
                    </div>
                  );
                  })
                )}
              </div>

              {/* Customer Select */}
              {cart.length > 0 && (
                <div className="border-t border-slate-200 p-4">
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">Mijoz</label>
                  <button
                    onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="flex-1 text-left truncate">
                      {selectedCustomer ? selectedCustomer.name : 'Oddiy mijoz'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showCustomerSelect && (
                    <div className="absolute right-0 left-0 mx-4 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto thin-scrollbar">
                      <button
                        onClick={() => { setSelectedCustomer(null); setShowCustomerSelect(false); }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100"
                      >
                        Oddiy mijoz
                      </button>
                      {customers.map(customer => (
                        <button
                          key={customer._id}
                          onClick={() => { setSelectedCustomer(customer); setShowCustomerSelect(false); }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          <p className="text-xs text-slate-500">{customer.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Total & Actions */}
              {cart.length > 0 && (
                <div className="border-t border-slate-200 p-3 sm:p-6 space-y-2 sm:space-y-3">
                  {/* Jami summa - katta va aniq */}
                  <div className="bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl p-3 sm:p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">Jami:</span>
                      <span className="text-base sm:text-lg font-bold text-brand-600">{formatNumber(total)} so'm</span>
                    </div>
                  </div>

                  {/* Tugmalar - Gorizontal bir qatorda */}
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                    <button
                      onClick={() => setShowPayment(true)}
                      className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-2 rounded-lg transition-all shadow-lg hover:shadow-xl flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px]"
                    >
                      <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>To'lash</span>
                    </button>

                    <button
                      onClick={saveReceipt}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px]"
                    >
                      <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Saqlash</span>
                    </button>

                    <button
                      onClick={() => setCart([])}
                      className="bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-2 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px]"
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      <span>Tozalash</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div 
          data-modal="true"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={() => {
            setShowPayment(false);
            setCashAmount(0);
            setCardAmount(0);
            setShowNewCustomerForm(false);
            setNewCustomerName('');
            setNewCustomerPhone('');
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full my-8 overflow-hidden"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white">
              <h3 className="text-xl font-bold">To'lov</h3>
            </div>

            <div className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto thin-scrollbar">
              {/* Jami summa */}
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Jami summa</p>
                <p className="text-3xl font-bold text-brand-600">{formatNumber(total)} so'm</p>
              </div>

              {/* Mijoz tanlash */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">Mijoz</label>
                
                {!showNewCustomerForm ? (
                  <div className="space-y-2">
                    <select
                      value={selectedCustomer?._id || ''}
                      onChange={(e) => {
                        const customer = customers.find(c => c._id === e.target.value);
                        setSelectedCustomer(customer || null);
                      }}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">Oddiy mijoz</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name} - {customer.phone}
                        </option>
                      ))}
                    </select>
                    
                    <button
                      onClick={() => setShowNewCustomerForm(true)}
                      className="w-full px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition-colors text-sm"
                    >
                      + Yangi mijoz qo'shish
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 p-4 bg-blue-50 rounded-xl">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Ism</label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="Mijoz ismi..."
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs font-semibold text-slate-700 mb-1 block">Telefon</label>
                      <input
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="+998 90 123 45 67"
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-sm"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateNewCustomer}
                        className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                      >
                        Saqlash
                      </button>
                      <button
                        onClick={() => {
                          setShowNewCustomerForm(false);
                          setNewCustomerName('');
                          setNewCustomerPhone('');
                        }}
                        className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors text-sm"
                      >
                        Bekor
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* To'lov inputlari */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    Naqd pul
                  </label>
                  <input
                    type="number"
                    value={cashAmount || ''}
                    onChange={(e) => setCashAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    Karta
                  </label>
                  <input
                    type="number"
                    value={cardAmount || ''}
                    onChange={(e) => setCardAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-lg font-semibold"
                  />
                </div>
              </div>

              {/* To'lov ma'lumotlari */}
              {(cashAmount > 0 || cardAmount > 0) && (
                <div className="space-y-2">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Jami to'lanadi:</span>
                      <span className="font-bold text-slate-900">{formatNumber(cashAmount + cardAmount)} so'm</span>
                    </div>
                    
                    {(cashAmount + cardAmount) < total && (
                      <div className="flex justify-between text-sm">
                        <span className="text-amber-600">Qarz:</span>
                        <span className="font-bold text-amber-600">{formatNumber(total - (cashAmount + cardAmount))} so'm</span>
                      </div>
                    )}
                    
                    {(cashAmount + cardAmount) > total && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Qaytim:</span>
                        <span className="font-bold text-green-600">{formatNumber((cashAmount + cardAmount) - total)} so'm</span>
                      </div>
                    )}
                  </div>

                  {/* Oddiy mijoz uchun ogohlantirish */}
                  {(cashAmount + cardAmount) < total && !selectedCustomer && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-900 text-sm">Oddiy mijozga qarzga sotib bo'lmaydi!</p>
                        <p className="text-xs text-red-700 mt-1">To'liq to'lov qiling yoki mijozni tanlang</p>
                      </div>
                    </div>
                  )}

                  {/* Qarz ogohlantirishi */}
                  {(cashAmount + cardAmount) < total && selectedCustomer && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 text-sm">Qisman to'lov</p>
                        <p className="text-xs text-amber-700 mt-1">
                          {formatNumber(total - (cashAmount + cardAmount))} so'm <span className="font-bold">{selectedCustomer.name}</span> nomiga qarzga yoziladi
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tugmalar */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handlePayment}
                  disabled={cashAmount + cardAmount <= 0 || ((cashAmount + cardAmount) < total && !selectedCustomer)}
                  className="flex-1 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  Tasdiqlash
                </button>
                <button
                  onClick={() => {
                    setShowPayment(false);
                    setCashAmount(0);
                    setCardAmount(0);
                    setShowNewCustomerForm(false);
                    setNewCustomerName('');
                    setNewCustomerPhone('');
                  }}
                  className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Bekor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* Saved Receipts Modal */}
      {showSavedReceipts && (
        <div 
          data-modal="true"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
          onClick={() => setShowSavedReceipts(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Saqlangan Cheklar</h3>
              <button onClick={() => setShowSavedReceipts(false)} className="hover:bg-brand-600 p-2 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 thin-scrollbar">
              {savedReceipts.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Saqlangan cheklar yo'q</p>
                </div>
              ) : (
                savedReceipts.map(receipt => (
                  <div key={receipt.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-900">{receipt.items.length} ta mahsulot</p>
                        <p className="text-xs text-slate-500">{receipt.savedAt}</p>
                      </div>
                      <p className="font-bold text-brand-600">{formatNumber(receipt.total)} so'm</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadSavedReceipt(receipt)}
                        className="flex-1 bg-brand-100 hover:bg-brand-200 text-brand-700 font-semibold py-2 rounded-lg transition-colors text-sm"
                      >
                        Yuklash
                      </button>
                      <button
                        onClick={() => deleteSavedReceipt(receipt.id)}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 rounded-lg transition-colors text-sm"
                      >
                        O'chirish
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal - Professional UX/UI */}
      {showProductDetail && selectedProductForDetail && (
        <div 
          data-modal="true"
          className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto animate-fadeIn"
          style={{ pointerEvents: 'auto' }}
          onClick={() => {
            setShowProductDetail(false);
            setSelectedProductForDetail(null);
            setProductDetailQuantity(0);
          }}
        >
          <div 
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg sm:w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-slideUp transform transition-all"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle - Mobile only */}
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
            </div>

            {/* Modal Header - Gradient */}
            <div className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-purple-600 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Package2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Mahsulot tafsiloti</h3>
                  <p className="text-xs text-white/80">Miqdorni tanlang</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowProductDetail(false);
                  setSelectedProductForDetail(null);
                  setProductDetailQuantity(0);
                }}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              
              {/* Decorative circles - pointer-events none */}
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 thin-scrollbar bg-gradient-to-b from-slate-50 to-white">
              {/* Product Image - Enhanced - Kichikroq */}
              <div className="relative w-full max-w-xs mx-auto aspect-square bg-gradient-to-br from-brand-50 via-purple-50 to-blue-50 rounded-2xl border-2 border-brand-200/50 flex items-center justify-center overflow-hidden shadow-lg group">
                {/* Stock badge */}
                <div className="absolute top-3 right-3 z-10">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-lg backdrop-blur-sm ${
                    selectedProductForDetail.quantity <= 0 
                      ? 'bg-red-500/90 text-white' 
                      : selectedProductForDetail.quantity <= 10 
                      ? 'bg-orange-500/90 text-white' 
                      : 'bg-green-500/90 text-white'
                  }`}>
                    {selectedProductForDetail.quantity} ta
                  </div>
                </div>

                {selectedProductForDetail.images && selectedProductForDetail.images.length > 0 ? (
                  <img 
                    src={getProductImage(selectedProductForDetail) || ''}
                    alt={selectedProductForDetail.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = '<svg class="w-16 h-16 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                      }
                    }}
                  />
                ) : (
                  <Package2 className="w-16 h-16 text-brand-400" />
                )}
              </div>

              {/* Product Info - Card Style */}
              <div className="space-y-3">
                {/* Name & Code */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <p className="text-xs font-semibold text-brand-600 mb-1 uppercase tracking-wide">Mahsulot</p>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">{selectedProductForDetail.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Kod:</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-sm font-mono font-semibold text-slate-700">
                      {selectedProductForDetail.code}
                    </span>
                  </div>
                </div>

                {/* Price Info */}
                <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-xl p-4 shadow-sm border border-brand-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Narx</span>
                    <DollarSign className="w-4 h-4 text-brand-500" />
                  </div>
                  <div className="text-2xl font-bold text-brand-600 mb-1">
                    {formatNumber(selectedProductForDetail.price)} <span className="text-base text-brand-500">so'm</span>
                  </div>
                  
                  {/* Additional prices */}
                  {(selectedProductForDetail.costPrice || selectedProductForDetail.boxPrice) && (
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-brand-200/50">
                      {selectedProductForDetail.costPrice && selectedProductForDetail.costPrice > 0 && (
                        <div>
                          <p className="text-[10px] text-brand-600 mb-0.5 uppercase tracking-wide">Tan narxi</p>
                          <p className="text-sm font-bold text-slate-700">{formatNumber(selectedProductForDetail.costPrice)}</p>
                        </div>
                      )}
                      {selectedProductForDetail.boxPrice && selectedProductForDetail.boxPrice > 0 && (
                        <div>
                          <p className="text-[10px] text-brand-600 mb-0.5 uppercase tracking-wide">Karobka</p>
                          <p className="text-sm font-bold text-slate-700">{formatNumber(selectedProductForDetail.boxPrice)}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity Selector - Enhanced */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Miqdor</span>
                    <ShoppingCart className="w-4 h-4 text-slate-400" />
                  </div>
                  
                  {/* Quantity Input with +/- buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProductDetailQuantity(Math.max(1, productDetailQuantity - 1))}
                      className="w-12 h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 rounded-xl transition-all duration-150 font-bold text-slate-700"
                    >
                      −
                    </button>
                    
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={productDetailQuantity === 0 ? '' : productDetailQuantity}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setProductDetailQuantity(0);
                          return;
                        }
                        const numValue = parseInt(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          setProductDetailQuantity(Math.min(numValue, selectedProductForDetail.quantity));
                        }
                      }}
                      onBlur={(e) => {
                        if (productDetailQuantity === 0 || e.target.value === '') {
                          setProductDetailQuantity(1);
                        }
                      }}
                      onClick={(e) => e.currentTarget.select()}
                      placeholder="1"
                      className="flex-1 h-12 text-center text-2xl font-bold bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 rounded-xl cursor-pointer hover:bg-slate-50 transition-all duration-150"
                    />
                    
                    <button
                      onClick={() => setProductDetailQuantity(Math.min(selectedProductForDetail.quantity, productDetailQuantity + 1))}
                      disabled={productDetailQuantity >= selectedProductForDetail.quantity}
                      className="w-12 h-12 flex items-center justify-center bg-brand-500 hover:bg-brand-600 active:bg-brand-700 active:scale-95 disabled:bg-slate-200 disabled:text-slate-400 rounded-xl transition-all duration-150 font-bold text-white shadow-lg shadow-brand-500/30"
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Low Stock Warning */}
                  {productDetailQuantity > selectedProductForDetail.quantity * 0.5 && selectedProductForDetail.quantity <= 10 && productDetailQuantity > 0 && (
                    <div className="mt-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 flex items-start gap-2 animate-fadeIn">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-yellow-900 text-xs">Mahsulot soni kam!</p>
                        <p className="text-[10px] text-yellow-700 mt-0.5">
                          Omborda {selectedProductForDetail.quantity} ta qoldi
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Total Price - Prominent */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-white/80 uppercase tracking-wide mb-1">Jami to'lov</p>
                      <p className="text-2xl font-bold text-white">
                        {formatNumber(selectedProductForDetail.price * productDetailQuantity)}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>

                {/* Description */}
                {selectedProductForDetail.description && (
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Ta'rif</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{selectedProductForDetail.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons - Fixed at bottom - Enhanced */}
            <div className="flex gap-3 p-5 border-t border-slate-200 flex-shrink-0 bg-white shadow-lg">
              <button
                onClick={() => {
                  setShowProductDetail(false);
                  setSelectedProductForDetail(null);
                  setProductDetailQuantity(0);
                }}
                className="flex-1 px-5 py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-slate-700 font-bold rounded-xl transition-all duration-150 shadow-sm"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  if (selectedProductForDetail) {
                    // ⚡ OPTIMISTIC UI - Darhol UI ni yangilash
                    const existingInCart = cart.find(p => p._id === selectedProductForDetail._id);
                    
                    if (existingInCart) {
                      const newQuantity = existingInCart.cartQuantity + productDetailQuantity;
                      if (newQuantity > selectedProductForDetail.quantity) {
                        showAlert(`Maksimal: ${selectedProductForDetail.quantity} ta`, 'Ogohlantirish', 'warning');
                        return;
                      }
                      // Darhol savat yangilanadi
                      setCart(prev => prev.map(p => 
                        p._id === selectedProductForDetail._id 
                          ? {...p, cartQuantity: newQuantity} 
                          : p
                      ));
                    } else {
                      // Darhol savatga qo'shiladi
                      setCart(prev => [...prev, {
                        ...selectedProductForDetail, 
                        cartQuantity: productDetailQuantity
                      }]);
                    }
                    
                    // Darhol modal yopiladi
                    setShowProductDetail(false);
                    setSelectedProductForDetail(null);
                    setProductDetailQuantity(0);
                    
                    // Success xabari
                    showAlert(`${selectedProductForDetail.name} (${productDetailQuantity} ta) qo'shildi`, 'Muvaffaqiyat', 'success');
                  }
                }}
                disabled={selectedProductForDetail.quantity <= 0 || productDetailQuantity <= 0 || productDetailQuantity > selectedProductForDetail.quantity}
                className="flex-1 px-5 py-3.5 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 active:scale-95 active:shadow-inner text-white font-bold rounded-xl transition-all duration-150 shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-5 h-5" />
                Savatga qo'shish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Panel - Only on mobile */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] sm:hidden"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel - LEFT SIDE - Only on mobile */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-[100] shadow-2xl animate-slide-in-left sm:hidden">
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <img src="/o5sk1awh.png" alt="Logo" className="w-8 h-8 rounded-lg border-2 border-white/30" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Sardor Furnitura</h2>
                    <p className="text-brand-100 text-xs">Mebel furniturasi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Menu Items */}
            <div className="p-4 space-y-2">
              <button 
                onClick={() => { navigate('/'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <Home className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Bosh sahifa</span>
              </button>
              <button 
                onClick={() => { navigate('/admin/products'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <Package2 className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Mahsulotlar</span>
              </button>
              <button 
                onClick={() => { setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-50 text-brand-700 transition-colors text-left"
              >
                <ShoppingCart className="w-5 h-5" />
                <span className="font-medium">Kassa (POS)</span>
              </button>
              <button 
                onClick={() => { navigate('/admin/customers'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <Users className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Mijozlar</span>
              </button>
              <button 
                onClick={() => { navigate('/admin/debts'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Qarzlar</span>
              </button>
              <button 
                onClick={() => { navigate('/admin/staff-receipts'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <Receipt className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Cheklar</span>
              </button>
              <button 
                onClick={() => { navigate('/admin/helpers'); setMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <UserCircle className="w-5 h-5 text-slate-600" />
                <span className="font-medium text-slate-700">Hodimlar</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Kategoriya tanlash modali */}
      {showCategoryModal && selectedProductForCategory && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowCategoryModal(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Kategoriya tanlash</h3>
                <p className="text-sm text-slate-500 mt-1">{selectedProductForCategory.name}</p>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-6 h-6 text-slate-600" />
              </button>
            </div>

            {/* Kategoriyalar ro'yxati */}
            <div className="space-y-2 max-h-96 overflow-y-auto thin-scrollbar mb-6">
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => setSelectedCategoryForProduct(category.name)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 ${
                    selectedCategoryForProduct === category.name
                      ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg scale-[1.02]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    {selectedCategoryForProduct === category.name && (
                      <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                        <div className="w-2.5 h-2.5 bg-brand-500 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Tugmalar */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all duration-150 active:scale-95"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleSaveProductCategory}
                disabled={!selectedCategoryForProduct}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
