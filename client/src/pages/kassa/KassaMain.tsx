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

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadSavedReceipts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?mainOnly=true');
      setProducts(res.data);
    } catch (err) {
      console.error('Error fetching products:', err);
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
    if (value === 'C') setInputValue('');
    else if (value === '⌫') setInputValue(prev => prev.slice(0, -1));
    else if (value === '+') {
      addProductByCode(inputValue);
    }
    else setInputValue(prev => prev + value);
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
    <div className="flex-1 flex">
      {AlertComponent}
      
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
            <div className="col-span-4">Mahsulot</div>
            <div className="col-span-2 text-center">Soni</div>
            <div className="col-span-2 text-right">Narx</div>
            <div className="col-span-2 text-right">Summa</div>
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
                    className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-surface-50 transition-colors"
                  >
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
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button 
            onClick={() => { setShowSearch(true); setSearchResults(products); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-surface-200 rounded-xl text-surface-700 hover:bg-surface-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            Qidirish
          </button>
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
          <p className="text-3xl lg:text-4xl font-bold text-surface-900">
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
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative z-10">
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-surface-900 mb-2">To'lov usuli</h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600">{selectedCustomer.name}</span>
                </div>
              )}
              <p className="text-3xl font-bold text-surface-900">
                {formatNumber(total)} so'm
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => handlePayment('cash')} 
                className="w-full flex items-center justify-center gap-2 py-4 bg-success-500 hover:bg-success-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Banknote className="w-5 h-5" />
                Naqd pul
              </button>
              <button 
                onClick={() => handlePayment('card')} 
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
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
