import { useState, useEffect, useRef } from 'react';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package, Banknote, Delete, AlertTriangle, User, ChevronDown, Wifi, WifiOff, RefreshCw, ScanLine
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useOffline } from '../../hooks/useOffline';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  cacheProducts, 
  getCachedProducts,
  saveOfflineSale,
  markSalesAsSynced,
  deleteSyncedSales
} from '../../utils/indexedDbService';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

export default function Kassa() {
  const { showAlert, AlertComponent } = useAlert();
  const { isOnline, pendingCount, isSyncing, manualSync } = useOffline();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [showReturnSearch, setShowReturnSearch] = useState(false);
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  
  // Pricing tier edit uchun state
  const [showPricingEdit, setShowPricingEdit] = useState(false);
  const [selectedItemForPricing, setSelectedItemForPricing] = useState<CartItem | null>(null);
  
  // QR Scanner states
  const [showScanner, setShowScanner] = useState(false);
  const [scannerReady, setScannerReady] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [customMarkupPercent, setCustomMarkupPercent] = useState<number>(15);

  // Miqdorga qarab narx hisoblash funksiyasi
  const calculateDynamicPrice = (product: Product, quantity: number): number => {
    const basePrice = product.price; // Base price (cost price)
    let markupPercent = 15; // Default 15%
    
    // Pricing tier aniqlash
    if (quantity >= 100) {
      markupPercent = 11; // 100+ dona uchun 11%
    } else if (quantity >= 10) {
      markupPercent = 13; // 10-99 dona uchun 13%
    } else {
      markupPercent = 15; // 1-9 dona uchun 15%
    }
    
    // Narxni hisoblash
    const finalPrice = basePrice * (1 + markupPercent / 100);
    return Math.round(finalPrice); // Yaxlitlash
  };

  // Pricing tier ma'lumotini olish
  const getPricingTier = (quantity: number, customMarkup?: number) => {
    if (customMarkup !== undefined) {
      return { name: 'Maxsus', markupPercent: customMarkup, discount: customMarkup < 15, custom: true };
    }
    
    if (quantity >= 100) {
      return { name: '100+ dona', markupPercent: 11, discount: true, custom: false };
    } else if (quantity >= 10) {
      return { name: '10-99 dona', markupPercent: 13, discount: true, custom: false };
    } else {
      return { name: '1-9 dona', markupPercent: 15, discount: false, custom: false };
    }
  };

  // Pricing edit funksiyalari
  const handleItemPricingEdit = (item: CartItem) => {
    setSelectedItemForPricing(item);
    const currentTier = getPricingTier(item.cartQuantity, item.customMarkup);
    setCustomMarkupPercent(currentTier.markupPercent);
    setShowPricingEdit(true);
  };

  const saveCustomPricing = () => {
    if (!selectedItemForPricing) return;
    
    const basePrice = selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15; // Approximate base price
    const originalPrice = Math.round(basePrice * 1.15); // Asl narx (15% qo'shimcha bilan)
    const newPrice = Math.round(basePrice * (1 + customMarkupPercent / 100));
    const discount = originalPrice - newPrice;
    
    setCart(prev => prev.map(p => 
      p._id === selectedItemForPricing._id 
        ? { ...p, price: newPrice, customMarkup: customMarkupPercent, originalPrice: originalPrice }
        : p
    ));
    
    setShowPricingEdit(false);
    setSelectedItemForPricing(null);
    
    if (discount > 0) {
      showAlert(`Narx kelishtirildi: ${formatNumber(originalPrice)} → ${formatNumber(newPrice)} (${formatNumber(discount)} so'm chegirma)`, 'Muvaffaqiyat', 'success');
    } else {
      showAlert(`Narx yangilandi: ${customMarkupPercent}% qo'shimcha`, 'Muvaffaqiyat', 'success');
    }
  };

  // QR Scanner funksiyalari
  const startScanner = async () => {
    setShowScanner(true);
    setScannerReady(false);
    
    setTimeout(async () => {
      try {
        if (!scannerContainerRef.current) return;
        
        const html5QrCode = new Html5Qrcode("admin-qr-reader");
        html5QrCodeRef.current = html5QrCode;
        
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            // URL dan product ID ni ajratib olish
            const match = decodedText.match(/\/product\/([a-zA-Z0-9]+)/);
            if (match && match[1]) {
              const productId = match[1];
              
              try {
                const res = await api.get(`/products/public/${productId}`);
                const product = res.data;
                
                if (product) {
                  await stopScanner();
                  addToCart(product);
                  showAlert(`"${product.name}" savatchaga qo'shildi!`, 'Muvaffaqiyat', 'success');
                }
              } catch (err) {
                showAlert('Mahsulot topilmadi', 'Xatolik', 'warning');
              }
            } else {
              // Oddiy kod sifatida qidirish
              const product = products.find(p => p.code === decodedText);
              if (product) {
                await stopScanner();
                addToCart(product);
                showAlert(`"${product.name}" savatchaga qo'shildi!`, 'Muvaffaqiyat', 'success');
              } else {
                showAlert(`"${decodedText}" kodi bo'yicha mahsulot topilmadi`, 'Xatolik', 'warning');
              }
            }
          },
          () => {}
        );
        
        setScannerReady(true);
      } catch (err) {
        console.error('Skaner xatosi:', err);
        showAlert('Kameraga ulanib bo\'lmadi', 'Xatolik', 'danger');
        setShowScanner(false);
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      } catch (err) {
        console.error('Skanerni to\'xtatishda xatolik:', err);
      }
    }
    setShowScanner(false);
    setScannerReady(false);
  };

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadSavedReceipts();
  }, []);

  const fetchProducts = async () => {
    try {
      if (navigator.onLine) {
        // Online: fetch from server and cache
        const res = await api.get('/products?mainOnly=true');
        setProducts(res.data);
        // Cache for offline use
        await cacheProducts(res.data);
      } else {
        // Offline: use cached products
        const cached = await getCachedProducts();
        setProducts(cached as Product[]);
        if (cached.length === 0) {
          showAlert('Offline rejimda keshda tovarlar yo\'q', 'Ogohlantirish', 'warning');
        }
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      // Try cache on error
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        setProducts(cached as Product[]);
        showAlert('Serverga ulanib bo\'lmadi, keshdan yuklandi', 'Ogohlantirish', 'warning');
      }
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const loadSavedReceipts = () => {
    const saved = localStorage.getItem('savedReceipts');
    if (saved) setSavedReceipts(JSON.parse(saved));
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') setInputValue('');
    else if (value === '⌫') setInputValue(prev => prev.slice(0, -1));
    else if (value === '+') {
      addProductByCode(inputValue);
    }
    else setInputValue(prev => prev + value);
  };

  const handleCartItemClick = (item: CartItem) => {
    setSelectedCartItemId(item._id);
  };

  const addProductByCode = (code: string) => {
    const product = products.find(p => p.code === code);
    if (product) {
      addToCart(product);
      setInputValue('');
    } else if (code) {
      showAlert('Tovar topilmadi', 'Xatolik', 'warning');
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        const newQuantity = existing.cartQuantity + 1;
        // Dynamic pricing bilan narxni yangilash
        const dynamicPrice = calculateDynamicPrice(product, newQuantity);
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: newQuantity, price: dynamicPrice} : p);
      }
      // Yangi mahsulot uchun dynamic pricing (1 dona)
      const dynamicPrice = calculateDynamicPrice(product, 1);
      return [...prev, {...product, cartQuantity: 1, price: dynamicPrice}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const toggleReturnMode = () => {
    if (!isReturnMode) {
      // Entering return mode - show search modal
      setCart([]);
      setIsReturnMode(true);
      setShowReturnSearch(true);
    } else {
      // Exiting return mode
      setIsReturnMode(false);
      setCart([]);
    }
  };

  const handleReturnSearch = (query: string) => {
    setReturnSearchQuery(query);
    if (query.length > 0) {
      const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const addToReturn = (product: Product) => {
    addToCart(product);
    setShowReturnSearch(false);
    setReturnSearchQuery('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      const results = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(results);
    } else {
      setSearchResults(products);
    }
  };

  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;
    
    // Qoldiq summani hisoblash
    const remainingAmount = total - paidAmount;
    
    const saleData = {
      items: cart.map(item => ({
        product: item._id,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.cartQuantity
      })),
      total,
      paymentMethod: method,
      isReturn: isReturnMode,
      customer: selectedCustomer?._id
    };

    try {
      // Step 1: ALWAYS save locally first (safety - never lose sales)
      const offlineSale = await saveOfflineSale(saleData);

      // Step 2: Try to sync to server if online
      if (navigator.onLine) {
        try {
          await api.post('/receipts', saleData);
          // Success - mark as synced and delete local copy
          await markSalesAsSynced([offlineSale.id]);
          await deleteSyncedSales([offlineSale.id]);
          
          // Agar qoldiq summa bo'lsa va mijoz tanlangan bo'lsa, qarz yaratish
          if (remainingAmount > 0 && selectedCustomer && !isReturnMode) {
            try {
              const debtData = {
                customer: selectedCustomer._id,
                amount: remainingAmount,
                description: `Xarid qoldig'i - Admin kassa`,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 kun keyin
                type: 'receivable'
              };
              
              await api.post('/debts', debtData);
              showAlert(`${isReturnMode ? 'Qaytarish' : 'Chek saqlandi'}! ${formatNumber(remainingAmount)} so'm qoldiq qarz daftariga qo'shildi`, 'Muvaffaqiyat', 'success');
            } catch (debtError) {
              console.error('Qarz yaratishda xatolik:', debtError);
              showAlert(`${isReturnMode ? 'Qaytarish' : 'Chek saqlandi'}! Qarz yaratishda xatolik yuz berdi`, 'Ogohlantirish', 'warning');
            }
          } else {
            showAlert(isReturnMode ? 'Qaytarish muvaffaqiyatli!' : 'Chek saqlandi!', 'Muvaffaqiyat', 'success');
          }
        } catch (serverErr) {
          // Server failed - sale is saved locally, will sync later
          showAlert('Chek offline saqlandi, keyinroq sinxronlanadi', 'Ogohlantirish', 'warning');
        }
      } else {
        // Offline - sale saved locally
        showAlert('Offline rejim: Chek saqlandi, internet qaytganda sinxronlanadi', 'Ogohlantirish', 'warning');
      }

      // Clear cart and reset state
      setCart([]);
      setShowPayment(false);
      setIsReturnMode(false);
      setPaidAmount(0);
      setSelectedCustomer(null);
      fetchProducts();
      
    } catch (err) {
      console.error('Error creating receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const saveReceipt = () => {
    if (cart.length === 0) { showAlert("Chek bo'sh", 'Ogohlantirish', 'warning'); return; }
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
    <div className={`min-h-screen flex flex-col ${isReturnMode ? 'bg-warning-50' : 'bg-surface-50'}`}>
      {AlertComponent}
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-surface-900">Kassa (POS)</h1>
          {/* Offline Status Indicator */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
            isOnline ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'
          }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          {/* Pending Sales Indicator */}
          {pendingCount > 0 && (
            <button
              onClick={async () => {
                if (isOnline && !isSyncing) {
                  const result = await manualSync();
                  if (result.success) {
                    showAlert(`${result.synced} ta chek sinxronlandi`, 'Muvaffaqiyat', 'success');
                  } else {
                    showAlert(result.error || 'Sinxronlash xatosi', 'Xatolik', 'danger');
                  }
                }
              }}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                isSyncing ? 'bg-brand-100 text-brand-700' : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sinxronlanmoqda...' : `${pendingCount} ta kutmoqda`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSavedReceipts(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface-100 rounded-lg text-sm hover:bg-surface-200 transition-colors"
          >
            <Save className="w-4 h-4 text-surface-500" />
            <span className="text-surface-700">Saqlangan</span>
            {savedReceipts.length > 0 && (
              <span className="px-1.5 py-0.5 bg-danger-500 text-white text-xs rounded-full font-medium">
                {savedReceipts.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left - Cart Table */}
        <div className="flex-1 flex flex-col p-2 sm:p-4 lg:p-6 order-first lg:order-none max-h-[60vh] lg:max-h-none overflow-y-auto lg:overflow-y-visible">
          {/* Cart Info */}
          <div className="mb-2 sm:mb-4 flex items-center justify-between">
            <span className="text-xs sm:text-sm text-surface-600">JAMI: {cart.length} ta mahsulot</span>
            
            {/* Customer Select */}
            <div className="relative">
              <button
                onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedCustomer 
                    ? 'bg-brand-100 text-brand-700' 
                    : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="max-w-32 truncate">
                  {selectedCustomer ? selectedCustomer.name : 'Oddiy mijoz'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showCustomerSelect && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCustomerSelect(false)} />
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden">
                    <div className="p-3 border-b border-surface-100">
                      <input
                        type="text"
                        placeholder="Mijoz qidirish..."
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      <button
                        onClick={() => { setSelectedCustomer(null); setShowCustomerSelect(false); setCustomerSearchQuery(''); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                          !selectedCustomer ? 'bg-brand-50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-surface-200 rounded-lg flex items-center justify-center">
                          <User className="w-4 h-4 text-surface-500" />
                        </div>
                        <span className="text-sm font-medium text-surface-700">Oddiy mijoz</span>
                      </button>
                      {customers
                        .filter(c => 
                          customerSearchQuery === '' ||
                          c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                          c.phone.includes(customerSearchQuery)
                        )
                        .map(customer => (
                          <button
                            key={customer._id}
                            onClick={() => { setSelectedCustomer(customer); setShowCustomerSelect(false); setCustomerSearchQuery(''); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                              selectedCustomer?._id === customer._id ? 'bg-brand-50' : ''
                            }`}
                          >
                            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                              <span className="text-sm font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-surface-900 truncate">{customer.name}</p>
                              <p className="text-xs text-surface-500">{customer.phone}</p>
                            </div>
                            {customer.debt > 0 && (
                              <span className="text-xs text-danger-600 font-medium">
                                {formatNumber(customer.debt)}
                              </span>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 bg-white rounded-xl border border-surface-200 overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase">
              <div className="col-span-1">Kod</div>
              <div className="col-span-3">Mahsulot</div>
              <div className="col-span-2">Ombor</div>
              <div className="col-span-2 text-center">Soni</div>
              <div className="col-span-2 text-right">Narx</div>
              <div className="col-span-1 text-right">Summa</div>
              <div className="col-span-1 text-center">Amallar</div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-full text-surface-400 py-20">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Savat bo'sh</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {cart.map((item) => (
                    <div 
                      key={item._id} 
                      onClick={() => handleCartItemClick(item)}
                      className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors ${
                        selectedCartItemId === item._id 
                          ? 'bg-brand-50 border-l-4 border-brand-500' 
                          : 'hover:bg-surface-50'
                      }`}
                    >
                      <div className="col-span-1">
                        <span className="text-sm font-mono text-surface-600">{item.code}</span>
                      </div>
                      <div className="col-span-3">
                        <span className="text-sm font-medium text-surface-900">{item.name}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm text-surface-500">-</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <input
                          type="text"
                          value={item.cartQuantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              const newQuantity = val === '' ? 0 : parseInt(val);
                              // Dynamic pricing bilan narxni yangilash
                              const dynamicPrice = calculateDynamicPrice(item, newQuantity);
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, cartQuantity: newQuantity, price: dynamicPrice } : p
                              ));
                            }
                          }}
                          onBlur={() => {
                            if (item.cartQuantity === 0 || !item.cartQuantity) {
                              removeFromCart(item._id);
                            }
                          }}
                          className="w-16 h-9 text-center font-medium border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="space-y-1">
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-sm text-surface-900">{formatNumber(item.price)}</span>
                            {/* Kelishtirildi badge */}
                            {item.customMarkup !== undefined && item.originalPrice && item.originalPrice > item.price && (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-orange-600 font-bold bg-orange-100 px-1.5 py-0.5 rounded">
                                  🤝 Kelishtirildi
                                </span>
                                <span className="text-[10px] text-red-500 line-through">
                                  {formatNumber(item.originalPrice)}
                                </span>
                                <span className="text-[10px] text-green-600 font-semibold">
                                  -{formatNumber(item.originalPrice - item.price)}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Pricing tier ma'lumoti */}
                          {(() => {
                            const tier = getPricingTier(item.cartQuantity, item.customMarkup);
                            return (
                              <div 
                                onClick={() => handleItemPricingEdit(item)}
                                className={`text-xs px-2 py-0.5 rounded-full inline-block cursor-pointer hover:opacity-80 transition-opacity ${
                                  tier.custom ? 'bg-purple-100 text-purple-700' :
                                  tier.discount ? 'bg-success-100 text-success-700' : 'bg-surface-100 text-surface-600'
                                }`}
                                title="Foizni o'zgartirish uchun bosing"
                              >
                                {tier.name} ({tier.markupPercent}%)
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="text-sm font-semibold text-surface-900">
                          {formatNumber(item.price * item.cartQuantity)}
                        </span>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 mt-4">
            {/* QR Skaner tugmasi */}
            <button 
              onClick={startScanner}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
              Skaner
            </button>
            {!isReturnMode && (
              <button 
                onClick={() => { setShowSearch(true); setSearchResults(products); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
              >
                <Search className="w-4 h-4" />
                Qidirish
              </button>
            )}
            <button 
              onClick={toggleReturnMode}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-colors ${
                isReturnMode 
                  ? 'bg-warning-500 text-white' 
                  : 'bg-warning-100 text-warning-700 hover:bg-warning-200'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              {isReturnMode ? 'Qaytarishni bekor qilish' : 'Qaytarish'}
            </button>
            {isReturnMode && (
              <button 
                onClick={() => setShowReturnSearch(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-warning-100 text-warning-700 rounded-xl hover:bg-warning-200 transition-colors"
              >
                <Search className="w-4 h-4" />
                Tovar qo'shish
              </button>
            )}
            <button 
              onClick={saveReceipt}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Saqlash
            </button>
            <button 
              onClick={() => {
                setShowPayment(true);
                setPaidAmount(total);
              }}
              disabled={cart.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              To'lov
            </button>
          </div>
        </div>

        {/* Right - Numpad & Total */}
        <div className="w-full lg:w-72 xl:w-80 bg-white border-t lg:border-t-0 lg:border-l border-surface-200 p-1 sm:p-2 lg:p-4 lg:p-6 flex flex-col order-last lg:order-none max-h-[40vh] lg:max-h-none overflow-y-auto lg:overflow-y-visible">
          {/* Total */}
          <div className="text-center lg:text-right mb-2 sm:mb-4 lg:mb-6">
            <p className={`text-3xl lg:text-4xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
              {formatNumber(total)} so'm
            </p>
          </div>

          {/* Input */}
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addProductByCode(inputValue)}
            placeholder="Kod kiriting..."
            className="w-full px-4 py-3 text-center text-lg font-mono bg-surface-50 border border-surface-200 rounded-xl mb-4 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />

          {/* Numpad */}
          <div className="grid grid-cols-4 gap-0.5 sm:gap-1 lg:gap-1.5">
            {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumpadClick(key)}
                className={`
                  flex items-center justify-center rounded-xl text-xs sm:text-lg lg:text-xl font-semibold transition-all active:scale-95
                  ${key === 'C' ? 'bg-danger-500 text-white hover:bg-danger-600' : ''}
                  ${key === '⌫' ? 'bg-warning-500 text-white hover:bg-warning-600' : ''}
                  ${key === '+' ? 'bg-brand-500 text-white hover:bg-brand-600 row-span-2' : ''}
                  ${!['C', '⌫', '+'].includes(key) ? 'bg-surface-100 text-surface-700 hover:bg-surface-200' : ''}
                  ${key === '+' ? 'h-full' : 'h-10 sm:h-12 lg:h-16'}
                `}
              >
                {key === '⌫' ? <Delete className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-4 sm:pt-0 px-4 sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" onClick={() => setShowSearch(false)} />
          <div className="bg-white w-full sm:w-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative z-10">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 p-4 sm:p-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Nom yoki kod bo'yicha qidiring..."
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                    <p className="font-semibold text-brand-600">Optom: {formatNumber(product.price)}</p>
                  </div>
                </button>
              ))}
              {searchQuery && searchResults.length === 0 && (
                <p className="text-center text-surface-500 py-8">Tovar topilmadi</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" onClick={() => setShowPayment(false)} />
          <div className="bg-white w-full sm:w-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-sm max-h-[90vh] overflow-hidden flex flex-col relative z-10">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 p-4 sm:p-6 text-center">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 mb-2">
                {isReturnMode ? 'Qaytarish tasdiqlash' : "To'lov usuli"}
              </h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600 truncate">{selectedCustomer.name}</span>
                </div>
              )}
              <p className={`text-2xl sm:text-3xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
                {isReturnMode && '- '}{formatNumber(total)} so'm
              </p>
              {isReturnMode && (
                <p className="text-sm text-warning-600 mt-2">Bu summa mijozga qaytariladi</p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {!isReturnMode && (
                  <div className="mt-4 space-y-2">
                    <label className="block text-sm font-medium text-surface-700">To'langan summa</label>
                    <input
                      type="number"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-surface-200 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    {paidAmount > 0 && paidAmount < total && (
                      <p className="text-sm text-warning-600">
                        Qoldiq: {formatNumber(total - paidAmount)} so'm (qarz daftariga qo'shiladi)
                      </p>
                    )}
                    {paidAmount > total && (
                      <p className="text-sm text-success-600">
                        Qaytim: {formatNumber(paidAmount - total)} so'm
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-surface-100 p-1.5 sm:p-3 lg:p-4 space-y-1.5 sm:space-y-2">
              <button onClick={() => handlePayment('cash')} className={`w-full flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 lg:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs lg:text-sm ${isReturnMode ? 'bg-warning-500 hover:bg-warning-600' : 'bg-success-500 hover:bg-success-600'} text-white rounded-lg font-semibold transition-colors`}>
                <Banknote className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Naqd</span>
              </button>
              <button onClick={() => handlePayment('card')} className="w-full flex items-center justify-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 lg:py-3 px-1.5 sm:px-2 text-[10px] sm:text-xs lg:text-sm bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors">
                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Karta</span>
              </button>
              <button onClick={() => setShowPayment(false)} className="w-full py-1 sm:py-1.5 lg:py-2 text-[10px] sm:text-xs text-surface-600 hover:text-surface-900 transition-colors">
                Bekor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Search Modal */}
      {showReturnSearch && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center pt-4 sm:pt-0 px-4 sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" onClick={() => { setShowReturnSearch(false); if (cart.length === 0) setIsReturnMode(false); }} />
          <div className="bg-white w-full sm:w-auto rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-lg max-h-[90vh] overflow-hidden flex flex-col relative z-10">
            <div className="sticky top-0 z-10 bg-warning-50 border-b border-surface-100 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-surface-900 truncate">Qaytarish rejimi</h3>
                  <p className="text-sm text-surface-500 truncate">Qaytariladigan tovarni tanlang</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Tovar nomi yoki kodi..."
                  value={returnSearchQuery}
                  onChange={e => handleReturnSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-surface-200 rounded-xl focus:outline-none focus:border-warning-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToReturn(product)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-warning-50 transition-colors text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                    <RotateCcw className="w-5 h-5 text-warning-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-surface-900">{product.name}</p>
                    <p className="text-sm text-surface-500">Kod: {product.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">Tan: {formatNumber((product as any).costPrice || 0)}</p>
                    <p className="font-semibold text-warning-600">Optom: {formatNumber(product.price)}</p>
                  </div>
                </button>
              ))}
              {returnSearchQuery && searchResults.length === 0 && (
                <p className="text-center text-surface-500 py-8">Tovar topilmadi</p>
              )}
              {!returnSearchQuery && (
                <p className="text-center text-surface-400 py-8">Tovar nomini yoki kodini kiriting</p>
              )}
            </div>
            <div className="p-4 border-t border-surface-100 bg-surface-50">
              <button 
                onClick={() => { setShowReturnSearch(false); if (cart.length === 0) setIsReturnMode(false); }}
                className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Receipts Modal */}
      {showSavedReceipts && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSavedReceipts(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-surface-900">Saqlangan cheklar</h3>
                <button 
                  onClick={() => setShowSavedReceipts(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-100 transition-colors"
                >
                  <X className="w-5 h-5 text-surface-500" />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-auto">
              {savedReceipts.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-surface-400">
                  <div className="text-center">
                    <Save className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Saqlangan cheklar yo'q</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-surface-100">
                  {savedReceipts.map(receipt => (
                    <div key={receipt.id} className="p-4 hover:bg-surface-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-surface-500">{receipt.savedAt}</span>
                        <span className="font-semibold text-surface-900">{formatNumber(receipt.total)} so'm</span>
                      </div>
                      <p className="text-sm text-surface-600 mb-3">
                        {receipt.items.length} ta mahsulot
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadSavedReceipt(receipt)}
                          className="flex-1 py-1 sm:py-1.5 bg-brand-500 text-white rounded-lg text-[10px] sm:text-xs font-medium hover:bg-brand-600 transition-colors"
                        >
                          Yuklash
                        </button>
                        <button
                          onClick={() => deleteSavedReceipt(receipt.id)}
                          className="px-1.5 sm:px-2 py-1 sm:py-1.5 bg-danger-100 text-danger-600 rounded-lg hover:bg-danger-200 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pricing Edit Modal - Foizni o'zgartirish */}
      {showPricingEdit && selectedItemForPricing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => {
            setShowPricingEdit(false);
            setSelectedItemForPricing(null);
          }} />
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative z-10">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 mb-2">Foizni o'zgartirish</h3>
              <div className="bg-surface-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-surface-700 mb-1">{selectedItemForPricing.name}</p>
                <p className="text-xs text-surface-500 font-mono mb-2">Kod: {selectedItemForPricing.code}</p>
                <p className="text-sm text-surface-600">
                  Miqdor: {selectedItemForPricing.cartQuantity} ta
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  Qo'shimcha foiz (%)
                </label>
                <input
                  type="number"
                  value={customMarkupPercent}
                  onChange={(e) => setCustomMarkupPercent(Number(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-center text-lg font-semibold focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="15"
                />
              </div>
              
              {/* Tezkor foiz tugmalari */}
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map(percent => (
                  <button
                    key={percent}
                    onClick={() => setCustomMarkupPercent(percent)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      customMarkupPercent === percent
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              
              {/* Narx ko'rsatish */}
              {selectedItemForPricing && (
                <div className="bg-brand-50 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-surface-600">Yangi narx (1 ta):</span>
                    <span className="font-semibold text-brand-600">
                      {formatNumber(Math.round((selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15) * (1 + customMarkupPercent / 100)))} so'm
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-600">Jami summa:</span>
                    <span className="font-bold text-brand-700">
                      {formatNumber(Math.round((selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15) * (1 + customMarkupPercent / 100)) * selectedItemForPricing.cartQuantity)} so'm
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-1.5 sm:gap-2 mt-3 sm:mt-4">
              <button
                onClick={() => {
                  setShowPricingEdit(false);
                  setSelectedItemForPricing(null);
                }}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs bg-surface-100 text-surface-700 rounded-lg font-medium hover:bg-surface-200 transition-colors"
              >
                Bekor
              </button>
              <button
                onClick={saveCustomPricing}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 text-[10px] sm:text-xs bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-surface-900">QR Skaner</h3>
              </div>
              <button
                onClick={stopScanner}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 hover:bg-surface-200 transition-colors"
              >
                <X className="w-5 h-5 text-surface-600" />
              </button>
            </div>
            
            {/* Scanner Container */}
            <div className="p-4">
              <div 
                id="admin-qr-reader" 
                ref={scannerContainerRef}
                className="w-full rounded-xl overflow-hidden bg-black"
                style={{ minHeight: '300px' }}
              />
              
              {!scannerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center text-white">
                    <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    <p>Kamera yuklanmoqda...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Instructions */}
            <div className="p-4 bg-surface-50 border-t border-surface-200">
              <p className="text-sm text-surface-600 text-center">
                📱 Mahsulot QR kodini kameraga ko'rsating
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
