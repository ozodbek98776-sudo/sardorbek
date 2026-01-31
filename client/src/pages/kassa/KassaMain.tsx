import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Search, Save, CreditCard, Trash2, 
  Package, Banknote, Delete, RefreshCw, Printer,
  DollarSign, Smartphone, Upload, QrCode
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { printReceipt, ReceiptData, checkPrinterStatus } from '../../utils/receipt';
import PartnerPaymentModal from '../../components/PartnerPaymentModal';
import * as QRCodeLib from 'qrcode';
import { FRONTEND_URL } from '../../config/api';

// Payment Breakdown Form komponenti
interface PaymentBreakdownFormProps {
  item: CartItem;
  selectedCustomer?: Customer | null;
  onSave: (cash: number, click: number, card: number) => void;
  onCancel: () => void;
}

const PaymentBreakdownForm = ({ item, selectedCustomer, onSave, onCancel }: PaymentBreakdownFormProps) => {
  const [cash, setCash] = useState(item.paymentBreakdown?.cash || 0);
  const [click, setClick] = useState(item.paymentBreakdown?.click || 0);
  const [card, setCard] = useState(item.paymentBreakdown?.card || 0);
  
  const itemTotal = item.price * item.cartQuantity;
  const breakdownTotal = cash + click + card;
  const remaining = itemTotal - breakdownTotal;
  
  const handleSave = () => {
    // Faqat ortiq pul kiritilganda xatolik berish, kam pul kiritsa ham saqlash
    if (remaining < -1) {
      return; // Faqat ortiq pul kiritilganda to'xtatish
    }
    onSave(cash, click, card);
  };
  
  // Ortiq pul kiritishni cheklash funksiyasi
  const handleAmountChange = (value: string, type: 'cash' | 'click' | 'card') => {
    const cleaned = parseNumber(value);
    const newAmount = cleaned === '' ? 0 : parseFloat(cleaned) || 0;
    
    // Hozirgi boshqa to'lov turlarining summasi
    const otherAmounts = type === 'cash' ? click + card : 
                        type === 'click' ? cash + card : 
                        cash + click;
    
    // Maksimal kiritish mumkin bo'lgan summa
    const maxAllowed = itemTotal - otherAmounts;
    
    // Agar yangi summa maksimaldan oshsa, maksimal qiymatni o'rnatish
    const finalAmount = newAmount > maxAllowed ? maxAllowed : newAmount;
    
    if (type === 'cash') setCash(finalAmount);
    else if (type === 'click') setClick(finalAmount);
    else setCard(finalAmount);
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Naqd pul
          </label>
          <input
            type="text"
            value={formatInputNumber(cash.toString())}
            onChange={(e) => handleAmountChange(e.target.value, 'cash')}
            className="w-full px-4 py-3 text-lg font-semibold border-2 border-success-200 rounded-xl focus:outline-none focus:border-success-500 focus:ring-4 focus:ring-success-500/10 bg-success-50"
            placeholder="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Click
          </label>
          <input
            type="text"
            value={formatInputNumber(click.toString())}
            onChange={(e) => handleAmountChange(e.target.value, 'click')}
            className="w-full px-4 py-3 text-lg font-semibold border-2 border-purple-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 bg-purple-50"
            placeholder="0"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-surface-700 mb-2">
            Plastik karta
          </label>
          <input
            type="text"
            value={formatInputNumber(card.toString())}
            onChange={(e) => handleAmountChange(e.target.value, 'card')}
            className="w-full px-4 py-3 text-lg font-semibold border-2 border-brand-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 bg-brand-50"
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="bg-surface-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Jami to'lov:</span>
          <span className="font-semibold text-surface-900">{formatNumber(breakdownTotal)} so'm</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-surface-600">Tovar summasi:</span>
          <span className="font-semibold text-surface-900">{formatNumber(breakdownTotal)} so'm</span>
        </div>
        <div className={`flex justify-between text-sm font-semibold pt-2 border-t border-surface-200 ${
          remaining <= 1 && remaining >= -1 ? 'text-success-600' : 
          remaining > 1 ? 'text-warning-600' : 'text-danger-600'
        }`}>
          <span>Qoldiq:</span>
          <span>{formatNumber(itemTotal - breakdownTotal)} so'm</span>
        </div>
        
        {remaining < -1 && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-2 mt-2">
            <p className="text-xs text-warning-700">
              ⚠️ Ortiq pul kiritib bo'lmaydi. Maksimal: {formatNumber(itemTotal)} so'm
            </p>
          </div>
        )}
        
        {remaining > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-2">
            <p className="text-xs text-blue-700">
              ℹ️ {formatNumber(remaining)} so'm qoldiq {selectedCustomer ? 'qarz daftariga qo\'shiladi va botga yuboriladi' : 'qarz bo\'ladi (mijoz tanlanmagan)'}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-surface-600 hover:text-surface-900 transition-colors rounded-xl border border-surface-200 hover:bg-surface-50"
        >
          Bekor qilish
        </button>
        <button
          onClick={handleSave}
          disabled={remaining < -1} // Faqat ortiq pul kiritilganda disable qilish
          className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
            remaining < -1
              ? 'bg-surface-300 text-surface-500 cursor-not-allowed'
              : 'bg-brand-500 hover:bg-brand-600 text-white'
          }`}
        >
          Saqlash
        </button>
      </div>
    </div>
  );
};

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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [savedReceipts, setSavedReceipts] = useState<SavedReceipt[]>([]);
  // Yangi state - real-time qidiruv uchun
  const [codeSuggestions, setCodeSuggestions] = useState<Product[]>([]);
  const [showCodeSuggestions, setShowCodeSuggestions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<{available: boolean; printers: string[]; xPrinterFound?: boolean}>({
    available: false,
    printers: [],
    xPrinterFound: false
  });
  // KOD/SON panel uchun yangi state
  const [inputMode, setInputMode] = useState<'kod' | 'son'>('kod');
  const [numberInput, setNumberInput] = useState('');
  const [selectedProductForQuantity, setSelectedProductForQuantity] = useState<Product | null>(null);
  // To'lov turlari uchun state
  const [showPaymentBreakdown, setShowPaymentBreakdown] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<CartItem | null>(null);
  const [showPartnerPayment, setShowPartnerPayment] = useState(false);
  const [selectedItemForPartner, setSelectedItemForPartner] = useState<CartItem | null>(null);
  
  // Pricing tier edit uchun state
  const [showPricingEdit, setShowPricingEdit] = useState(false);
  const [selectedItemForPricing, setSelectedItemForPricing] = useState<CartItem | null>(null);
  const [customMarkupPercent, setCustomMarkupPercent] = useState<number>(15);
  
  // Mahsulot qadini o'zgartirish uchun state
  const [showQuantityEdit, setShowQuantityEdit] = useState(false);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<Product | null>(null);
  const [newQuantity, setNewQuantity] = useState<string>('');
  
  // QR-code modal uchun state
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // To'lov modal uchun yangi state
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentAmounts, setPaymentAmounts] = useState<{cash: number; click: number; card: number}>({
    cash: 0,
    click: 0,
    card: 0
  });

  // Miqdorga qarab narx hisoblash funksiyasi
  const calculateDynamicPrice = (product: Product, quantity: number): number => {
    const basePrice = product.price; // Base price (cost price)
    let markupPercent = 15; // Default 15%
    
    // Pricing tier aniqlash
    if (quantity >= 100) {
      markupPercent = 11; // 100+ dona uchun 11%
    } else if (quantity >= 10) {
      markupPercent = 13; // 10-99 dona uchun 13%
    } else {
      markupPercent = 15; // 1-9 dona uchun 15%
    }
    
    // Narxni hisoblash
    const finalPrice = basePrice * (1 + markupPercent / 100);
    return Math.round(finalPrice); // Yaxlitlash
  };

  // Pricing tier ma'lumotini olish
  const getPricingTier = (quantity: number, customMarkup?: number) => {
    if (customMarkup !== undefined) {
      return { name: 'Maxsus', markupPercent: customMarkup, discount: customMarkup < 15, custom: true };
    }
    
    if (quantity >= 100) {
      return { name: '100+ dona', markupPercent: 11, discount: true, custom: false };
    } else if (quantity >= 10) {
      return { name: '10-99 dona', markupPercent: 13, discount: true, custom: false };
    } else {
      return { name: '1-9 dona', markupPercent: 15, discount: false, custom: false };
    }
  };

  // Pricing edit funksiyalari
  const handleItemPricingEdit = (item: CartItem) => {
    setSelectedItemForPricing(item);
    const currentTier = getPricingTier(item.cartQuantity, item.customMarkup);
    setCustomMarkupPercent(currentTier.markupPercent);
    setShowPricingEdit(true);
  };

  const saveCustomPricing = () => {
    if (!selectedItemForPricing) return;
    
    const basePrice = selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15; // Approximate base price
    const newPrice = Math.round(basePrice * (1 + customMarkupPercent / 100));
    
    setCart(prev => prev.map(p => 
      p._id === selectedItemForPricing._id 
        ? { ...p, price: newPrice, customMarkup: customMarkupPercent }
        : p
    ));
    
    setShowPricingEdit(false);
    setSelectedItemForPricing(null);
    showAlert(`Narx yangilandi: ${customMarkupPercent}% qo'shimcha`, 'Muvaffaqiyat', 'success');
  };

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

  // Mijoz qidirish
  const searchCustomers = (query: string) => {
    setCustomerSearchQuery(query);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone.includes(customerSearchQuery)
  );

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
        // Dynamic pricing bilan narxni yangilash
        const dynamicPrice = calculateDynamicPrice(product, newQuantity);
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: newQuantity, price: dynamicPrice} : p);
      }
      // Yangi mahsulot uchun dynamic pricing
      const dynamicPrice = calculateDynamicPrice(product, quantity);
      return [...prev, {...product, cartQuantity: quantity, price: dynamicPrice}];
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
        // Dynamic pricing bilan narxni yangilash
        const dynamicPrice = calculateDynamicPrice(product, newQuantity);
        return prev.map(p => p._id === product._id ? {...p, cartQuantity: newQuantity, price: dynamicPrice} : p);
      }
      // Yangi mahsulot uchun dynamic pricing (1 dona)
      const dynamicPrice = calculateDynamicPrice(product, 1);
      return [...prev, {...product, cartQuantity: 1, price: dynamicPrice}];
    });
    setShowSearch(false);
    setSearchQuery('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item._id !== id));
  };

  // Mahsulot qadini o'zgartirish funksiyasi
  const handleQuantityEdit = (product: Product) => {
    setSelectedProductForEdit(product);
    setNewQuantity(product.quantity.toString());
    setShowQuantityEdit(true);
  };

  // QR-code modal ochish funksiyasi
  const openQRModal = async (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
    
    try {
      const productUrl = `${FRONTEND_URL}/product/${product._id}`;
      const dataUrl = await QRCodeLib.toDataURL(productUrl, {
        width: 300,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
      showAlert('QR kod yaratishda xatolik', 'Xatolik', 'danger');
    }
  };

  // QR-code chop etish funksiyasi
  const printQRCode = () => {
    if (!selectedProductForQR || !qrDataUrl) return;

    const printWindow = window.open('', '_blank', 'width=600,height=400');
    if (!printWindow) {
      showAlert('Popup bloklangan. Iltimos, popup ga ruxsat bering.', 'Ogohlantirish', 'warning');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Label - ${selectedProductForQR.name}</title>
        <style>
          @page {
            size: 60mm 40mm;
            margin: 0;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label {
            width: 60mm;
            height: 40mm;
            padding: 2mm;
            background: white;
            display: flex;
            flex-direction: column;
          }
          .top-section {
            display: flex;
            gap: 2mm;
            flex: 1;
          }
          .qr-box {
            width: 22mm;
            height: 22mm;
            flex-shrink: 0;
          }
          .qr-code {
            width: 22mm;
            height: 22mm;
            display: block;
            image-rendering: pixelated;
          }
          .info-box {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .product-code {
            font-size: 7pt;
            font-weight: 600;
            color: #666;
            margin-bottom: 1mm;
          }
          .product-name {
            font-size: 9pt;
            font-weight: 700;
            color: #000;
            line-height: 1.2;
            text-transform: uppercase;
            word-break: break-word;
          }
          .bottom-section {
            margin-top: 1.5mm;
          }
          .price-box {
            padding: 1.5mm;
            text-align: center;
            background: #f0f0f0;
            border-radius: 1mm;
          }
          .price-value {
            font-size: 14pt;
            font-weight: 900;
            color: #000;
            letter-spacing: -0.5px;
          }
          .price-currency {
            font-size: 10pt;
            font-weight: 700;
            color: #000;
            margin-left: 1mm;
          }
          @media print {
            body { background: white; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="top-section">
            <div class="qr-box">
              <img src="${qrDataUrl}" alt="QR" class="qr-code" />
            </div>
            <div class="info-box">
              <div class="product-code">Kod: ${selectedProductForQR.code}</div>
              <div class="product-name">${selectedProductForQR.name}</div>
            </div>
          </div>
          <div class="bottom-section">
            <div class="price-box">
              <span class="price-value">${formatNumber(selectedProductForQR.price)}</span>
              <span class="price-currency">so'm</span>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }, 200);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleQuantityUpdate = async () => {
    if (!selectedProductForEdit) return;
    
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 0) {
      showAlert('Noto\'g\'ri miqdor kiritildi', 'Xatolik', 'danger');
      return;
    }

    try {
      // Serverga yangilash so'rovi
      await api.put(`/products/${selectedProductForEdit._id}`, {
        quantity: qty
      });

      // Local state ni yangilash
      setProducts(prev => prev.map(p => 
        p._id === selectedProductForEdit._id ? { ...p, quantity: qty } : p
      ));

      // Agar mahsulot savatchada bo'lsa, uni ham yangilash kerak
      setCart(prev => prev.map(item => {
        if (item._id === selectedProductForEdit._id && item.cartQuantity > qty) {
          // Agar savatchadagi miqdor yangi qaddan ko'p bo'lsa, kamaytiramiz
          return { ...item, cartQuantity: qty };
        }
        return item;
      }));

      showAlert('Mahsulot qadi yangilandi', 'Muvaffaqiyat', 'success');
      setShowQuantityEdit(false);
      setSelectedProductForEdit(null);
      setNewQuantity('');
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      showAlert(err.response?.data?.message || 'Qadni yangilashda xatolik', 'Xatolik', 'danger');
    }
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

  // Har bir tovar uchun to'lov turlarini tanlash
  const handleItemPaymentBreakdown = (item: CartItem) => {
    setSelectedItemForPayment(item);
    setShowPaymentBreakdown(true);
  };

  const handlePartnerPaymentClick = (item: CartItem) => {
    setSelectedItemForPartner(item);
    setShowPartnerPayment(true);
  };

  // To'lov turlarini saqlash
  const saveItemPaymentBreakdown = async (cash: number, click: number, card: number) => {
    if (!selectedItemForPayment) return;
    
    const itemTotal = selectedItemForPayment.price * selectedItemForPayment.cartQuantity;
    const breakdownTotal = cash + click + card;
    
    // Faqat ortiq pul kiritilganda xatolik berish, kam pul kiritsa ham saqlash
    if (breakdownTotal > itemTotal + 1) { // 1 so'm farqga ruxsat berish
      showAlert(`Ortiq pul kiritib bo'lmaydi. Maksimal: ${formatNumber(itemTotal)} so'm, Kiritilgan: ${formatNumber(breakdownTotal)} so'm`, 'Xatolik', 'danger');
      return;
    }
    
    // Agar qoldiq bo'lsa va mijoz tanlangan bo'lsa, qarz yaratish
    const remainingAmount = itemTotal - breakdownTotal;
    if (remainingAmount > 1 && selectedCustomer) {
      try {
        console.log(`Tovar uchun qoldiq qarz yaratilmoqda: ${remainingAmount} so'm`);
        
        // Qarz yaratish
        const debtData = {
          customer: selectedCustomer._id,
          amount: remainingAmount,
          paidAmount: 0,
          description: `${selectedItemForPayment.name} uchun qoldiq to'lov - ${new Date().toLocaleDateString('uz-UZ')}`,
          items: [{
            product: selectedItemForPayment._id,
            name: selectedItemForPayment.name,
            code: selectedItemForPayment.code,
            price: selectedItemForPayment.price,
            quantity: selectedItemForPayment.cartQuantity
          }]
        };

        await api.post('/debts/kassa', debtData);
        console.log('✅ Tovar uchun qoldiq qarz muvaffaqiyatli qo\'shildi va botga yuborildi');
        showAlert(`${formatNumber(remainingAmount)} so'm qarz qo'shildi va botga yuborildi`, 'Ma\'lumot', 'info');
        
      } catch (debtError: any) {
        console.error('❌ Qarz yaratishda xatolik:', debtError);
        showAlert('Qarz yaratishda xatolik yuz berdi', 'Ogohlantirish', 'warning');
      }
    }
    
    setCart(prev => prev.map(p => 
      p._id === selectedItemForPayment._id 
        ? { 
            ...p, 
            paymentBreakdown: { 
              cash, 
              click, 
              card,
              partner: p.paymentBreakdown?.partner || 0 
            } 
          }
        : p
    ));
    
    setShowPaymentBreakdown(false);
    setSelectedItemForPayment(null);
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
          
          {/* Mijoz tanlash qismi */}
          <div className="flex items-center gap-2">
            {selectedCustomer ? (
              <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-lg px-3 py-2">
                <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-brand-700">{selectedCustomer.name}</span>
                  <span className="text-xs text-brand-600">{selectedCustomer.phone}</span>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="ml-2 w-5 h-5 flex items-center justify-center rounded-full text-brand-500 hover:bg-brand-200 transition-colors"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                <span>Mijoz tanlash</span>
              </button>
            )}
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
                        
                        {/* Mahsulot rasmi yoki icon */}
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={`${(import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:8000'}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`}
                            alt={product.name}
                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover ${
                              product.quantity === 0 ? 'opacity-50 grayscale' : ''
                            }`}
                            onError={(e) => {
                              // Rasm yuklanmasa, icon ko'rsatish
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${product.images && product.images.length > 0 ? 'hidden' : ''} w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
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
              <div className="space-y-3 p-4">
                {cart.map((item) => (
                  <div key={item._id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-surface-100 overflow-hidden">
                    {/* Desktop Layout - Professional */}
                    <div className="hidden md:grid grid-cols-12 gap-3 p-4 items-center">
                      {/* Code */}
                      <div className="col-span-1">
                        <div className="px-2 py-1 bg-surface-50 rounded-lg">
                          <span className="text-xs font-mono font-semibold text-surface-700">{item.code}</span>
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div className="col-span-4">
                        <span className="text-sm font-semibold text-surface-900">{item.name}</span>
                      </div>
                      
                      {/* Quantity */}
                      <div className="col-span-2 flex items-center justify-center">
                        <input
                          type="text"
                          value={item.cartQuantity}
                          onClick={() => editCartItemQuantity(item)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d+$/.test(val)) {
                              const newQuantity = val === '' ? 0 : parseInt(val);
                              
                              if (newQuantity > item.quantity) {
                                showAlert(`${item.name} uchun maksimal miqdor: ${item.quantity} ta`, 'Ogohlantirish', 'warning');
                                return;
                              }
                              
                              const dynamicPrice = calculateDynamicPrice(item, newQuantity);
                              
                              setCart(prev => prev.map(p => 
                                p._id === item._id ? { ...p, cartQuantity: newQuantity, price: dynamicPrice } : p
                              ));
                            }
                          }}
                          onBlur={() => {
                            if (item.cartQuantity === 0 || !item.cartQuantity) {
                              removeFromCart(item._id);
                            }
                          }}
                          className={`w-20 h-10 text-center font-bold text-lg border-2 rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                            item.cartQuantity > item.quantity 
                              ? 'border-danger-500 bg-danger-50 text-danger-700 focus:border-danger-500 focus:ring-danger-500/20' 
                              : 'border-brand-200 bg-brand-50/50 text-brand-700 focus:border-brand-500 focus:ring-brand-500/20 hover:bg-brand-50'
                          }`}
                        />
                      </div>
                      
                      {/* Price */}
                      <div className="col-span-2 text-right">
                        <div className="space-y-1">
                          <span className="text-base font-bold text-surface-900">{formatNumber(item.price)}</span>
                          {(() => {
                            const tier = getPricingTier(item.cartQuantity, item.customMarkup);
                            return (
                              <div 
                                onClick={() => handleItemPricingEdit(item)}
                                className={`text-xs px-2.5 py-1 rounded-full inline-block cursor-pointer hover:scale-105 transition-all font-medium shadow-sm ${
                                  tier.custom ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white' :
                                  tier.discount ? 'bg-gradient-to-r from-success-500 to-success-600 text-white' : 
                                  'bg-gradient-to-r from-surface-100 to-surface-200 text-surface-700'
                                }`}
                                title="Foizni o'zgartirish uchun bosing"
                              >
                                {tier.name} ({tier.markupPercent}%)
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="col-span-2 text-right">
                        <div className="bg-gradient-to-r from-brand-500 to-brand-600 text-white px-3 py-2 rounded-xl inline-block shadow-lg">
                          <span className="text-base font-black">
                            {formatNumber(item.price * item.cartQuantity)}
                          </span>
                        </div>
                        {item.paymentBreakdown && (
                          <div className="mt-2 space-y-1">
                            {item.paymentBreakdown.cash > 0 && (
                              <div className="flex items-center justify-end gap-1.5 text-xs">
                                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                  <DollarSign className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="font-medium text-green-700">{formatNumber(item.paymentBreakdown.cash)}</span>
                              </div>
                            )}
                            {item.paymentBreakdown.click > 0 && (
                              <div className="flex items-center justify-end gap-1.5 text-xs">
                                <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Smartphone className="w-3 h-3 text-purple-600" />
                                </div>
                                <span className="font-medium text-purple-700">{formatNumber(item.paymentBreakdown.click)}</span>
                              </div>
                            )}
                            {item.paymentBreakdown.card > 0 && (
                              <div className="flex items-center justify-end gap-1.5 text-xs">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                  <CreditCard className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="font-medium text-blue-700">{formatNumber(item.paymentBreakdown.card)}</span>
                              </div>
                            )}
                            {item.paymentBreakdown.partner && item.paymentBreakdown.partner > 0 && (
                              <div className="flex items-center justify-end gap-1.5 text-xs">
                                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Smartphone className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="font-medium text-blue-700">{formatNumber(item.paymentBreakdown.partner)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {!item.paymentBreakdown && (
                          <button
                            onClick={() => handleItemPaymentBreakdown(item)}
                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <CreditCard className="w-3 h-3" />
                            To'lov
                          </button>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="col-span-1 flex justify-center gap-1.5">
                        <button
                          onClick={() => handlePartnerPaymentClick(item)}
                          className="w-9 h-9 flex items-center justify-center rounded-xl text-purple-600 bg-purple-50 hover:bg-purple-100 transition-all shadow-sm hover:shadow-md"
                          title="Hamkor orqali to'lash"
                        >
                          <Smartphone className="w-4 h-4" />
                        </button>
                        {item.paymentBreakdown && (
                          <button
                            onClick={() => handleItemPaymentBreakdown(item)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 transition-colors"
                            title="To'lov turini o'zgartirish"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-danger-500 hover:bg-danger-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Layout - Professional Design */}
                    <div className="md:hidden p-4 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                      {/* Header with Product Name and Delete Button */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-1.5 text-base">{item.name}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-md">
                              Kod: {item.code}
                            </span>
                            {/* Stock indicator */}
                            <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                              item.quantity > 10 
                                ? 'bg-green-100 text-green-700' 
                                : item.quantity > 0 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {item.quantity} ta
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item._id)}
                          className="ml-3 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 transition-all shadow-sm hover:shadow-md"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </div>
                      
                      {/* Quantity and Price Section */}
                      <div className="space-y-3">
                        {/* Quantity Input */}
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm">
                          <span className="text-sm font-medium text-gray-700">Soni:</span>
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
                                
                                // Dynamic pricing bilan narxni yangilash
                                const dynamicPrice = calculateDynamicPrice(item, newQuantity);
                                
                                setCart(prev => prev.map(p => 
                                  p._id === item._id ? { ...p, cartQuantity: newQuantity, price: dynamicPrice } : p
                                ));
                              }
                            }}
                            onBlur={() => {
                              if (item.cartQuantity === 0 || !item.cartQuantity) {
                                removeFromCart(item._id);
                              }
                            }}
                            className={`w-20 h-10 text-center font-semibold border-2 rounded-xl focus:outline-none focus:ring-2 cursor-pointer transition-all ${
                              item.cartQuantity > item.quantity 
                                ? 'border-red-400 bg-red-50 text-red-700 focus:border-red-500 focus:ring-red-500/20' 
                                : 'border-blue-300 bg-blue-50 text-blue-700 focus:border-blue-500 focus:ring-blue-500/20 hover:bg-blue-100'
                            }`}
                          />
                        </div>
                        
                        {/* Price Information */}
                        <div className="bg-white p-3 rounded-xl shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Narxi:</span>
                            <span className="text-sm font-semibold text-gray-900">{formatNumber(item.price)} so'm</span>
                          </div>
                          
                          {/* Pricing tier badge with gradient */}
                          {(() => {
                            const tier = getPricingTier(item.cartQuantity, item.customMarkup);
                            return (
                              <div 
                                onClick={() => handleItemPricingEdit(item)}
                                className={`text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:shadow-md font-medium ${
                                  tier.custom 
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                                    : tier.discount 
                                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                      : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                }`}
                                title="Foizni o'zgartirish uchun bosing"
                              >
                                <span>{tier.name}</span>
                                <span className="font-bold">({tier.markupPercent}%)</span>
                              </div>
                            );
                          })()}
                          
                          {/* Total Price with gradient background */}
                          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-md">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">Jami:</span>
                              <span className="text-lg font-bold text-white">
                                {formatNumber(item.price * item.cartQuantity)} so'm
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Payment Breakdown Display */}
                        {item.paymentBreakdown && (
                          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl shadow-sm space-y-2">
                            <div className="text-xs font-semibold text-gray-700 mb-2">To'lov turlari:</div>
                            {item.paymentBreakdown.cash > 0 && (
                              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-md">
                                    <DollarSign className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Naqd</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{formatNumber(item.paymentBreakdown.cash)} so'm</span>
                              </div>
                            )}
                            {item.paymentBreakdown.click > 0 && (
                              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md">
                                    <Smartphone className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Click</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{formatNumber(item.paymentBreakdown.click)} so'm</span>
                              </div>
                            )}
                            {item.paymentBreakdown.card > 0 && (
                              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md">
                                    <CreditCard className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Karta</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{formatNumber(item.paymentBreakdown.card)} so'm</span>
                              </div>
                            )}
                            {item.paymentBreakdown.partner && item.paymentBreakdown.partner > 0 && (
                              <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-md">
                                    <Smartphone className="w-4 h-4 text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-gray-700">Hamkor</span>
                                </div>
                                <span className="text-sm font-semibold text-gray-900">{formatNumber(item.paymentBreakdown.partner)} so'm</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePartnerPaymentClick(item)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <Smartphone className="w-4 h-4" />
                            Hamkor
                          </button>
                          {!item.paymentBreakdown && (
                            <button
                              onClick={() => handleItemPaymentBreakdown(item)}
                              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium"
                            >
                              <CreditCard className="w-4 h-4" />
                              To'lov
                            </button>
                          )}
                          {item.paymentBreakdown && (
                            <button
                              onClick={() => handleItemPaymentBreakdown(item)}
                              className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
                              title="To'lov turini o'zgartirish"
                            >
                              <CreditCard className="w-5 h-5" />
                            </button>
                          )}
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
                  
                  {/* Mahsulot rasmi yoki icon */}
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={`${(import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:8000'}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`}
                      alt={product.name}
                      className={`w-12 h-12 rounded-xl object-cover flex-shrink-0 ${
                        product.quantity === 0 ? 'opacity-50 grayscale' : ''
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`${product.images && product.images.length > 0 ? 'hidden' : ''} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                      {/* Qad o'zgartirish tugmasi - faqat admin uchun */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityEdit(product);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700 hover:bg-brand-200 transition-colors"
                        title="Qadni o'zgartirish"
                      >
                        ✏️
                      </button>
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
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button 
            onClick={() => { 
              setShowSearch(true); 
              handleSearch(''); // Bo'sh qidiruv bilan boshlanadi
            }}
            className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-white border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors flex-1 min-w-[100px]"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline sm:inline">Qidirish</span>
          </button>
          <button 
            onClick={saveReceipt}
            className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-white border border-surface-200 rounded-lg text-surface-700 hover:bg-surface-50 transition-colors flex-1 min-w-[100px]"
          >
            <Save className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline sm:inline">Saqlash</span>
          </button>

          {/* To'lov tugmasi */}
          {cart.length > 0 && (
            <button 
              onClick={() => {
                // To'lov summalarini hisoblash - paymentBreakdown bo'lmagan tovarlar uchun 0 deb hisoblash
                const totalCash = cart.reduce((sum, item) => sum + (item.paymentBreakdown?.cash || 0), 0);
                const totalClick = cart.reduce((sum, item) => sum + (item.paymentBreakdown?.click || 0), 0);
                const totalCard = cart.reduce((sum, item) => sum + (item.paymentBreakdown?.card || 0), 0);
                const totalPartner = cart.reduce((sum, item) => sum + (item.paymentBreakdown?.partner || 0), 0);
                const totalPaid = totalCash + totalClick + totalCard + totalPartner;
                
                // To'lov miqdorlarini state ga saqlash
                setPaymentAmounts({cash: totalCash, click: totalClick, card: totalCard});
                setPaidAmount(totalPaid);
                setShowPayment(true);
              }}
              className="flex items-center justify-center gap-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-success-500 text-white rounded-lg hover:bg-success-600 transition-colors flex-1 min-w-[100px] font-semibold"
            >
              <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden xs:inline sm:inline">To'lov</span>
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
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 sm:pt-20 px-4">
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
            <div className="max-h-[500px] sm:max-h-[600px] overflow-auto p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {searchResults.map(product => (
                  <button
                    key={product._id}
                    onClick={() => addToCart(product)}
                    className="flex flex-col bg-white border border-surface-200 rounded-xl hover:shadow-lg hover:border-brand-300 transition-all p-3 text-left group relative"
                  >
                    {/* QR Code tugmasi */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openQRModal(product);
                      }}
                      className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm hover:bg-brand-500 hover:text-white rounded-lg shadow-md transition-all duration-200 group/qr"
                      title="QR kod"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>

                    {/* Mahsulot rasmi */}
                    <div className="relative w-full aspect-square mb-3 rounded-lg overflow-hidden bg-surface-50">
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={`${(import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:8000'}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${product.images && product.images.length > 0 ? 'hidden' : ''} absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100`}>
                        <Package className="w-12 h-12 text-brand-400" />
                      </div>
                      
                      {/* Stock badge */}
                      {product.quantity !== undefined && (
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-bold shadow-lg ${
                          product.quantity > 10 ? 'bg-success-500 text-white' :
                          product.quantity > 0 ? 'bg-warning-500 text-white' :
                          'bg-danger-500 text-white'
                        }`}>
                          {product.quantity > 0 ? `${product.quantity}` : 'Tugagan'}
                        </div>
                      )}
                    </div>
                    
                    {/* Mahsulot ma'lumotlari */}
                    <div className="flex-1 flex flex-col">
                      <p className="font-semibold text-surface-900 text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
                        {product.name}
                      </p>
                      <p className="text-xs text-surface-500 mb-2 font-mono">
                        #{product.code}
                      </p>
                      <div className="mt-auto">
                        <p className="text-lg font-bold text-brand-600">
                          {formatNumber(product.price)}
                        </p>
                        <p className="text-xs text-surface-400">so'm</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {searchQuery && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-surface-400" />
                  </div>
                  <p className="text-center text-surface-500 font-medium">Tovar topilmadi</p>
                  <p className="text-center text-surface-400 text-sm mt-1">Boshqa nom yoki kod bilan qidiring</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-4 sm:pt-20 px-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCustomerModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative z-10 overflow-hidden max-h-[90vh] sm:max-h-none">
            <div className="p-4 border-b border-surface-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-surface-900">Mijoz tanlash</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                <input
                  type="text"
                  placeholder="Mijoz ismi yoki telefon raqami..."
                  value={customerSearchQuery}
                  onChange={e => searchCustomers(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-surface-50 border border-surface-200 rounded-xl focus:outline-none focus:border-brand-500"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-80 sm:max-h-96 overflow-auto">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map(customer => (
                  <button
                    key={customer._id}
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowCustomerModal(false);
                      setCustomerSearchQuery('');
                    }}
                    className="w-full flex items-center gap-3 p-4 hover:bg-surface-50 transition-colors text-left border-b border-surface-50 last:border-0"
                  >
                    <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-brand-600">{customer.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-surface-900 truncate">{customer.name}</p>
                      <div className="flex items-center gap-2 text-sm text-surface-500">
                        <span>{customer.phone}</span>
                        {customer.debt > 0 && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                            {formatNumber(customer.debt)} so'm qarz
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-surface-600">
                        {formatNumber(customer.totalPurchases)} so'm
                      </p>
                      <p className="text-xs text-surface-400">jami xarid</p>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-surface-500">
                    {customerSearchQuery ? 'Mijoz topilmadi' : 'Mijozlar ro\'yxati bo\'sh'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowPayment(false)} />
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative z-10">
            <div className="text-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 mb-2">To'lov turlarini tanlang</h3>
              {selectedCustomer && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-brand-100 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-semibold text-brand-600">{selectedCustomer.name.charAt(0)}</span>
                  </div>
                  <span className="text-sm text-surface-600 truncate">{selectedCustomer.name}</span>
                </div>
              )}
              
              <div className="bg-surface-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-surface-600 mb-1">Jami summa:</p>
                <p className="text-2xl sm:text-3xl font-bold text-surface-900 mb-3">
                  {formatNumber(total)} so'm
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-surface-600">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span>Naqd pul:</span>
                    </div>
                    <span className="font-semibold">{formatNumber(paymentAmounts.cash)} so'm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-surface-600">
                      <Smartphone className="w-4 h-4 text-purple-600" />
                      <span>Click:</span>
                    </div>
                    <span className="font-semibold">{formatNumber(paymentAmounts.click)} so'm</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-surface-600">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                      <span>Plastik karta:</span>
                    </div>
                    <span className="font-semibold">{formatNumber(paymentAmounts.card)} so'm</span>
                  </div>
                  <div className="border-t border-surface-200 pt-2 flex justify-between">
                    <span className="text-surface-600">Jami to'lov:</span>
                    <span className="font-bold text-lg">{formatNumber(paidAmount)} so'm</span>
                  </div>
                  
                  {paidAmount < total && (
                    <div className="flex justify-between text-warning-600">
                      <span>Qoldiq:</span>
                      <span className="font-bold">{formatNumber(total - paidAmount)} so'm</span>
                    </div>
                  )}
                  
                  {paidAmount > total && (
                    <div className="flex justify-between text-success-600">
                      <span>Qaytim:</span>
                      <span className="font-bold">{formatNumber(paidAmount - total)} so'm</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Qoldiq summa uchun ma'lumot */}
              {paidAmount < total && (
                <div className={`border rounded-lg p-3 mb-4 ${
                  selectedCustomer 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-warning-50 border-warning-200'
                }`}>
                  <p className={`text-sm ${
                    selectedCustomer ? 'text-blue-700' : 'text-warning-700'
                  }`}>
                    {selectedCustomer ? (
                      <>ℹ️ {formatNumber(total - paidAmount)} so'm qarz daftariga qo'shiladi</>
                    ) : (
                      <>⚠️ {formatNumber(total - paidAmount)} so'm qoldiq - mijoz tanlanmagan</>
                    )}
                  </p>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-1 text-xs">
                <Printer className={`w-3 h-3 ${printerStatus.xPrinterFound ? 'text-green-600' : printerStatus.available ? 'text-yellow-600' : 'text-red-600'}`} />
                <span className={printerStatus.xPrinterFound ? 'text-green-600' : printerStatus.available ? 'text-yellow-600' : 'text-red-600'}>
                  {printerStatus.xPrinterFound 
                    ? 'X Printer tayyor' 
                    : printerStatus.available 
                    ? `Printer mavjud (${printerStatus.printers.length} ta)` 
                    : 'Printer topilmadi'
                  }
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Chek chiqarish tugmasi - to'lovsiz */}
              <button 
                onClick={async () => {
                  if (cart.length === 0) {
                    showAlert("Savat bo'sh", 'Ogohlantirish', 'warning');
                    return;
                  }

                  try {
                    // 1. Tovar miqdorlarini kamaytirish
                    console.log('Chek chiqarish uchun tovar miqdorlarini kamaytirish boshlandi...');
                    const updateResults: Array<{success: boolean; item: string; error?: string}> = [];
                    
                    for (const item of cart) {
                      try {
                        console.log(`${item.name} uchun miqdorni kamaytirish: ${item.cartQuantity} ta`);
                        await api.put(`/products/${item._id}/reduce-quantity`, {
                          quantity: item.cartQuantity
                        });
                        console.log(`✅ ${item.name} muvaffaqiyatli yangilandi`);
                        updateResults.push({ success: true, item: item.name });
                      } catch (quantityError: any) {
                        console.error(`❌ ${item.name} miqdorini kamaytirish xatosi:`, quantityError);
                        const errorMsg = quantityError.response?.data?.message || 'Noma\'lum xatolik';
                        updateResults.push({ success: false, item: item.name, error: errorMsg });
                      }
                    }
                    
                    console.log('Tovar miqdorlarini yangilash tugadi. Natijalar:', updateResults);

                    // 2. Chek ma'lumotlarini tayyorlash
                    const receiptNumber = `HELPER-${Date.now()}`;
                    const printReceiptData: ReceiptData = {
                      items: cart,
                      total,
                      paymentMethod: 'cash',
                      customer: selectedCustomer,
                      receiptNumber,
                      cashier: 'Kassir',
                      date: new Date()
                    };

                    // 3. Telegram botga xabar yuborish
                    try {
                      console.log('Telegram botga chek ma\'lumotlarini yuborish...');
                      
                      const receiptData = {
                        items: cart.map(item => ({
                          product: item._id,
                          name: item.name,
                          code: item.code,
                          price: item.price,
                          quantity: item.cartQuantity,
                          paymentBreakdown: item.paymentBreakdown || { cash: 0, click: 0, card: 0 }
                        })),
                        total,
                        paymentMethod: 'cash',
                        customer: selectedCustomer?._id || null,
                        receiptNumber,
                        paidAmount: paidAmount,
                        remainingAmount: total - paidAmount
                      };

                      // Kassa endpoint ga yuborish (telegram xabar ham yuboriladi)
                      const response = await api.post('/receipts/kassa', receiptData);
                      console.log('✅ Chek ma\'lumotlari serverga yuborildi:', response.data);
                      
                    } catch (telegramError: any) {
                      console.error('❌ Telegram xabar yuborishda xatolik:', telegramError);
                      // Telegram xatoligi chek chiqarishni to'xtatmasin
                    }
                    
                    // 4. Print qilish
                    const printSuccess = await printReceipt(printReceiptData, () => {
                      // Print tugagandan keyin
                      const successCount = updateResults.filter(r => r.success).length;
                      const failCount = updateResults.filter(r => !r.success).length;
                      
                      let message = 'Chek muvaffaqiyatli chiqarildi va telegram botga yuborildi';
                      
                      if (failCount === 0) {
                        showAlert(message + ', tovar miqdorlari yangilandi!', 'Muvaffaqiyat', 'success');
                      } else {
                        showAlert(`${message}. ${successCount} ta tovar yangilandi, ${failCount} ta xatolik`, 'Ogohlantirish', 'warning');
                      }
                      
                      setCart([]);
                      setSelectedCustomer(null);
                      setShowPayment(false);
                      fetchProducts(); // Yangilangan miqdorlarni ko'rsatish uchun
                    });
                    
                    if (!printSuccess) {
                      // Print ishlamasa ham tovar miqdorlari yangilangan va telegram xabar yuborilgan
                      const successCount = updateResults.filter(r => r.success).length;
                      const failCount = updateResults.filter(r => !r.success).length;
                      
                      let message = 'Chek faylga yuklandi va telegram botga yuborildi';
                      
                      if (failCount === 0) {
                        showAlert(message + ', tovar miqdorlari yangilandi!', 'Ma\'lumot', 'info');
                      } else {
                        showAlert(`${message}. ${successCount} ta tovar yangilandi, ${failCount} ta xatolik`, 'Ogohlantirish', 'warning');
                      }
                      
                      setCart([]);
                      setSelectedCustomer(null);
                      setShowPayment(false);
                      fetchProducts(); // Yangilangan miqdorlarni ko'rsatish uchun
                    }
                    
                  } catch (error: any) {
                    console.error('Chek chiqarish xatosi:', error);
                    showAlert('Chek chiqarishda xatolik yuz berdi', 'Xatolik', 'danger');
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors"
              >
                <Printer className="w-5 h-5" />
                Chek chiqarish (to'lovsiz)
              </button>
              
              {paidAmount < total && !selectedCustomer && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                  <p className="text-xs text-warning-700 text-center">
                    💡 Qoldiq summa uchun mijoz tanlashingiz mumkin yoki oddiy mijoz sifatida saqlashingiz mumkin
                  </p>
                </div>
              )}
              
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

      {/* Payment Breakdown Modal - Har bir tovar uchun to'lov turlarini tanlash */}
      {showPaymentBreakdown && selectedItemForPayment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => {
            setShowPaymentBreakdown(false);
            setSelectedItemForPayment(null);
          }} />
          <div className="bg-white rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative z-10">
            <div className="mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 mb-2">To'lov turlarini tanlang</h3>
              <div className="bg-surface-50 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-surface-700 mb-1">{selectedItemForPayment.name}</p>
                <p className="text-xs text-surface-500 font-mono mb-2">Kod: {selectedItemForPayment.code}</p>
                <p className="text-lg font-bold text-surface-900">
                  Jami: {formatNumber(selectedItemForPayment.price * selectedItemForPayment.cartQuantity)} so'm
                </p>
              </div>
            </div>
            
            <PaymentBreakdownForm
              item={selectedItemForPayment}
              selectedCustomer={selectedCustomer}
              onSave={saveItemPaymentBreakdown}
              onCancel={() => {
                setShowPaymentBreakdown(false);
                setSelectedItemForPayment(null);
              }}
            />
          </div>
        </div>
      )}

      {showPartnerPayment && selectedItemForPartner && (
        <PartnerPaymentModal
          isOpen={showPartnerPayment}
          onClose={() => {
            setShowPartnerPayment(false);
            setSelectedItemForPartner(null);
          }}
          item={selectedItemForPartner}
          customer={selectedCustomer}
          onSave={(_, amount) => {
            setCart(prev =>
              prev.map(p => {
                if (p._id !== selectedItemForPartner._id) return p;
                const current = p.paymentBreakdown || { cash: 0, click: 0, card: 0, partner: 0 };
                return {
                  ...p,
                  paymentBreakdown: {
                    ...current,
                    partner: (current.partner || 0) + amount
                  }
                };
              })
            );
          }}
        />
      )}

      {/* Pricing Edit Modal - Foizni o'zgartirish */}
      {showPricingEdit && selectedItemForPricing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => {
            setShowPricingEdit(false);
            setSelectedItemForPricing(null);
          }} />
          <div className="bg-white rounded-xl w-full max-w-sm p-4 shadow-2xl relative z-10">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-surface-900 mb-2">Foizni o'zgartirish</h3>
              <div className="bg-surface-50 rounded-lg p-2.5 mb-3">
                <p className="text-xs font-medium text-surface-700 mb-1">{selectedItemForPricing.name}</p>
                <p className="text-[10px] text-surface-500 font-mono mb-1.5">Kod: {selectedItemForPricing.code}</p>
                <p className="text-xs text-surface-600">
                  Miqdor: {selectedItemForPricing.cartQuantity} ta
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">
                  Qo'shimcha foiz (%)
                </label>
                <input
                  type="number"
                  value={customMarkupPercent}
                  onChange={(e) => setCustomMarkupPercent(Number(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg text-center text-base font-semibold focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  placeholder="15"
                />
              </div>
              
              {/* Tezkor foiz tugmalari */}
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 20].map(percent => (
                  <button
                    key={percent}
                    onClick={() => setCustomMarkupPercent(percent)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-colors ${
                      customMarkupPercent === percent
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                    }`}
                  >
                    {percent}%
                  </button>
                ))}
              </div>
              
              {/* Narx ko'rsatish */}
              {selectedItemForPricing && (
                <div className="bg-brand-50 rounded-lg p-2.5">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-surface-600">Yangi narx (1 ta):</span>
                    <span className="font-semibold text-brand-600">
                      {formatNumber(Math.round((selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15) * (1 + customMarkupPercent / 100)))} so'm
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-surface-600">Jami summa:</span>
                    <span className="font-bold text-brand-700">
                      {formatNumber(Math.round((selectedItemForPricing.costPrice || selectedItemForPricing.price / 1.15) * (1 + customMarkupPercent / 100)) * selectedItemForPricing.cartQuantity)} so'm
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowPricingEdit(false);
                  setSelectedItemForPricing(null);
                }}
                className="flex-1 py-2 px-3 bg-surface-100 text-surface-700 rounded-lg font-medium hover:bg-surface-200 transition-colors text-sm"
              >
                Bekor qilish
              </button>
              <button
                onClick={saveCustomPricing}
                className="flex-1 py-2 px-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors text-sm"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedProductForQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowQRModal(false)} />
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl relative z-10 overflow-hidden">
            <div className="p-4 border-b border-surface-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-surface-900">QR Kod</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl border-2 border-surface-200 mb-4">
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl} 
                    alt="QR Code"
                    className="w-48 h-48"
                    style={{ imageRendering: 'pixelated' }}
                  />
                ) : (
                  <div className="w-48 h-48 bg-surface-100 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="text-center mb-4 w-full">
                <p className="font-bold text-surface-900 text-lg mb-1">{selectedProductForQR.name}</p>
                <p className="text-sm text-surface-500 mb-2">Kod: {selectedProductForQR.code}</p>
                <p className="text-2xl font-bold text-brand-600">
                  {formatNumber(selectedProductForQR.price)} <span className="text-sm">so'm</span>
                </p>
              </div>
              
              {/* Print Button */}
              <button
                onClick={printQRCode}
                disabled={!qrDataUrl}
                className="w-full px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Chop etish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Edit Modal - Mahsulot qadini o'zgartirish */}
      {showQuantityEdit && selectedProductForEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => {
            setShowQuantityEdit(false);
            setSelectedProductForEdit(null);
            setNewQuantity('');
          }} />
          <div className="bg-white rounded-xl w-full max-w-sm p-4 shadow-2xl relative z-10">
            <h3 className="text-base font-bold text-surface-900 mb-3">
              Mahsulot qadini o'zgartirish
            </h3>
            
            <div className="space-y-3">
              {/* Mahsulot ma'lumotlari */}
              <div className="bg-surface-50 rounded-lg p-3">
                <p className="text-xs text-surface-600 mb-1">Mahsulot:</p>
                <p className="font-semibold text-sm text-surface-900">{selectedProductForEdit.name}</p>
                <p className="text-[10px] text-surface-500 mt-1">Kod: {selectedProductForEdit.code}</p>
              </div>

              {/* Hozirgi qad */}
              <div className="bg-blue-50 rounded-lg p-2">
                <p className="text-xs text-blue-600 mb-1">Hozirgi qad:</p>
                <p className="text-xl font-bold text-blue-700">{selectedProductForEdit.quantity} ta</p>
              </div>

              {/* Yangi qad kiritish */}
              <div>
                <label className="block text-xs font-medium text-surface-700 mb-1.5">
                  Yangi qad:
                </label>
                <input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  className="w-full px-3 py-2 text-base font-semibold border-2 border-brand-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                  placeholder="Yangi qadni kiriting"
                  min="0"
                  autoFocus
                />
              </div>

              {/* Ogohlantirish */}
              <div className="bg-warning-50 border border-warning-200 rounded-lg p-2">
                <p className="text-[10px] text-warning-700">
                  ⚠️ Diqqat: Mahsulot qadi o'zgartirilganda, agar savatchada bu mahsulot bo'lsa va yangi qad savatchadagi miqdordan kam bo'lsa, savatchadagi miqdor ham kamaytiriladi.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowQuantityEdit(false);
                  setSelectedProductForEdit(null);
                  setNewQuantity('');
                }}
                className="flex-1 py-2 px-3 bg-surface-100 text-surface-700 rounded-lg font-medium hover:bg-surface-200 transition-colors text-sm"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleQuantityUpdate}
                className="flex-1 py-2 px-3 bg-brand-500 text-white rounded-lg font-medium hover:bg-brand-600 transition-colors text-sm"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
