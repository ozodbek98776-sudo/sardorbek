import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Send, Plus, Minus, X, Package, ShoppingCart, CheckCircle, User, Users, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CartItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { PRODUCT_CATEGORIES } from '../../constants/categories';

interface Customer {
  _id: string;
  name: string;
  phone: string;
}

interface NewCustomerForm {
  name: string;
  phone: string;
}

export default function HelperScanner() {
  const { showAlert, AlertComponent } = useAlert();
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [expandedPricing, setExpandedPricing] = useState<string | null>(null); // Qaysi mahsulotning pricing tiers ochiq
  const [sending, setSending] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>({ name: '', phone: '' });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Kategoriya o'zgarganda qidiruvni qayta ishga tushirish
  useEffect(() => {
    handleSearch(searchQuery);
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      // Handle both paginated and non-paginated responses
      const productsData = res.data.data || res.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) { console.error('Error fetching products:', err); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data || res.data || []);
    } catch (err) { 
      console.error('Error fetching customers:', err);
    }
  };

  const handleAddNewCustomer = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      showAlert('Iltimos, ism va telefon raqamni kiriting!', 'Ogohlantirish', 'warning');
      return;
    }
    
    setAddingCustomer(true);
    try {
      const res = await api.post('/customers', {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim()
      });
      
      const createdCustomer = res.data;
      
      // Mijozlar ro'yxatiga qo'shish
      setCustomers(prev => [createdCustomer, ...prev]);
      
      // Yangi mijozni tanlash
      setSelectedCustomer(createdCustomer);
      
      // Formani yopish va tozalash
      setShowNewCustomerForm(false);
      setShowCustomerModal(false);
      setNewCustomer({ name: '', phone: '' });
      
      showAlert(`Mijoz ${createdCustomer.name} qo'shildi!`, 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      showAlert(
        err?.response?.data?.message || 'Mijoz qo\'shishda xatolik',
        'Xatolik',
        'danger'
      );
    } finally {
      setAddingCustomer(false);
    }
  };

  const startScanner = async () => {
    setScannedProduct(null);
    setSearchQuery('');
    setSearchResults([]);
    setScanning(true);
    
    // DOM elementini kutamiz
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const element = document.getElementById('qr-reader');
      if (!element) {
        throw new Error('QR reader element topilmadi. Iltimos, qayta urinib ko\'ring.');
      }
      
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: facingMode },
        { 
          fps: 30,  // 10 → 30 (tezroq skanerlash)
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          // Qo'shimcha optimizatsiyalar
          videoConstraints: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
        },
        async (decodedText) => {
          console.log('QR kod o\'qildi:', decodedText);
          
          let codeOrId: string | null = null;

          try {
            const parsed = JSON.parse(decodedText);
            if (parsed && typeof parsed === 'object') {
              if (parsed.code) codeOrId = String(parsed.code);
              else if (parsed.id || parsed._id) codeOrId = String(parsed.id || parsed._id);
            }
          } catch (e) {
            // JSON emas, to'g'ridan-to'g'ri kod sifatida ishlatamiz
          }

          let searchKey = codeOrId || decodedText;
          
          // Agar URL bo'lsa, ID'ni ajratib olish
          if (searchKey.includes('/product/')) {
            const parts = searchKey.split('/product/');
            if (parts.length > 1) {
              searchKey = parts[1].split('?')[0].split('#')[0]; // Query va hash'ni olib tashlash
            }
          }
          
          console.log('Qidiruv kaliti:', searchKey);
          
          // Avval local products'dan qidirish
          let product = products.find(p => 
            p.code === searchKey || 
            (p as any)._id === searchKey
          );

          console.log('Local\'da topildi:', !!product);

          // Agar local'da topilmasa, serverdan qidirish
          if (!product) {
            try {
              console.log('Serverdan qidirilmoqda:', searchKey);
              const res = await api.get(`/products/scan-qr/${encodeURIComponent(searchKey)}`);
              product = res.data;
              console.log('Serverdan topildi:', !!product);
            } catch (err: any) {
              console.error('Server qidiruv xatosi:', err.response?.status, err.message);
            }
          }

          if (product) {
            setScannedProduct(product);
            // Agar serverdan topilgan bo'lsa, local products'ga qo'shamiz
            if (!products.find(p => p._id === product._id)) {
              setProducts(prev => [...prev, product]);
            }
          } else {
            showAlert('Tovar topilmadi: ' + searchKey, 'Xatolik', 'warning');
          }

          stopScanner();
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setScanning(false);
      let errorMessage = 'Kamerani ishga tushirishda xatolik';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Kamera ruxsati berilmadi. Brauzer sozlamalarida kamera ruxsatini yoqing.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Kamera topilmadi. Qurilmangizda kamera borligini tekshiring.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Kamera band. Boshqa ilova kamerani ishlatayotgan bo\'lishi mumkin.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'HTTPS kerak. Xavfsiz ulanish orqali kirish kerak.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      showAlert(errorMessage, 'Xatolik', 'danger');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (err) {}
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const switchCamera = async () => {
    if (scanning) {
      await stopScanner();
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
      // Kamerani qayta ishga tushirish uchun biroz kutamiz
      setTimeout(() => {
        startScanner();
      }, 300);
    } else {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setScannedProduct(null);
    if (query.length > 0) {
      let results = products.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      
      // Kategoriya bo'yicha filtrlash
      if (selectedCategory) {
        results = results.filter(p => p.category === selectedCategory);
      }
      
      setSearchResults(results);
    } else {
      // Agar qidiruv bo'sh bo'lsa, faqat kategoriya bo'yicha filtrlash
      if (selectedCategory) {
        const results = products.filter(p => p.category === selectedCategory);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    }
  };

  // Miqdorga qarab narx hisoblash funksiyasi (chegirma tizimi)
  const calculateDynamicPrice = (basePrice: number, quantity: number): number => {
    let markupPercent = 15; // Default 15%
    
    // Pricing tier aniqlash
    if (quantity >= 100) {
      markupPercent = 11; // 100+ dona uchun 11% (katta chegirma)
    } else if (quantity >= 10) {
      markupPercent = 13; // 10-99 dona uchun 13% (o'rta chegirma)
    } else {
      markupPercent = 15; // 1-9 dona uchun 15% (oddiy narx)
    }
    
    // Narxni hisoblash
    const finalPrice = basePrice * (1 + markupPercent / 100);
    return Math.round(finalPrice);
  };

  // Pricing tier ma'lumotini olish
  const getPricingTier = (quantity: number) => {
    if (quantity >= 100) {
      return { name: '100+ dona', markupPercent: 11, discount: true };
    } else if (quantity >= 10) {
      return { name: '10-99 dona', markupPercent: 13, discount: true };
    } else {
      return { name: '1-9 dona', markupPercent: 15, discount: false };
    }
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        const newQuantity = existing.cartQuantity + 1;
        const dynamicPrice = calculateDynamicPrice(product.price, newQuantity);
        return prev.map(p => p._id === product._id ? { 
          ...p, 
          cartQuantity: newQuantity,
          price: dynamicPrice 
        } : p);
      }
      // Yangi mahsulot uchun 1 dona narxi
      const dynamicPrice = calculateDynamicPrice(product.price, 1);
      return [...prev, { ...product, cartQuantity: 1, price: dynamicPrice }];
    });
    setSearchQuery('');
    setSearchResults([]);
    setScannedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQuantity = Math.max(1, item.cartQuantity + delta);
        const product = products.find(p => p._id === id);
        if (product) {
          const dynamicPrice = calculateDynamicPrice(product.price, newQuantity);
          return { ...item, cartQuantity: newQuantity, price: dynamicPrice };
        }
        return { ...item, cartQuantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const sendToCashier = async () => {
    if (cart.length === 0) {
      showAlert('Savat bo\'sh!', 'Ogohlantirish', 'warning');
      return;
    }
    
    if (!selectedCustomer) {
      showAlert('Iltimos, mijozni tanlang!', 'Ogohlantirish', 'warning');
      setShowCustomerModal(true);
      return;
    }

    setSending(true);
    try {
      // Oddiy mijoz uchun customer: null, ro'yxatdagi mijoz uchun customer._id
      const receiptData = {
        customer: selectedCustomer._id === 'default' ? null : selectedCustomer._id,
        items: cart.map(item => ({
          product: item._id,
          name: item.name,
          code: item.code,
          price: item.price,
          quantity: item.cartQuantity
        })),
        total,
        paymentMethod: 'cash',
        paidAmount: total,
        status: selectedCustomer._id === 'default' ? 'completed' : 'pending'
      };

      await api.post('/receipts', receiptData);
      
      const customerName = selectedCustomer._id === 'default' ? 'Oddiy mijoz' : selectedCustomer.name;
      showAlert(`Chek ${customerName} uchun saqlandi!`, 'Muvaffaqiyat', 'success');
      setCart([]);
      setSelectedCustomer(null);
    } catch (err) {
      console.error('Error sending receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setSending(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone.includes(customerSearchQuery)
  );

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-b from-surface-50 to-surface-100/80 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-sm overflow-x-hidden">
      {AlertComponent}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-surface-900 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-brand-600" />
            Skaner orqali savat to'ldirish
          </h1>
          <p className="text-sm text-surface-500 mt-1">
            Tovarlarni QR kod orqali tezda toping, savatga qo'shing va kassaga yuboring.
          </p>
        </div>
        
        {/* Mijoz tanlash tugmasi */}
        <button
          onClick={() => setShowCustomerModal(true)}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all shadow-sm text-sm sm:text-base w-full sm:w-auto ${
            selectedCustomer
              ? 'bg-green-50 border-2 border-green-500 text-green-700 hover:bg-green-100'
              : 'bg-brand-500 text-white hover:bg-brand-600'
          }`}
        >
          <User className="w-4 h-4 sm:w-5 sm:h-5" />
          <div className="text-left flex-1">
            <div className="text-xs font-medium">
              {selectedCustomer ? 'Mijoz tanlandi' : 'Mijoz tanlash'}
            </div>
            {selectedCustomer && (
              <div className="text-sm font-semibold truncate">{selectedCustomer.name}</div>
            )}
          </div>
        </button>
      </div>

      {/* Mijoz tanlash modali */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between bg-gradient-to-r from-brand-500 to-brand-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Mijoz tanlash
              </h3>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              {!showNewCustomerForm ? (
                <>
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="text"
                        value={customerSearchQuery}
                        onChange={e => setCustomerSearchQuery(e.target.value)}
                        placeholder="Ism yoki telefon raqam..."
                        className="w-full pl-10 pr-4 py-2.5 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={() => setShowNewCustomerForm(true)}
                      className="px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" />
                      Yangi
                    </button>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {/* Oddiy mijoz - default */}
                    <button
                      onClick={() => {
                        setSelectedCustomer({ _id: 'default', name: 'Oddiy mijoz', phone: '', debt: 0 } as Customer);
                        setShowCustomerModal(false);
                        setCustomerSearchQuery('');
                      }}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        selectedCustomer?._id === 'default'
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'bg-blue-50/50 hover:bg-blue-100 border-2 border-blue-200'
                      }`}
                    >
                      <div className="font-medium text-blue-900 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Oddiy mijoz
                      </div>
                      <div className="text-xs text-blue-600">Faqat to'liq to'lov</div>
                    </button>

                    {filteredCustomers.length === 0 ? (
                      <div className="text-center py-8 text-surface-500">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Mijoz topilmadi</p>
                      </div>
                    ) : (
                      filteredCustomers.map(customer => (
                        <button
                          key={customer._id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerModal(false);
                            setCustomerSearchQuery('');
                          }}
                          className={`w-full p-3 rounded-xl text-left transition-all ${
                            selectedCustomer?._id === customer._id
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'bg-surface-50 hover:bg-surface-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="font-medium text-surface-900">{customer.name}</div>
                          <div className="text-sm text-surface-500">{customer.phone}</div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-surface-900">Yangi mijoz qo'shish</h4>
                    <button
                      onClick={() => {
                        setShowNewCustomerForm(false);
                        setNewCustomer({ name: '', phone: '' });
                      }}
                      className="text-surface-500 hover:text-surface-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      Ism
                    </label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      placeholder="Alisher Karimov"
                      className="w-full px-4 py-2.5 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-1.5">
                      Telefon raqam
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      placeholder="+998901234567"
                      className="w-full px-4 py-2.5 border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        setShowNewCustomerForm(false);
                        setNewCustomer({ name: '', phone: '' });
                      }}
                      className="flex-1 px-4 py-2.5 border border-surface-200 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium"
                      disabled={addingCustomer}
                    >
                      Bekor qilish
                    </button>
                    <button
                      onClick={handleAddNewCustomer}
                      disabled={addingCustomer}
                      className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingCustomer ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 lg:gap-6 items-start w-full">
        <div className="space-y-4 lg:space-y-5 min-w-0">
          <div className="card p-3 sm:p-4 border border-surface-100 shadow-sm">
            <div className="flex flex-col gap-3 items-stretch">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-brand-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Qidirish..."
                  className="w-full h-12 pl-10 sm:pl-11 pr-10 rounded-xl border-2 border-surface-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 transition-all text-sm sm:text-base text-surface-900 placeholder:text-surface-400 bg-white shadow-sm hover:border-brand-300 relative z-0"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors z-10"
                  >
                    <X className="w-4 h-4 text-surface-500" />
                  </button>
                )}
              </div>
              
              {/* Category Filter - Horizontal Scrollable */}
              <div className="bg-white rounded-xl p-2 border-2 border-surface-200">
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
                  {PRODUCT_CATEGORIES.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                        selectedCategory === category 
                          ? 'bg-brand-500 text-white shadow-md' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={scanning ? stopScanner : startScanner}
                className={`h-12 flex items-center justify-center gap-2 rounded-xl px-4 font-medium ${scanning ? 'btn-secondary' : 'btn-primary'} shadow-md hover:shadow-lg transition-all`}
              >
                <QrCode className="w-5 h-5" />
                <span>{scanning ? 'Skanerni to\'xtatish' : 'QR skaner'}</span>
              </button>
            </div>
          </div>

          {scanning && (
            <div className="card border border-brand-100 bg-gradient-to-br from-brand-50/60 to-surface-0 shadow-sm">
              <div className="flex flex-col items-center gap-4 p-4 sm:p-5">
                <div className="relative w-full max-w-md rounded-2xl overflow-hidden ring-4 ring-brand-300/50 ring-offset-4 ring-offset-surface-0 shadow-lg">
                  <div id="qr-reader" className="w-full aspect-square bg-black" />
                  {/* Kamera almashtirish tugmasi - pastki o'ng burchak */}
                  <button
                    onClick={switchCamera}
                    className="absolute bottom-3 right-3 w-9 h-9 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-105 z-10 backdrop-blur-sm border border-white/20"
                    title={facingMode === 'environment' ? 'Old kameraga o\'tish' : 'Orqa kameraga o\'tish'}
                  >
                    <RefreshCw className="w-4 h-4 text-surface-600" />
                  </button>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-surface-800">QR kodni kameraga to‘g‘ri tuting</p>
                  <p className="text-xs text-surface-500">Kamera kodni o‘qigach, tovar ma'lumotlari avtomatik chiqadi.</p>
                </div>
              </div>
            </div>
          )}

          {scannedProduct && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-gradient-to-r from-success-500 to-success-600 p-4 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Tovar topildi!</h3>
                  </div>
                  <button
                    onClick={() => setScannedProduct(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Mahsulot nomi */}
                  <div>
                    <label className="text-xs font-medium text-surface-500 uppercase tracking-wide">Mahsulot nomi</label>
                    <p className="text-xl font-bold text-surface-900 mt-1">{scannedProduct.name}</p>
                  </div>

                  {/* Mahsulot kodi */}
                  <div>
                    <label className="text-xs font-medium text-surface-500 uppercase tracking-wide">Mahsulot kodi</label>
                    <p className="text-lg font-semibold text-surface-700 mt-1">{scannedProduct.code}</p>
                  </div>

                  {/* Mavjud miqdor */}
                  <div>
                    <label className="text-xs font-medium text-surface-500 uppercase tracking-wide">Mavjud miqdor</label>
                    <p className="text-lg font-semibold text-brand-600 mt-1">{scannedProduct.quantity} dona</p>
                  </div>

                  {/* Asosiy narx */}
                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                    <label className="text-xs font-medium text-brand-700 uppercase tracking-wide">Optom narxi</label>
                    <p className="text-2xl font-bold text-brand-600 mt-1">{formatNumber(scannedProduct.price)} so'm</p>
                  </div>

                  {/* Boshqa narxlar */}
                  {(
                    (scannedProduct as any).unitPrice ||
                    (scannedProduct as any).boxPrice ||
                    (scannedProduct as any).prices?.perUnit ||
                    (scannedProduct as any).prices?.perBox ||
                    (scannedProduct as any).prices?.perRoll
                  ) && (
                    <div>
                      <label className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 block">Boshqa narxlar</label>
                      <div className="flex flex-wrap gap-2">
                        {(scannedProduct as any).prices?.perUnit || (scannedProduct as any).unitPrice || scannedProduct.price ? (
                          <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-success-50 border border-success-200">
                            <p className="text-xs text-success-600 font-medium">Dona narxi</p>
                            <p className="text-lg font-bold text-success-700 mt-0.5">
                              {formatNumber(
                                (scannedProduct as any).prices?.perUnit ||
                                (scannedProduct as any).unitPrice ||
                                scannedProduct.price
                              )} so'm
                            </p>
                          </div>
                        ) : null}
                        {(scannedProduct as any).prices?.perBox || (scannedProduct as any).boxPrice ? (
                          <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-brand-50 border border-brand-200">
                            <p className="text-xs text-brand-600 font-medium">Karobka narxi</p>
                            <p className="text-lg font-bold text-brand-700 mt-0.5">
                              {formatNumber(
                                (scannedProduct as any).prices?.perBox ||
                                (scannedProduct as any).boxPrice ||
                                0
                              )} so'm
                            </p>
                          </div>
                        ) : null}
                        {(scannedProduct as any).prices?.perRoll ? (
                          <div className="flex-1 min-w-[140px] px-4 py-3 rounded-xl bg-sky-50 border border-sky-200">
                            <p className="text-xs text-sky-600 font-medium">Rulon narxi</p>
                            <p className="text-lg font-bold text-sky-700 mt-0.5">
                              {formatNumber((scannedProduct as any).prices?.perRoll || 0)} so'm
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Chegirmalar */}
                  {(scannedProduct as any).pricingTiers && (
                    <div>
                      <label className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 block">Miqdorga qarab chegirmalar</label>
                      <div className="space-y-2">
                        {(scannedProduct as any).pricingTiers.tier1 && (
                          <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-emerald-700">
                                {(scannedProduct as any).pricingTiers.tier1.minQuantity}-
                                {(scannedProduct as any).pricingTiers.tier1.maxQuantity} dona
                              </span>
                              <span className="text-lg font-bold text-emerald-700">
                                {(scannedProduct as any).pricingTiers.tier1.discountPercent}% chegirma
                              </span>
                            </div>
                            <p className="text-sm text-emerald-600 mt-1">
                              Narx: {formatNumber(
                                Math.round(
                                  scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier1.discountPercent / 100)
                                )
                              )} so'm
                            </p>
                          </div>
                        )}
                        {(scannedProduct as any).pricingTiers.tier2 && (
                          <div className="px-4 py-3 rounded-xl border border-sky-200 bg-sky-50">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-sky-700">
                                {(scannedProduct as any).pricingTiers.tier2.minQuantity}-
                                {(scannedProduct as any).pricingTiers.tier2.maxQuantity} dona
                              </span>
                              <span className="text-lg font-bold text-sky-700">
                                {(scannedProduct as any).pricingTiers.tier2.discountPercent}% chegirma
                              </span>
                            </div>
                            <p className="text-sm text-sky-600 mt-1">
                              Narx: {formatNumber(
                                Math.round(
                                  scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier2.discountPercent / 100)
                                )
                              )} so'm
                            </p>
                          </div>
                        )}
                        {(scannedProduct as any).pricingTiers.tier3 && (
                          <div className="px-4 py-3 rounded-xl border border-violet-200 bg-violet-50">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-violet-700">
                                {(scannedProduct as any).pricingTiers.tier3.minQuantity}+ dona
                              </span>
                              <span className="text-lg font-bold text-violet-700">
                                {(scannedProduct as any).pricingTiers.tier3.discountPercent}% chegirma
                              </span>
                            </div>
                            <p className="text-sm text-violet-600 mt-1">
                              Narx: {formatNumber(
                                Math.round(
                                  scannedProduct.price * (1 - (scannedProduct as any).pricingTiers.tier3.discountPercent / 100)
                                )
                              )} so'm
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Savatga qo'shish tugmasi */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setScannedProduct(null)}
                      className="flex-1 px-4 py-3 border border-surface-200 text-surface-700 rounded-xl hover:bg-surface-50 transition-colors font-medium"
                    >
                      Yopish
                    </button>
                    <button
                      onClick={() => {
                        addToCart(scannedProduct);
                        setScannedProduct(null);
                      }}
                      className="flex-1 px-4 py-3 bg-success-500 hover:bg-success-600 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Savatga qo'shish
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {searchQuery && searchResults.length > 0 && (
            <div className="card p-0 overflow-hidden border border-surface-100 shadow-sm">
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-surface-700">Qidiruv natijalari</p>
                <span className="text-xs text-surface-400">{searchResults.length} ta topildi</span>
              </div>
              <div className="divide-y divide-surface-100 max-h-72 overflow-auto custom-scrollbar">
                {searchResults.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between p-4 hover:bg-surface-50/80 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 line-clamp-1">{product.name}</p>
                        <p className="text-xs text-surface-500">Kod: {product.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-brand-600">{formatNumber(product.price)} so'm</p>
                      <p className="text-[11px] text-surface-400">{product.quantity} dona</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="card text-center py-10 bg-surface-0/60 border-dashed border-surface-200">
              <p className="text-sm text-surface-500">Tovar topilmadi. Nomi yoki kodini tekshirib qayta urinib ko'ring.</p>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-4 min-w-0 w-full">
          <div className="card border border-surface-100 shadow-md shadow-surface-900/5 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-surface-900 text-sm sm:text-base">Savat</span>
                  <p className="text-xs text-surface-400 truncate">Tanlangan tovarlar</p>
                </div>
              </div>
              <span className="badge-primary text-xs px-2 sm:px-3 py-1 rounded-full flex-shrink-0">{cart.length} ta</span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 sm:py-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-surface-300" />
                </div>
                <p className="text-surface-500 text-xs sm:text-sm px-2">Savat bo'sh. QR skaner yoki qidiruv orqali tovar qo'shing.</p>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-[360px] overflow-auto pr-1 custom-scrollbar">
                {cart.map(item => {
                  const pricingTier = getPricingTier(item.cartQuantity);
                  const basePrice = products.find(p => p._id === item._id)?.price || item.price;
                  const product = products.find(p => p._id === item._id);
                  const isExpanded = expandedPricing === item._id;
                  
                  return (
                  <div key={item._id} className="bg-surface-50 rounded-xl border border-surface-100">
                    <div className="flex items-center gap-2 p-2 sm:p-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-900 truncate text-sm">{item.name}</p>
                        
                        {/* Pricing tier badge - bosiladigan */}
                        <button
                          onClick={() => setExpandedPricing(isExpanded ? null : item._id)}
                          className="flex items-center gap-1.5 mt-1 hover:opacity-80 transition-opacity"
                        >
                          <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            pricingTier.discount 
                              ? 'bg-success-100 text-success-700' 
                              : 'bg-surface-200 text-surface-600'
                          }`}>
                            {pricingTier.name} • {pricingTier.markupPercent}%
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-surface-500" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-surface-500" />
                          )}
                        </button>
                        
                        <p className="text-xs sm:text-sm text-brand-600 font-semibold mt-1">
                          {formatNumber(item.price * item.cartQuantity)} so'm
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1 bg-white rounded-lg border border-surface-200 px-1 sm:px-1.5 py-1 flex-shrink-0">
                        <button onClick={() => updateQuantity(item._id, -1)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded hover:bg-surface-100 transition-colors">
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.cartQuantity}
                          onChange={(e) => {
                            const newQty = parseInt(e.target.value) || 1;
                            const delta = newQty - item.cartQuantity;
                            updateQuantity(item._id, delta);
                          }}
                          className="w-8 sm:w-10 text-center font-semibold text-xs sm:text-sm bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded"
                        />
                        <button onClick={() => updateQuantity(item._id, 1)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded hover:bg-surface-100 transition-colors">
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item._id)} className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors flex-shrink-0">
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>

                    {/* Dropdown - 3 ta chegirma narxi */}
                    {isExpanded && product && (
                      <div className="px-2 sm:px-3 pb-2 sm:pb-3 space-y-1.5">
                        {/* Tier 1 */}
                        <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200">
                          <div>
                            <p className="text-[10px] font-medium text-green-900">
                              {product.pricingTiers?.tier1?.minQuantity || 1}-{product.pricingTiers?.tier1?.maxQuantity || 9} dona
                            </p>
                          </div>
                          <span className="text-xs font-bold text-green-700">
                            {product.pricingTiers?.tier1?.discountPercent || 15}%
                          </span>
                        </div>

                        {/* Tier 2 */}
                        <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div>
                            <p className="text-[10px] font-medium text-blue-900">
                              {product.pricingTiers?.tier2?.minQuantity || 10}-{product.pricingTiers?.tier2?.maxQuantity || 99} dona
                            </p>
                          </div>
                          <span className="text-xs font-bold text-blue-700">
                            {product.pricingTiers?.tier2?.discountPercent || 13}%
                          </span>
                        </div>

                        {/* Tier 3 */}
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div>
                            <p className="text-[10px] font-medium text-purple-900">
                              {product.pricingTiers?.tier3?.minQuantity || 100}+ dona
                            </p>
                          </div>
                          <span className="text-xs font-bold text-purple-700">
                            {product.pricingTiers?.tier3?.discountPercent || 11}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}

            {cart.length > 0 && (
              <div className="mt-4 pt-3 sm:pt-4 border-t border-surface-200 space-y-2 sm:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-surface-500 text-xs sm:text-sm">Jami summa</span>
                  <span className="text-xl sm:text-2xl font-bold text-surface-900">{formatNumber(total)} so'm</span>
                </div>
                <button
                  onClick={sendToCashier}
                  disabled={sending}
                  className="btn-primary w-full py-3 sm:py-3.5 text-sm sm:text-base rounded-xl flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      Kassaga yuborish
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
