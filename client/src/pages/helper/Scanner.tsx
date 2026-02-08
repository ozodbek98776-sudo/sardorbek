import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Send, Plus, Minus, X, Package, ShoppingCart, CheckCircle, User, Users, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CartItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useCategories } from '../../hooks/useCategories';
import { useSocket } from '../../hooks/useSocket';
import { getDiscountPrices, getUnitLabel, getUnitPrice, getCostPrice } from '../../utils/pricing';

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
  const { categories } = useCategories();
  const socket = useSocket(); // ⚡ Socket.IO hook
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
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // ⚡ Socket.IO - Real-time product updates
  useEffect(() => {
    if (!socket) return;

    // Mahsulot yangilanganda
    socket.on('product:updated', (updatedProduct: Product) => {
      console.log('📡 Helper Scanner: Mahsulot yangilandi', updatedProduct);
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
      // Qidiruv natijalarini ham yangilash
      setSearchResults(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    });

    // Mahsulot qo'shilganda
    socket.on('product:created', (newProduct: Product) => {
      console.log('📡 Helper Scanner: Yangi mahsulot qo\'shildi', newProduct);
      setProducts(prev => [newProduct, ...prev]);
    });

    // Mahsulot o'chirilganda
    socket.on('product:deleted', (data: { _id: string }) => {
      console.log('📡 Helper Scanner: Mahsulot o\'chirildi', data._id);
      setProducts(prev => prev.filter(p => p._id !== data._id));
      setSearchResults(prev => prev.filter(p => p._id !== data._id));
    });

    return () => {
      socket.off('product:updated');
      socket.off('product:created');
      socket.off('product:deleted');
    };
  }, [socket]);

  // Body scroll lock for modals
  useEffect(() => {
    if (showCustomerModal || scannedProduct) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showCustomerModal, scannedProduct]);

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
      const customersData = res.data.data || res.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (err) { 
      console.error('Error fetching customers:', err);
      setCustomers([]); // Set empty array on error
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
      setCustomers(prev => Array.isArray(prev) ? [createdCustomer, ...prev] : [createdCustomer]);
      
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setScannedProduct(null);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce: 500ms kutish
    searchTimeoutRef.current = setTimeout(async () => {
      if (query.length > 0) {
        try {
          // Serverdan qidirish - barcha mahsulotlar orasidan
          const res = await api.get('/products', {
            params: {
              search: query,
              category: selectedCategory || undefined
            }
          });
          
          const productsData = res.data.data || res.data;
          const results = Array.isArray(productsData) ? productsData : [];
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
          // Xatolik bo'lsa, local'dan qidirish
          let results = products.filter(p =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.code.toLowerCase().includes(query.toLowerCase())
          );
          
          if (selectedCategory) {
            results = results.filter(p => p.category === selectedCategory);
          }
          
          setSearchResults(results);
        }
      } else {
        // Agar qidiruv bo'sh bo'lsa, faqat kategoriya bo'yicha filtrlash
        if (selectedCategory) {
          try {
            const res = await api.get('/products', {
              params: { category: selectedCategory }
            });
            const productsData = res.data.data || res.data;
            const results = Array.isArray(productsData) ? productsData : [];
            setSearchResults(results);
          } catch (err) {
            const results = products.filter(p => p.category === selectedCategory);
            setSearchResults(results);
          }
        } else {
          setSearchResults([]);
        }
      }
    }, 500);
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

  const filteredCustomers = Array.isArray(customers) 
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery)
      )
    : [];

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 p-1 sm:p-2 w-full h-full">
      {AlertComponent}

      {/* Modern Header with Glassmorphism */}
      <div className="w-full mb-2 sm:mb-3">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl shadow-slate-900/5 border border-white/20 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  QR Skaner
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Tez va oson savat to'ldirish tizimi
                </p>
              </div>
            </div>
            
            {/* Mijoz tanlash tugmasi - Yangilangan dizayn */}
            <button
              onClick={() => setShowCustomerModal(true)}
              className={`group relative overflow-hidden px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${
                selectedCustomer
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white'
                  : 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
              }`}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold opacity-90">
                    {selectedCustomer ? 'Tanlangan mijoz' : 'Mijoz tanlash'}
                  </div>
                  {selectedCustomer && (
                    <div className="text-sm font-bold truncate max-w-[150px]">{selectedCustomer.name}</div>
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mijoz tanlash modali */}
      {showCustomerModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCustomerModal(false);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden"
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
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

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 items-start">
        {/* Chap tomon - Qidiruv va mahsulotlar */}
        <div className="space-y-5">
          {/* Qidiruv va skaner kartasi - Glassmorphism */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-900/5 border border-white/20 p-5">
            <div className="space-y-4">
              {/* Qidiruv input - Modern */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-500 z-10" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Mahsulot nomi yoki kodi..."
                    className="w-full h-14 pl-12 pr-12 rounded-2xl border-2 border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all text-base text-slate-900 placeholder:text-slate-400 bg-white shadow-sm hover:shadow-md font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearch('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all hover:scale-110 z-10"
                    >
                      <X className="w-4 h-4 text-slate-600" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Kategoriya filtri - Horizontal scroll */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-3 border border-slate-200/50">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                      selectedCategory === '' 
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105' 
                        : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm hover:shadow-md'
                    }`}
                  >
                    🔹 Barchasi
                  </button>
                  {categories.map(category => (
                    <button
                      key={category._id}
                      onClick={() => setSelectedCategory(category.name)}
                      className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                        selectedCategory === category.name 
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 scale-105' 
                          : 'bg-white text-slate-600 hover:bg-slate-50 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* QR Skaner tugmasi - Premium */}
              <button
                onClick={scanning ? stopScanner : startScanner}
                className={`group relative w-full h-14 rounded-2xl font-bold text-base transition-all duration-300 overflow-hidden ${
                  scanning 
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40' 
                    : 'bg-gradient-to-r from-brand-500 via-brand-600 to-indigo-600 hover:from-brand-600 hover:via-brand-700 hover:to-indigo-700 shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40'
                } text-white hover:scale-[1.02]`}
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center gap-3">
                  <QrCode className="w-6 h-6" />
                  <span>{scanning ? 'Skanerni to\'xtatish' : 'QR Skaner Ochish'}</span>
                </div>
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
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              style={{ pointerEvents: 'auto' }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setScannedProduct(null);
                }
              }}
            >
              <div 
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
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

                  {/* Chegirmalar - YANGI NARX TIZIMI */}
                  {(() => {
                    const discountPrices = getDiscountPrices(scannedProduct);
                    return discountPrices.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2 block">Miqdorga qarab chegirmalar</label>
                        <div className="space-y-2">
                          {discountPrices.map((discount, index) => {
                            const colors = [
                              { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', textLight: 'text-emerald-600' },
                              { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', textLight: 'text-sky-600' },
                              { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', textLight: 'text-violet-600' }
                            ];
                            const color = colors[index] || colors[0];
                            
                            return (
                              <div key={discount.type} className={`px-4 py-3 rounded-xl border ${color.border} ${color.bg}`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${color.text}`}>
                                    {discount.minQuantity}+ {getUnitLabel(scannedProduct.unit || 'dona')}
                                  </span>
                                  <span className={`text-lg font-bold ${color.text}`}>
                                    {discount.discountPercent}% chegirma
                                  </span>
                                </div>
                                <p className={`text-sm ${color.textLight} mt-1`}>
                                  Narx: {formatNumber(discount.amount)} so'm
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

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

        {/* O'ng tomon - Savat - Premium dizayn */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/10 border border-white/20 p-5 overflow-hidden">
            {/* Savat header - Gradient */}
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-indigo-500/10 rounded-2xl blur-xl" />
              <div className="relative flex items-center justify-between p-4 bg-gradient-to-r from-brand-50 to-indigo-50 rounded-2xl border border-brand-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-lg">Savat</span>
                    <p className="text-xs text-slate-600">Tanlangan mahsulotlar</p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold shadow-lg shadow-brand-500/30">
                  {cart.length}
                </div>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <ShoppingCart className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium mb-1">Savat bo'sh</p>
                <p className="text-sm text-slate-500">QR skaner yoki qidiruv orqali mahsulot qo'shing</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-[400px] overflow-auto pr-2 custom-scrollbar">
                  {cart.map(item => {
                    const pricingTier = getPricingTier(item.cartQuantity);
                    const product = products.find(p => p._id === item._id);
                    const isExpanded = expandedPricing === item._id;
                    
                    return (
                    <div key={item._id} className="group bg-gradient-to-br from-white to-slate-50/50 rounded-2xl border-2 border-slate-200 hover:border-brand-300 transition-all duration-300 hover:shadow-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          
                          {/* Pricing tier badge */}
                          <button
                            onClick={() => setExpandedPricing(isExpanded ? null : item._id)}
                            className="flex items-center gap-2 mt-1.5 hover:opacity-80 transition-opacity"
                          >
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                              pricingTier.discount 
                                ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' 
                                : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-300'
                            }`}>
                              {pricingTier.name} • {pricingTier.markupPercent}%
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </button>
                          
                          <p className="text-sm text-brand-600 font-bold mt-1.5">
                            {formatNumber(item.price * item.cartQuantity)} so'm
                          </p>
                        </div>
                        
                        {/* Miqdor o'zgartirish - Modern */}
                        <div className="flex items-center gap-1 bg-white rounded-xl border-2 border-slate-200 px-2 py-1.5 shadow-sm">
                          <button 
                            onClick={() => updateQuantity(item._id, -1)} 
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all hover:scale-110"
                          >
                            <Minus className="w-4 h-4" />
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
                            className="w-12 text-center font-bold text-sm bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-brand-500 rounded-lg"
                          />
                          <button 
                            onClick={() => updateQuantity(item._id, 1)} 
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all hover:scale-110"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* O'chirish tugmasi */}
                        <button 
                          onClick={() => removeFromCart(item._id)} 
                          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50 text-red-500 transition-all hover:scale-110"
                        >
                          <X className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      {/* Dropdown - Chegirma tiers */}
                      {isExpanded && product && (
                        <div className="px-3 pb-3 space-y-2 bg-slate-50/50">
                          <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-900">
                              {product.pricingTiers?.tier1?.minQuantity || 1}-{product.pricingTiers?.tier1?.maxQuantity || 9} dona
                            </p>
                            <span className="text-xs font-bold text-emerald-700 px-2 py-1 bg-emerald-100 rounded-lg">
                              {product.pricingTiers?.tier1?.discountPercent || 15}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900">
                              {product.pricingTiers?.tier2?.minQuantity || 10}-{product.pricingTiers?.tier2?.maxQuantity || 99} dona
                            </p>
                            <span className="text-xs font-bold text-blue-700 px-2 py-1 bg-blue-100 rounded-lg">
                              {product.pricingTiers?.tier2?.discountPercent || 13}%
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl border border-purple-200">
                            <p className="text-xs font-semibold text-purple-900">
                              {product.pricingTiers?.tier3?.minQuantity || 100}+ dona
                            </p>
                            <span className="text-xs font-bold text-purple-700 px-2 py-1 bg-purple-100 rounded-lg">
                              {product.pricingTiers?.tier3?.discountPercent || 11}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>

                {/* Jami va yuborish - Premium */}
                <div className="mt-5 pt-5 border-t-2 border-slate-200 space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl border border-slate-200">
                    <span className="text-slate-600 font-semibold">Jami summa</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-indigo-600 bg-clip-text text-transparent">
                      {formatNumber(total)} so'm
                    </span>
                  </div>
                  
                  <button
                    onClick={sendToCashier}
                    disabled={sending}
                    className="group relative w-full h-14 rounded-2xl font-bold text-base transition-all duration-300 overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-600 hover:via-green-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex items-center justify-center gap-3">
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Kassaga Yuborish</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
