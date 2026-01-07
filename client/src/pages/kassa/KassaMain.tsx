import { useState, useEffect } from 'react';
import { 
  Search, Save, CreditCard, Trash2, 
  Package, Banknote, Delete, User, ChevronDown
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

export default function KassaMain() {
  const { showAlert, AlertComponent } = useAlert();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  // Yangi state - real-time qidiruv uchun
  const [codeSuggestions, setCodeSuggestions] = useState<Product[]>([]);
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadSavedReceipts();
  }, []);

  const fetchProducts = async () => {
    try {
      // Kassa uchun alohida endpoint - token talab qilmaydi
      const res = await api.get('/products/kassa');
      setProducts(res.data);
      console.log(`Kassa: ${res.data.length} ta tovar yuklandi`);
    } catch (err) {
      console.error('Error fetching products:', err);
      showAlert('Tovarlarni yuklashda xatolik', 'Xatolik', 'danger');
    }
  };

  // Real-time kod qidiruvi - DARHOL CHIQISHI UCHUN
  const searchProductsByCode = async (partialCode: string) => {
    if (!partialCode.trim() || partialCode.length === 0) {
      setCodeSuggestions([]);
      setShowCodeSuggestions(false);
      return;
    }

    // 1. DARHOL local cache dan ko'rsatish - TARKIBIDA HAM QIDIRISH
    const localResults = products.filter(p => 
      p.code.toLowerCase().includes(partialCode.toLowerCase()) // startsWith o'rniga includes
    ).sort((a: Product, b: Product) => {
      // Prioritet: avval kod boshida mos kelganlar, keyin tarkibida
      const aStartsWith = a.code.toLowerCase().startsWith(partialCode.toLowerCase());
      const bStartsWith = b.code.toLowerCase().startsWith(partialCode.toLowerCase());
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return a.code.localeCompare(b.code); // Kod bo'yicha saralash
    });
    
    // Darhol local natijalarni ko'rsatish
    setCodeSuggestions(localResults.slice(0, 8));
    setShowCodeSuggestions(true);

    // 2. Agar local da kam natija bo'lsa, server dan qo'shimcha olish (background da)
    if (localResults.length < 5 && partialCode.length >= 1) {
      try {
        const res = await api.get(`/products/kassa?search=${encodeURIComponent(partialCode)}`);
        const serverResults = res.data || [];
        
        // Kod tarkibida ham qidirish - faqat boshida emas
        const codeMatches = serverResults.filter((p: Product) => 
          p.code.toLowerCase().includes(partialCode.toLowerCase()) // startsWith o'rniga includes
        ).sort((a: Product, b: Product) => {
          // Prioritet: avval kod boshida mos kelganlar, keyin tarkibida
          const aStartsWith = a.code.toLowerCase().startsWith(partialCode.toLowerCase());
          const bStartsWith = b.code.toLowerCase().startsWith(partialCode.toLowerCase());
          
          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;
          return a.code.localeCompare(b.code);
        });

        // Natijalarni birlashtirish
        const combinedResults = [...localResults];
        codeMatches.forEach((serverProduct: Product) => {
          const exists = combinedResults.find(p => p._id === serverProduct._id);
          if (!exists) {
            combinedResults.push(serverProduct);
          }
        });

        // Yangilangan natijalarni ko'rsatish
        setCodeSuggestions(combinedResults.slice(0, 8));
        
        // Yangi topilgan tovarlarni cache ga qo'shish
        setProducts(prev => {
          const newProducts = [...prev];
          codeMatches.forEach((serverProduct: Product) => {
            const exists = newProducts.find(p => p._id === serverProduct._id);
            if (!exists) {
              newProducts.push(serverProduct);
            }
          });
          return newProducts;
        });
      } catch (err) {
        console.error('Error searching products by code:', err);
        // Xatolik bo'lsa ham local natijalar ko'rsatiladi
      }
    }
  };
  const searchProductByCode = async (code: string) => {
    if (!code.trim()) return null;
    
    try {
      // Avval local cache dan qidirish
      const localProduct = products.find(p => p.code === code.trim());
      if (localProduct) {
        return localProduct;
      }
      
      // Agar local da yo'q bo'lsa, server dan qidirish
      const res = await api.get(`/products/kassa?search=${encodeURIComponent(code.trim())}`);
      if (res.data && res.data.length > 0) {
        const foundProduct = res.data.find((p: Product) => p.code === code.trim());
        if (foundProduct) {
          // Topilgan tovarni local cache ga qo'shish
          setProducts(prev => {
            const exists = prev.find(p => p._id === foundProduct._id);
            if (!exists) {
              return [...prev, foundProduct];
            }
            return prev;
          });
          return foundProduct;
        }
      }
      
      return null;
    } catch (err) {
      console.error('Error searching product:', err);
      return null;
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/kassa');
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
    if (value === 'C') {
      setInputValue('');
      setShowCodeSuggestions(false);
      setCodeSuggestions([]);
    }
    else if (value === '⌫') {
      const newValue = inputValue.slice(0, -1);
      setInputValue(newValue);
      // Darhol qidirish
      if (newValue.length > 0) {
        searchProductsByCode(newValue);
      } else {
        setShowCodeSuggestions(false);
        setCodeSuggestions([]);
      }
    }
    else if (value === '+') {
      addProductByCode(inputValue);
    }
    else {
      const newValue = inputValue + value;
      setInputValue(newValue);
      // Darhol qidirish
      searchProductsByCode(newValue);
    }
  };

  const addProductByCode = async (code: string) => {
    if (!code.trim()) return;
    
    // MongoDB dan tovarni qidirish
    const product = await searchProductByCode(code.trim());
    
    if (product) {
      // Tugagan tovarni tekshirish
      if (product.quantity === 0) {
        showAlert(`"${product.name}" tugagan, savatchaga qo'shib bo'lmaydi`, 'Ogohlantirish', 'warning');
        return;
      }
      
      // Tovar topildi va mavjud - savatchaga qo'shish
      addToCart(product);
      setInputValue('');
      setShowCodeSuggestions(false);
      setCodeSuggestions([]);
      
      // Muvaffaqiyat haqida xabar
      showAlert(`${product.name} qo'shildi`, 'Muvaffaqiyat', 'success');
    } else {
      // Tovar topilmadi
      showAlert(`Kod "${code}" bo'yicha tovar topilmadi`, 'Xatolik', 'warning');
    }
  };

  // Taklif qilingan tovarni tanlash
  const selectSuggestedProduct = (product: Product) => {
    // Tugagan tovarni tanlashga ruxsat bermaslik
    if (product.quantity === 0) {
      showAlert(`"${product.name}" tugagan, savatchaga qo'shib bo'lmaydi`, 'Ogohlantirish', 'warning');
      return;
    }
    
    addToCart(product);
    setInputValue('');
    setShowCodeSuggestions(false);
    setCodeSuggestions([]);
    showAlert(`${product.name} qo'shildi`, 'Muvaffaqiyat', 'success');
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

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length > 0) {
      // Local cache dan qidirish
      const localResults = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.code.toLowerCase().includes(query.toLowerCase())
      );
      
      // Agar local da kam natija bo'lsa, server dan qidirish
      if (localResults.length < 5 && query.length > 2) {
        try {
          const res = await api.get(`/products/kassa?search=${encodeURIComponent(query)}`);
          const serverResults = res.data || [];
          
          // Server natijalarini local cache bilan birlashtirish
          const combinedResults = [...localResults];
          serverResults.forEach((serverProduct: Product) => {
            const exists = combinedResults.find(p => p._id === serverProduct._id);
            if (!exists) {
              combinedResults.push(serverProduct);
            }
          });
          
          setSearchResults(combinedResults);
          
          // Yangi topilgan tovarlarni cache ga qo'shish
          setProducts(prev => {
            const newProducts = [...prev];
            serverResults.forEach((serverProduct: Product) => {
              const exists = newProducts.find(p => p._id === serverProduct._id);
              if (!exists) {
                newProducts.push(serverProduct);
              }
            });
            return newProducts;
          });
          
        } catch (err) {
          console.error('Error searching products:', err);
          setSearchResults(localResults);
        }
      } else {
        setSearchResults(localResults);
      }
    } else {
      setSearchResults(products.slice(0, 20)); // Faqat birinchi 20 ta ko'rsatish
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
      customer: selectedCustomer?._id
    };

    try {
      await api.post('/receipts', saleData);
      
      // Telegram xabar yuborish (agar mijoz tanlangan bo'lsa)
      if (selectedCustomer) {
        const message = `🛒 Yangi xarid:\n👤 Mijoz: ${selectedCustomer.name}\n💰 Summa: ${formatNumber(total)} so'm\n📦 Mahsulotlar: ${cart.length} ta\n⏰ Vaqt: ${new Date().toLocaleString()}`;
        // Bu yerda telegram bot API orqali xabar yuboriladi
        console.log('Telegram message:', message);
      }
      
      showAlert('Chek muvaffaqiyatli saqlandi!', 'Muvaffaqiyat', 'success');
      setCart([]);
      setShowPayment(false);
      setSelectedCustomer(null);
      fetchProducts();
      
    } catch (err) {
      console.error('Error creating receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
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

  return (
    <div className="flex-1 flex flex-col xl:flex-row">
      {AlertComponent}
      
      {/* Left - Cart Table */}
      <div className="flex-1 flex flex-col p-3 sm:p-4 lg:p-6">
        {/* Cart Info */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-sm text-surface-600">JAMI: {cart.length} ta mahsulot</span>
          
          {/* Customer Select */}
          <div className="relative">
            <button
              onClick={() => setShowCustomerSelect(!showCustomerSelect)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto ${
                selectedCustomer 
                  ? 'bg-brand-100 text-brand-700' 
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="max-w-32 sm:max-w-40 truncate">
                {selectedCustomer ? selectedCustomer.name : 'Oddiy mijoz'}
              </span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" />
            </button>
            
            {showCustomerSelect && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCustomerSelect(false)} />
                <div className="absolute right-0 sm:right-0 top-full mt-2 w-full sm:w-72 bg-white rounded-xl shadow-lg border border-surface-200 z-50 overflow-hidden max-h-80 sm:max-h-96">
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
                  <div className="max-h-48 sm:max-h-64 overflow-auto">
                    <button
                      onClick={() => { setSelectedCustomer(null); setShowCustomerSelect(false); setCustomerSearchQuery(''); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors ${
                        !selectedCustomer ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="w-8 h-8 bg-surface-200 rounded-lg flex items-center justify-center flex-shrink-0">
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
                          <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-900 truncate">{customer.name}</p>
                            <p className="text-xs text-surface-500 truncate">{customer.phone}</p>
                          </div>
                          {customer.debt > 0 && (
                            <span className="text-xs text-danger-600 font-medium flex-shrink-0">
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
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 sm:px-4 py-3 bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase">
            <div className="col-span-1 sm:col-span-1">Kod</div>
            <div className="col-span-4 sm:col-span-4">Mahsulot</div>
            <div className="col-span-2 sm:col-span-2 text-center">Soni</div>
            <div className="col-span-2 sm:col-span-2 text-right">Narx</div>
            <div className="col-span-2 sm:col-span-2 text-right">Summa</div>
            <div className="col-span-1 sm:col-span-1 text-center">Amallar</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              // Savat bo'sh bo'lganda kod takliflari yoki bo'sh holat
              showCodeSuggestions && codeSuggestions.length > 0 ? (
                <div className="p-3 sm:p-4">
                  <div className="text-center mb-3 sm:mb-4">
                    <p className="text-sm text-surface-500">
                      "{inputValue}" ni o'z ichiga olgan tovarlar
                      {codeSuggestions.length > 4 && (
                        <span className="block text-xs text-surface-400 mt-1">
                          Jami {codeSuggestions.length} ta tovar (scroll qiling)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {codeSuggestions.map((product, index) => (
                      <button
                        key={product._id}
                        onClick={() => selectSuggestedProduct(product)}
                        disabled={product.quantity === 0} // Tugagan tovarni tanlash mumkin emas
                        className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl transition-colors text-left relative overflow-hidden ${
                          product.quantity === 0 
                            ? 'bg-red-50 border-2 border-red-200 cursor-not-allowed opacity-80' 
                            : index < 4 
                            ? 'bg-brand-50 hover:bg-brand-100 border border-brand-200' // Birinchi 4 ta uchun alohida rang
                            : 'bg-surface-50 hover:bg-surface-100 border border-transparent'
                        }`}
                      >
                        {/* Tugagan tovar uchun chiroyli o'rtada yozuv */}
                        {product.quantity === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-50 bg-opacity-90 rounded-xl">
                            <div className="bg-red-500 text-white text-xs sm:text-sm font-bold px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg border-2 border-white transform rotate-12 animate-pulse">
                              TUGAGAN
                            </div>
                          </div>
                        )}
                        
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
                          product.quantity === 0 ? 'bg-red-100' : 'bg-brand-100'
                        }`}>
                          <Package className={`w-4 h-4 sm:w-5 sm:h-5 ${
                            product.quantity === 0 ? 'text-red-600' : 'text-brand-600'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0 relative">
                          <p className={`font-medium text-sm sm:text-base truncate ${
                            product.quantity === 0 ? 'text-red-700 opacity-60' : 'text-surface-900'
                          }`}>
                            {product.name}
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-surface-500">
                            <span className={`font-mono px-1.5 sm:px-2 py-0.5 rounded border text-xs ${
                              product.quantity === 0 
                                ? 'bg-red-100 border-red-300 text-red-700 opacity-60' 
                                : 'bg-white'
                            }`}>
                              {/* Kod ichida qidirilgan qismni highlight qilish */}
                              {inputValue && product.code.toLowerCase().includes(inputValue.toLowerCase()) ? (
                                <>
                                  {product.code.split(new RegExp(`(${inputValue})`, 'gi')).map((part, index) => 
                                    part.toLowerCase() === inputValue.toLowerCase() ? (
                                      <span key={index} className="bg-yellow-200 text-yellow-800 font-bold">
                                        {part}
                                      </span>
                                    ) : (
                                      <span key={index}>{part}</span>
                                    )
                                  )}
                                </>
                              ) : (
                                product.code
                              )}
                            </span>
                            {product.quantity !== undefined && (
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                product.quantity > 10 ? 'bg-success-100 text-success-700' :
                                product.quantity > 0 ? 'bg-warning-100 text-warning-700' :
                                'bg-danger-100 text-danger-700 font-bold animate-pulse'
                              }`}>
                                {product.quantity > 0 ? `${product.quantity} ta` : 'TUGAGAN'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-sm sm:text-base ${
                            product.quantity === 0 ? 'text-red-600 opacity-60' : 'text-brand-600'
                          }`}>
                            {formatNumber(product.price)}
                          </p>
                          <p className={`text-xs ${
                            product.quantity === 0 ? 'text-red-500' : 'text-surface-500'
                          }`}>
                            {product.quantity === 0 ? 'Mavjud emas' : 'so\'m'}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-surface-400 py-20">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Savat bo'sh</p>
                    {inputValue.length > 0 && (
                      <p className="text-sm mt-2">Kod kiriting yoki qidiring</p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="divide-y divide-surface-100">
                {cart.map((item) => (
                  <div key={item._id}>
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-surface-50 transition-colors">
                      <div className="col-span-1">
                        <span className="text-sm font-mono text-surface-600">{item.code}</span>
                      </div>
                      <div className="col-span-4">
                        <span className="text-sm font-medium text-surface-900">{item.name}</span>
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
                      <div className="col-span-2 text-right">
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

                    {/* Mobile Layout */}
                    <div className="md:hidden p-4 hover:bg-surface-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-surface-900 mb-1">{item.name}</h3>
                          <p className="text-sm text-surface-500 font-mono">Kod: {item.code}</p>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="ml-3 w-8 h-8 flex items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-surface-600">Soni:</span>
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
                            className="w-16 h-8 text-center font-medium border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm text-surface-600">{formatNumber(item.price)} so'm</p>
                          <p className="font-semibold text-surface-900">
                            {formatNumber(item.price * item.cartQuantity)} so'm
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-4">
          <button 
            onClick={() => { 
              setShowSearch(true); 
              handleSearch(''); // Bo'sh qidiruv bilan boshlanadi
            }}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="sm:inline">Qidirish</span>
          </button>
          <button 
            onClick={saveReceipt}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="sm:inline">Saqlash</span>
          </button>
          <button 
            onClick={() => setShowPayment(true)}
            disabled={cart.length === 0}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-success-500 text-white rounded-xl hover:bg-success-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-4 h-4" />
            <span className="sm:inline">To'lov</span>
          </button>
        </div>
      </div>

      {/* Right - Numpad & Total */}
      <div className="w-full xl:w-72 2xl:w-80 bg-white border-t xl:border-t-0 xl:border-l border-surface-200 p-3 sm:p-4 lg:p-6 flex flex-col">
        {/* Total */}
        <div className="text-center xl:text-right mb-4 sm:mb-6">
          <p className="text-2xl sm:text-3xl xl:text-4xl font-bold text-surface-900">
            {formatNumber(total)} so'm
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={e => {
              const newValue = e.target.value;
              setInputValue(newValue);
              // Darhol qidirish
              if (newValue.length > 0) {
                searchProductsByCode(newValue);
              } else {
                setShowCodeSuggestions(false);
                setCodeSuggestions([]);
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addProductByCode(inputValue);
              } else if (e.key === 'Escape') {
                setShowCodeSuggestions(false);
                setCodeSuggestions([]);
              }
            }}
            onFocus={() => {
              if (inputValue.length > 0) {
                searchProductsByCode(inputValue);
              }
            }}
            placeholder="Kod kiriting..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 text-center text-base sm:text-lg font-mono bg-surface-50 border border-surface-200 rounded-xl mb-3 sm:mb-4 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpadClick(key)}
              className={`
                flex items-center justify-center rounded-xl text-lg sm:text-xl font-semibold transition-all active:scale-95
                ${key === 'C' ? 'bg-danger-500 text-white hover:bg-danger-600' : ''}
                ${key === '⌫' ? 'bg-warning-500 text-white hover:bg-warning-600' : ''}
                ${key === '+' ? 'bg-brand-500 text-white hover:bg-brand-600 row-span-2' : ''}
                ${!['C', '⌫', '+'].includes(key) ? 'bg-surface-100 text-surface-700 hover:bg-surface-200' : ''}
                ${key === '+' ? 'h-full' : 'h-12 sm:h-14 xl:h-16'}
              `}
            >
              {key === '⌫' ? <Delete className="w-5 h-5 sm:w-6 sm:h-6" /> : key}
            </button>
          ))}
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowSearch(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden max-h-[90vh] sm:max-h-none">
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
            <div className="max-h-80 sm:max-h-96 overflow-auto">
              {searchResults.map(product => (
                <button
                  key={product._id}
                  onClick={() => addToCart(product)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-left border-b border-surface-50 last:border-0"
                >
                  <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-surface-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 text-sm text-surface-500">
                      <span>Kod: {product.code}</span>
                      {product.quantity !== undefined && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          product.quantity > 10 ? 'bg-success-100 text-success-700' :
                          product.quantity > 0 ? 'bg-warning-100 text-warning-700' :
                          'bg-danger-100 text-danger-700'
                        }`}>
                          {product.quantity > 0 ? `${product.quantity} ta` : 'Tugagan'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-brand-600">{formatNumber(product.price)}</p>
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl relative z-10">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 mb-2">To'lov usuli</h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600 truncate">{selectedCustomer.name}</span>
                </div>
              )}
              <p className="text-2xl sm:text-3xl font-bold text-surface-900">
                {formatNumber(total)} so'm
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => handlePayment('cash')} 
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-success-500 hover:bg-success-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Banknote className="w-5 h-5" />
                Naqd pul
              </button>
              <button 
                onClick={() => handlePayment('card')} 
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Plastik karta
              </button>
              <button 
                onClick={() => setShowPayment(false)} 
                className="w-full py-3 text-surface-600 hover:text-surface-900 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );}
