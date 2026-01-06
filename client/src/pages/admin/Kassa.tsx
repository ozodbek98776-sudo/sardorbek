import { useState, useEffect } from 'react';
import { 
  Search, RotateCcw, Save, CreditCard, Trash2, X, 
  Package, Banknote, Delete, AlertTriangle, User, ChevronDown, Wifi, WifiOff, RefreshCw
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useOffline } from '../../hooks/useOffline';
import { cacheProducts, getCachedProducts } from '../../utils/indexedDbService';

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
  const [inputMode, setInputMode] = useState<'code'>('code');
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
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: p.cartQuantity + 1} : p);
      }
      return [...prev, {...product, cartQuantity: 1}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => 
      item._id === id ? { ...item, cartQuantity: Math.max(1, item.cartQuantity + delta) } : item
    ));
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
      // Import offline sale function
      const { saveOfflineSale, markSalesAsSynced, deleteSyncedSales, getUnsyncedSalesCount } = await import('../../utils/indexedDbService');
      
      // Step 1: ALWAYS save locally first (safety - never lose sales)
      const offlineSale = await saveOfflineSale(saleData);
      console.log('Sale saved locally:', offlineSale.id);

      // Step 2: Try to sync to server if online
      if (navigator.onLine) {
        try {
          await api.post('/receipts', saleData);
          // Success - mark as synced and delete local copy
          await markSalesAsSynced([offlineSale.id]);
          await deleteSyncedSales([offlineSale.id]);
          showAlert(isReturnMode ? 'Qaytarish muvaffaqiyatli!' : 'Chek saqlandi!', 'Muvaffaqiyat', 'success');
        } catch (serverErr) {
          // Server failed - sale is saved locally, will sync later
          console.log('Server sync failed, sale saved offline');
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
      <div className="flex-1 flex">
        {/* Left - Cart Table */}
        <div className="flex-1 flex flex-col p-4 lg:p-6">
          {/* Cart Info */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-surface-600">JAMI: {cart.length} ta mahsulot</span>
            
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
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, cartQuantity: val === '' ? 0 : parseInt(val) } : p
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
                        <span className="text-sm text-surface-900">{formatNumber(item.price)}</span>
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
              onClick={() => setShowPayment(true)}
              disabled={cart.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CreditCard className="w-4 h-4" />
              To'lov
            </button>
          </div>
        </div>

        {/* Right - Numpad & Total */}
        <div className="w-72 lg:w-80 bg-white border-l border-surface-200 p-4 lg:p-6 flex flex-col">
          {/* Total */}
          <div className="text-right mb-6">
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
          <div className="grid grid-cols-4 gap-1.5">
            {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
              <button
                key={key}
                onClick={() => handleNumpadClick(key)}
                className={`
                  flex items-center justify-center rounded-xl text-xl font-semibold transition-all active:scale-95
                  ${key === 'C' ? 'bg-danger-500 text-white hover:bg-danger-600' : ''}
                  ${key === '⌫' ? 'bg-warning-500 text-white hover:bg-warning-600' : ''}
                  ${key === '+' ? 'bg-brand-500 text-white hover:bg-brand-600 row-span-2' : ''}
                  ${!['C', '⌫', '+'].includes(key) ? 'bg-surface-100 text-surface-700 hover:bg-surface-200' : ''}
                  ${key === '+' ? 'h-full' : 'h-16'}
                `}
              >
                {key === '⌫' ? <Delete className="w-6 h-6" /> : key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSearch(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100">
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
            <div className="max-h-80 overflow-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayment(false)} />
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-surface-900 mb-2">
                {isReturnMode ? 'Qaytarish tasdiqlash' : "To'lov usuli"}
              </h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600">{selectedCustomer.name}</span>
                </div>
              )}
              <p className={`text-3xl font-bold ${isReturnMode ? 'text-warning-600' : 'text-surface-900'}`}>
                {isReturnMode && '- '}{formatNumber(total)} so'm
              </p>
              {isReturnMode && (
                <p className="text-sm text-warning-600 mt-2">Bu summa mijozga qaytariladi</p>
              )}
            </div>
            <div className="space-y-3">
              <button onClick={() => handlePayment('cash')} className={`w-full flex items-center justify-center gap-2 py-4 ${isReturnMode ? 'bg-warning-500 hover:bg-warning-600' : 'bg-success-500 hover:bg-success-600'} text-white rounded-xl font-semibold transition-colors`}>
                <Banknote className="w-5 h-5" />
                Naqd pul
              </button>
              <button onClick={() => handlePayment('card')} className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors">
                <CreditCard className="w-5 h-5" />
                Plastik karta
              </button>
              <button onClick={() => setShowPayment(false)} className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors">
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Search Modal */}
      {showReturnSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowReturnSearch(false); if (cart.length === 0) setIsReturnMode(false); }} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-100 bg-warning-50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-warning-100 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-warning-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900">Qaytarish rejimi</h3>
                  <p className="text-sm text-surface-500">Qaytariladigan tovarni tanlang</p>
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadSavedReceipt(receipt)}
                          className="flex-1 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
                        >
                          Yuklash
                        </button>
                        <button
                          onClick={() => deleteSavedReceipt(receipt.id)}
                          className="px-3 py-2 bg-danger-100 text-danger-600 rounded-lg hover:bg-danger-200 transition-colors"
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
        </div>
      )}
    </div>
  );
}
