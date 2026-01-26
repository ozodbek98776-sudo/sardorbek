import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package, Banknote, Delete, AlertTriangle, User, ChevronDown, Wifi, WifiOff, RefreshCw, ScanLine,
  ShoppingCart, Plus, Minus, DollarSign, Receipt, Clock, TrendingUp, Scan
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
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

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

export default function KassaPro() {
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(null);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
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

  const fetchProducts = async () => {
    try {
      if (navigator.onLine) {
        const res = await api.get('/products?mainOnly=true&limit=1000');
        const productsData = res.data.data || res.data;
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
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const addToCart = (product: Product) => {
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
    console.log('✅ QR Scanner: Mahsulot kassaga qo\'shilmoqda', product);
    addToCart(product);
    showAlert(`${product.name} savatga qo'shildi`, 'Muvaffaqiyat', 'success');
    setShowQRScanner(false);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
    } else {
      setCart(prev => prev.map(p => p._id === id ? {...p, cartQuantity: quantity} : p));
    }
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
      setSearchResults(products.slice(0, 20));
    }
  };

  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;

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
      const offlineSale = await saveOfflineSale(saleData);

      if (navigator.onLine) {
        try {
          const response = await api.post('/receipts', saleData);
          await markSalesAsSynced([offlineSale.id]);
          await deleteSyncedSales([offlineSale.id]);
          
          // Chekni print qilish
          printReceipt(response.data, method);
          
          showAlert(isReturnMode ? 'Qaytarish muvaffaqiyatli!' : 'Chek saqlandi!', 'Muvaffaqiyat', 'success');
        } catch (serverErr) {
          showAlert('Chek offline saqlandi, keyinroq sinxronlanadi', 'Ogohlantirish', 'warning');
        }
      } else {
        showAlert('Offline rejim: Chek saqlandi', 'Ogohlantirish', 'warning');
      }

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

  const printReceipt = (receipt: any, method: string) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return;

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
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .total { font-weight: bold; font-size: 14px; text-align: right; margin: 10px 0; }
          .footer { text-align: center; margin-top: 10px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">CHEK</div>
          <div>${new Date().toLocaleString('uz-UZ')}</div>
        </div>
        
        <div class="items">
          ${receipt.items.map((item: any) => `
            <div class="item">
              <span>${item.name}</span>
              <span>${formatNumber(item.price * item.quantity)} so'm</span>
            </div>
            <div style="font-size: 10px; color: #666;">
              ${item.quantity} x ${formatNumber(item.price)} so'm
            </div>
          `).join('')}
        </div>
        
        <div class="total">
          Jami: ${formatNumber(receipt.total)} so'm
        </div>
        
        <div class="footer">
          To'lov usuli: ${method === 'cash' ? 'Naqd pul' : 'Karta'}
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 pb-20 lg:pb-0">
      {AlertComponent}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Kassa (POS)</h1>
                <p className="text-xs text-slate-500">Professional Satish Tizimi</p>
              </div>
            </div>

            {/* Status Indicators */}
            <div className="flex items-center gap-2 ml-6 pl-6 border-l border-slate-200">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {isOnline ? 'Online' : 'Offline'}
              </div>

              {pendingCount > 0 && (
                <button
                  onClick={async () => {
                    if (isOnline && !isSyncing) {
                      const result = await manualSync();
                      if (result.success) {
                        showAlert(`${result.synced} ta chek sinxronlandi`, 'Muvaffaqiyat', 'success');
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sinxronlanmoqda...' : `${pendingCount} kutmoqda`}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowQRScanner(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-xl text-sm font-medium text-blue-700 transition-colors"
              title="QR Scanner"
            >
              <Scan className="w-4 h-4" />
              <span className="hidden sm:inline">Scanner</span>
            </button>
            
            <button 
              onClick={() => setShowSavedReceipts(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Saqlangan
              {savedReceipts.length > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                  {savedReceipts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1800px] mx-auto p-2 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          {/* Left - Products Search & List */}
          <div className="lg:col-span-2 space-y-2 sm:space-y-3 lg:space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Mahsulot qidirish..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => setShowSearch(true)}
                className="w-full pl-9 sm:pl-12 pr-3 sm:pr-4 py-2 sm:py-3 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-xs sm:text-sm"
              />
            </div>

            {/* Search Results / Products Grid */}
            {showSearch && searchQuery ? (
              <div className="bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg">
                <div className="max-h-64 sm:max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {searchResults.map(product => (
                        <button
                          key={product._id}
                          onClick={() => { addToCart(product); setShowSearch(false); setSearchQuery(''); }}
                          className="w-full flex items-center gap-2 sm:gap-4 p-2 sm:p-4 hover:bg-slate-50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-100 to-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-xs sm:text-sm">{product.name}</p>
                            <p className="text-[10px] sm:text-xs text-slate-500">Kod: {product.code}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-brand-600 text-xs sm:text-sm">{formatNumber(product.price)} so'm</p>
                            <p className="text-[10px] sm:text-xs text-slate-500">{product.quantity} ta</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 sm:p-8 text-center text-slate-500">
                      <Package className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                      <p className="text-xs sm:text-sm">Mahsulot topilmadi</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Popular Products */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3">
                {products.slice(0, 12).map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="group bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all p-2 sm:p-4 text-left"
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-brand-100 to-brand-50 rounded-lg flex items-center justify-center mb-2 sm:mb-3 group-hover:scale-105 transition-transform">
                      <Package className="w-6 h-6 sm:w-8 sm:h-8 text-brand-600" />
                    </div>
                    <p className="font-semibold text-slate-900 text-[10px] sm:text-sm truncate">{product.name}</p>
                    <p className="text-[9px] sm:text-xs text-slate-500 mb-1 sm:mb-2">{product.code}</p>
                    <p className="font-bold text-brand-600 text-[10px] sm:text-sm">{formatNumber(product.price)} so'm</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - Cart Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg sm:rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden sticky top-20 sm:top-24">
              {/* Cart Header */}
              <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-3 sm:px-6 py-3 sm:py-4 text-white">
                <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  <h2 className="text-base sm:text-lg font-bold">Savat</h2>
                </div>
                <p className="text-xs sm:text-sm text-brand-100">{itemCount} ta mahsulot</p>
              </div>

              {/* Cart Items */}
              <div className="max-h-48 sm:max-h-64 overflow-y-auto divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="p-4 sm:p-8 text-center text-slate-400">
                    <ShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                    <p className="text-xs sm:text-sm">Savat bo'sh</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item._id} className="p-2 sm:p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between mb-1 sm:mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-xs sm:text-sm truncate">{item.name}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500">{item.code}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                        >
                          <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 sm:p-1">
                          <button
                            onClick={() => updateQuantity(item._id, item.cartQuantity - 1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-slate-200 rounded transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </button>
                          <span className="w-5 text-center text-xs sm:text-sm font-semibold">{item.cartQuantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, item.cartQuantity + 1)}
                            className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center hover:bg-slate-200 rounded transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                        <p className="font-bold text-brand-600 text-xs sm:text-sm">{formatNumber(item.price * item.cartQuantity)} so'm</p>
                      </div>
                    </div>
                  ))
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
                    <div className="absolute right-0 left-0 mx-4 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto">
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
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm text-slate-600">
                      <span>Jami:</span>
                      <span>{formatNumber(total)} so'm</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    To'lash
                  </button>

                  <button
                    onClick={saveReceipt}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                    Saqlash
                  </button>

                  <button
                    onClick={() => setCart([])}
                    className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm"
                  >
                    <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    Tozalash
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white">
              <h3 className="text-xl font-bold">To'lov Usuli</h3>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-600 mb-1">Jami summa</p>
                <p className="text-3xl font-bold text-brand-600">{formatNumber(total)} so'm</p>
              </div>

              {isReturnMode && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 text-sm">Vazvrat Cheksiz Qabul Qilinmaydi</p>
                    <p className="text-xs text-red-700 mt-1">Vazvrat chekni faqat asl chek bilan qabul qilish mumkin</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => { handlePayment('cash'); setShowPayment(false); }}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <Banknote className="w-6 h-6" />
                Naqd Pul
              </button>

              <button
                onClick={() => { handlePayment('card'); setShowPayment(false); }}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg"
              >
                <CreditCard className="w-6 h-6" />
                Karta
              </button>

              <button
                onClick={() => setShowPayment(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Bekor qilish
              </button>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Saqlangan Cheklar</h3>
              <button onClick={() => setShowSavedReceipts(false)} className="hover:bg-brand-600 p-2 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
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
    </div>
  );
}
