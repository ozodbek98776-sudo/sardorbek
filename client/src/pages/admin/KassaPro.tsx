import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { useAlert } from '../../hooks/useAlert';
import { useCategories } from '../../hooks/useCategories';
import { useSocket } from '../../hooks/useSocket';
import { formatNumber } from '../../utils/format';
import { 
  cacheProducts, 
  getCachedProducts
} from '../../utils/indexedDbService';

// Yangi komponentlar
import { KassaHeader } from '../../components/kassa/KassaHeader';
import { KassaTabs } from '../../components/kassa/KassaTabs';
import { SearchBar } from '../../components/kassa/SearchBar';
import { CategoryFilter } from '../../components/kassa/CategoryFilter';
import { ProductGrid } from '../../components/kassa/ProductGrid';
import { CartPanel } from '../../components/kassa/CartPanel';
import { PaymentModal, PaymentData } from '../../components/kassa/PaymentModal';
import { SavedReceiptsModal } from '../../components/kassa/SavedReceiptsModal';
import { ProductDetailModal } from '../../components/kassa/ProductDetailModal';
import { DebtPaymentModal } from '../../components/kassa/DebtPaymentModal';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

// Fuzzy search algoritmi
function fuzzySearch(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();
  
  if (textLower === queryLower) return 100;
  if (textLower.startsWith(queryLower)) return 90;
  if (textLower.includes(queryLower)) return 70;
  
  let score = 0;
  let queryIndex = 0;
  
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      score += 10;
      queryIndex++;
    }
  }
  
  return queryIndex === queryLower.length ? score : 0;
}

