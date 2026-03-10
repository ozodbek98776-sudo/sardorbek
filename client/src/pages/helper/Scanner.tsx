import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, Send, Plus, Minus, X, Package, ShoppingCart, CheckCircle, User, Users, RefreshCw, ChevronDown, ChevronUp, Filter, Archive, Edit3, Save, Clock } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Product, CartItem } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useCategories } from '../../hooks/useCategories';
import { useSocket } from '../../hooks/useSocket';
import { getDiscountPrices, getUnitLabel, getUnitPrice, getCostPrice, calculateBestPrice } from '../../utils/pricing';
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

interface ArchiveReceipt {
  _id: string;
  receiptNumber: string;
  items: { product: string; name: string; code: string; price: number; quantity: number }[];
  total: number;
  status: string;
  customer: { _id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
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
  const [isSearching, setIsSearching] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'scanner' | 'archive'>('scanner');
  const [archiveReceipts, setArchiveReceipts] = useState<ArchiveReceipt[]>([]);
  const [editingReceiptId, setEditingReceiptId] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<{ product: string; name: string; code: string; price: number; quantity: number }[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useSwipeToClose(showCustomerModal ? () => setShowCustomerModal(false) : undefined);
  useSwipeToClose(scannedProduct ? () => setScannedProduct(null) : undefined);
  useModalScrollLock(showCustomerModal || !!scannedProduct);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    return () => {
      if (scannerRef.current) {
        try {
          const p = scannerRef.current.stop();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        } catch (_) {}
        scannerRef.current = null;
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
      setProducts(prev => prev.filter(p => p._id !== data._id));
      setSearchResults(prev => prev.filter(p => p._id !== data._id));
    });

    // Chek yangilanganda arxivni refresh
    socket.on('receipt:updated', () => {
      fetchArchiveReceipts();
    });

    return () => {
      socket.off('product:updated');
      socket.off('product:created');
      socket.off('product:deleted');
      socket.off('receipt:updated');
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

  const performSearch = async (query: string, category: string) => {
    if (!query && !category) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsSearching(true);

    try {
      const res = await api.get('/products/kassa', {
        params: {
          search: query || undefined,
          category: category || undefined,
          limit: 50
        },
        signal: abortControllerRef.current.signal
      });
      const data = res.data.data || res.data.products || res.data;
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') return;
      const results = products.filter(p => {
        const matchesQ = !query ||
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          String(p.code || '').toLowerCase().includes(query.toLowerCase());
        const matchesC = !category || p.category === category;
        return matchesQ && matchesC;
      });
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setScannedProduct(null);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query && !selectedCategory) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => performSearch(query, selectedCategory), 300);
  };

  // Kategoriya o'zgarganda darhol (debounssiz) qidirish
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    performSearch(searchQuery, selectedCategory);
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products/kassa', { params: { limit: 1000 } });
      const productsData = res.data.data || res.data.products || res.data;
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

  // === ARXIV FUNKSIYALARI ===
  const fetchArchiveReceipts = async () => {
    setArchiveLoading(true);
    try {
      const res = await api.get('/receipts/my-receipts');
      setArchiveReceipts(res.data.receipts || []);
    } catch (err) {
      console.error('Error fetching archive:', err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'archive') fetchArchiveReceipts();
  }, [activeTab]);

  const startEditReceipt = (receipt: ArchiveReceipt) => {
    setEditingReceiptId(receipt._id);
    setEditingItems(receipt.items.map(item => ({ ...item })));
  };

  const cancelEdit = () => {
    setEditingReceiptId(null);
    setEditingItems([]);
  };

  const updateEditItemQty = (index: number, delta: number) => {
    setEditingItems(prev => prev.map((item, i) =>
      i === index ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeEditItem = (index: number) => {
    setEditingItems(prev => prev.filter((_, i) => i !== index));
  };

  const saveEditReceipt = async () => {
    if (!editingReceiptId || editingItems.length === 0) return;
    setSavingEdit(true);
    try {
      await api.put(`/receipts/${editingReceiptId}/update-items`, { items: editingItems });
      showAlert('Chek yangilandi!', 'Muvaffaqiyat', 'success');
      cancelEdit();
      fetchArchiveReceipts();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showAlert(error.response?.data?.message || 'Xatolik', 'Xatolik', 'danger');
    } finally {
      setSavingEdit(false);
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
            // Serverdan topilgan bo'lsa, local products'ga qo'shamiz
            if (!products.find(p => p._id === product._id)) {
              setProducts(prev => [...prev, product]);
            }
            addToCart(product);
          } else {
            showAlert('Tovar topilmadi: ' + searchKey, 'Xatolik', 'warning');
          }

          stopScanner();
        },
        () => {}
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      scannerRef.current = null;
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


  // Pricing tier ma'lumotini olish
  const getPricingTier = (product: Product, quantity: number) => {
    const calc = calculateBestPrice(product, quantity);
    const unitPrice = getUnitPrice(product);
    const hasDiscount = calc.price < unitPrice;
    const discounts = getDiscountPrices(product);
    const applied = [...discounts].reverse().find(d => quantity >= d.minQuantity);
    return {
      name: applied ? `${applied.minQuantity}+ dona` : '1-9 dona',
      markupPercent: applied ? applied.discountPercent : 0,
      discount: hasDiscount
    };
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        const newQuantity = existing.cartQuantity + 1;
        const price = Math.round(calculateBestPrice(product, newQuantity).price);
        return prev.map(p => p._id === product._id ? { ...p, cartQuantity: newQuantity, price } : p);
      }
      const price = Math.round(calculateBestPrice(product, 1).price);
      return [...prev, { ...product, cartQuantity: 1, price }];
    });
    setSearchQuery('');
    setSearchResults([]);
    setScannedProduct(null);
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item._id === id) {
        const newQuantity = Math.max(1, item.cartQuantity + delta);
        const product = products.find(p => p._id === id) || searchResults.find(p => p._id === id);
        if (product) {
          const price = Math.round(calculateBestPrice(product, newQuantity).price);
          return { ...item, cartQuantity: newQuantity, price };
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
      setActiveTab('archive');
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

      {/* Tab switcher */}
      <div className="flex gap-2 mx-3 mt-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'scanner'
              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <QrCode className="w-4 h-4" />
          Skaner
        </button>
        <button
          onClick={() => setActiveTab('archive')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-sm transition-all ${
            activeTab === 'archive'
              ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Archive className="w-4 h-4" />
          Arxiv
          {archiveReceipts.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold leading-none">
              {archiveReceipts.length}
            </span>
          )}
        </button>
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

      {/* === ARXIV TAB === */}
      {activeTab === 'archive' && (
        <div className="p-3 space-y-3">
          {archiveLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : archiveReceipts.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">Cheklar yo'q</p>
              <p className="text-sm text-slate-400 mt-1">Yuborgan cheklar shu yerda ko'rinadi</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archiveReceipts.map(receipt => (
                <div key={receipt._id} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-800">Chek #{receipt.receiptNumber}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
                      </p>
                      {receipt.customer && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium">Mijoz:</span> {receipt.customer.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-600">{formatNumber(receipt.total)} so'm</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        receipt.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        receipt.status === 'approved' ? 'bg-green-100 text-green-700' :
                        receipt.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {receipt.status === 'pending' ? 'Kutilmoqda' :
                         receipt.status === 'approved' ? 'Tasdiqlangan' :
                         receipt.status === 'completed' ? 'Yakunlangan' : 'Rad etilgan'}
                      </span>
                    </div>
                  </div>

                  {editingReceiptId === receipt._id ? (
                    <div className="space-y-2">
                      {editingItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{formatNumber(item.price)} so'm</p>
                          </div>
                          <div className="flex items-center bg-white rounded-lg border border-slate-200">
                            <button onClick={() => updateEditItemQty(idx, -1)} className="w-8 h-8 flex items-center justify-center">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <button onClick={() => updateEditItemQty(idx, 1)} className="w-8 h-8 flex items-center justify-center">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <button onClick={() => removeEditItem(idx)} className="w-7 h-7 flex items-center justify-center text-red-400 hover:bg-red-50 rounded">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-slate-200">
                        <span>Yangi jami:</span>
                        <span className="text-brand-600">
                          {formatNumber(editingItems.reduce((s, i) => s + i.price * i.quantity, 0))} so'm
                        </span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button onClick={cancelEdit} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium">
                          Bekor
                        </button>
                        <button
                          onClick={saveEditReceipt}
                          disabled={savingEdit || editingItems.length === 0}
                          className="flex-1 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {savingEdit ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <><Save className="w-4 h-4" /> Saqlash</>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1.5">
                        {receipt.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-600">{item.name} × {item.quantity}</span>
                            <span className="font-medium text-slate-800">{formatNumber(item.price * item.quantity)} so'm</span>
                          </div>
                        ))}
                      </div>
                      {receipt.status === 'pending' && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => startEditReceipt(receipt)}
                            className="w-full px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                            Tahrirlash
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === SCANNER TAB === */}
      {activeTab === 'scanner' && (
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
              {isSearching ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              ) : searchQuery && searchResults.length === 1 ? (
                <button
                  onClick={() => { addToCart(searchResults[0]); handleSearch(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-success-500 flex items-center justify-center"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                </button>
              ) : searchQuery ? (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-slate-500" />
                </button>
              ) : null}
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

          {(searchQuery || selectedCategory) && searchResults.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-700">
                  {searchQuery ? 'Qidiruv natijalari' : selectedCategory}
                </p>
                <span className="text-[10px] text-slate-400">{searchResults.length} ta</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-64 overflow-auto">
                {searchResults.map((product) => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 active:bg-slate-100 text-left transition-colors"
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
                      <p className={`text-[10px] ${product.quantity === 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {product.quantity} dona
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(searchQuery || selectedCategory) && !isSearching && searchResults.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-slate-200 text-center py-8">
              <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Tovar topilmadi</p>
              {searchQuery && <p className="text-xs text-slate-400 mt-1">"{searchQuery}" bo'yicha natija yo'q</p>}
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
                    const product = products.find(p => p._id === item._id);
                    const pricingTier = getPricingTier(product || item, item.cartQuantity);
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
                        <div className="flex items-center bg-white rounded-lg border border-slate-200">
                          <button onClick={() => updateQuantity(item._id, -1)} className="w-9 h-9 flex items-center justify-center rounded-l-lg hover:bg-slate-100 flex-shrink-0">
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item._id in editValues ? editValues[item._id] : String(item.cartQuantity)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setEditValues(prev => ({ ...prev, [item._id]: raw }));
                              const num = parseInt(raw);
                              if (num >= 1) updateQuantity(item._id, num - item.cartQuantity);
                            }}
                            onBlur={() => setEditValues(prev => { const n = { ...prev }; delete n[item._id]; return n; })}
                            style={{ width: `calc(${Math.max(2, String(item._id in editValues ? editValues[item._id] || '1' : item.cartQuantity).length)}ch + 1rem)` }}
                            className="text-center font-bold text-base bg-transparent border-x border-slate-200 focus:outline-none py-1"
                          />
                          <button onClick={() => updateQuantity(item._id, 1)} className="w-9 h-9 flex items-center justify-center rounded-r-lg hover:bg-slate-100 flex-shrink-0">
                            <Plus className="w-4 h-4" />
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
      )}
    </div>
  );
}
