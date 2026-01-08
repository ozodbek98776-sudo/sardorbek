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
  const [, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
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

    try {
      // 1. Chekni saqlash
      await api.post('/receipts/kassa', saleData);
      
      // 2. Mahsulot miqdorini yangilash - har bir mahsulot uchun
      console.log('To\'lov uchun mahsulot miqdorlarini yangilash boshlandi...');
      const updateResults: Array<{success: boolean; item: string; data?: any; error?: string}> = [];
      
      for (const item of cart) {
        try {
          console.log(`${item.name} uchun miqdorni kamaytirish: ${item.cartQuantity} ta`);
          const response = await api.put(`/products/${item._id}/reduce-quantity`, {
            quantity: item.cartQuantity
          });
          console.log(`✅ ${item.name} muvaffaqiyatli yangilandi:`, response.data);
          updateResults.push({ success: true, item: item.name, data: response.data });
        } catch (quantityError: any) {
          console.error(`❌ ${item.name} mahsuloti miqdorini kamaytirish xatosi:`, quantityError);
          console.error('Xatolik tafsilotlari:', quantityError.response?.data);
          
          // Xatolik haqida foydalanuvchiga xabar berish
          const errorMsg = quantityError.response?.data?.message || 'Noma\'lum xatolik';
          showAlert(`${item.name}: ${errorMsg}`, 'Ogohlantirish', 'warning');
          
          updateResults.push({ success: false, item: item.name, error: errorMsg });
        }
      }
      
      console.log('To\'lov uchun mahsulot miqdorlarini yangilash tugadi. Natijalar:', updateResults);
      
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
      
      // Chekni chiqarish - print tugagandan keyin callback bilan
      const printSuccess = await printReceipt(receiptData, () => {
        // Print tugagandan keyin success xabari
        const successCount = updateResults.filter(r => r.success).length;
        const failCount = updateResults.filter(r => !r.success).length;
        
        if (failCount === 0) {
          showAlert('To\'lov qabul qilindi, chek muvaffaqiyatli chiqarildi va mahsulot miqdorlari yangilandi!', 'Muvaffaqiyat', 'success');
        } else {
          showAlert(`To\'lov qabul qilindi, chek chiqarildi. ${successCount} ta mahsulot yangilandi, ${failCount} ta xatolik`, 'Ogohlantirish', 'warning');
        }
        
        // Savat va boshqa ma'lumotlarni tozalash
        setCart([]);
        setShowPayment(false);
        setSelectedCustomer(null);
        // Mahsulotlar ro'yxatini yangilash - miqdorlar o'zgargan
        fetchProducts();
      });
      
      if (!printSuccess) {
        showAlert('To\'lov qabul qilindi, savdo saqlandi, chek faylga yuklandi', 'Ogohlantirish', 'warning');
        // Print ishlamasa ham savat tozalanadi
        setCart([]);
        setShowPayment(false);
        setSelectedCustomer(null);
        // Mahsulotlar ro'yxatini yangilash - miqdorlar o'zgargan
        fetchProducts();
      }
      
      // Telegram xabar yuborish (agar mijoz tanlangan bo'lsa)
      if (selectedCustomer) {
        const message = `🛒 Yangi xarid:\n👤 Mijoz: ${selectedCustomer.name}\n💰 Summa: ${formatNumber(total)} so'm\n📦 Mahsulotlar: ${cart.length} ta\n⏰ Vaqt: ${new Date().toLocaleString()}`;
        // Bu yerda telegram bot API orqali xabar yuboriladi
        console.log('Telegram message:', message);
      }
      
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

  // Kassir cheki chiqarish - to'lovsiz
  const handleHelperReceipt = async () => {
    if (cart.length === 0) {
      showAlert("Savat bo'sh", 'Ogohlantirish', 'warning');
      return;
    }

    try {
      // 1. Kassir chekini bazaga saqlash
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
        // 2. Chekni print qilish
        const printReceiptData: ReceiptData = {
          items: cart,
          total,
          paymentMethod: 'cash', // Default
          customer: selectedCustomer,
          receiptNumber: `HELPER-${Date.now()}`,
          cashier: 'Kassir',
          date: new Date()
        };
        
        const printSuccess = await printReceipt(printReceiptData, () => {
          showAlert('Chek muvaffaqiyatli chiqarildi!', 'Muvaffaqiyat', 'success');
          setCart([]);
          setSelectedCustomer(null);
          // Mahsulotlar ro'yxatini yangilash - miqdorlar o'zgargan
          fetchProducts();
        });
        
        if (!printSuccess) {
          showAlert('Chek bazaga saqlandi, faylga yuklandi', 'Ogohlantirish', 'warning');
          setCart([]);
          setSelectedCustomer(null);
          // Mahsulotlar ro'yxatini yangilash - miqdorlar o'zgargan
          fetchProducts();
        }
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
                <Printer className="w-4 h-4 ml-1 opacity-75" />
              </button>
              <button 
                onClick={() => handlePayment('card')} 
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
              >
                <CreditCard className="w-5 h-5" />
                Plastik karta
                <Printer className="w-4 h-4 ml-1 opacity-75" />
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
