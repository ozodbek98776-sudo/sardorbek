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
import { useSwipeToClose } from '../../hooks/useSwipeToClose';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';

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

  useSwipeToClose(showCustomerModal ? () => setShowCustomerModal(false) : undefined);
  useSwipeToClose(scannedProduct ? () => setScannedProduct(null) : undefined);
  useModalScrollLock(showCustomerModal || !!scannedProduct);

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
      const res = await api.get('/products/kassa', { params: { limit: 1000 } });
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
            String(p.code) === searchKey ||
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
          const res = await api.get('/products/kassa', {
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
            String(p.code || '').toLowerCase().includes(query.toLowerCase())
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
            const res = await api.get('/products/kassa', {
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

      // Notify cashier via socket
      if (socket) {
        socket.emit('helper:receipt:new');
      }

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
    <div className="min-h-screen bg-slate-50 w-full h-full">
      {AlertComponent}

      {/* Compact Header */}
      <div className="bg-white border-b border-slate-200 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-base font-bold text-slate-900">QR Skaner</h1>
          </div>
          <button
            onClick={() => setShowCustomerModal(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
              selectedCustomer
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-brand-50 text-brand-700 border border-brand-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="truncate max-w-[120px]">
              {selectedCustomer ? selectedCustomer.name : 'Mijoz tanlash'}
            </span>
          </button>
        </div>
      </div>

      {/* Mijoz tanlash modali */}
      {showCustomerModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          data-modal="true"
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

      <div className="px-3 py-3 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 items-start">
        {/* Chap tomon - Qidiruv va mahsulotlar */}
        <div className="space-y-3">
          {/* Qidiruv + kategoriya + QR */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 space-y-2.5">
            {/* Qidiruv */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Mahsulot nomi yoki kodi..."
                className="w-full h-10 pl-9 pr-9 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 text-sm text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              )}
            </div>

            {/* Kategoriyalar */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
              <button
                onClick={() => setSelectedCategory('')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all ${
                  selectedCategory === ''
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Barchasi
              </button>
              {categories.map(category => (
                <button
                  key={category._id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs transition-all whitespace-nowrap ${
                    selectedCategory === category.name
                      ? 'bg-brand-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* QR Skaner tugmasi */}
            <button
              onClick={scanning ? stopScanner : startScanner}
              className={`w-full h-10 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                scanning
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-brand-500 hover:bg-brand-600 text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              {scanning ? 'To\'xtatish' : 'QR Skaner'}
            </button>
          </div>

          {scanning && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
              <div className="relative w-full max-w-sm mx-auto rounded-lg overflow-hidden ring-2 ring-brand-200">
                <div id="qr-reader" className="w-full aspect-square bg-black" />
                <button
                  onClick={switchCamera}
                  className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-md z-10"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center mt-2">QR kodni kameraga tuting</p>
            </div>
          )}

          {scannedProduct && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              data-modal="true"
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">Natijalar</p>
                <span className="text-[10px] text-slate-400">{searchResults.length} ta</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-auto">
                {searchResults.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-3.5 h-3.5 text-brand-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{product.name}</p>
                        <p className="text-[10px] text-slate-400">Kod: {product.code}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="text-xs font-bold text-brand-600">{formatNumber(product.price)}</p>
                      <p className="text-[10px] text-slate-400">{product.quantity} dona</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-slate-200 text-center py-6">
              <p className="text-xs text-slate-500">Tovar topilmadi</p>
            </div>
          )}
        </div>

        {/* O'ng tomon - Savat */}
        <div className="lg:sticky lg:top-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
            {/* Savat header */}
            <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-sm text-slate-900">Savat</span>
              </div>
              <span className="text-xs font-bold bg-brand-100 text-brand-700 px-2.5 py-1 rounded-lg">
                {cart.length}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Savat bo'sh</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[350px] overflow-auto pr-1">
                  {cart.map(item => {
                    const pricingTier = getPricingTier(item.cartQuantity);
                    const product = products.find(p => p._id === item._id);
                    const isExpanded = expandedPricing === item._id;

                    return (
                    <div key={item._id} className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2 p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                          <button
                            onClick={() => setExpandedPricing(isExpanded ? null : item._id)}
                            className="flex items-center gap-1 mt-0.5"
                          >
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              pricingTier.discount
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              {pricingTier.name} • {pricingTier.markupPercent}%
                            </span>
                            {isExpanded ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
                          </button>
                          <p className="text-xs text-brand-600 font-bold mt-0.5">
                            {formatNumber(item.price * item.cartQuantity)} so'm
                          </p>
                        </div>

                        {/* Miqdor */}
                        <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 px-1 py-0.5">
                          <button onClick={() => updateQuantity(item._id, -1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100">
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.cartQuantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              updateQuantity(item._id, newQty - item.cartQuantity);
                            }}
                            className="w-9 text-center font-bold text-xs bg-transparent border-none focus:outline-none"
                          />
                          <button onClick={() => updateQuantity(item._id, 1)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-slate-100">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button onClick={() => removeFromCart(item._id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Chegirma tiers */}
                      {isExpanded && product && (
                        <div className="px-2 pb-2 space-y-1 bg-white">
                          <div className="flex items-center justify-between px-2 py-1.5 bg-emerald-50 rounded text-[10px]">
                            <span className="font-semibold text-emerald-800">{product.pricingTiers?.tier1?.minQuantity || 1}-{product.pricingTiers?.tier1?.maxQuantity || 9} dona</span>
                            <span className="font-bold text-emerald-700">{product.pricingTiers?.tier1?.discountPercent || 15}%</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1.5 bg-blue-50 rounded text-[10px]">
                            <span className="font-semibold text-blue-800">{product.pricingTiers?.tier2?.minQuantity || 10}-{product.pricingTiers?.tier2?.maxQuantity || 99} dona</span>
                            <span className="font-bold text-blue-700">{product.pricingTiers?.tier2?.discountPercent || 13}%</span>
                          </div>
                          <div className="flex items-center justify-between px-2 py-1.5 bg-purple-50 rounded text-[10px]">
                            <span className="font-semibold text-purple-800">{product.pricingTiers?.tier3?.minQuantity || 100}+ dona</span>
                            <span className="font-bold text-purple-700">{product.pricingTiers?.tier3?.discountPercent || 11}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>

                {/* Jami va yuborish */}
                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600 font-medium">Jami</span>
                    <span className="text-lg font-bold text-brand-600">{formatNumber(total)} so'm</span>
                  </div>
                  <button
                    onClick={sendToCashier}
                    disabled={sending}
                    className="w-full h-10 rounded-lg font-semibold text-sm bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Kassaga Yuborish
                      </>
                    )}
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
