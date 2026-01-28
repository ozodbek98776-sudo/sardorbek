import { useState, useEffect, useRef } from 'react';
import { 
  Search, ShoppingCart, CreditCard, Banknote, User, 
  Plus, Minus, X, Trash2, Receipt, Clock, Package, Check, Sparkles
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function KassaModern() {
  const { showAlert, AlertComponent } = useAlert();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageLoadedMap, setImageLoadedMap] = useState<Record<string, boolean>>({});
  const cartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products?mainOnly=true&limit=1000');
      const productsData = res.data.data || res.data;
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 50); // Increased to 50 for better UX

  const handleImageLoad = (productId: string) => {
    setImageLoadedMap(prev => ({ ...prev, [productId]: true }));
  };

  const addToCart = (product: Product) => {
    // Animatsiya uchun
    setAddingProductId(product._id);
    
    // Savatga qo'shish
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: p.cartQuantity + 1} : p);
      }
      return [...prev, {...product, cartQuantity: 1}];
    });
    
    // Animatsiyani tozalash
    setTimeout(() => setAddingProductId(null), 600);
    
    // Savatni scroll qilish
    setTimeout(() => {
      if (cartRef.current) {
        cartRef.current.scrollTop = cartRef.current.scrollHeight;
      }
    }, 100);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item._id !== id));
    } else {
      setCart(prev => prev.map(p => p._id === id ? {...p, cartQuantity: quantity} : p));
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;

    try {
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

      await api.post('/receipts', saleData);
      
      // Success animatsiyasi
      setSuccessAnimation(true);
      
      setTimeout(() => {
        showAlert('Chek muvaffaqiyatli saqlandi!', 'Muvaffaqiyat', 'success');
        setCart([]);
        setShowPayment(false);
        setSelectedCustomer(null);
        setSuccessAnimation(false);
      }, 1500);
    } catch (err) {
      console.error('Error creating receipt:', err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {AlertComponent}
      
      {/* Modern POS Layout */}
      <div className="h-screen flex flex-col lg:flex-row">
        
        {/* LEFT SIDE - Products Search & Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Clean & Modern Design */}
          <div className="bg-white border-b border-slate-200 px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
            {/* Title Section - Centered & Beautiful */}
            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-blue-600 flex items-center justify-center shadow-xl">
                  <ShoppingCart className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
                </div>
                <div className="text-center">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                    Kassa (POS)
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">Professional Sotish Tizimi</p>
                </div>
              </div>
            </div>

            {/* Search Bar - Full Width with Beautiful Design */}
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Mahsulot qidirish..."
                className="w-full pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-slate-200 rounded-2xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all text-sm sm:text-base font-medium placeholder:text-slate-400 shadow-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Products Grid - High Performance */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {loading ? (
              /* Skeleton Loaders */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {[...Array(20)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-4 border-2 border-slate-100 animate-pulse">
                    <div className="flex items-center justify-between mb-3">
                      <div className="h-3 w-12 bg-slate-200 rounded" />
                      <div className="w-8 h-8 bg-slate-200 rounded-lg" />
                    </div>
                    <div className="space-y-2 mb-3">
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                    </div>
                    <div className="h-5 bg-slate-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn">
                <div className="relative mb-4">
                  <Package className="w-20 h-20 text-slate-300" />
                  <Search className="w-8 h-8 absolute -bottom-2 -right-2 text-blue-400" />
                </div>
                <p className="text-lg font-semibold text-slate-600">Mahsulot topilmadi</p>
                <p className="text-sm text-center mt-2 max-w-xs">
                  {searchQuery ? `"${searchQuery}" bo'yicha natija yo'q` : 'Mahsulotlar yuklanmoqda...'}
                </p>
              </div>
            ) : (
              /* Products Grid with Micro-interactions */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
                {filteredProducts.map((product, index) => {
                  const UPLOADS_URL = (import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:5000';
                  const hasImage = product.images && product.images.length > 0;
                  const imageUrl = hasImage ? `${UPLOADS_URL}${product.images[0]}` : null;
                  const isImageLoaded = imageLoadedMap[product._id];
                  const stockStatus = product.quantity === 0 ? 'out' : product.quantity <= 10 ? 'low' : 'good';
                  
                  return (
                    <button
                      key={product._id}
                      onClick={() => addToCart(product)}
                      disabled={product.quantity === 0}
                      className={`group relative bg-white rounded-xl p-3 lg:p-4 border-2 transition-all duration-300 text-left overflow-hidden ${
                        addingProductId === product._id 
                          ? 'border-green-500 bg-green-50 scale-95' 
                          : product.quantity === 0
                          ? 'border-slate-200 opacity-60 cursor-not-allowed'
                          : 'border-slate-200 hover:border-blue-400 hover:shadow-xl hover:scale-[1.02] active:scale-95'
                      }`}
                      style={{
                        animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.02}s both`
                      }}
                    >
                      {/* Shimmer Effect on Add */}
                      {addingProductId === product._id && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" />
                      )}
                      
                      {/* Product Image */}
                      {hasImage && (
                        <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-slate-100">
                          {!isImageLoaded && (
                            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
                          )}
                          <img
                            src={imageUrl!}
                            alt={product.name}
                            loading="lazy"
                            onLoad={() => handleImageLoad(product._id)}
                            className={`w-full h-full object-cover transition-all duration-500 ${
                              isImageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                            } ${addingProductId === product._id ? 'scale-110' : 'group-hover:scale-105'}`}
                          />
                          {/* Stock Badge on Image */}
                          <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-lg backdrop-blur-sm ${
                            stockStatus === 'out' ? 'bg-red-500/90 text-white' :
                            stockStatus === 'low' ? 'bg-amber-500/90 text-white' :
                            'bg-green-500/90 text-white'
                          }`}>
                            {product.quantity}
                          </div>
                        </div>
                      )}
                      
                      {/* Header: Code + Icon */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          #{product.code}
                        </span>
                        <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                          addingProductId === product._id 
                            ? 'bg-green-500 scale-125 rotate-12' 
                            : 'bg-blue-100 group-hover:bg-blue-500 group-hover:scale-110 group-hover:rotate-6'
                        }`}>
                          {addingProductId === product._id ? (
                            <Check className="w-4 h-4 text-white animate-bounce" />
                          ) : (
                            <ShoppingCart className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 group-hover:text-white transition-colors" />
                          )}
                        </div>
                      </div>
                      
                      {/* Product Name */}
                      <h3 className="font-semibold text-slate-900 text-xs lg:text-sm mb-2 line-clamp-2 min-h-[2.5rem] leading-tight">
                        {product.name}
                      </h3>
                      
                      {/* Price */}
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-base lg:text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {formatNumber(product.price)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">so'm</span>
                      </div>
                      
                      {/* Stock Status */}
                      <div className={`text-[10px] lg:text-xs font-medium flex items-center gap-1 ${
                        stockStatus === 'out' ? 'text-red-600' :
                        stockStatus === 'low' ? 'text-amber-600' :
                        'text-green-600'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          stockStatus === 'out' ? 'bg-red-500 animate-pulse' :
                          stockStatus === 'low' ? 'bg-amber-500 animate-pulse' :
                          'bg-green-500'
                        }`} />
                        {stockStatus === 'out' ? 'Tugagan' : 
                         stockStatus === 'low' ? 'Kam qoldi' : 
                         'Mavjud'}
                      </div>
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDE - Cart & Checkout - Mobile Optimized */}
        <div className="w-full lg:w-[420px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-2xl">
          {/* Cart Header - Compact on Mobile */}
          <div className="px-3 py-3 sm:px-4 sm:py-4 lg:px-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm sm:text-base">Savat</h2>
                  <p className="text-[10px] sm:text-xs text-slate-500">{itemCount} ta mahsulot</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="p-1.5 sm:p-2 hover:bg-red-100 rounded-lg text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div ref={cartRef} className="flex-1 overflow-y-auto p-4 scroll-smooth">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-fadeIn">
                <div className="relative">
                  <ShoppingCart className="w-16 h-16 mb-4 animate-pulse" />
                  <Sparkles className="w-6 h-6 absolute -top-2 -right-2 text-blue-400 animate-bounce" />
                </div>
                <p className="text-center font-semibold">Savat bo'sh</p>
                <p className="text-sm text-center mt-2">Mahsulot qo'shing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div 
                    key={item._id} 
                    className="bg-slate-50 rounded-xl p-3 border border-slate-200 transform transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                    style={{
                      animation: `slideInRight 0.3s ease-out ${idx * 0.05}s both`
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-lg flex items-center justify-center text-xs font-bold shadow-md">
                            {idx + 1}
                          </span>
                          <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                        </div>
                        <p className="text-xs text-slate-500">#{item.code}</p>
                      </div>
                      <button
                        onClick={() => updateQuantity(item._id, 0)}
                        className="p-1 hover:bg-red-100 rounded-lg text-red-600 transition-all hover:scale-110 hover:rotate-90"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-slate-200">
                        <button
                          onClick={() => updateQuantity(item._id, item.cartQuantity - 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-red-100 rounded-md transition-all hover:scale-110 active:scale-95"
                        >
                          <Minus className="w-4 h-4 text-red-600" />
                        </button>
                        <span className="w-10 text-center font-bold text-blue-600">{item.cartQuantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.cartQuantity + 1)}
                          className="w-7 h-7 flex items-center justify-center hover:bg-green-100 rounded-md transition-all hover:scale-110 active:scale-95"
                        >
                          <Plus className="w-4 h-4 text-green-600" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">
                          {formatNumber(item.price)} × {item.cartQuantity}
                        </div>
                        <div className="font-bold text-blue-600 animate-pulse">
                          {formatNumber(item.price * item.cartQuantity)} so'm
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total & Checkout */}
          {cart.length > 0 && (
            <div className="border-t border-slate-200 p-6 bg-gradient-to-br from-slate-50 to-blue-50 animate-slideUp">
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Mahsulotlar:</span>
                  <span className="font-semibold">{itemCount} ta</span>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-lg font-bold text-slate-900">Jami:</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
                    {formatNumber(total)} <span className="text-sm text-slate-400">so'm</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handlePayment('cash')}
                  disabled={successAnimation}
                  className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {successAnimation ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" />
                      <span>Muvaffaqiyatli!</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Naqd</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
                <button
                  onClick={() => handlePayment('card')}
                  disabled={successAnimation}
                  className="group relative overflow-hidden flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {successAnimation ? (
                    <>
                      <Check className="w-5 h-5 animate-bounce" />
                      <span>Muvaffaqiyatli!</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Karta</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