export default function KassaProNew() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const navigate = useNavigate();
  const { showAlert, AlertComponent } = useAlert();
  const { categories } = useCategories();
  const socket = useSocket();
  
  // State
  const [activeTab, setActiveTab] = useState<'products' | 'receipts'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Barcha tovarlar
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]); // Ko'rsatiladigan tovarlar
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>(''); // Bo'lim filtri
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [helperReceipts, setHelperReceipts] = useState<any[]>([]);
  
  // Modals
  const [showPayment, setShowPayment] = useState(false);
  const [showSavedReceipts, setShowSavedReceipts] = useState(false);
  const [showDebtPayment, setShowDebtPayment] = useState(false);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false); // Mobile cart modal
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  
  // Computed values
  const total = cart.reduce((sum, item) => {
    const price = item.discountedPrice || item.price;
    return sum + price * item.cartQuantity;
  }, 0);
  
  const itemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  
  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, page]);

  const loadMoreProducts = () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    
    // Keyingi 10 ta tovarni qo'shish
    setTimeout(() => {
      const nextPage = page + 1;
      const startIndex = page * 10;
      const endIndex = startIndex + 10;
      const nextProducts = allProducts.slice(startIndex, endIndex);
      
      if (nextProducts.length > 0) {
        setDisplayedProducts(prev => [...prev, ...nextProducts]);
        setPage(nextPage);
        setHasMore(endIndex < allProducts.length);
      } else {
        setHasMore(false);
      }
      
      setLoadingMore(false);
    }, 300); // 300ms delay for smooth loading
  };
  
  // Fetch data
  useEffect(() => {
    console.log('🚀 KassaPro useEffect - ma\'lumotlar yuklanmoqda...');
    fetchProducts();
    fetchCustomers();
    fetchHelperReceipts();
    loadSavedReceipts();
  }, []);
  
  // Socket.IO - Real-time updates
  useEffect(() => {
    if (!socket) return;
    
    socket.on('product:updated', (updatedProduct: Product) => {
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    });
    
    socket.on('product:created', (newProduct: Product) => {
      setProducts(prev => [newProduct, ...prev]);
    });
    
    socket.on('product:deleted', (data: { _id: string }) => {
      setProducts(prev => prev.filter(p => p._id !== data._id));
    });
    
    return () => {
      socket.off('product:updated');
      socket.off('product:created');
      socket.off('product:deleted');
    };
  }, [socket]);
  
  // Fetch functions
  const fetchProducts = async () => {
    try {
      if (navigator.onLine) {
        const res = await api.get('/products?kassaView=true');
        const productsData = Array.isArray(res.data) ? res.data : [];
        
        // Narxlarni to'g'ri formatga keltirish
        const normalizedProducts = productsData.map((product: any) => {
          // Agar prices array mavjud bo'lsa, undan narxni olish
          if (Array.isArray(product.prices) && product.prices.length > 0) {
            const unitPrice = product.prices.find((p: any) => p.type === 'unit');
            return {
              ...product,
              price: unitPrice?.amount || product.unitPrice || product.price || 0
            };
          }
          // Eski format uchun
          return {
            ...product,
            price: product.unitPrice || product.price || 0
          };
        });
        
        setAllProducts(normalizedProducts); // Barcha tovarlarni saqlash
        setProducts(normalizedProducts); // Eski state ham to'ldirish (filter uchun)
        
        // Birinchi 10 ta tovarni ko'rsatish
        setDisplayedProducts(normalizedProducts.slice(0, 10));
        setPage(1);
        setHasMore(normalizedProducts.length > 10);
        
        await cacheProducts(normalizedProducts);
      } else {
        const cached = await getCachedProducts();
        const cachedData = cached as Product[];
        
        // Cache dan olingan mahsulotlar uchun ham narxni normalizatsiya qilish
        const normalizedCached = cachedData.map((product: any) => {
          if (Array.isArray(product.prices) && product.prices.length > 0) {
            const unitPrice = product.prices.find((p: any) => p.type === 'unit');
            return {
              ...product,
              price: unitPrice?.amount || product.unitPrice || product.price || 0
            };
          }
          return {
            ...product,
            price: product.unitPrice || product.price || 0
          };
        });
        
        setAllProducts(normalizedCached);
        setProducts(normalizedCached);
        setDisplayedProducts(normalizedCached.slice(0, 10));
        setPage(1);
        setHasMore(normalizedCached.length > 10);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      const cached = await getCachedProducts();
      if (cached.length > 0) {
        const cachedData = cached as Product[];
        
        // Error holatida ham narxni normalizatsiya qilish
        const normalizedError = cachedData.map((product: any) => {
          if (Array.isArray(product.prices) && product.prices.length > 0) {
            const unitPrice = product.prices.find((p: any) => p.type === 'unit');
            return {
              ...product,
              price: unitPrice?.amount || product.unitPrice || product.price || 0
            };
          }
          return {
            ...product,
            price: product.unitPrice || product.price || 0
          };
        });
        
        setAllProducts(normalizedError);
        setProducts(normalizedError);
        setDisplayedProducts(normalizedError.slice(0, 10));
        setPage(1);
        setHasMore(normalizedError.length > 10);
      }
    }
  };
  
  const fetchCustomers = async () => {
    try {
      console.log('📞 fetchCustomers boshlandi...');
      const res = await api.get('/customers/kassa');
      console.log('📥 Customers API javobi (raw):', res);
      console.log('📥 Customers API javobi (data):', res.data);
      
      // Backend yangi formatda javob qaytaradi
      let customersData = [];
      
      // Turli formatlarni tekshirish
      if (res.data && res.data.success && res.data.data) {
        // Format 1: { success: true, data: [...] }
        console.log('Format 1: success wrapper');
        customersData = Array.isArray(res.data.data) ? res.data.data : [];
      } else if (Array.isArray(res.data)) {
        // Format 2: to'g'ridan-to'g'ri array
        console.log('Format 2: direct array');
        customersData = res.data;
      } else if (res.data && Array.isArray(res.data.data)) {
        // Format 3: { data: [...] }
        console.log('Format 3: data wrapper');
        customersData = res.data.data;
      } else {
        console.warn('⚠️ Unexpected customers API response format:', res.data);
        customersData = [];
      }
      
      console.log('✅ Customers yuklandi:', customersData.length, 'ta');
      console.log('✅ Customers ma\'lumotlari:', customersData);
      setCustomers(customersData);
    } catch (err: any) {
      console.error('❌ Error fetching customers:', err);
      console.error('❌ Error response:', err.response?.data);
      setCustomers([]); // Xato bo'lsa bo'sh array
    }
  };
  
  const fetchHelperReceipts = async () => {
    try {
      const res = await api.get('/receipts/kassa');
      setHelperReceipts(res.data || []);
    } catch (err) {
      console.error('Error fetching helper receipts:', err);
    }
  };
  
  const loadSavedReceipts = () => {
    const saved = localStorage.getItem('savedReceipts');
    if (saved) setSavedReceipts(JSON.parse(saved));
  };
  
  // Search
  const performSearch = useCallback((query: string) => {
    if (!query || query.length < 1) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    const results = products
      .map(product => {
        const nameScore = fuzzySearch(query, product.name);
        const codeScore = fuzzySearch(query, product.code);
        const maxScore = Math.max(nameScore, codeScore);
        return { product, score: maxScore };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => item.product);
    
    setSearchResults(results);
    setIsSearching(false);
  }, [products]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);
  
  // Cart functions
  const addToCart = (product: Product, quantity: number = 1) => {
    if (product.quantity <= 0) {
      showAlert(`${product.name} tugagan!`, 'Ogohlantirish', 'warning');
      return;
    }
    
    const existingInCart = cart.find(p => p._id === product._id);
    const currentCartQuantity = existingInCart ? existingInCart.cartQuantity : 0;
    
    if (currentCartQuantity + quantity > product.quantity) {
      showAlert(`Maksimal: ${product.quantity} ta`, 'Ogohlantirish', 'warning');
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        return prev.map(p => 
          p._id === product._id 
            ? {...p, cartQuantity: p.cartQuantity + quantity} 
            : p
        );
      }
      return [...prev, {...product, cartQuantity: quantity}];
    });
  };
  
  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };
  
  const updateQuantity = (id: string, quantity: number) => {
    setCart(prev => prev.map(p => 
      p._id === id ? {...p, cartQuantity: Math.max(1, quantity)} : p
    ));
  };
  
  const clearCart = () => {
    if (confirm('Savatni tozalashni xohlaysizmi?')) {
      setCart([]);
    }
  };
  
  // Save receipt
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
  
  // Payment
  const handlePayment = async (data: PaymentData) => {
    console.log('💰 handlePayment boshlandi:', data);
    
    const { customer, cashAmount, cardAmount, debtAmount } = data;
    
    // Validatsiya
    if (cart.length === 0) {
      showAlert('Savat bo\'sh!', 'Xatolik', 'danger');
      return;
    }
    
    if (cashAmount + cardAmount <= 0) {
      showAlert('To\'lov summasi 0 dan katta bo\'lishi kerak!', 'Xatolik', 'danger');
      return;
    }
    
    let finalPaymentMethod: 'cash' | 'card' | 'mixed';
    if (cashAmount > 0 && cardAmount > 0) {
      finalPaymentMethod = 'mixed';
    } else if (cashAmount > 0) {
      finalPaymentMethod = 'cash';
    } else {
      finalPaymentMethod = 'card';
    }
    
    const saleData = {
      items: cart.map(item => ({
        product: item._id,
        name: item.name,
        code: item.code,
        price: item.price,
        quantity: item.cartQuantity
      })),
      total,
      paidAmount: cashAmount + cardAmount,
      cashAmount,
      cardAmount,
      paymentMethod: finalPaymentMethod,
      customer: customer?._id
    };
    
    console.log('📤 Serverga yuborilayotgan ma\'lumot:', JSON.stringify(saleData, null, 2));
    console.log('📦 Cart ma\'lumotlari:', cart);
    
    try {
      const response = await api.post('/receipts', saleData);
      console.log('✅ Server javobi:', response.data);
      
      // Clear cart
      setCart([]);
      setShowPayment(false);
      fetchProducts();
      
      if (debtAmount > 0 && customer) {
        showAlert(`To'lov qabul qilindi! Qarz: ${debtAmount} so'm`, 'Muvaffaqiyat', 'success');
        // Qarzdaftarcha sahifasiga o'tish
        setTimeout(() => {
          navigate('/admin/debts');
        }, 1500);
      } else {
        showAlert('Chek saqlandi!', 'Muvaffaqiyat', 'success');
      }
    } catch (err: any) {
      console.error('❌ To\'lov xatosi:', err);
      console.error('❌ Xato tafsilotlari:', err.response?.data);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };
  
  // Create customer
  const handleCreateCustomer = async (name: string, phone: string) => {
    try {
      const response = await api.post('/customers/kassa', { name, phone });
      
      if (response.data.success) {
        const newCustomer = response.data.customer;
        setCustomers(prev => [...prev, newCustomer]);
        showAlert('Yangi mijoz qo\'shildi!', 'Muvaffaqiyat', 'success');
      }
    } catch (err: any) {
      if (err.response?.status === 400 && err.response?.data?.existingCustomer) {
        showAlert('Bu mijoz allaqachon mavjud', 'Ma\'lumot', 'info');
      } else {
        showAlert(err.response?.data?.message || 'Mijoz qo\'shishda xatolik', 'Xatolik', 'danger');
      }
    }
  };
  
  // QR Print
  const printQRCodes = async (products: Product[]) => {
    // TODO: Implement QR printing
    showAlert('QR print funksiyasi qo\'shilmoqda...', 'Ma\'lumot', 'info');
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      
      {/* Header - Responsive */}
      <KassaHeader
        savedReceiptsCount={savedReceipts.length}
        onOpenSavedReceipts={() => setShowSavedReceipts(true)}
        onOpenDebtPayment={() => setShowDebtPayment(true)}
        onMenuOpen={onMenuToggle}
      />
      
      {/* Main Content - Fully Responsive */}
      <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          {/* Desktop: Side by side | Mobile: Stacked with fixed cart */}
          <div className="h-full flex flex-col lg:flex-row lg:gap-4 lg:p-4">
            
            {/* Left: Products/Receipts - Scrollable */}
            <div className="flex-1 overflow-y-auto lg:overflow-y-auto px-3 py-3 lg:px-0 lg:py-0 space-y-3 lg:space-y-4">
              {/* Tabs */}
              <KassaTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                receiptsCount={helperReceipts.length}
              />
              
              {activeTab === 'products' ? (
                <>
                  {/* Search */}
                  <SearchBar
                    query={searchQuery}
                    onQueryChange={setSearchQuery}
                    results={searchResults}
                    isSearching={isSearching}
                    showResults={searchQuery.length > 0}
                    onProductSelect={(product) => {
                      setSelectedProductForDetail(product);
                      setShowProductDetail(true);
                      setSearchQuery('');
                    }}
                    onClose={() => setSearchQuery('')}
                  />
                  
                  {/* Category Filter with Section Select - Responsive */}
                  <div className="space-y-2 lg:space-y-3">
                    {/* Category Filter with Subcategories */}
                    <div className="w-full">
                      <CategoryFilter
                        categories={categories}
                        selectedCategory={selectedCategory}
                        selectedSubcategory={selectedSection}
                        onCategoryChange={setSelectedCategory}
                        onSubcategoryChange={setSelectedSection}
                      />
                    </div>
                  </div>
                  
                  {/* Products Grid */}
                  <ProductGrid
                    products={displayedProducts}
                    selectedCategory={selectedCategory}
                    selectedSection={selectedSection}
                    onProductClick={(product) => {
                      setSelectedProductForDetail(product);
                      setShowProductDetail(true);
                    }}
                    onCategoryClick={(product) => {
                      setSelectedCategory(product.category || '');
                    }}
                    onQRPrint={(product) => printQRCodes([product])}
                    loadMoreRef={loadMoreRef}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                  />
                </>
              ) : (
                <div className="bg-white rounded-xl p-6 text-center">
                  <p className="text-slate-500">Cheklar ro'yxati</p>
                  <p className="text-sm text-slate-400 mt-2">
                    {helperReceipts.length} ta chek
                  </p>
                </div>
              )}
            </div>
            
            {/* Right: Cart - Responsive (Fixed on mobile, sidebar on desktop) */}
            <div className="lg:w-[360px] lg:flex-shrink-0">
              {/* Mobile: Hidden - faqat floating button */}
              
              {/* Desktop: Sticky sidebar cart */}
              <div className="hidden lg:block lg:sticky lg:top-4 lg:h-[calc(100vh-80px)] lg:overflow-hidden">
                <CartPanel
                  cart={cart}
                  total={total}
                  itemCount={itemCount}
                  onQuantityChange={updateQuantity}
                  onRemove={removeFromCart}
                  onClear={clearCart}
                  onSave={saveReceipt}
                  onCheckout={() => setShowPayment(true)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile: Floating Cart Button */}
      {cart.length > 0 && (
        <button
          onClick={() => setShowCartModal(true)}
          className="lg:hidden fixed bottom-20 right-4 z-40 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-full p-4 shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform"
        >
          <ShoppingCart className="w-6 h-6" />
          <div className="flex flex-col items-start">
            <span className="text-xs font-medium">{itemCount} ta</span>
            <span className="text-sm font-bold">{formatNumber(total)} so'm</span>
          </div>
        </button>
      )}
      
      {/* Mobile: Cart Modal */}
      {showCartModal && (
        <>
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50" 
            onClick={() => setShowCartModal(false)} 
          />
          
          <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
              <CartPanel
                cart={cart}
                total={total}
                itemCount={itemCount}
                onQuantityChange={updateQuantity}
                onRemove={removeFromCart}
                onClear={clearCart}
                onSave={() => {
                  saveReceipt();
                  setShowCartModal(false);
                }}
                onCheckout={() => {
                  setShowCartModal(false);
                  setShowPayment(true);
                }}
                isModal={true}
              />
            </div>
          </div>
        </>
      )}
      
      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={total}
        cart={cart}
        customers={customers}
        onPayment={handlePayment}
        onCreateCustomer={handleCreateCustomer}
      />
      
      {/* Saved Receipts Modal */}
      <SavedReceiptsModal
        isOpen={showSavedReceipts}
        onClose={() => setShowSavedReceipts(false)}
        receipts={savedReceipts}
        onLoad={(receipt) => {
          setCart(receipt.items);
          showAlert('Chek yuklandi!', 'Muvaffaqiyat', 'success');
        }}
        onDelete={(id) => {
          const updated = savedReceipts.filter(r => r.id !== id);
          setSavedReceipts(updated);
          localStorage.setItem('savedReceipts', JSON.stringify(updated));
          showAlert('Chek o\'chirildi', 'Ma\'lumot', 'info');
        }}
      />
      
      {/* Debt Payment Modal */}
      <DebtPaymentModal
        isOpen={showDebtPayment}
        onClose={() => setShowDebtPayment(false)}
        onPaymentSuccess={() => {
          showAlert('Qarz to\'lovi qabul qilindi!', 'Muvaffaqiyat', 'success');
        }}
      />
      
      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={showProductDetail}
        onClose={() => {
          setShowProductDetail(false);
          setSelectedProductForDetail(null);
        }}
        product={selectedProductForDetail}
        onAddToCart={(product, quantity) => {
          addToCart(product, quantity);
          showAlert(`${product.name} (${quantity} ta) qo'shildi`, 'Muvaffaqiyat', 'success');
        }}
      />
    </div>
  );
}
