import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, Save, CreditCard, Trash2, 
  Package, Banknote, Delete, RefreshCw, Printer
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { printReceipt, ReceiptData, checkPrinterStatus } from '../../utils/receipt';

interface SavedReceipt {
  id: string;
  items: CartItem[];
  total: number;
  savedAt: string;
}

export default function KassaMain() {
  const { showAlert, AlertComponent } = useAlert();
  const location = useLocation();
  
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
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  // Yangi state - real-time qidiruv uchun
  const [codeSuggestions, setCodeSuggestions] = useState<Product[]>([]);
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<{available: boolean; printers: string[]}>({
    available: false,
    printers: []
  });
  // KOD/SON panel uchun yangi state
  const [inputMode, setInputMode] = useState<'kod' | 'son'>('kod');
  const [numberInput, setNumberInput] = useState('');
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    loadSavedReceipts();
    checkPrinters(); // Printer holatini tekshirish
    
    // Kassa sahifasida beforeunload eventini vaqtincha o'chirish
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    // Cleanup da qaytarish
    return () => {
      window.onbeforeunload = originalHandler;
    };
  }, []);

  // Route o'zgarganda ma'lumotlarni yangilash
  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [location.pathname]);

  const handleRefresh = async () => {
    console.log('Refresh tugmasi bosildi');
    setIsRefreshing(true);
    try {
      console.log('Ma\'lumotlar yangilanmoqda...');
      await Promise.all([
        fetchProducts(),
        fetchCustomers()
      ]);
      console.log('Ma\'lumotlar muvaffaqiyatli yangilandi');
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      console.error('Refresh xatosi:', error);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setIsRefreshing(false);
    }
  };

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

  // Printer holatini tekshirish
  const checkPrinters = async () => {
    try {
      const status = await checkPrinterStatus();
      setPrinterStatus(status);
      console.log('Printer holati:', status);
    } catch (error) {
      console.error('Printer holatini tekshirishda xatolik:', error);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.cartQuantity, 0);

  const handleNumpadClick = (value: string) => {
    if (value === 'C') {
      if (inputMode === 'kod') {
        setInputValue('');
        setShowCodeSuggestions(false);
        setCodeSuggestions([]);
      } else {
        setNumberInput('1'); // 1 ga o'rnatish
        // Agar mahsulot tanlangan bo'lsa, uni 1 ta qilish
        if (selectedProductForQuantity) {
          const existingInCart = cart.find(p => p._id === selectedProductForQuantity._id);
          if (existingInCart) {
            setCart(prev => prev.map(p => 
              p._id === selectedProductForQuantity._id ? {...p, cartQuantity: 1} : p
            ));
          }
        }
      }
    }
    else if (value === '⌫') {
      if (inputMode === 'kod') {
        const newValue = inputValue.slice(0, -1);
        setInputValue(newValue);
        // Darhol qidirish
        if (newValue.length > 0) {
          searchProductsByCode(newValue);
        } else {
          setShowCodeSuggestions(false);
          setCodeSuggestions([]);
        }
      } else {
        const newValue = numberInput.slice(0, -1);
        
        // Agar yangi qiymat bo'sh bo'lsa yoki 0 ga teng bo'lsa, 1 ga o'rnatish
        const finalValue = newValue === '' || parseInt(newValue) === 0 ? '1' : newValue;
        setNumberInput(finalValue);
        
        // Real-time savatchani yangilash
        if (selectedProductForQuantity) {
          const quantity = parseInt(finalValue);
          if (quantity > 0 && quantity <= selectedProductForQuantity.quantity) {
            const existingInCart = cart.find(p => p._id === selectedProductForQuantity._id);
            if (existingInCart) {
              // Mavjud mahsulot miqdorini real-time yangilash
              setCart(prev => prev.map(p => 
                p._id === selectedProductForQuantity._id ? {...p, cartQuantity: quantity} : p
              ));
            }
          }
        }
      }
    }
    else if (value === '+') {
      if (inputMode === 'kod') {
        addProductByCode(inputValue);
      } else {
        // SON rejimida + bosilganda - tanlangan mahsulotni savatchaga qo'shish yoki yangilash
        if (selectedProductForQuantity && numberInput.trim()) {
          const quantity = parseInt(numberInput);
          if (!isNaN(quantity) && quantity > 0) {
            // Miqdorni tekshirish
            if (quantity > selectedProductForQuantity.quantity) {
              showAlert(`${selectedProductForQuantity.name} uchun maksimal miqdor: ${selectedProductForQuantity.quantity} ta`, 'Ogohlantirish', 'warning');
              return;
            }
            
            // Savatchada mavjud mahsulotni yangilash yoki yangi qo'shish
            const existingInCart = cart.find(p => p._id === selectedProductForQuantity._id);
            if (existingInCart) {
              // Mavjud mahsulot miqdorini yangilash
              setCart(prev => prev.map(p => 
                p._id === selectedProductForQuantity._id ? {...p, cartQuantity: quantity} : p
              ));
            } else {
              // Yangi mahsulot qo'shish
              addToCartWithQuantity(selectedProductForQuantity, quantity);
            }
            
            // Holatni tozalash va KOD rejimiga qaytish
            setSelectedProductForQuantity(null);
            setNumberInput('');
            setInputMode('kod');
          }
        } else if (!selectedProductForQuantity) {
          showAlert('Mahsulot qo\'shing', 'Ogohlantirish', 'warning');
        }
      }
    }
    else {
      if (inputMode === 'kod') {
        const newValue = inputValue + value;
        setInputValue(newValue);
        // Darhol qidirish
        searchProductsByCode(newValue);
      } else {
        // SON rejimida faqat raqamlar (nuqta yo'q, chunki miqdor butun son)
        // Faqat mahsulot tanlangan bo'lsa raqam kiritish mumkin
        if (selectedProductForQuantity && (/^[\d]$/.test(value) || value === '00')) {
          const newValue = numberInput + value;
          const quantity = parseInt(newValue);
          
          // Avval miqdorni tekshirish - agar oshib ketsa, raqam qo'shilmaydi
          if (!isNaN(quantity) && quantity > selectedProductForQuantity.quantity) {
            showAlert(`${selectedProductForQuantity.name} uchun maksimal miqdor: ${selectedProductForQuantity.quantity} ta`, 'Ogohlantirish', 'warning');
            return; // Raqamni qo'shmaslik
          }
          
          console.log('SON rejimida raqam kiritildi:', value, 'Yangi qiymat:', newValue);
          setNumberInput(newValue);
          
          // Real-time savatchani yangilash
          if (!isNaN(quantity) && quantity > 0) {
            const existingInCart = cart.find(p => p._id === selectedProductForQuantity._id);
            if (existingInCart) {
              // Mavjud mahsulot miqdorini real-time yangilash
              setCart(prev => prev.map(p => 
                p._id === selectedProductForQuantity._id ? {...p, cartQuantity: quantity} : p
              ));
            }
          }
        } else if (!selectedProductForQuantity) {
          // Mahsulot tanlanmagan bo'lsa, KOD rejimiga o'tish
          setInputMode('kod');
          showAlert('Mahsulot qo\'shing', 'Ogohlantirish', 'warning');
        }
      }
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
      
      // Tovar topildi - darhol 1 ta qo'shish
      addToCart(product);
      setInputValue('');
      setShowCodeSuggestions(false);
      setCodeSuggestions([]);
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
    
    // Tovar tanlandi - darhol 1 ta qo'shish
    addToCart(product);
    setInputValue('');
    setShowCodeSuggestions(false);
    setCodeSuggestions([]);
  };

  const editCartItemQuantity = (item: CartItem) => {
    // Mahsulotni tanlash va SON rejimiga o'tish
    setSelectedProductForQuantity(item);
    setInputMode('son');
    setNumberInput(item.cartQuantity.toString());
  };

  const addToCartWithQuantity = (product: Product, quantity: number) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        // Agar mahsulot allaqachon savatchada bo'lsa, miqdorni qo'shish
        const newQuantity = existing.cartQuantity + quantity;
        if (newQuantity > product.quantity) {
          showAlert(`${product.name} uchun maksimal miqdor: ${product.quantity} ta`, 'Ogohlantirish', 'warning');
          return prev; // O'zgartirishni bekor qilish
        }
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: newQuantity} : p);
      }
      return [...prev, {...product, cartQuantity: quantity}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(p => p._id === product._id);
      if (existing) {
        // Agar mahsulot allaqachon savatchada bo'lsa, miqdorni tekshirish
        const newQuantity = existing.cartQuantity + 1;
        if (newQuantity > product.quantity) {
          showAlert(`${product.name} uchun maksimal miqdor: ${product.quantity} ta`, 'Ogohlantirish', 'warning');
          return prev; // O'zgartirishni bekor qilish
        }
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: newQuantity} : p);
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

  // ATOMIC TRANSACTION bilan to'lov - Print va Cancel mantiqini to'liq amalga oshirish
  const handlePayment = async (method: 'cash' | 'card') => {
    if (cart.length === 0) return;
    
    const receiptNumber = `CHK-${Date.now()}`;
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
      customer: selectedCustomer?._id,
      receiptNumber
    };

    // Chek ma'lumotlarini tayyorlash
    const receiptData: ReceiptData = {
      items: cart,
      total,
      paymentMethod: method,
      customer: selectedCustomer,
      receiptNumber,
      cashier: 'Kassa',
      date: new Date()
    };

    try {
      // 1️⃣ PRINT BOSHLASH - Avval print qilish
      console.log('🖨️ Print jarayoni boshlanmoqda...');
      
      // Print preview modal ochish va foydalanuvchi tanlovini kutish
      const printConfirmed = await new Promise<boolean>((resolve) => {
        // Print modal yaratish
        const printModal = document.createElement('div');
        printModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md';
        printModal.innerHTML = `
          <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-pulse-once">
            <!-- Header with animated icon -->
            <div class="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-8 text-center overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div class="relative z-10">
                <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-white/30 animate-bounce-slow">
                  <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2 drop-shadow-lg">Chek chiqarish</h3>
                <p class="text-white/90 text-sm drop-shadow">Chekni printerga yuborish uchun "Print" tugmasini bosing</p>
              </div>
              <!-- Decorative elements -->
              <div class="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
              <div class="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full animate-pulse delay-300"></div>
            </div>
            
            <div class="p-6 bg-gradient-to-b from-gray-50 to-white">
              <!-- Amount display with icons -->
              <div class="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-2xl p-6 mb-6 border-2 border-indigo-100 shadow-inner">
                <div class="text-center">
                  <div class="flex items-center justify-center gap-2 mb-2">
                    <svg class="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                    <span class="text-sm font-semibold text-gray-600 uppercase tracking-wider">Jami summa</span>
                  </div>
                  <p class="text-4xl font-bold text-gray-800 mb-3">${formatNumber(total)} <span class="text-lg text-gray-500">so'm</span></p>
                  <div class="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span>${cart.length} ta mahsulot</span>
                    </div>
                    <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div class="flex items-center gap-1">
                      ${method === 'cash' ? 
                        '<svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15h2c0 1.08 1.37 2 3 2s3-.92 3-2c0-1.1-1.04-1.5-3.24-2.03C9.64 12.44 7 11.78 7 9c0-1.79 1.47-3.31 3.5-3.82V3h3v2.18C15.53 5.69 17 7.21 17 9h-2c0-1.08-1.37-2-3-2s-3 .92-3 2c0 1.1 1.04 1.5 3.24 2.03C14.36 11.56 17 12.22 17 15c0 1.79-1.47 3.31-3.5 3.82V21h-3v-2.18C8.47 18.31 7 16.79 7 15z"/></svg><span>Naqd pul</span>' : 
                        '<svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg><span>Plastik karta</span>'
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Action buttons with enhanced design -->
              <div class="flex gap-4">
                <button id="cancelPrint" class="flex-1 group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-xl border border-gray-300">
                  <div class="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:to-red-500/5 transition-all duration-300"></div>
                  <svg class="w-5 h-5 text-red-500 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  <span class="relative z-10">Cancel</span>
                </button>
                <button id="confirmPrint" class="flex-1 group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl font-bold hover:from-blue-600 hover:via-indigo-600 hover:to-purple-700 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-2xl">
                  <div class="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg class="w-5 h-5 relative z-10 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                  </svg>
                  <span class="relative z-10">Print</span>
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </div>
              
              <!-- Footer info -->
              <div class="mt-4 text-center">
                <p class="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Chek printerga yuboriladi va ma'lumotlar saqlanadi
                </p>
              </div>
            </div>
          </div>
          
          <style>
            @keyframes bounce-slow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse-once {
              0% { transform: scale(0.95); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-slow {
              animation: bounce-slow 2s infinite;
            }
            .animate-pulse-once {
              animation: pulse-once 0.3s ease-out;
            }
          </style>
        `;
        
        document.body.appendChild(printModal);
        
        // Event listenerlar
        const cancelBtn = printModal.querySelector('#cancelPrint');
        const printBtn = printModal.querySelector('#confirmPrint');
        
        cancelBtn?.addEventListener('click', () => {
          document.body.removeChild(printModal);
          resolve(false); // Cancel bosildi - hech narsa qilmaslik
        });
        
        printBtn?.addEventListener('click', async () => {
          document.body.removeChild(printModal);
          
          // Haqiqiy print jarayoni
          try {
            const printSuccess = await printReceipt(receiptData);
            resolve(printSuccess); // Print natijasi
          } catch (printError) {
            console.error('Print xatosi:', printError);
            resolve(false); // Print muvaffaqiyatsiz
          }
        });
      });

      // 2️⃣ PRINT NATIJASINI TEKSHIRISH
      if (!printConfirmed) {
        // ❌ CANCEL BOSILDI yoki PRINT MUVAFFAQIYATSIZ
        console.log('❌ Print bekor qilindi yoki muvaffaqiyatsiz');
        
        // CANCEL bosilganda hech qanday modal chiqarmaslik va hech narsa o'zgartirmaslik
        setShowPayment(false);
        return; // Funksiyadan chiqish - hech narsa o'zgartirilmaydi
      }

      // 3️⃣ PRINT MUVAFFAQIYATLI - ATOMIC TRANSACTION BOSHLASH
      console.log('✅ Print muvaffaqiyatli, atomic transaction boshlanmoqda...');
      
      // Atomic transaction bilan backend'ga yuborish
      const transactionData = {
        ...saleData,
        printSuccess: true // Print muvaffaqiyatli ekanligini bildirish
      };
      
      const response = await api.post('/receipts/kassa-atomic', transactionData);
      
      if (response.data.success) {
        // 4️⃣ TRANSACTION MUVAFFAQIYATLI
        console.log('✅ Atomic transaction muvaffaqiyatli tugadi');
        
        // Success modal ko'rsatish
        const successModal = document.createElement('div');
        successModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md';
        successModal.innerHTML = `
          <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-success">
            <!-- Success header with animated checkmark -->
            <div class="relative bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 p-8 text-center overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div class="relative z-10">
                <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-white/30 animate-checkmark">
                  <svg class="w-12 h-12 text-white animate-draw-check" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2 drop-shadow-lg">Muvaffaqiyatli!</h3>
                <p class="text-white/90 text-sm drop-shadow">Barcha amallar muvaffaqiyatli bajarildi</p>
              </div>
              <!-- Celebration particles -->
              <div class="absolute top-4 right-4 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
              <div class="absolute top-8 right-8 w-1 h-1 bg-white rounded-full animate-ping delay-100"></div>
              <div class="absolute bottom-4 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-ping delay-200"></div>
            </div>
            
            <div class="p-6 bg-gradient-to-b from-green-50 to-white">
              <!-- Success steps -->
              <div class="space-y-4 mb-6">
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-green-100">
                  <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">Chek yaratildi va saqlandi</p>
                    <p class="text-xs text-gray-500">Ma'lumotlar bazaga saqlandi</p>
                  </div>
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-green-100">
                  <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,14H13V16H11V14M11,8H13V12H11V8Z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">Mahsulot miqdorlari yangilandi</p>
                    <p class="text-xs text-gray-500">Ombor ma'lumotlari yangilandi</p>
                  </div>
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                
                <div class="flex items-center gap-3 p-3 bg-white rounded-xl shadow-sm border border-green-100">
                  <div class="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg class="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-800">Chek printerga yuborildi</p>
                    <p class="text-xs text-gray-500">Print jarayoni tugallandi</p>
                  </div>
                  <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
              </div>
              
              <!-- Action button -->
              <button id="closeSuccess" class="w-full group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 text-white rounded-2xl font-bold hover:from-green-600 hover:via-emerald-600 hover:to-teal-700 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-2xl">
                <div class="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <svg class="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
                <span class="relative z-10">Ajoyib!</span>
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </button>
            </div>
          </div>
          
          <style>
            @keyframes checkmark {
              0% { transform: scale(0) rotate(0deg); }
              50% { transform: scale(1.2) rotate(180deg); }
              100% { transform: scale(1) rotate(360deg); }
            }
            @keyframes draw-check {
              0% { stroke-dasharray: 0 50; }
              100% { stroke-dasharray: 50 0; }
            }
            @keyframes success {
              0% { transform: scale(0.8) translateY(20px); opacity: 0; }
              100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            .animate-checkmark {
              animation: checkmark 0.6s ease-out;
            }
            .animate-draw-check {
              stroke-dasharray: 50;
              animation: draw-check 0.8s ease-out 0.3s both;
            }
            .animate-success {
              animation: success 0.4s ease-out;
            }
          </style>
        `;
        
        document.body.appendChild(successModal);
        
        successModal.querySelector('#closeSuccess')?.addEventListener('click', () => {
          document.body.removeChild(successModal);
        });
        
        // Savat va ma'lumotlarni tozalash
        setCart([]);
        setShowPayment(false);
        setSelectedCustomer(null);
        
        // Mahsulotlar ro'yxatini yangilash
        fetchProducts();
        
        showAlert('To\'lov muvaffaqiyatli yakunlandi!', 'Muvaffaqiyat', 'success');
      }
      
    } catch (err: any) {
      // 5️⃣ XATOLIK - ROLLBACK
      console.error('❌ Atomic transaction xatosi:', err);
      
      // Error modal ko'rsatish
      const errorModal = document.createElement('div');
      errorModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md';
      errorModal.innerHTML = `
        <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-error-shake">
          <!-- Error header with animated warning -->
          <div class="relative bg-gradient-to-br from-red-400 via-pink-500 to-rose-600 p-8 text-center overflow-hidden">
            <div class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
            <div class="relative z-10">
              <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-white/30 animate-warning-pulse">
                <svg class="w-12 h-12 text-white animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-white mb-2 drop-shadow-lg">Xatolik yuz berdi</h3>
              <p class="text-white/90 text-sm drop-shadow">Jarayon davomida muammo yuzaga keldi</p>
            </div>
            <!-- Warning particles -->
            <div class="absolute top-4 right-4 w-2 h-2 bg-yellow-300 rounded-full animate-ping"></div>
            <div class="absolute bottom-4 left-4 w-1 h-1 bg-white rounded-full animate-ping delay-300"></div>
          </div>
          
          <div class="p-6 bg-gradient-to-b from-red-50 to-white">
            <!-- Error details -->
            <div class="space-y-4 mb-6">
              <div class="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-red-100">
                <div class="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v4z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-800 mb-1">Xatolik tafsiloti:</p>
                  <p class="text-sm text-gray-600">${err.response?.data?.message || 'Transaction xatosi'}</p>
                </div>
              </div>
              
              <div class="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                </div>
                <div class="flex-1">
                  <p class="text-sm font-semibold text-gray-800">Barcha o'zgarishlar bekor qilindi</p>
                  <p class="text-xs text-gray-500">Ma'lumotlar xavfsizligi ta'minlandi</p>
                </div>
                <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                </svg>
              </div>
            </div>
            
            <!-- Action button -->
            <button id="closeError" class="w-full group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-red-500 via-pink-500 to-rose-600 text-white rounded-2xl font-bold hover:from-red-600 hover:via-pink-600 hover:to-rose-700 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-2xl">
              <div class="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <svg class="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <span class="relative z-10">Tushunarli</span>
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </button>
          </div>
        </div>
        
        <style>
          @keyframes warning-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          @keyframes error-shake {
            0% { transform: translateX(0) scale(0.95); opacity: 0; }
            25% { transform: translateX(-5px) scale(1); opacity: 1; }
            50% { transform: translateX(5px) scale(1); }
            75% { transform: translateX(-3px) scale(1); }
            100% { transform: translateX(0) scale(1); }
          }
          .animate-warning-pulse {
            animation: warning-pulse 1.5s infinite;
          }
          .animate-error-shake {
            animation: error-shake 0.5s ease-out;
          }
        </style>
      `;
      
      document.body.appendChild(errorModal);
      
      errorModal.querySelector('#closeError')?.addEventListener('click', () => {
        document.body.removeChild(errorModal);
      });
      
      showAlert('Transaction xatosi - barcha o\'zgarishlar bekor qilindi', 'Xatolik', 'danger');
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

  // Kassir cheki chiqarish - to'lovsiz
  const handleHelperReceipt = async () => {
    if (cart.length === 0) {
      showAlert("Savat bo'sh", 'Ogohlantirish', 'warning');
      return;
    }

    try {
      // Print preview modal ochish va foydalanuvchi tanlovini kutish
      const printConfirmed = await new Promise<boolean>((resolve) => {
        // Print modal yaratish
        const printModal = document.createElement('div');
        printModal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md';
        printModal.innerHTML = `
          <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden transform transition-all animate-pulse-once">
            <!-- Header with animated icon -->
            <div class="relative bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 p-8 text-center overflow-hidden">
              <div class="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
              <div class="relative z-10">
                <div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-white/30 animate-bounce-slow">
                  <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                  </svg>
                </div>
                <h3 class="text-2xl font-bold text-white mb-2 drop-shadow-lg">Kassir cheki chiqarish</h3>
                <p class="text-white/90 text-sm drop-shadow">Chekni printerga yuborish uchun "Print" tugmasini bosing</p>
              </div>
              <!-- Decorative elements -->
              <div class="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full animate-pulse"></div>
              <div class="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full animate-pulse delay-300"></div>
            </div>
            
            <div class="p-6 bg-gradient-to-b from-purple-50 to-white">
              <!-- Amount display with icons -->
              <div class="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl p-6 mb-6 border-2 border-purple-100 shadow-inner">
                <div class="text-center">
                  <div class="flex items-center justify-center gap-2 mb-2">
                    <svg class="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                    <span class="text-sm font-semibold text-gray-600 uppercase tracking-wider">Kassir cheki</span>
                  </div>
                  <p class="text-4xl font-bold text-gray-800 mb-3">${formatNumber(total)} <span class="text-lg text-gray-500">so'm</span></p>
                  <div class="flex items-center justify-center gap-4 text-sm text-gray-600">
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      <span>${cart.length} ta mahsulot</span>
                    </div>
                    <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div class="flex items-center gap-1">
                      <svg class="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2M21 9V7L15 1H5C3.89 1 3 1.89 3 3V19A2 2 0 0 0 5 21H11V19H5V3H13V9H21Z"/>
                      </svg>
                      <span>Kassir cheki</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Action buttons with enhanced design -->
              <div class="flex gap-4">
                <button id="cancelHelperPrint" class="flex-1 group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-2xl font-bold hover:from-gray-200 hover:to-gray-300 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-xl border border-gray-300">
                  <div class="absolute inset-0 bg-gradient-to-r from-red-500/0 to-red-500/0 group-hover:from-red-500/10 group-hover:to-red-500/5 transition-all duration-300"></div>
                  <svg class="w-5 h-5 text-red-500 relative z-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                  <span class="relative z-10">Cancel</span>
                </button>
                <button id="confirmHelperPrint" class="flex-1 group relative overflow-hidden py-4 px-6 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-600 text-white rounded-2xl font-bold hover:from-purple-600 hover:via-indigo-600 hover:to-blue-700 transition-all duration-300 flex items-center justify-center gap-3 hover:scale-105 shadow-lg hover:shadow-2xl">
                  <div class="absolute inset-0 bg-gradient-to-r from-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <svg class="w-5 h-5 relative z-10 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
                  </svg>
                  <span class="relative z-10">Print</span>
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </div>
              
              <!-- Footer info -->
              <div class="mt-4 text-center">
                <p class="text-xs text-gray-500 flex items-center justify-center gap-1">
                  <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Kassir cheki printerga yuboriladi
                </p>
              </div>
            </div>
          </div>
          
          <style>
            @keyframes bounce-slow {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
            }
            @keyframes pulse-once {
              0% { transform: scale(0.95); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            .animate-bounce-slow {
              animation: bounce-slow 2s infinite;
            }
            .animate-pulse-once {
              animation: pulse-once 0.3s ease-out;
            }
          </style>
        `;
        
        document.body.appendChild(printModal);
        
        // Event listenerlar
        const cancelBtn = printModal.querySelector('#cancelHelperPrint');
        const printBtn = printModal.querySelector('#confirmHelperPrint');
        
        cancelBtn?.addEventListener('click', () => {
          document.body.removeChild(printModal);
          resolve(false); // Cancel bosildi - hech narsa qilmaslik
        });
        
        printBtn?.addEventListener('click', async () => {
          document.body.removeChild(printModal);
          
          // Haqiqiy print jarayoni
          const printReceiptData: ReceiptData = {
            items: cart,
            total,
            paymentMethod: 'cash', // Default
            customer: selectedCustomer,
            receiptNumber: `HELPER-${Date.now()}`,
            cashier: 'Kassir',
            date: new Date()
          };
          
          try {
            const printSuccess = await printReceipt(printReceiptData);
            resolve(printSuccess); // Print natijasi
          } catch (printError) {
            console.error('Print xatosi:', printError);
            resolve(false); // Print muvaffaqiyatsiz
          }
        });
      });

      // Print natijasini tekshirish
      if (!printConfirmed) {
        // Cancel bosildi yoki print muvaffaqiyatsiz
        console.log('❌ Kassir cheki print bekor qilindi');
        return; // Hech narsa o'zgartirilmaydi
      }

      // Print muvaffaqiyatli - bazaga saqlash
      const receiptData = {
        items: cart.map(item => ({
          productId: item._id,
          name: item.name,
          code: item.code,
          price: item.price,
          quantity: item.cartQuantity
        }))
      };

      const response = await api.post('/receipts/helper-receipt', receiptData);
      
      if (response.data.success) {
        showAlert('Kassir cheki muvaffaqiyatli chiqarildi!', 'Muvaffaqiyat', 'success');
        setCart([]);
        setSelectedCustomer(null);
        // Mahsulotlar ro'yxatini yangilash
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Helper receipt error:', error);
      const errorMsg = error.response?.data?.message || 'Chek chiqarishda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {AlertComponent}
      
      {/* Left - Cart Table */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Cart Info */}
        <div className="p-2 sm:p-3 lg:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border-b border-surface-200 flex-shrink-0">
          <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
            <span className="text-xs sm:text-sm text-surface-600 font-medium">JAMI: {cart.length} ta mahsulot</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1 px-2 py-1 bg-surface-100 text-surface-700 rounded-lg hover:bg-surface-200 transition-colors disabled:opacity-50 text-xs w-fit"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Yangilanmoqda...' : 'Yangilash'}</span>
              <span className="xs:hidden">{isRefreshing ? '...' : '↻'}</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 bg-white overflow-hidden flex flex-col min-h-0">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 sm:px-4 py-3 bg-surface-50 border-b border-surface-200 text-xs font-semibold text-surface-500 uppercase flex-shrink-0">
            <div className="col-span-1">Kod</div>
            <div className="col-span-4">Mahsulot</div>
            <div className="col-span-2 text-center">Soni</div>
            <div className="col-span-2 text-right">Narx</div>
            <div className="col-span-2 text-right">Summa</div>
            <div className="col-span-1 text-center">Amallar</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-auto min-h-0">
            {cart.length === 0 ? (
              // Savat bo'sh bo'lganda kod takliflari yoki bo'sh holat
              showCodeSuggestions && codeSuggestions.length > 0 ? (
                <div className="p-2 sm:p-3 lg:p-4 h-full flex flex-col">
                  <div className="text-center mb-2 sm:mb-3 flex-shrink-0">
                    <p className="text-sm text-surface-500">
                      "{inputValue}" ni o'z ichiga olgan tovarlar
                      {codeSuggestions.length > 4 && (
                        <span className="block text-xs text-surface-400 mt-1">
                          Jami {codeSuggestions.length} ta tovar
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1 sm:space-y-2 min-h-0">
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
                <div className="flex items-center justify-center h-full text-surface-400 py-8 sm:py-12">
                  <div className="text-center">
                    <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">Savat bo'sh</p>
                    {inputValue.length > 0 && (
                      <p className="text-xs sm:text-sm mt-1 sm:mt-2">Kod kiriting yoki qidiring</p>
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
                          onClick={() => editCartItemQuantity(item)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              const newQuantity = val === '' ? 0 : parseInt(val);
                              
                              // Ombordagi miqdorni tekshirish
                              if (newQuantity > item.quantity) {
                                showAlert(`${item.name} uchun maksimal miqdor: ${item.quantity} ta`, 'Ogohlantirish', 'warning');
                                return; // O'zgartirishni bekor qilish
                              }
                              
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, cartQuantity: newQuantity } : p
                              ));
                            }
                          }}
                          onBlur={() => {
                            if (item.cartQuantity === 0 || !item.cartQuantity) {
                              removeFromCart(item._id);
                            }
                          }}
                          className={`w-16 h-9 text-center font-medium border rounded-xl focus:outline-none focus:ring-2 cursor-pointer ${
                            item.cartQuantity > item.quantity 
                              ? 'border-danger-500 bg-danger-50 text-danger-700 focus:border-danger-500 focus:ring-danger-500/20' 
                              : 'border-surface-200 focus:border-brand-500 focus:ring-brand-500/20 hover:bg-surface-50'
                          }`}
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
                            onClick={() => editCartItemQuantity(item)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || /^\d+$/.test(val)) {
                                const newQuantity = val === '' ? 0 : parseInt(val);
                                
                                // Ombordagi miqdorni tekshirish
                                if (newQuantity > item.quantity) {
                                  showAlert(`${item.name} uchun maksimal miqdor: ${item.quantity} ta`, 'Ogohlantirish', 'warning');
                                  return; // O'zgartirishni bekor qilish
                                }
                                
                                setCart(prev => prev.map(p => 
                                  p._id === item._id ? { ...p, cartQuantity: newQuantity } : p
                                ));
                              }
                            }}
                            onBlur={() => {
                              if (item.cartQuantity === 0 || !item.cartQuantity) {
                                removeFromCart(item._id);
                              }
                            }}
                            className={`w-16 h-8 text-center font-medium border rounded-lg focus:outline-none focus:ring-2 cursor-pointer ${
                              item.cartQuantity > item.quantity 
                                ? 'border-danger-500 bg-danger-50 text-danger-700 focus:border-danger-500 focus:ring-danger-500/20' 
                                : 'border-surface-200 focus:border-brand-500 focus:ring-brand-500/20 hover:bg-surface-50'
                            }`}
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

        {/* Kod takliflari - savat to'la bo'lganda alohida scroll */}
        {showCodeSuggestions && codeSuggestions.length > 0 && cart.length > 0 && (
          <div className="mt-4 bg-white border border-surface-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 border-b border-surface-100 bg-surface-50">
              <p className="text-sm text-surface-600 text-center">
                "{inputValue}" ni o'z ichiga olgan tovarlar ({codeSuggestions.length} ta)
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {codeSuggestions.map((product) => (
                <button
                  key={product._id}
                  onClick={() => selectSuggestedProduct(product)}
                  disabled={product.quantity === 0}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-surface-50 transition-colors text-left border-b border-surface-50 last:border-0 relative ${
                    product.quantity === 0 ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  {/* Tugagan tovar uchun overlay */}
                  {product.quantity === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-red-50 bg-opacity-80 rounded">
                      <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        TUGAGAN
                      </span>
                    </div>
                  )}
                  
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    product.quantity === 0 ? 'bg-red-100' : 'bg-brand-100'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      product.quantity === 0 ? 'text-red-600' : 'text-brand-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-base truncate ${
                      product.quantity === 0 ? 'text-red-700' : 'text-surface-900'
                    }`}>
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className={`font-mono px-2 py-1 rounded border ${
                        product.quantity === 0 
                          ? 'bg-red-100 border-red-300 text-red-700' 
                          : 'bg-white border-surface-200'
                      }`}>
                        {/* Kod ichida qidirilgan qismni highlight qilish */}
                        {inputValue && product.code.toLowerCase().includes(inputValue.toLowerCase()) ? (
                          <>
                            {product.code.split(new RegExp(`(${inputValue})`, 'gi')).map((part, partIndex) => 
                              part.toLowerCase() === inputValue.toLowerCase() ? (
                                <span key={partIndex} className="bg-yellow-200 text-yellow-800 font-bold">
                                  {part}
                                </span>
                              ) : (
                                <span key={partIndex}>{part}</span>
                              )
                            )}
                          </>
                        ) : (
                          product.code
                        )}
                      </span>
                      {product.quantity !== undefined && (
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          product.quantity > 10 ? 'bg-success-100 text-success-700' :
                          product.quantity > 0 ? 'bg-warning-100 text-warning-700' :
                          'bg-danger-100 text-danger-700'
                        }`}>
                          {product.quantity > 0 ? `${product.quantity} ta` : 'TUGAGAN'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-lg ${
                      product.quantity === 0 ? 'text-red-600' : 'text-brand-600'
                    }`}>
                      {formatNumber(product.price)}
                    </p>
                    <p className={`text-sm ${
                      product.quantity === 0 ? 'text-red-500' : 'text-surface-500'
                    }`}>
                      so'm
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="p-2 sm:p-3 lg:p-4 bg-white border-t border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={() => { 
              setShowSearch(true); 
              handleSearch(''); // Bo'sh qidiruv bilan boshlanadi
            }}
            className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-white border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors flex-1"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline sm:inline">Qidirish</span>
          </button>
          <button 
            onClick={saveReceipt}
            className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-white border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors flex-1"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline sm:inline">Saqlash</span>
          </button>
          {/* Chek chiqarish tugmasi - oldingi kabi */}
          {cart.length > 0 && (
            <button 
              onClick={handleHelperReceipt}
              className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex-1"
            >
              <Printer className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline sm:inline">Chek chiqarish</span>
            </button>
          )}
          </div>
        </div>
      </div>

      {/* Right - Numpad & Total */}
      <div className="w-full lg:w-72 xl:w-80 bg-white border-t lg:border-t-0 lg:border-l border-surface-200 p-2 sm:p-3 lg:p-4 flex flex-col flex-shrink-0">
        {/* Total */}
        <div className="text-center xl:text-right mb-3 sm:mb-4">
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-surface-900">
            {formatNumber(total)} so'm
          </p>
        </div>

        {/* Input maydoni ustidagi matn */}
        <div className="text-center mb-2 bg-surface-50 rounded-lg py-3 px-4 min-h-[60px] flex flex-col items-center justify-center">
          {inputMode === 'kod' ? (
            inputValue ? (
              <div className="text-lg font-mono text-surface-900">
                Kod: <span className="font-bold text-brand-600">{inputValue}</span>
              </div>
            ) : (
              <div className="text-sm text-surface-500">Mahsulot kodini kiriting</div>
            )
          ) : (
            <div className="text-center w-full">
              {selectedProductForQuantity && (
                <div className="mb-2">
                  <div className="text-sm font-medium text-surface-700">{selectedProductForQuantity.name}</div>
                  <div className="text-xs text-surface-500">Mavjud: {selectedProductForQuantity.quantity} ta</div>
                </div>
              )}
              
              {/* SONI sarlavhasi */}
              <div className="text-xs text-surface-500 mb-1 uppercase tracking-wider">SONI</div>
              
              {/* Raqam ko'rsatish */}
              {numberInput ? (
                <div className={`text-3xl font-bold rounded-lg py-2 px-4 border-2 inline-block min-w-[80px] ${
                  selectedProductForQuantity && parseInt(numberInput) > selectedProductForQuantity.quantity
                    ? 'bg-red-50 border-red-500 text-red-700 animate-pulse'
                    : 'bg-white border-gray-200 text-gray-800'
                }`}>
                  {numberInput}
                </div>
              ) : (
                <div className="text-lg text-surface-400 bg-white rounded-lg py-2 px-4 border-2 border-dashed border-gray-300 inline-block min-w-[80px]">
                  {selectedProductForQuantity ? '0' : '—'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="relative mb-3 sm:mb-4">
          {/* KOD/SON tugmalari */}
          <div className="flex mb-2 sm:mb-3 bg-surface-100 rounded-lg p-1">
            <button
              onClick={() => {
                setInputMode('kod');
                setNumberInput('');
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                inputMode === 'kod' 
                  ? 'bg-blue-500 text-white shadow-sm' 
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              KOD
            </button>
            <button
              onClick={() => {
                setInputMode('son');
                setInputValue('');
                setShowCodeSuggestions(false);
                setCodeSuggestions([]);
              }}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-semibold transition-all ${
                inputMode === 'son' 
                  ? 'bg-gray-500 text-white shadow-sm' 
                  : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              SON
            </button>
          </div>

          {/* Input maydoni */}
          {inputMode === 'kod' ? (
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
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-center text-sm sm:text-base font-mono bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          ) : (
            <input
              type="text"
              value={numberInput}
              onChange={e => {
                const value = e.target.value;
                // Faqat butun sonlar
                if (/^\d*$/.test(value)) {
                  setNumberInput(value);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (selectedProductForQuantity && numberInput.trim()) {
                    const quantity = parseInt(numberInput);
                    if (!isNaN(quantity) && quantity > 0) {
                      // Miqdorni tekshirish
                      if (quantity > selectedProductForQuantity.quantity) {
                        showAlert(`${selectedProductForQuantity.name} uchun maksimal miqdor: ${selectedProductForQuantity.quantity} ta`, 'Ogohlantirish', 'warning');
                        return;
                      }
                      
                      // Mahsulotni savatchaga qo'shish
                      addToCartWithQuantity(selectedProductForQuantity, quantity);
                      
                      // Holatni tozalash va KOD rejimiga qaytish
                      setSelectedProductForQuantity(null);
                      setNumberInput('');
                      setInputMode('kod');
                      showAlert(`${selectedProductForQuantity.name} (${quantity} ta) savatchaga qo'shildi`, 'Muvaffaqiyat', 'success');
                    }
                  }
                }
              }}
              placeholder="1"
              disabled={!selectedProductForQuantity}
              className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-center text-lg sm:text-xl font-bold rounded-lg focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedProductForQuantity && numberInput && parseInt(numberInput) > selectedProductForQuantity.quantity
                  ? 'bg-red-50 border-2 border-red-500 text-red-700 focus:border-red-500 focus:ring-red-500/20'
                  : 'bg-surface-50 border border-surface-200 focus:border-gray-500 focus:ring-gray-500/20'
              }`}
            />
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 mb-3">
          {['7', '8', '9', 'C', '4', '5', '6', '⌫', '1', '2', '3', '+', '0', '00', '.'].map((key) => (
            <button
              key={key}
              onClick={() => handleNumpadClick(key)}
              className={`
                flex items-center justify-center rounded-lg text-base sm:text-lg font-semibold transition-all active:scale-95
                ${key === 'C' ? 'bg-red-500 text-white hover:bg-red-600' : ''}
                ${key === '⌫' ? 'bg-orange-500 text-white hover:bg-orange-600' : ''}
                ${key === '+' ? `${inputMode === 'kod' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'} text-white row-span-2` : ''}
                ${!['C', '⌫', '+'].includes(key) ? 'bg-surface-100 text-surface-700 hover:bg-surface-200' : ''}
                ${key === '+' ? 'h-full' : 'h-10 sm:h-12 lg:h-14'}
              `}
            >
              {key === '⌫' ? <Delete className="w-4 h-4 sm:w-5 sm:h-5" /> : 
               key === '+' ? (inputMode === 'kod' ? '+' : '✓') : key}
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
              <div className="flex items-center justify-center gap-1 mt-2 text-xs">
                <Printer className={`w-3 h-3 ${printerStatus.available ? 'text-green-600' : 'text-red-600'}`} />
                <span className={printerStatus.available ? 'text-green-600' : 'text-red-600'}>
                  {printerStatus.available 
                    ? `Printer tayyor (${printerStatus.printers.length} ta)` 
                    : 'Printer topilmadi'
                  }
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => handlePayment('cash')} 
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-success-500 hover:bg-success-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Banknote className="w-5 h-5" />
                Naqd pul
                <span className="text-xs opacity-75">(Print bilan)</span>
              </button>
              <button 
                onClick={() => handlePayment('card')} 
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Plastik karta
                <span className="text-xs opacity-75">(Print bilan)</span>
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
  );
}
