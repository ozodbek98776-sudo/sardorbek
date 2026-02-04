import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Upload, Printer, Ruler, Box, Scale, RotateCcw, BarChart3, Clock, Calendar, TrendingUp, ShoppingCart, CheckSquare, Save, Copy, Search, Filter, Check } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import QRCodeGenerator, { exportQRCodeToPNG } from '../../components/QRCodeGenerator';
import * as QRCode from 'qrcode';
import { FRONTEND_URL, UPLOADS_URL } from '../../config/api';
import QRPrintLabel from '../../components/QRPrintLabel';
import BatchQRPrint from '../../components/BatchQRPrint';
import logger from '../../utils/logger';
import { useSocket } from '../../hooks/useSocket';
import { useCategories } from '../../hooks/useCategories';
import { PRODUCT_CATEGORIES } from '../../constants/categories';

// Statistika interfeysi
interface ProductStats {
  product: { _id: string; name: string; code: string; price: number; quantity: number };
  stats: {
    totalSold: number;
    totalRevenue: number;
    totalReceipts: number;
    averagePerSale: number;
    bestDay: { date: string; count: number } | null;
    bestHour: { hour: number; label: string; count: number } | null;
  };
  periodStats: { date: string; count: number; revenue: number }[];
  monthlyStats: { month: string; label: string; count: number; revenue: number }[];
  hourlyStats: { hour: number; label: string; count: number; revenue: number }[];
  recentSales: { date: string; quantity: number; price: number; total: number; customer: any; receiptId: string }[];
}

export default function Products() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const socket = useSocket(); // ⚡ Socket.IO hook
  const { categories } = useCategories(); // ⚡ Dynamic categories
  const [products, setProducts] = useState<Product[]>([]); // Barcha mahsulotlar
  const [currentPage, setCurrentPage] = useState(1); // Joriy sahifa
  const [totalPages, setTotalPages] = useState(1); // Jami sahifalar
  const [totalProducts, setTotalProducts] = useState(0); // Jami mahsulotlar soni
  const [loadingMore, setLoadingMore] = useState(false); // Yana yuklanmoqda
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // Stepper uchun: 1, 2, 3
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBatchQRModal, setShowBatchQRModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<string>('7'); // 7, 30, 90, 365, all
  
  // Mahsulot ma'lumotlarini ko'rish uchun yangi state
  const [showProductDetailsModal, setShowProductDetailsModal] = useState(false);
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [detailsStep, setDetailsStep] = useState(1); // 1: Asosiy, 2: O'lchamlar, 3: Narxlar
  
  // Kategoriya tanlash modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedProductForCategory, setSelectedProductForCategory] = useState<Product | null>(null);
  
  // Umumiy statistika - faqat bir marta yuklanadi
  const [overallStats, setOverallStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dollarRate, setDollarRate] = useState(12500);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Floating search button uchun
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [floatingSearchQuery, setFloatingSearchQuery] = useState('');

  // ⚡ Memoized QR value - faqat selectedProduct o'zgarganda yangilanadi
  const qrValue = useMemo(() => {
    const value = selectedProduct ? `${FRONTEND_URL}/product/${selectedProduct._id}` : '';
    console.log('QR Value:', value, 'FRONTEND_URL:', FRONTEND_URL, 'Product ID:', selectedProduct?._id);
    return value;
  }, [selectedProduct?._id]);

  // ⚡ Debounce qidiruv - 150ms kutish (tezroq)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal ochilganda body scroll ni to'xtatish
  useEffect(() => {
    if (showModal || showQRModal || showBatchQRModal || showStatsModal || showImageModal || showProductDetailsModal || showCategoryModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup - component unmount bo'lganda
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showQRModal, showBatchQRModal, showStatsModal, showImageModal, showProductDetailsModal, showCategoryModal]);

  // Scroll listener - floating search button ko'rsatish
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      // 200px dan ko'proq scroll qilganda ko'rsatish
      setShowFloatingSearch(scrollTop > 200);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', quantity: '',
    previousPrice: '', 
    currentPrice: '', // Dona narxi
    costPrice: '', // Tan narxi so'mda
    costPriceInDollar: '', // Tan narxi dollarda
    unitPrice: '', // Dona narxi
    boxPrice: '', // Karobka narxi
    category: 'Boshqa', // Kategoriya
    // Foizli chegirmalar
    pricingTiers: {
      tier1: { minQuantity: '1', maxQuantity: '5', discountPercent: '15' },
      tier2: { minQuantity: '6', maxQuantity: '20', discountPercent: '13' },
      tier3: { minQuantity: '21', maxQuantity: '100', discountPercent: '11' }
    },
    unit: 'dona' as 'dona' | 'metr' | 'rulon' | 'karobka' | 'gram' | 'kg' | 'litr',
    // O'lchamlar (sm/mm)
    dimensions: { width: '', height: '', length: '' },
    // Rulon uchun
    metersPerRoll: '', // 1 rulonda necha metr
    // Karobka uchun
    unitsPerBox: '', // 1 karobkada necha dona
    // Metr narxlari (diapazon bo'yicha)
    meterPriceRanges: [{ from: '', to: '', price: '' }] as { from: string; to: string; price: string }[],
    // Narxlar
    pricePerRoll: '',
    pricePerBox: '',
    pricePerKg: '',
    pricePerGram: ''
  });
  const [packageData, setPackageData] = useState({
    packageCount: '', unitsPerPackage: '', totalCost: ''
  });
  const [images, setImages] = useState<string[]>([]);
  const [newlyUploadedImages, setNewlyUploadedImages] = useState<string[]>([]); // Yangi yuklangan rasmlar
  const [codeError, setCodeError] = useState('');
  const [showPackageInput, setShowPackageInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrContainerRef = useRef<HTMLDivElement>(null);

  const downloadQR = async () => {
    if (!selectedProduct) return;
    
    const success = await exportQRCodeToPNG(
      qrContainerRef.current,
      `QR-${selectedProduct.code}-${selectedProduct.name}.png`
    );
    
    if (success) {
      showAlert('QR kod yuklandi', 'Muvaffaqiyat', 'success');
    } else {
      showAlert('QR kodni yuklashda xatolik', 'Xatolik', 'danger');
    }
  };

  const checkCodeExists = async (code: string) => {
    if (!code) return;
    try {
      const excludeId = editingProduct?._id || '';
      const res = await api.get(`/products/check-code/${code}${excludeId ? `?excludeId=${excludeId}` : ''}`);
      if (res.data.exists) {
        setCodeError(`Kod "${code}" allaqachon mavjud`);
      } else {
        setCodeError('');
      }
    } catch (err) {
      logger.error('Error checking code:', err);
      showAlert('Kod tekshirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const printXprinterLabel = async (product: Product) => {
    if (!qrContainerRef.current) {
      showAlert('QR kod topilmadi', 'Xatolik', 'danger');
      return;
    }

    const svg = qrContainerRef.current.querySelector('svg');
    if (!svg) {
      showAlert('QR kod topilmadi', 'Xatolik', 'danger');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas yaratib bo\'lmadi');
      }

      const svgSize = svg.getBoundingClientRect();
      canvas.width = svgSize.width || 150;
      canvas.height = svgSize.height || 150;

      // Oq fon
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        
        const dataUrl = canvas.toDataURL('image/png', 1.0);
        const printWindow = window.open('', '_blank', 'width=400,height=600');
        
        if (!printWindow) {
          showAlert('Chop etish oynasi ochilmadi', 'Xatolik', 'danger');
          return;
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>QR - ${product.name}</title>
              <meta charset="UTF-8">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  height: 100vh;
                  background: white;
                }
                img { 
                  width: 260px; 
                  height: 260px;
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: crisp-edges;
                }
                @media print {
                  body { margin: 0; }
                  img { width: 100%; height: auto; }
                }
              </style>
            </head>
            <body>
              <img src="${dataUrl}" alt="QR Code - ${product.name}" />
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        
        // Print dialog ochish
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        showAlert('QR kodni chop etishda xatolik', 'Xatolik', 'danger');
      };

      img.src = url;
    } catch (error) {
      console.error('QR chop etishda xatolik:', error);
      showAlert('QR kodni chop etishda xatolik', 'Xatolik', 'danger');
    }
  };

  // ⚡ Filtered products - useMemo bilan optimize qilish
  // ⚡ Filtered products - useMemo bilan optimize qilish
  const filteredProducts = useMemo(() => {
    // Agar qidiruv bo'lmasa va filter 'all' bo'lsa, barcha mahsulotlarni qaytarish
    if (!debouncedSearch && stockFilter === 'all' && !categoryFilter) {
      return products;
    }

    // Qidiruv so'zini bir marta lowercase qilish (optimizatsiya)
    const searchLower = debouncedSearch.toLowerCase().trim();
    
    // Qidiruv so'zlarini bo'laklarga ajratish (masalan: "samsung a50" -> ["samsung", "a50"])
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 0);

    return products.filter(p => {
      if (!debouncedSearch) return true;
      
      const nameLower = p.name.toLowerCase();
      const codeLower = p.code.toLowerCase();
      
      // Agar bitta so'z bo'lsa - oddiy qidiruv (tezroq)
      if (searchWords.length === 1) {
        return nameLower.includes(searchLower) || codeLower.includes(searchLower);
      }
      
      // Agar bir nechta so'z bo'lsa - barcha so'zlar nom yoki kodda bo'lishi kerak
      const matchesSearch = searchWords.every(word => 
        nameLower.includes(word) || codeLower.includes(word)
      );
      
      if (!matchesSearch) return false;
      
      // Stock filter
      const matchesStock = stockFilter === 'all' || 
                          (stockFilter === 'low' && p.quantity <= (p.minStock || 50) && p.quantity > 0) ||
                          (stockFilter === 'out' && p.quantity === 0);
      
      // Category filter
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      
      return matchesStock && matchesCategory;
    });
  }, [products, debouncedSearch, stockFilter, categoryFilter]);

  // ⚡ Mahsulotlarni yuklash - useCallback bilan
  const fetchProducts = useCallback(async (page = 1) => {
    const startTime = performance.now();
    
    // Safari detection
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isSafari) {
      console.log('🍎 Safari browser aniqlandi - maxsus optimizatsiyalar faol');
    }
    
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // ⚡ Pagination - 20 tadan yuklash
      const timestamp = Date.now();
      const response = await api.get(`/products?page=${page}&limit=20&t=${timestamp}`);
      
      const productsData = response.data.data || [];
      const pagination = response.data.pagination || {};
      
      console.log(`📦 Sahifa ${page}: ${productsData.length} ta mahsulot keldi`);
      
      // Yumshoq validatsiya - faqat _id va name majburiy
      const validProducts = productsData.filter((p: Product) => {
        if (!p || !p._id) {
          console.warn('⚠️ Mahsulot ID yo\'q:', p);
          return false;
        }
        if (!p.name || p.name.trim() === '') {
          console.warn('⚠️ Mahsulot nomi yo\'q:', p._id);
          return false;
        }
        return true;
      });
      
      const invalidCount = productsData.length - validProducts.length;
      if (invalidCount > 0) {
        console.warn(`⚠️ Sahifa ${page}: ${invalidCount} ta invalid mahsulot o'tkazib yuborildi`);
      }
      
      const loadTime = performance.now() - startTime;
      console.log(`⚡ Sahifa ${page}: ${validProducts.length}/${productsData.length} ta maxsulot ${Math.round(loadTime)}ms da yuklandi`);
      console.log(`📊 Pagination: Sahifa ${pagination.page}/${pagination.pages}, Jami: ${pagination.total}`);
      
      // Agar birinchi sahifa bo'lsa, yangi array yaratish
      // Aks holda, mavjud mahsulotlarga qo'shish
      if (page === 1) {
        setProducts(validProducts);
      } else {
        setProducts(prev => [...prev, ...validProducts]);
      }
      
      setCurrentPage(pagination.page || 1);
      setTotalPages(pagination.pages || 1);
      setTotalProducts(pagination.total || 0);
      
      // ⚡ Statistikani background da hisoblash (faqat birinchi sahifada)
      if (page === 1) {
        // Safari uchun fallback - requestIdleCallback mavjud bo'lmasa setTimeout ishlatish
        const scheduleStats = () => {
          const stats = {
            total: pagination.total || 0,
            lowStock: validProducts.filter((p: Product) => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
            outOfStock: validProducts.filter((p: Product) => p.quantity === 0).length,
            totalValue: validProducts.reduce((sum: number, p: Product) => {
              // Narxni aniqlash - eng to'g'ri narxni tanlash
              let price = 0;
              
              // 1. currentPrice (hozirgi narx) - eng yuqori prioritet
              if ((p as any).currentPrice && (p as any).currentPrice > 0) {
                price = (p as any).currentPrice;
              }
              // 2. unitPrice (dona narxi)
              else if ((p as any).unitPrice && (p as any).unitPrice > 0) {
                price = (p as any).unitPrice;
              }
              // 3. price (asosiy narx)
              else if (p.price && p.price > 0) {
                price = p.price;
              }
              // 4. boxPrice (karobka narxi) - agar dona narxi yo'q bo'lsa
              else if ((p as any).boxPrice && (p as any).boxPrice > 0 && (p as any).unitsPerBox && (p as any).unitsPerBox > 0) {
                price = (p as any).boxPrice / (p as any).unitsPerBox; // Dona narxini hisoblash
              }
              // 5. previousPrice (oldingi narx) - oxirgi variant
              else if ((p as any).previousPrice && (p as any).previousPrice > 0) {
                price = (p as any).previousPrice;
              }
              
              return sum + (price * (p.quantity || 0));
            }, 0)
          };
          console.log('💰 Client-side jami qiymat:', stats.totalValue);
          setOverallStats(stats);
        };
        
        // Safari uchun requestIdleCallback polyfill
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(scheduleStats, { timeout: 2000 });
        } else {
          // Safari fallback - setTimeout ishlatish
          setTimeout(scheduleStats, 100);
        }
      }
      
    } catch (err: any) {
      console.error('❌ Mahsulotlarni yuklashda xatolik:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        stack: err.stack
      });
      
      // Safari uchun maxsus xato xabari
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      let errorMsg = err.response?.data?.message || err.message || 'Maxsulotlarni yuklashda xatolik';
      
      if (isSafari && err.message?.includes('Network')) {
        errorMsg = 'Internet aloqasini tekshiring. Safari\'da ba\'zan aloqa muammolari bo\'lishi mumkin.';
      }
      
      showAlert(errorMsg, 'Xatolik', 'danger');
      
      // Agar xatolik bo'lsa, bo'sh array qo'yish (crash bo'lmasligi uchun)
      if (page === 1) {
        setProducts([]);
        setOverallStats({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [showAlert]);

  // Component mount bo'lganda - birinchi sahifani yuklash
  useEffect(() => {
    // Parallel yuklash - warehouse va products bir vaqtda
    fetchMainWarehouse();
    
    // Birinchi sahifani yuklash
    fetchProducts(1);
    
    // Umumiy statistikani background da yuklash (1 soniyadan keyin)
    const statsTimer = setTimeout(() => {
      fetchOverallStats();
    }, 1000);
    
    return () => clearTimeout(statsTimer);
  }, [fetchProducts]);

  // ⚡ Socket.IO - Real-time updates
  useEffect(() => {
    if (!socket) return;

    // Yangi mahsulot qo'shilganda
    socket.on('product:created', (newProduct: Product) => {
      console.log('📡 Socket: Yangi mahsulot qo\'shildi', newProduct);
      setProducts(prev => [newProduct, ...prev]); // Eng oldinga qo'shish
      setTotalProducts(prev => prev + 1);
      // Statistikani yangilash
      fetchOverallStats();
    });

    // Mahsulot yangilanganda
    socket.on('product:updated', (updatedProduct: Product) => {
      console.log('📡 Socket: Mahsulot yangilandi', updatedProduct);
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
      // Statistikani yangilash
      fetchOverallStats();
    });

    // Mahsulot o'chirilganda
    socket.on('product:deleted', (data: { _id: string }) => {
      console.log('📡 Socket: Mahsulot o\'chirildi', data._id);
      setProducts(prev => prev.filter(p => p._id !== data._id));
      setTotalProducts(prev => prev - 1);
      // Statistikani yangilash
      fetchOverallStats();
    });

    return () => {
      socket.off('product:created');
      socket.off('product:updated');
      socket.off('product:deleted');
    };
  }, [socket]);

  // Umumiy statistikani serverdan olish
  const fetchOverallStats = async () => {
    if (statsLoading) return; // Agar allaqachon yuklanayotgan bo'lsa, qayta yuklash kerak emas
    
    setStatsLoading(true);
    try {
      console.log('📊 Statistika yuklanmoqda...');
      const response = await api.get('/products/overall-stats');
      console.log('📊 Server statistikasi:', response.data);
      console.log('💰 Jami qiymat:', response.data.totalValue);
      setOverallStats(response.data);
    } catch (err: any) {
      console.error('Statistikani yuklashda xatolik:', err);
      // Timeout bo'lsa, foydalanuvchiga xabar berish
      if (err.code === 'ECONNABORTED') {
        console.warn('⚠️ Statistika yuklash juda uzoq davom etdi, keyinroq qayta uriniladi');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  // Birinchi sahifa yuklangandan keyin, qolgan sahifalarni background da yuklash
  useEffect(() => {
    if (currentPage === 1 && totalPages > 1 && !loadingMore) {
      console.log(`🔄 Background: Qolgan ${totalPages - 1} ta sahifa yuklanmoqda...`);
      
      // 500ms kutib, keyin qolgan sahifalarni yuklash
      const timer = setTimeout(async () => {
        setLoadingMore(true); // Loading flag ni o'rnatish
        
        for (let page = 2; page <= totalPages; page++) {
          console.log(`📥 Sahifa ${page}/${totalPages} yuklanmoqda...`);
          
          try {
            const response = await api.get(`/products?page=${page}&limit=20&t=${Date.now()}`);
            const productsData = response.data.data || [];
            
            // Yumshoq validatsiya
            const validProducts = productsData.filter((p: Product) => {
              if (!p || !p._id) return false;
              if (!p.name || p.name.trim() === '') return false;
              return true;
            });
            
            // Faqat yangi mahsulotlarni qo'shish (dublikat oldini olish)
            setProducts(prev => {
              const existingIds = new Set(prev.map(p => p._id));
              const newProducts = validProducts.filter((p: Product) => !existingIds.has(p._id));
              return [...prev, ...newProducts];
            });
            
            setCurrentPage(page);
            
            // Har bir sahifa orasida 200ms kutish
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (err) {
            console.error(`❌ Sahifa ${page} yuklashda xatolik:`, err);
          }
        }
        
        setLoadingMore(false);
        console.log(`✅ Barcha ${totalPages} ta sahifa yuklandi!`);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [currentPage, totalPages, loadingMore]);

  // Scroll handler - DISABLED (background loading ishlatilmoqda)
  const handleScroll = useCallback(() => {
    // Scroll handler o'chirilgan - background loading ishlatilmoqda
    return;
  }, []);

  // Qidiruv yoki filter o'zgarganda - birinchi sahifaga qaytish
  useEffect(() => {
    if (debouncedSearch || stockFilter !== 'all') {
      // Qidiruv yoki filter bo'lsa, birinchi sahifani qayta yuklash
      setProducts([]);
      setCurrentPage(1);
      fetchProducts(1);
    }
  }, [debouncedSearch, stockFilter, fetchProducts]);

  // Infinite scroll handler - agar foydalanuvchi scroll qilsa
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    logger.log('Products state updated:', {
      count: products.length,
      firstProduct: products.length > 0 ? {
        _id: products[0]._id,
        name: products[0].name,
        code: products[0].code
      } : null
    });
  }, [products]);

  const fetchMainWarehouse = async () => {
    try {
      // Cache bypass - har safar yangi ma'lumot olish
      const timestamp = Date.now();
      const res = await api.get(`/warehouses?t=${timestamp}`);
      
      // res.data array ekanligini tekshirish
      const warehouses = Array.isArray(res.data) ? res.data : [];
      
      const main = warehouses.find((w: Warehouse) => w.name === 'Asosiy ombor');
      if (main) {
        setMainWarehouse(main);
      } else {
        const newMain = await api.post('/warehouses', { name: 'Asosiy ombor', address: '' });
        setMainWarehouse(newMain.data);
      }
    } catch (err) {
      logger.error('Error fetching warehouses:', err);
      showAlert('Omborlarni yuklashda xatolik', 'Xatolik', 'danger');
      setLoading(false);
    }
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if larger than 1920px
          if (width > 1920 || height > 1920) {
            const ratio = Math.min(1920 / width, 1920 / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to blob failed'));
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Image load failed'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const remainingSlots = 8 - images.length;
    if (remainingSlots <= 0) {
      showAlert('Maksimum 8 ta rasm yuklash mumkin', 'Ogohlantirish', 'warning');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validFiles = Array.from(files).filter(file => {
      if (!allowedTypes.includes(file.type)) {
        showAlert(`${file.name} - noto'g'ri format. Faqat JPG, PNG, WebP qabul qilinadi`, 'Xatolik', 'warning');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const filesToUpload = validFiles.slice(0, remainingSlots);
    const formDataUpload = new FormData();
    
    setUploading(true);
    try {
      // Compress each image before uploading
      for (const file of filesToUpload) {
        try {
          const compressedBlob = await compressImage(file);
          formDataUpload.append('images', compressedBlob, file.name);
        } catch (compressionError) {
          logger.warn(`Image compression failed for ${file.name}, uploading original:`, compressionError);
          // If compression fails, upload original
          formDataUpload.append('images', file);
        }
      }
      
      const res = await api.post('/products/upload-images', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadedImages = (res.data.images || []).map((img: any) =>
        typeof img === 'string' ? img : img.path
      );
      
      // Yangi yuklangan rasmlarni tracking qilamiz
      setNewlyUploadedImages([...newlyUploadedImages, ...uploadedImages]);
      
      setImages([
        ...images.map((img: any) => (typeof img === 'string' ? img : img.path)),
        ...uploadedImages
      ]);
      showAlert(`${res.data.images.length} ta rasm muvaffaqiyatli yuklandi`, 'Muvaffaqiyat', 'success');
    } catch (err) {
      logger.error('Error uploading images:', err);
      showAlert('Rasmlarni yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = async (imagePath: string) => {
    try {
      console.log('🗑️ Removing image:', { imagePath, isNewlyUploaded: newlyUploadedImages.includes(imagePath) });
      
      // Avval local state dan o'chiramiz (tezkor UI uchun)
      const updatedImages = images
        .map((img: any) => (typeof img === 'string' ? img : img.path))
        .filter(path => path !== imagePath);
      setImages(updatedImages);
      
      // Agar bu yangi yuklangan rasm bo'lsa, faqat tracking dan o'chiramiz
      if (newlyUploadedImages.includes(imagePath)) {
        setNewlyUploadedImages(newlyUploadedImages.filter(img => img !== imagePath));
        showAlert('Rasm o\'chirildi (hali saqlanmagan)', 'Ma\'lumot', 'info');
        
        // Yangi yuklangan rasmni serverdan ham o'chiramiz (fayl tizimidan)
        try {
          await api.delete('/products/delete-image', {
            data: { imagePath, productId: undefined }
          });
          console.log('✅ Yangi yuklangan rasm serverdan ham o\'chirildi');
        } catch (serverErr) {
          console.warn('Yangi yuklangan rasmni serverdan o\'chirishda xatolik:', serverErr);
        }
        return;
      }
      
      // Agar mahsulot tahrirlash rejimida bo'lsa va rasm serverda bo'lsa
      const productId = editingProduct?._id;
      if (productId) {
        try {
          await api.delete('/products/delete-image', {
            data: { imagePath, productId }
          });
          showAlert('Rasm o\'chirildi', 'Muvaffaqiyat', 'success');
        } catch (serverErr: any) {
          console.warn('Server xatosi:', serverErr);
          if (serverErr.response?.status === 404) {
            showAlert('Rasm local state dan o\'chirildi', 'Ma\'lumot', 'info');
          } else {
            showAlert('Rasm local state dan o\'chirildi, lekin serverda xatolik', 'Ogohlantirish', 'warning');
          }
        }
      } else {
        showAlert('Rasm o\'chirildi', 'Muvaffaqiyat', 'success');
      }
    } catch (err: any) {
      logger.error('Error deleting image:', err);
      const msg = err.response?.data?.message || err.message || 'Rasmni o\'chirishda xatolik';
      showAlert(msg, 'Xatolik', 'danger');
    }
  };

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      let imagePath = typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path;
      
      // Agar imagePath to'liq URL bo'lsa (http:// yoki https:// bilan boshlansa), faqat path qismini olish
      if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        try {
          const url = new URL(imagePath);
          imagePath = url.pathname; // Faqat /uploads/products/... qismini olish
        } catch (e) {
          console.warn('Invalid image URL:', imagePath);
        }
      }
      
      // Agar imagePath / bilan boshlanmasa, qo'shish
      if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
      }
      
      return `${UPLOADS_URL}${imagePath}`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.log('Form submit boshlandi. Ma\'lumotlar:', {
      code: formData.code,
      name: formData.name,
      unitPrice: formData.unitPrice,
      currentPrice: formData.currentPrice,
      codeError: codeError
    });
    
    if (codeError) {
      logger.error('Kod xatosi:', codeError);
      showAlert(codeError, 'Xatolik', 'danger');
      return;
    }
    
    // Validate required fields
    if (!formData.name || !formData.name.trim()) {
      logger.error('Tovar nomi bo\'sh');
      showAlert('Tovar nomi majburiy', 'Xatolik', 'danger');
      return;
    }
    
    if (!formData.unitPrice && !formData.currentPrice) {
      logger.error('Narx bo\'sh');
      showAlert('Tovar narxi majburiy', 'Xatolik', 'danger');
      return;
    }
    
    logger.log('Validation o\'tdi. Maxsulot qo\'shilmoqda...');
    
    let finalQuantity = Number(formData.quantity);
    let packageInfo = null;
    
    // If package data is provided, calculate totals
    if (showPackageInput && packageData.packageCount && packageData.unitsPerPackage) {
      const totalUnits = Number(packageData.packageCount) * Number(packageData.unitsPerPackage);
      
      finalQuantity = editingProduct ? Number(formData.quantity) + totalUnits : totalUnits;
      
      packageInfo = {
        packageCount: Number(packageData.packageCount),
        unitsPerPackage: Number(packageData.unitsPerPackage),
        totalUnits: totalUnits
      };
    }

    // Hisoblangan qiymatlar
    let totalMeters = 0;
    let totalUnits = 0;
    if (formData.unit === 'rulon' && formData.metersPerRoll) {
      totalMeters = finalQuantity * Number(formData.metersPerRoll);
    }
    if (formData.unit === 'karobka' && formData.unitsPerBox) {
      totalUnits = finalQuantity * Number(formData.unitsPerBox);
    }
    
    try {
      const data = {
        code: formData.code,
        name: formData.name,
        description: formData.description || '',
        price: Number(formData.unitPrice) || Number(formData.currentPrice),
        costPrice: Number(formData.costPrice) || 0,
        unitPrice: Number(formData.unitPrice) || Number(formData.currentPrice) || 0,
        boxPrice: Number(formData.boxPrice) || 0,
        previousPrice: Number(formData.previousPrice) || 0,
        currentPrice: Number(formData.currentPrice) || 0,
        category: formData.category || 'Boshqa',
        // Foizli chegirmalar
        pricingTiers: {
          tier1: {
            minQuantity: Number(formData.pricingTiers.tier1.minQuantity) || 1,
            maxQuantity: Number(formData.pricingTiers.tier1.maxQuantity) || 5,
            discountPercent: Number(formData.pricingTiers.tier1.discountPercent) || 15
          },
          tier2: {
            minQuantity: Number(formData.pricingTiers.tier2.minQuantity) || 6,
            maxQuantity: Number(formData.pricingTiers.tier2.maxQuantity) || 20,
            discountPercent: Number(formData.pricingTiers.tier2.discountPercent) || 13
          },
          tier3: {
            minQuantity: Number(formData.pricingTiers.tier3.minQuantity) || 21,
            maxQuantity: Number(formData.pricingTiers.tier3.maxQuantity) || 100,
            discountPercent: Number(formData.pricingTiers.tier3.discountPercent) || 11
          }
        },
        quantity: finalQuantity,
        warehouse: mainWarehouse?._id,
        images,
        packageInfo,
        unit: formData.unit,
        // Dollar narxlari
        costPriceInDollar: Number(formData.costPriceInDollar) || 0,
        dollarRate: dollarRate,
        // O'lchamlar
        dimensions: {
          width: formData.dimensions.width || '',
          height: formData.dimensions.height || '',
          length: formData.dimensions.length || ''
        },
        // Rulon/Karobka sozlamalari
        metersPerRoll: Number(formData.metersPerRoll) || 0,
        unitsPerBox: Number(formData.unitsPerBox) || 0,
        totalMeters,
        totalUnits,
        // Metr narxlari (diapazon)
        meterPriceRanges: formData.meterPriceRanges
          .filter(r => r.from && r.to && r.price)
          .map(r => ({ from: Number(r.from), to: Number(r.to), price: Number(r.price) })),
        prices: {
          perUnit: Number(formData.unitPrice) || Number(formData.currentPrice),
          perRoll: Number(formData.pricePerRoll) || 0,
          perBox: Number(formData.boxPrice) || Number(formData.pricePerBox) || 0,
          perKg: Number(formData.pricePerKg) || 0,
          perGram: Number(formData.pricePerGram) || 0
        }
      };
      
      logger.log('Tovar serverga yuborilmoqda:', {
        code: data.code,
        name: data.name,
        warehouse: data.warehouse,
        quantity: data.quantity,
        price: data.price
      });
      
      if (editingProduct) {
        const response = await api.put(`/products/${editingProduct._id}`, data);
        logger.log('Tovar yangilandi:', editingProduct._id);
        
        // Darhol UI da yangilash (serverdan qayta yuklamasdan)
        if (response.data && response.data._id) {
          const updatedProduct = {
            ...response.data,
            warehouse: response.data.warehouse || mainWarehouse,
            images: response.data.images || images || []
          };
          
          setProducts(prev => {
            const updated = prev.map(p => 
              p._id === editingProduct._id ? updatedProduct : p
            );
            // Yangi mahsulotlar birinchi - createdAt bo'yicha sorting
            updated.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0).getTime();
              const dateB = new Date(b.createdAt || 0).getTime();
              return dateB - dateA; // Eng yangi birinchi
            });
            return updated;
          });
          logger.log('Tovar darhol UI da yangilandi:', response.data.name);
          
          // Tahrirlangan mahsulot kategoriyasini filtrlash uchun o'rnatish
          if (response.data.category) {
            setCategoryFilter(response.data.category);
          }
        }
      } else {
        const response = await api.post('/products', data);
        logger.log('Tovar serverdan qaytdi:', response.data);
        logger.log('Tovar rasmlar:', response.data.images);
        
        // Darhol UI ga qo'shish (1 sekund kutmasdan)
        if (response.data && response.data._id) {
          // Warehouse ma'lumotlarini populate qilish
          const productWithWarehouse = {
            ...response.data,
            warehouse: response.data.warehouse || mainWarehouse,
            // Rasmlarni to'g'ri ko'chirish
            images: response.data.images || images || []
          };
          
          logger.log('UI ga qo\'shilayotgan tovar:', {
            _id: productWithWarehouse._id,
            name: productWithWarehouse.name,
            images: productWithWarehouse.images,
            imagesCount: productWithWarehouse.images?.length || 0
          });
          
          // Yangi maxsulotni boshiga qo'shish (eng yangi birinchi)
          setProducts(prev => {
            const updated = [productWithWarehouse, ...prev]; // Boshiga qo'shish
            return updated;
          });
          logger.log('Yangi tovar darhol UI ga qo\'shildi:', response.data.name);
          
          // Yangi mahsulot kategoriyasini filtrlash uchun o'rnatish
          if (response.data.category) {
            setCategoryFilter(response.data.category);
          }
        }
      }
      
      // Modal yopish va tozalash
      closeModal();
      resetModal();
      showAlert(editingProduct ? 'Tovar yangilandi' : 'Tovar qo\'shildi', 'Muvaffaqiyat', 'success');
      
      // Statistikani yangilash
      fetchOverallStats();
    } catch (err: any) {
      logger.error('Error adding/updating product:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
      logger.error('Error details:', {
        status: err.response?.status,
        message: errorMsg,
        data: err.response?.data
      });
      showAlert(errorMsg, 'Xatolik', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Tovarni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/products/${id}`);
      
      // Darhol state dan o'chirish (real-time update)
      setProducts(prev => prev.filter(p => p._id !== id));
      logger.log('Tovar UI dan o\'chirildi:', id);
      
      showAlert('Tovar o\'chirildi', 'Muvaffaqiyat', 'success');
      
      // Statistikani yangilash
      fetchOverallStats();
    } catch (err) {
      logger.error('Error deleting product:', err);
      showAlert('Tovarni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const p = product as any;
    
    // Dollar kursini o'rnatish (agar bo'lmasa default 12500)
    setDollarRate(p.dollarRate || 12500);
    
    setFormData({
      code: product.code,
      name: product.name,
      description: p.description || '',
      previousPrice: String(p.previousPrice || 0),
      currentPrice: String(p.currentPrice || product.price),
      costPrice: String(p.costPrice || 0),
      costPriceInDollar: String(p.costPriceInDollar || 0),
      unitPrice: String(p.unitPrice || p.currentPrice || product.price),
      boxPrice: String(p.boxPrice || 0),
      category: p.category || 'Boshqa',
      pricingTiers: {
        tier1: {
          minQuantity: String(p.pricingTiers?.tier1?.minQuantity || 1),
          maxQuantity: String(p.pricingTiers?.tier1?.maxQuantity || 5),
          discountPercent: String(p.pricingTiers?.tier1?.discountPercent || 15)
        },
        tier2: {
          minQuantity: String(p.pricingTiers?.tier2?.minQuantity || 6),
          maxQuantity: String(p.pricingTiers?.tier2?.maxQuantity || 20),
          discountPercent: String(p.pricingTiers?.tier2?.discountPercent || 13)
        },
        tier3: {
          minQuantity: String(p.pricingTiers?.tier3?.minQuantity || 21),
          maxQuantity: String(p.pricingTiers?.tier3?.maxQuantity || 100),
          discountPercent: String(p.pricingTiers?.tier3?.discountPercent || 11)
        }
      },
      quantity: String(product.quantity),
      unit: product.unit || 'dona',
      dimensions: {
        width: p.dimensions?.width || '',
        height: p.dimensions?.height || '',
        length: p.dimensions?.length || ''
      },
      metersPerRoll: String(p.metersPerRoll || ''),
      unitsPerBox: String(p.unitsPerBox || ''),
      meterPriceRanges: p.meterPriceRanges?.length > 0 
        ? p.meterPriceRanges.map((r: any) => ({ from: String(r.from || ''), to: String(r.to || ''), price: String(r.price || '') }))
        : [{ from: '', to: '', price: '' }],
      pricePerRoll: String(product.prices?.perRoll || ''),
      pricePerBox: String(product.prices?.perBox || ''),
      pricePerKg: String(product.prices?.perKg || ''),
      pricePerGram: String(product.prices?.perGram || '')
    });
    setImages(
      (p.images || []).map((img: any) =>
        typeof img === 'string' ? img : img.path
      )
    );
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };
  
  // Mahsulot ma'lumotlarini ko'rish
  const openProductDetailsModal = (product: Product) => {
    setSelectedProductForDetails(product);
    setDetailsStep(1);
    setShowProductDetailsModal(true);
  };

  // Selection funksiyalari
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const selectAllProducts = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const toggleSelectAll = () => {
    selectAllProducts();
  };

  const openBatchQRPrint = () => {
    if (selectedProducts.size === 0) {
      showAlert('Kamida bitta mahsulot tanlang', 'Ogohlantirish', 'warning');
      return;
    }
    setShowBatchQRModal(true);
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedProducts(new Set());
  };

  // Copy product - mahsulotni nusxalash (modal ochib, ma'lumotlarni to'ldirish)
  const copyProduct = async (product: Product) => {
    try {
      // ⚡ Darhol modalni ochish
      setShowModal(true);
      setEditingProduct(null); // Yangi mahsulot sifatida
      
      const p = product as any;
      
      // Dollar kursini o'rnatish
      setDollarRate(p.dollarRate || 12500);
      
      // ⚡ Background da keyingi kodni olish
      const nextCodePromise = api.get('/products/next-code');
      
      // Mahsulot ma'lumotlarini to'ldirish (kod bundan mustasno)
      setFormData({
        code: '', // Keyingi kod background da yuklanadi
        name: product.name, // Asl nom
        description: p.description || '',
        previousPrice: String(p.previousPrice || 0),
        currentPrice: String(p.currentPrice || product.price),
        costPrice: String(p.costPrice || 0),
        costPriceInDollar: String(p.costPriceInDollar || 0),
        unitPrice: String(p.unitPrice || p.currentPrice || product.price),
        boxPrice: String(p.boxPrice || 0),
        pricingTiers: {
          tier1: {
            minQuantity: String(p.pricingTiers?.tier1?.minQuantity || 1),
            maxQuantity: String(p.pricingTiers?.tier1?.maxQuantity || 5),
            discountPercent: String(p.pricingTiers?.tier1?.discountPercent || 15)
          },
          tier2: {
            minQuantity: String(p.pricingTiers?.tier2?.minQuantity || 6),
            maxQuantity: String(p.pricingTiers?.tier2?.maxQuantity || 20),
            discountPercent: String(p.pricingTiers?.tier2?.discountPercent || 13)
          },
          tier3: {
            minQuantity: String(p.pricingTiers?.tier3?.minQuantity || 21),
            maxQuantity: String(p.pricingTiers?.tier3?.maxQuantity || 100),
            discountPercent: String(p.pricingTiers?.tier3?.discountPercent || 11)
          }
        },
        quantity: '0', // Miqdorni 0 dan boshlash
        unit: product.unit || 'dona',
        category: p.category || 'Boshqa',
        dimensions: {
          width: p.dimensions?.width || '',
          height: p.dimensions?.height || '',
          length: p.dimensions?.length || ''
        },
        metersPerRoll: String(p.metersPerRoll || ''),
        unitsPerBox: String(p.unitsPerBox || ''),
        meterPriceRanges: p.meterPriceRanges?.length > 0 
          ? p.meterPriceRanges.map((r: any) => ({ from: String(r.from || ''), to: String(r.to || ''), price: String(r.price || '') }))
          : [{ from: '', to: '', price: '' }],
        pricePerRoll: String(product.prices?.perRoll || ''),
        pricePerBox: String(product.prices?.perBox || ''),
        pricePerKg: String(product.prices?.perKg || ''),
        pricePerGram: String(product.prices?.perGram || '')
      });
      
      // Rasmlarni nusxalash
      setImages(
        (p.images || []).map((img: any) =>
          typeof img === 'string' ? img : img.path
        )
      );
      
      setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
      setCodeError('');
      setShowPackageInput(false);
      
      // ⚡ Background da keyingi kodni olish va o'rnatish
      try {
        const res = await nextCodePromise;
        setFormData(prev => ({ ...prev, code: res.data.code }));
      } catch (err) {
        logger.error('Error getting next code:', err);
        showAlert('Keyingi kodni olishda xatolik', 'Xatolik', 'danger');
      }
      
      showAlert('Mahsulot nusxalandi. Kerakli o\'zgarishlarni kiriting va saqlang.', 'Muvaffaqiyat', 'success');
    } catch (err) {
      logger.error('Error copying product:', err);
      showAlert('Mahsulotni nusxalashda xatolik', 'Xatolik', 'danger');
    }
  };

  // Mahsulot statistikasini ochish
  const openStatsModal = async (product: Product, period: string = '7') => {
    setSelectedProduct(product);
    setShowStatsModal(true);
    setStatsLoading(true);
    setStatsPeriod(period);
    
    try {
      logger.log(`Fetching stats for product: ${product._id}`);
      const res = await api.get(`/products/stats/${product._id}?period=${period}`);
      logger.log('Stats response:', res.data);
      setProductStats(res.data);
    } catch (err: any) {
      logger.error('Error fetching product stats:', err);
      logger.error('Error details:', {
        status: err.response?.status,
        message: err.response?.data?.message,
        url: err.config?.url
      });
      showAlert('Statistikani yuklashda xatolik: ' + (err.response?.data?.message || err.message), 'Xatolik', 'danger');
      setProductStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  // Kategoriya tanlash modal ochish
  const openCategoryModal = (product: Product) => {
    setSelectedProductForCategory(product);
    setShowCategoryModal(true);
  };

  // Kategoriyani yangilash
  const handleCategoryUpdate = async (categoryName: string) => {
    if (!selectedProductForCategory) return;
    
    try {
      const response = await api.put(`/products/${selectedProductForCategory._id}/category`, {
        category: categoryName
      });
      
      // Darhol UI da yangilash
      setProducts(prev => prev.map(p => 
        p._id === selectedProductForCategory._id 
          ? { ...p, category: categoryName }
          : p
      ));
      
      setShowCategoryModal(false);
      setSelectedProductForCategory(null);
      showAlert('Kategoriya yangilandi', 'Muvaffaqiyat', 'success');
    } catch (err: any) {
      logger.error('Error updating category:', err);
      showAlert(err.response?.data?.message || 'Kategoriyani yangilashda xatolik', 'Xatolik', 'danger');
    }
  };

  // Davr o'zgarganda statistikani qayta yuklash
  const handlePeriodChange = async (period: string) => {
    if (!selectedProduct) return;
    setStatsPeriod(period);
    setStatsLoading(true);
    
    try {
      const res = await api.get(`/products/stats/${selectedProduct._id}?period=${period}`);
      setProductStats(res.data);
    } catch (err) {
      logger.error('Error fetching product stats:', err);
      showAlert('Statistikani yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setStatsLoading(false);
    }
  };

  // Print funksiyalari hozircha ishlatilmaydi, keyin qo'shilishi mumkin

  // Modal yopish (ma'lumotlarni saqlab qolish)
  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1); // Stepperни 1-bosqichga qaytarish
    // ❌ Ma'lumotlarni reset QILMAYMIZ - foydalanuvchi qayta ochganda saqlanib qoladi
  };

  // Modal to'liq tozalash (saqlangandan keyin yoki yangi mahsulot qo'shishda)
  const resetModal = () => {
    setEditingProduct(null);
    setDollarRate(12500);
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
    setFormData({ 
      code: '', name: '', description: '', quantity: '',
      previousPrice: '', currentPrice: '',
      costPrice: '', costPriceInDollar: '', unitPrice: '', boxPrice: '',
      category: 'Boshqa',
      pricingTiers: {
        tier1: { minQuantity: '1', maxQuantity: '5', discountPercent: '15' },
        tier2: { minQuantity: '6', maxQuantity: '20', discountPercent: '13' },
        tier3: { minQuantity: '21', maxQuantity: '100', discountPercent: '11' }
      },
      unit: 'dona',
      dimensions: { width: '', height: '', length: '' },
      metersPerRoll: '',
      unitsPerBox: '',
      meterPriceRanges: [{ from: '', to: '', price: '' }],
      pricePerRoll: '',
      pricePerBox: '',
      pricePerKg: '',
      pricePerGram: ''
    });
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setNewlyUploadedImages([]); // Yangi yuklangan rasmlar ro'yxatini tozalash
    setCodeError('');
    setShowPackageInput(false);
  };

  const openAddModal = async () => {
    // Ma'lumotlarni tozalash (yangi mahsulot uchun)
    resetModal();
    
    // ⚡ Darhol modalni ochish - UI tezkor bo'lishi uchun
    setShowModal(true);
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
    
    // ⚡ Background da keyingi kodni olish
    try {
      const res = await api.get('/products/next-code');
      setFormData(prev => ({ ...prev, code: res.data.code }));
    } catch (err) {
      logger.error('Error getting next code:', err);
      showAlert('Keyingi kodni olishda xatolik', 'Xatolik', 'danger');
    }
  };

  const stats = useMemo(() => ({
    total: overallStats.total || products.length || 0,
    lowStock: overallStats.lowStock || 0,
    outOfStock: overallStats.outOfStock || 0,
    totalValue: overallStats.totalValue || 0
  }), [overallStats, products.length]);

  // ... rest of the code remains the same ...

  const statItems = [
    { label: 'Jami tovarlar', value: stats.total, icon: Package, color: 'brand', filter: 'all' },
    { label: 'Kam qolgan', value: stats.lowStock, icon: AlertTriangle, color: 'warning', filter: 'low' },
    { label: 'Tugagan', value: stats.outOfStock, icon: X, color: 'danger', filter: 'out' },
    { label: 'Jami qiymat', value: `${formatNumber(stats.totalValue)} so'm`, icon: DollarSign, color: 'success', filter: null },
  ];



  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      
      {/* CHAP TOMON - Mahsulotlar */}
      <div className="flex-1 flex flex-col overflow-hidden pb-20 lg:pb-0">
      <Header 
        title="Tovarlar"
        showSearch 
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Refresh Button */}
            <button 
              onClick={() => fetchProducts()} 
              className="flex items-center justify-center p-0.5 rounded bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 transition-all duration-200 flex-shrink-0"
              style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
              title="Tovarlarni qayta yuklash"
            >
              <RotateCcw className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
            </button>
            
            {/* Selection Mode Toggle */}
            {!selectionMode ? (
              <button 
                onClick={() => setSelectionMode(true)} 
                className="flex items-center justify-center p-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 flex-shrink-0"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                title="Bir nechta QR chiqarish"
              >
                <CheckSquare className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
              </button>
            ) : (
              <>
                <button 
                  onClick={selectAllProducts} 
                  className="flex items-center justify-center px-2 py-0.5 rounded text-xs bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-700 transition-all duration-200 flex-shrink-0 font-medium"
                  style={{ height: '24px', minHeight: '24px' }}
                >
                  {selectedProducts.size === filteredProducts.length ? 'Bekor' : 'Barchasi'}
                </button>
                <button 
                  onClick={openBatchQRPrint} 
                  className="flex items-center justify-center gap-1 px-2 py-0.5 rounded text-xs bg-brand-500 hover:bg-brand-600 text-white transition-all duration-200 flex-shrink-0 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ height: '24px', minHeight: '24px' }}
                  disabled={selectedProducts.size === 0}
                >
                  <Printer className="w-3 h-3" style={{ width: '12px', height: '12px' }} />
                  <span>{selectedProducts.size}</span>
                </button>
                <button 
                  onClick={cancelSelection} 
                  className="flex items-center justify-center p-0.5 rounded bg-surface-200 hover:bg-surface-300 transition-all duration-200 flex-shrink-0"
                  style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                >
                  <X className="w-3 h-3" style={{ width: '12px', height: '12px' }} />
                </button>
              </>
            )}
            <button 
              onClick={openAddModal} 
              className="flex items-center gap-1 px-2 py-1 rounded bg-brand-500 hover:bg-brand-600 text-white transition-all duration-200 flex-shrink-0"
              style={{ minHeight: '28px' }}
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="text-[10px] sm:text-xs font-medium">Qo'shish</span>
            </button>
          </div>
        }
      />

      <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Stats Cards - Larger size with bigger fonts */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`bg-white rounded-xl sm:rounded-2xl border-2 transition-all ${
                stat.filter ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''
              } ${
                stockFilter === stat.filter ? 'border-brand-500 shadow-md' : 'border-surface-200'
              }`}
            >
              <div className="p-3 sm:p-4 md:p-5">
                <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-${stat.color}-50`}>
                    <stat.icon className={`w-5 h-5 sm:w-5.5 sm:h-5.5 md:w-6 md:h-6 text-${stat.color}-600`} />
                  </div>
                  <p className="text-[10px] sm:text-xs md:text-sm text-surface-500 font-medium">{stat.label}</p>
                </div>
                <p className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-surface-900 truncate">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Category Filter - Horizontal Scrollable */}
        <div className="bg-white rounded-xl p-3 sm:p-4 border-2 border-surface-200">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setCategoryFilter('')}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                categoryFilter === '' 
                  ? 'bg-brand-500 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Barchasi
            </button>
            {categories.map(category => (
              <button
                key={category._id}
                onClick={() => setCategoryFilter(category.name)}
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                  categoryFilter === category.name 
                    ? 'bg-brand-500 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products List - No frame, free-flowing */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8 mb-4" />
            <p className="text-surface-500">Yuklanmoqda...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-surface-400" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 mb-2">Tovarlar topilmadi</h3>
            <p className="text-surface-500 text-center max-w-md mb-6">
              {searchQuery ? 'Qidiruv bo\'yicha tovarlar topilmadi' : 'Birinchi tovarni qo\'shing'}
            </p>
            <button onClick={openAddModal} className="btn-primary">Tovar qo'shish</button>
          </div>
        ) : (
          <>
            {/* Card Grid View - 2 columns */}
            <div 
              ref={scrollContainerRef}
              className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4"
            >
                  {filteredProducts.map(product => {
                    const isSelected = selectedProducts.has(product._id);
                    const productImage = getProductImage(product);
                    
                    return (
                      <div 
                        key={product._id}
                        onClick={() => !selectionMode && openProductDetailsModal(product)}
                        className={`group relative bg-white rounded-lg sm:rounded-xl transition-all duration-200 hover:shadow-lg min-h-[140px] cursor-pointer ${
                          isSelected 
                            ? 'shadow-md ring-2 ring-brand-500' 
                            : 'shadow-sm hover:shadow-md'
                        }`}
                      >
                        {/* Action Buttons - O'ng yuqori burchakda */}
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 z-10">
                          <button 
                            onClick={(e) => { e.stopPropagation(); copyProduct(product); }} 
                            className="w-6 h-6 sm:w-7 sm:h-7 bg-blue-50 hover:bg-blue-100 rounded-lg transition-none text-blue-600 flex items-center justify-center hover:scale-110 shadow-sm"
                            title="Mahsulotni nusxalash"
                          >
                            <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openQRModal(product); }} 
                            className="w-6 h-6 sm:w-7 sm:h-7 bg-purple-50 hover:bg-purple-100 rounded-lg transition-none text-purple-600 flex items-center justify-center hover:scale-110 shadow-sm"
                            title="QR kod"
                          >
                            <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(product); }} 
                            className="w-6 h-6 sm:w-7 sm:h-7 bg-amber-50 hover:bg-amber-100 rounded-lg transition-none text-amber-600 flex items-center justify-center hover:scale-110 shadow-sm"
                            title="Tahrirlash"
                          >
                            <Edit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }} 
                            className="w-6 h-6 sm:w-7 sm:h-7 bg-red-50 hover:bg-red-100 rounded-lg transition-none text-red-600 flex items-center justify-center hover:scale-110 shadow-sm"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>

                        {/* Selection Checkbox - Chap yuqori burchak */}
                        {selectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleProductSelection(product._id)}
                              className="w-4 h-4 sm:w-5 sm:h-5 rounded border-2 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* 320px: Vertical layout, Larger: Horizontal */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 md:gap-3 p-2 sm:p-2.5 md:p-3">
                          {/* Product Image */}
                          <div 
                            className="relative w-full sm:w-20 md:w-24 h-24 sm:h-20 md:h-24 rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 cursor-pointer flex-shrink-0 shadow-sm"
                            onClick={() => {
                              if (productImage) {
                                setSelectedProduct(product);
                                setShowImageModal(true);
                              }
                            }}
                          >
                            {productImage ? (
                              <img 
                                src={productImage} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-slate-300" />
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0 px-2 pb-2 sm:p-0">
                            {/* Code Badge */}
                            <div className="text-xs font-mono text-slate-500 mb-0.5 sm:mb-1">
                              #{product.code}
                            </div>
                            
                            {/* Name with optional description suffix */}
                            <h3 className="font-semibold text-sm sm:text-base md:text-lg text-slate-900 mb-1 sm:mb-1.5 line-clamp-2">
                              {product.name}
                              {(product as any).description && (product as any).description.trim() && (
                                <span className="text-sm sm:text-base md:text-lg font-semibold text-slate-900 ml-1.5">
                                  {(product as any).description}
                                </span>
                              )}
                            </h3>

                            {/* Price and Category */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg sm:text-xl md:text-2xl font-bold text-brand-600">
                                  {formatNumber((product as any).unitPrice || product.price)}
                                </span>
                                <span className="text-xs sm:text-sm text-slate-500">so'm</span>
                              </div>
                              
                              {/* Category Badge - Click to change */}
                              <button
                                onClick={(e) => { e.stopPropagation(); openCategoryModal(product); }}
                                className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 text-purple-700 rounded-md transition-all hover:scale-105 shadow-sm border border-purple-200/50 flex items-center gap-1 flex-shrink-0"
                                title="Kategoriyani o'zgartirish"
                              >
                                <Filter className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="truncate max-w-[70px] sm:max-w-[90px]">
                                  {(product as any).category || 'Boshqa'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              
              {/* End indicator */}
              {currentPage >= totalPages && !loadingMore && filteredProducts.length > 0 && (
                <div className="flex justify-center items-center py-6 mt-4">
                  <div className="text-slate-400 text-sm">
                    ✅ Barcha maxsulotlar yuklandi ({totalProducts} ta)
                  </div>
                </div>
              )}
            </>
          )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4">
          {/* Backdrop with blur - orqa fon */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-black/70 backdrop-blur-sm transition-opacity duration-100" 
            onClick={closeModal}
            style={{ animation: 'fadeIn 0.1s ease-out' }}
          />
          
          {/* Modal oyna - professional design - MOBILE OPTIMIZED */}
          <form 
            onSubmit={handleSubmit} 
            className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-full sm:max-w-sm md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border-t sm:border border-white/20 transform"
            style={{
              animation: 'modalSlideUp 0.1s ease-out',
              willChange: 'transform, opacity'
            }}
          >
            {/* Header - Gradient with animation - MOBILE OPTIMIZED */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-3 sm:px-6 py-3 sm:py-5 border-b border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center gap-2 mb-1 truncate">
                    {editingProduct ? (
                      <>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </div>
                        <span className="truncate">Tovarni tahrirlash</span>
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </div>
                        <span className="truncate">Yangi tovar qo'shish</span>
                      </>
                    )}
                  </h3>
                  <p className="text-[10px] xs:text-xs sm:text-sm text-white/90 font-medium truncate">
                    {editingProduct ? 'Tovar ma\'lumotlarini yangilang' : 'Yangi tovar ma\'lumotlarini kiriting'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={closeModal} 
                  className="p-1.5 sm:p-2 md:p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 group ml-2 sm:ml-3 flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white group-hover:text-white/90" />
                </button>
              </div>
              
              {/* Stepper - MOBILE OPTIMIZED */}
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(step)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                          currentStep === step
                            ? 'bg-white text-blue-600 shadow-lg scale-110'
                            : currentStep > step
                            ? 'bg-green-500 text-white'
                            : 'bg-white/20 text-white/60'
                        }`}
                      >
                        {currentStep > step ? '✓' : step}
                      </button>
                      <span className={`text-[9px] xs:text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${
                        currentStep === step ? 'text-white' : 'text-white/60'
                      }`}>
                        {step === 1 ? 'Asosiy' : step === 2 ? 'O\'lcham' : 'Narx'}
                      </span>
                    </div>
                    {step < 3 && (
                      <div className={`h-0.5 flex-1 mx-1 sm:mx-2 ${
                        currentStep > step ? 'bg-green-500' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Content - Scrollable - MOBILE OPTIMIZED */}
            <div className="overflow-y-auto max-h-[calc(95vh-280px)] sm:max-h-[calc(90vh-240px)] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 md:space-y-6">
              {/* Bosqich 1: Asosiy ma'lumotlar */}
              {currentStep === 1 && (
                <>
              {/* Image Upload */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Rasmlar (max 8 ta - JPG, PNG, WebP)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {images.map((img, idx) => {
                    // img string yoki object bo'lishi mumkin - path ni olish
                    let imagePath = typeof img === 'string' ? img : (img as any).path;
                    
                    // Agar imagePath to'liq URL bo'lsa, faqat path qismini olish
                    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
                      try {
                        const url = new URL(imagePath);
                        imagePath = url.pathname;
                      } catch (e) {
                        console.warn('Invalid image URL:', imagePath);
                      }
                    }
                    
                    // Agar imagePath / bilan boshlanmasa, qo'shish
                    if (!imagePath.startsWith('/')) {
                      imagePath = '/' + imagePath;
                    }
                    
                    return (
                      <div key={idx} className="relative aspect-square group bg-surface-100 rounded-lg overflow-hidden">
                        <img 
                          src={`${UPLOADS_URL}${imagePath}`} 
                          alt={`Rasm ${idx + 1}`} 
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover" 
                          style={{ contentVisibility: 'auto' }}
                        />
                        {/* Delete button - rasm ichida, o'ng yuqori burchakda */}
                        <button
                          type="button"
                          onClick={() => removeImage(imagePath)}
                          className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-7 h-7 sm:w-8 sm:h-8 bg-red-500 hover:bg-red-600 text-white rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 z-10 opacity-90 hover:opacity-100"
                          title="Rasmni o'chirish"
                        >
                          <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                        </button>
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                      </div>
                    );
                  })}
                  {images.length < 8 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="aspect-square border-2 border-dashed border-surface-300 rounded-lg flex flex-col items-center justify-center hover:border-brand-500 hover:bg-brand-50 transition-colors cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="spinner w-4 h-4 sm:w-5 sm:h-5 text-brand-600" />
                          <span className="text-[8px] sm:text-[9px] text-brand-600 font-semibold">Yuklash...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-surface-400 mb-0.5 sm:mb-1 group-hover:text-brand-500 transition-colors" />
                          <span className="text-[10px] sm:text-xs text-surface-500 text-center px-0.5 group-hover:text-brand-600 transition-colors">Rasm</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-surface-500 mb-2 sm:mb-3">💡 Telefondan rasm olib qo'ysangiz, avtomatik sifati yaxshi bo'lib qo'yiladi. Bir vaqtning o'zida bir nechta rasmni yuklash mumkin.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Kod va Nomi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Kod</label>
                  <input 
                    type="text" 
                    className={`input text-sm ${codeError ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20' : ''}`}
                    placeholder="1" 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    onBlur={e => checkCodeExists(e.target.value)}
                    required 
                  />
                  {codeError && <p className="text-xs text-danger-600 mt-0.5 sm:mt-1">{codeError}</p>}
                </div>
                <div>
                  <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Nomi</label>
                  <input type="text" className="input text-sm" placeholder="Tovar nomi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                </div>
              </div>

              {/* Izoh */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Qisqacha izoh (ixtiyoriy)</label>
                <textarea 
                  className="input min-h-[60px] sm:min-h-[80px] resize-none text-sm" 
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  maxLength={500}
                />
                <p className="text-[10px] sm:text-xs text-surface-400 mt-0.5 sm:mt-1">{(formData.description || '').length}/500</p>
              </div>

              {/* Kategoriya */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">📂 Kategoriya</label>
                <select 
                  className="input text-sm cursor-pointer" 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {categories.map(category => (
                    <option key={category._id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>
                </>
              )}

              {/* Bosqich 2: O'lchamlar va Miqdor */}
              {currentStep === 2 && (
                <>

              {/* O'lchamlar (sm/mm) */}
              <div className="border-t border-surface-200 pt-2 sm:pt-3 md:pt-4 mt-2 sm:mt-3 md:mt-4">
                <h4 className="text-xs sm:text-sm font-semibold text-surface-900 mb-2 sm:mb-3 flex items-center gap-2">
                  <Ruler className="w-3 h-3 sm:w-4 sm:h-4 text-brand-600" />
                  O'lchamlar (ixtiyoriy)
                </h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">Eni (sm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="50"
                      value={formData.dimensions.width}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, width: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">Bo'yi (mm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="30"
                      value={formData.dimensions.height}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, height: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">Uzunligi (sm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="100"
                      value={formData.dimensions.length}
                      onChange={e => setFormData({...formData, dimensions: {...formData.dimensions, length: e.target.value}})}
                    />
                  </div>
                </div>
              </div>

              {/* O'lchov birligi va Miqdor */}
              <div className="border-t border-surface-200 pt-2 sm:pt-3 md:pt-4 mt-2 sm:mt-3 md:mt-4">
                <h4 className="text-xs sm:text-sm font-semibold text-surface-900 mb-2 sm:mb-3 flex items-center gap-2">
                  <Ruler className="w-3 h-3 sm:w-4 sm:h-4 text-brand-600" />
                  O'lchov birligi va Miqdor
                </h4>
                
                {/* Birlik tanlash va miqdor kiritish - yon-yoniga */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-2 sm:mb-4">
                  <div className="w-full sm:w-1/3">
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">Birlik</label>
                    <select 
                      className="input text-sm"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value as any})}
                    >
                      <option value="dona">Dona</option>
                      <option value="metr">Metr</option>
                      <option value="rulon">Rulon</option>
                      <option value="karobka">Karobka</option>
                      <option value="kg">Kilogram</option>
                      <option value="gram">Gram</option>
                      <option value="litr">Litr</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">
                      Miqdor ({formData.unit === 'dona' ? 'dona' : formData.unit === 'metr' ? 'metr' : formData.unit === 'rulon' ? 'rulon' : formData.unit === 'karobka' ? 'karobka' : formData.unit === 'kg' ? 'kg' : formData.unit === 'gram' ? 'gram' : 'litr'})
                    </label>
                    <input 
                      type="text" 
                      className="input text-sm font-semibold text-center cursor-pointer hover:bg-surface-50 transition-colors" 
                      placeholder="0" 
                      value={formatInputNumber(formData.quantity)} 
                      onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})}
                      onClick={(e) => e.currentTarget.select()}
                      required 
                    />
                  </div>
                </div>

                {/* Metr tanlanganda - Rulon sozlamalari */}
                {formData.unit === 'metr' && (
                  <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">🎞️ 1 rulonda necha metr?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="30"
                          value={formData.metersPerRoll}
                          onChange={e => setFormData({...formData, metersPerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">Rulon narxi (so'm)</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="0"
                          value={formatInputNumber(formData.pricePerRoll)}
                          onChange={e => setFormData({...formData, pricePerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.metersPerRoll && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          {formData.quantity} metr = {(Number(formData.quantity) / Number(formData.metersPerRoll)).toFixed(1)} rulon
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Dona tanlanganda - Karobka sozlamalari */}
                {formData.unit === 'dona' && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">📦 1 karobkada necha dona?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="12"
                          value={formData.unitsPerBox}
                          onChange={e => setFormData({...formData, unitsPerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">Karobka narxi (so'm)</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="0"
                          value={formatInputNumber(formData.pricePerBox)}
                          onChange={e => setFormData({...formData, pricePerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.unitsPerBox && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">
                          {formData.quantity} dona = {(Number(formData.quantity) / Number(formData.unitsPerBox)).toFixed(1)} karobka
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Rulon tanlanganda - 1 rulonda necha metr */}
                {formData.unit === 'rulon' && (
                  <div className="bg-purple-50 rounded-xl p-3 mb-3 border border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-purple-700 mb-1 block">1 rulonda necha metr?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="30"
                          value={formData.metersPerRoll}
                          onChange={e => setFormData({...formData, metersPerRoll: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.metersPerRoll && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-semibold text-purple-700">
                          {formData.quantity} rulon = {formatNumber(Number(formData.quantity) * Number(formData.metersPerRoll))} metr
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Karobka tanlanganda - 1 karobkada necha dona */}
                {formData.unit === 'karobka' && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1">
                        <label className="text-xs font-medium text-orange-700 mb-1 block">1 karobkada necha dona?</label>
                        <input 
                          type="text" 
                          className="input text-sm" 
                          placeholder="12"
                          value={formData.unitsPerBox}
                          onChange={e => setFormData({...formData, unitsPerBox: parseNumber(e.target.value)})}
                        />
                      </div>
                    </div>
                    {/* Avtomatik hisoblash */}
                    {formData.unitsPerBox && formData.quantity && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <RotateCcw className="w-4 h-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-700">
                          {formData.quantity} karobka = {formatNumber(Number(formData.quantity) * Number(formData.unitsPerBox))} dona
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
                </>
              )}

              {/* Bosqich 3: Narxlar */}
              {currentStep === 3 && (
                <>
              {/* Narxlar */}
              <div className="border-t border-surface-200 pt-2 sm:pt-3 md:pt-4 mt-2 sm:mt-3 md:mt-4">
                <h4 className="text-xs sm:text-sm font-semibold text-surface-900 mb-2 sm:mb-3 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  Narxlar (5 ta)
                </h4>
                
                {/* Tan narxi va Dona narxi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">💵 Tan narxi (Dollar)</label>
                    <div className="flex gap-1 sm:gap-2">
                      <input 
                        type="text" 
                        className="input flex-1 text-sm" 
                        placeholder="0.00"
                        value={formData.costPriceInDollar}
                        onChange={e => {
                          // Faqat raqam va nuqta qabul qilish
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          // Bir nechta nuqtani oldini olish
                          const parts = value.split('.');
                          const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value;
                          
                          const dollarPrice = parseFloat(cleanValue) || 0;
                          setFormData({
                            ...formData, 
                            costPriceInDollar: cleanValue,
                            costPrice: (dollarPrice * dollarRate).toString()
                          });
                        }}
                      />
                      <span className="text-[10px] sm:text-xs font-bold text-surface-600 flex items-center px-1.5 sm:px-2 bg-surface-100 rounded">$</span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-surface-500 mt-0.5 sm:mt-1">
                      = {formatNumber((parseFloat(formData.costPriceInDollar) || 0) * dollarRate)} so'm
                    </p>
                  </div>
                  <div>
                    <label className="text-[10px] sm:text-xs font-medium text-surface-600 mb-0.5 sm:mb-1 block">🏷️ Dona narxi (so'm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="0"
                      value={formatInputNumber(formData.unitPrice)}
                      onChange={e => setFormData({...formData, unitPrice: parseNumber(e.target.value)})}
                      required
                    />
                  </div>
                </div>

                {/* Dollar kursi sozlash */}
                <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
                  <label className="text-xs font-medium text-blue-700 mb-1 block">💱 Dollar kursi (1 $ = ? so'm)</label>
                  <input 
                    type="number" 
                    className="input" 
                    placeholder="12500"
                    step="1"
                    min="0"
                    value={dollarRate}
                    onChange={e => setDollarRate(parseFloat(e.target.value) || 12500)}
                  />
                  <p className="text-[10px] text-blue-600 mt-1">Hozirgi kurs: 1 $ = {formatNumber(dollarRate)} so'm</p>
                </div>

                {/* Foizli chegirmalar - 3 ta daraja */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-2.5 border border-emerald-200 shadow-sm">
                  <h5 className="text-[11px] font-semibold text-emerald-800 mb-2 flex items-center gap-1">
                    🎯 Chegirmalar
                  </h5>
                  
                  {/* Tier 1 */}
                  <div className="bg-white rounded-2xl p-2 mb-1.5 border border-emerald-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">1</span>
                      <span className="text-[9px] text-emerald-500 font-medium">Birinci daraja</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] justify-center">
                      <input 
                        type="text" 
                        className="input text-xs w-14 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="1"
                        value={formData.pricingTiers.tier1.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">-</span>
                      <input 
                        type="text" 
                        className="input text-xs w-14 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="5"
                        value={formData.pricingTiers.tier1.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">=</span>
                      <input 
                        type="text" 
                        className="input text-xs w-16 h-9 text-center font-bold rounded-2xl border-indigo-300 bg-indigo-50/60 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200" 
                        placeholder="15"
                        value={formData.pricingTiers.tier1.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier1: {...formData.pricingTiers.tier1, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] font-bold text-indigo-600">%</span>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="bg-white rounded-2xl p-2 mb-1.5 border border-blue-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">2</span>
                      <span className="text-[9px] text-blue-500 font-medium">Ikkinchi daraja</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] justify-center">
                      <input 
                        type="text" 
                        className="input text-xs w-14 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="6"
                        value={formData.pricingTiers.tier2.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">-</span>
                      <input 
                        type="text" 
                        className="input text-xs w-14 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="20"
                        value={formData.pricingTiers.tier2.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">=</span>
                      <input 
                        type="text" 
                        className="input text-xs w-16 h-9 text-center font-bold rounded-2xl border-indigo-300 bg-indigo-50/60 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200" 
                        placeholder="13"
                        value={formData.pricingTiers.tier2.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier2: {...formData.pricingTiers.tier2, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] font-bold text-indigo-600">%</span>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="bg-white rounded-2xl p-2 border border-purple-100 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">3</span>
                      <span className="text-[9px] text-purple-500 font-medium">Uchinchi daraja</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] justify-center">
                      <input 
                        type="text" 
                        className="input text-xs w-14 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="21"
                        value={formData.pricingTiers.tier3.minQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, minQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">-</span>
                      <input 
                        type="text" 
                        className="input text-xs w-16 h-9 text-center rounded-2xl border-violet-200 bg-violet-50/40 focus:border-violet-400 focus:ring-violet-200" 
                        placeholder="100"
                        value={formData.pricingTiers.tier3.maxQuantity}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, maxQuantity: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] text-violet-500 font-semibold">=</span>
                      <input 
                        type="text" 
                        className="input text-xs w-16 h-9 text-center font-bold rounded-2xl border-indigo-300 bg-indigo-50/60 text-indigo-700 focus:border-indigo-500 focus:ring-indigo-200" 
                        placeholder="11"
                        value={formData.pricingTiers.tier3.discountPercent}
                        onChange={e => setFormData({
                          ...formData, 
                          pricingTiers: {
                            ...formData.pricingTiers,
                            tier3: {...formData.pricingTiers.tier3, discountPercent: e.target.value}
                          }
                        })}
                      />
                      <span className="text-[11px] font-bold text-indigo-600">%</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-emerald-600 mt-2 italic">
                    * Masalan: 1-5 dona = 15% chegirma, 6-20 dona = 13% chegirma, 21-100 dona = 11% chegirma
                  </p>
                </div>
                
                {/* Asosiy narx - birlikka qarab (eski) */}
                <div className="mt-4 mb-4 hidden">
                  <label className="text-xs font-medium text-surface-600 mb-1 block">
                    {formData.unit === 'metr' ? '📏 Metr narxi' : 
                     formData.unit === 'rulon' ? '🎞️ Rulon narxi' : 
                     formData.unit === 'karobka' ? '📦 Karobka narxi' : 
                     formData.unit === 'kg' ? '⚖️ Kg narxi' : 
                     formData.unit === 'gram' ? '⚖️ Gram narxi' : 
                     formData.unit === 'litr' ? '💧 Litr narxi' : 
                     '💰 Dona narxi'} (so'm)
                  </label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="0"
                    value={formatInputNumber(formData.currentPrice)}
                    onChange={e => setFormData({...formData, currentPrice: parseNumber(e.target.value)})}
                  />
                </div>

                {/* Metr narxi - diapazon bo'yicha */}
                {(formData.unit === 'metr' || formData.unit === 'rulon') && (
                  <div className="bg-blue-50 rounded-xl p-3 mb-3 border border-blue-200">
                    <label className="text-xs font-medium text-blue-700 mb-2 block">📏 Metr narxlari (diapazon bo'yicha)</label>
                    {formData.meterPriceRanges.map((range, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-2">
                        <input 
                          type="text" 
                          className="input text-sm w-16" 
                          placeholder="1"
                          value={range.from}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].from = e.target.value;
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <input 
                          type="text" 
                          className="input text-sm w-16" 
                          placeholder="10"
                          value={range.to}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].to = e.target.value;
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <input 
                          type="text" 
                          className="input text-sm flex-1" 
                          placeholder="Narx"
                          value={formatInputNumber(range.price)}
                          onChange={e => {
                            const newRanges = [...formData.meterPriceRanges];
                            newRanges[idx].price = parseNumber(e.target.value);
                            setFormData({...formData, meterPriceRanges: newRanges});
                          }}
                        />
                        <span className="text-xs text-blue-600">so'm</span>
                        {formData.meterPriceRanges.length > 1 && (
                          <button 
                            type="button"
                            onClick={() => {
                              const newRanges = formData.meterPriceRanges.filter((_, i) => i !== idx);
                              setFormData({...formData, meterPriceRanges: newRanges});
                            }}
                            className="w-6 h-6 bg-red-100 text-red-600 rounded flex items-center justify-center hover:bg-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => setFormData({
                        ...formData, 
                        meterPriceRanges: [...formData.meterPriceRanges, { from: '', to: '', price: '' }]
                      })}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Diapazon qo'shish
                    </button>
                  </div>
                )}

                {/* Kg narxi */}
                {formData.unit === 'kg' && (
                  <div className="mb-3">
                    <label className="text-xs font-medium text-surface-600 mb-1 block">⚖️ Kg narxi (so'm)</label>
                    <input 
                      type="text" 
                      className="input text-sm" 
                      placeholder="0"
                      value={formatInputNumber(formData.pricePerKg)}
                      onChange={e => setFormData({...formData, pricePerKg: parseNumber(e.target.value)})}
                    />
                  </div>
                )}
              </div>
                </>
              )}
            </div>

            {/* Footer - Sticky Buttons with Stepper Navigation - MOBILE OPTIMIZED */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50 px-3 sm:px-6 py-3 sm:py-5 border-t border-slate-200/50 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              {/* Mobile: Vertikal layout, Desktop: Horizontal */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                {/* Orqaga tugmasi - Mobile: Full width, Desktop: Auto */}
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="w-full sm:w-auto px-4 sm:px-7 py-2.5 sm:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <span>← Orqaga</span>
                  </button>
                )}
                
                {/* Bekor va Keyingisi/Saqlash - Mobile: Full width row, Desktop: Auto */}
                <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 sm:flex-none px-3 sm:px-7 py-2.5 sm:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline sm:hidden">Bekor</span>
                    <span className="xs:hidden sm:inline">Bekor qilish</span>
                  </button>
                  
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="flex-1 sm:flex-none px-4 sm:px-10 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <span>Keyingisi →</span>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!!codeError || uploading}
                      className="flex-1 sm:flex-none px-4 sm:px-10 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-1.5 sm:gap-2 relative overflow-hidden group text-sm sm:text-base"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                      <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 relative z-10" />
                      <span className="relative z-10">{editingProduct ? 'Yangilash' : 'Saqlash'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="overlay -z-10" onClick={() => setShowQRModal(false)} />
          <div className="modal w-full sm:w-auto max-w-md relative z-10 max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-2 -mt-2 pt-2 border-b border-surface-100">
              <h3 className="text-lg font-semibold text-surface-900">QR Label - Xprinter</h3>
              <button onClick={() => setShowQRModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex flex-col items-center">
              {/* QRPrintLabel komponenti */}
              <QRPrintLabel
                productId={selectedProduct._id}
                code={selectedProduct.code}
                name={selectedProduct.name}
                price={selectedProduct.price}
                unit={selectedProduct.unit}
                dimensions={
                  (selectedProduct as any).dimensions 
                    ? [
                        (selectedProduct as any).dimensions.width,
                        (selectedProduct as any).dimensions.height,
                        (selectedProduct as any).dimensions.length
                      ].filter(Boolean).join(' × ')
                    : ''
                }
                labelWidth={60}
                labelHeight={40}
                copies={1}
                onPrint={() => setShowQRModal(false)}
              />
              
              {/* QR Preview - Ultra Fast */}
              <div className="mt-6 pt-6 border-t border-surface-200 w-full">
                <p className="text-sm font-medium text-surface-700 mb-3 text-center">Katta QR (yuklab olish uchun)</p>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl border border-surface-200">
                    <QRCodeGenerator
                      ref={qrContainerRef}
                      value={qrValue}
                      size={150}
                      level="H"
                      onError={(error) => {
                        console.error('QR generation error:', error);
                      }}
                    />
                  </div>
                </div>
                <button onClick={downloadQR} className="btn-secondary w-full">
                  <Download className="w-4 h-4" />
                  PNG yuklab olish
                </button>
              </div>
              
              {/* Xprinter Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700 w-full">
                <p className="font-medium mb-1">📋 Xprinter sozlamalari:</p>
                <ul className="space-y-0.5">
                  <li>• Label o'lchami: 40mm x 30mm</li>
                  <li>• QR o'lchami: 20mm x 20mm</li>
                  <li>• Margins: None</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Statistics Modal - Compact & Professional */}
      {showStatsModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div className="overlay" onClick={() => setShowStatsModal(false)} />
          <div className="modal w-full max-w-3xl p-4 sm:p-5 relative z-50 max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
            {/* Header - Compact with Image */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-200">
              <div className="flex items-center gap-4">
                {/* Product Image */}
                {getProductImage(selectedProduct) ? (
                  <img 
                    src={getProductImage(selectedProduct)!} 
                    alt={selectedProduct.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl object-cover border-2 border-brand-200 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Package className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-surface-900">{selectedProduct.name}</h3>
                  <p className="text-sm sm:text-base text-surface-500">Sotuv statistikasi</p>
                </div>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="btn-icon-sm"><X className="w-4 h-4" /></button>
            </div>

            {statsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="spinner text-brand-600 w-8 h-8 mb-3" />
                <p className="text-sm text-surface-500">Yuklanmoqda...</p>
              </div>
            ) : productStats ? (
              <div className="space-y-4">
                {/* Summary Cards - Compact & Professional */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
                        <ShoppingCart className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Sotilgan</span>
                    </div>
                    <p className="text-xl font-bold text-blue-700 mb-0.5">{formatNumber(productStats.stats.totalSold)}</p>
                    <p className="text-[10px] text-blue-500">{productStats.stats.totalReceipts} ta chek</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 bg-green-500 rounded-md flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-green-600 uppercase tracking-wide">Daromad</span>
                    </div>
                    <p className="text-xl font-bold text-green-700 mb-0.5">{formatNumber(productStats.stats.totalRevenue)}</p>
                    <p className="text-[10px] text-green-500">so'm</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border border-purple-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 bg-purple-500 rounded-md flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide">Top kun</span>
                    </div>
                    {productStats.stats.bestDay ? (
                      <>
                        <p className="text-base font-bold text-purple-700 mb-0.5">{productStats.stats.bestDay.date}</p>
                        <p className="text-[10px] text-purple-500">{productStats.stats.bestDay.count} dona</p>
                      </>
                    ) : (
                      <p className="text-xs text-purple-500">Ma'lumot yo'q</p>
                    )}
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border border-orange-200">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-6 h-6 bg-orange-500 rounded-md flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Top soat</span>
                    </div>
                    {productStats.stats.bestHour ? (
                      <>
                        <p className="text-base font-bold text-orange-700 mb-0.5">{productStats.stats.bestHour.label}</p>
                        <p className="text-[10px] text-orange-500">{productStats.stats.bestHour.count} dona</p>
                      </>
                    ) : (
                      <p className="text-xs text-orange-500">Ma'lumot yo'q</p>
                    )}
                  </div>
                </div>

                {/* Hourly Stats Bar Chart - Compact */}
                <div className="bg-white rounded-lg border border-surface-200 p-3">
                  <h4 className="text-xs font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-brand-100 rounded flex items-center justify-center">
                      <Clock className="w-3 h-3 text-brand-600" />
                    </div>
                    Soatlik statistika
                  </h4>
                  <div className="flex items-end gap-0.5 h-24">
                    {productStats.hourlyStats.map((hour, idx) => {
                      const maxCount = Math.max(...productStats.hourlyStats.map(h => h.count), 1);
                      const heightPercent = (hour.count / maxCount) * 100;
                      const isBestHour = productStats.stats.bestHour?.hour === hour.hour;
                      
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center group relative">
                          <div 
                            className={`w-full rounded-t transition-all ${isBestHour ? 'bg-gradient-to-t from-orange-500 to-amber-400' : 'bg-gradient-to-t from-brand-500 to-brand-400'} hover:opacity-80`}
                            style={{ height: `${Math.max(heightPercent, 3)}%` }}
                          />
                          <span className="text-[7px] text-surface-400 mt-0.5">{hour.hour}</span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-surface-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                            {hour.label}: {hour.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Period Selector & Chart - Compact */}
                <div className="bg-white rounded-lg border border-surface-200 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-surface-900 flex items-center gap-1.5">
                      <div className="w-5 h-5 bg-brand-100 rounded flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-brand-600" />
                      </div>
                      Sotuv tarixi
                    </h4>
                    <div className="flex gap-1">
                      {[
                        { value: '7', label: '7' },
                        { value: '30', label: '30' },
                        { value: '90', label: '90' },
                        { value: '365', label: '1y' },
                        { value: 'all', label: 'All' }
                      ].map(p => (
                        <button
                          key={p.value}
                          onClick={() => handlePeriodChange(p.value)}
                          className={`px-2 py-1 text-[10px] font-semibold rounded transition-all ${
                            statsPeriod === p.value 
                              ? 'bg-brand-600 text-white shadow-sm' 
                              : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Oylik statistika (yillik ko'rinish uchun) - Compact */}
                  {(statsPeriod === '365' || statsPeriod === 'all') && productStats.monthlyStats && productStats.monthlyStats.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {productStats.monthlyStats.map((month, idx) => {
                        const maxCount = Math.max(...productStats.monthlyStats.map(m => m.count), 1);
                        const widthPercent = (month.count / maxCount) * 100;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-surface-600 w-16 flex-shrink-0 font-medium">{month.label}</span>
                            <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full flex items-center justify-end pr-1.5 transition-all"
                                style={{ width: `${Math.max(widthPercent, 4)}%` }}
                              >
                                {month.count > 0 && (
                                  <span className="text-[9px] font-bold text-white">{month.count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-surface-500 w-20 text-right">
                              {formatNumber(month.revenue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {productStats.periodStats && productStats.periodStats.slice(-30).map((day, idx) => {
                        const maxCount = Math.max(...productStats.periodStats.map(d => d.count), 1);
                        const widthPercent = (day.count / maxCount) * 100;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-[10px] text-surface-600 w-14 flex-shrink-0 font-medium">
                              {new Date(day.date).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                            </span>
                            <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full flex items-center justify-end pr-1.5 transition-all"
                                style={{ width: `${Math.max(widthPercent, 4)}%` }}
                              >
                                {day.count > 0 && (
                                  <span className="text-[9px] font-bold text-white">{day.count}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-surface-500 w-20 text-right">
                              {formatNumber(day.revenue)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent Sales Table - Compact */}
                <div className="bg-white rounded-lg border border-surface-200 p-3">
                  <h4 className="text-xs font-semibold text-surface-900 mb-3 flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-brand-100 rounded flex items-center justify-center">
                      <ShoppingCart className="w-3 h-3 text-brand-600" />
                    </div>
                    Oxirgi sotuvlar
                  </h4>
                  {productStats.recentSales.length > 0 ? (
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-surface-200">
                            <th className="text-left py-1.5 px-2 text-surface-600 font-semibold text-[10px]">Sana</th>
                            <th className="text-center py-1.5 px-2 text-surface-600 font-semibold text-[10px]">Miqdor</th>
                            <th className="text-right py-1.5 px-2 text-surface-600 font-semibold text-[10px]">Narx</th>
                            <th className="text-right py-1.5 px-2 text-surface-600 font-semibold text-[10px]">Jami</th>
                            <th className="text-left py-1.5 px-2 text-surface-600 font-semibold text-[10px]">Mijoz</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productStats.recentSales.map((sale, idx) => (
                            <tr key={idx} className="border-b border-surface-100 hover:bg-surface-50">
                              <td className="py-1.5 px-2 text-surface-700 text-[10px]">
                                {new Date(sale.date).toLocaleString('uz-UZ', { 
                                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
                                })}
                              </td>
                              <td className="py-1.5 px-2 text-center">
                                <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded-full text-[10px] font-semibold">
                                  {sale.quantity}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-right text-surface-600 text-[10px]">{formatNumber(sale.price)}</td>
                              <td className="py-1.5 px-2 text-right font-semibold text-surface-900 text-[10px]">{formatNumber(sale.total)}</td>
                              <td className="py-1.5 px-2 text-surface-600 text-[10px]">
                                {sale.customer?.name || 'Noma\'lum'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-surface-500">
                      <ShoppingCart className="w-8 h-8 mx-auto mb-1.5 text-surface-300" />
                      <p className="text-xs">Hali sotuvlar yo'q</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-surface-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-surface-300" />
                <p className="text-sm">Statistika topilmadi</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mahsulot ma'lumotlari modali - Professional Stepper Design */}
      {showProductDetailsModal && selectedProductForDetails && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-3 md:p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-black/70 backdrop-blur-sm transition-opacity duration-100" 
            onClick={() => setShowProductDetailsModal(false)}
          />
          
          {/* Modal oyna - MOBILE OPTIMIZED */}
          <div 
            className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-full sm:max-w-sm md:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border-t sm:border border-white/20"
          >
            {/* Header - Gradient with animation */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-3 sm:px-6 py-3 sm:py-5 border-b border-white/20 shadow-lg">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-white flex items-center gap-2 mb-1 truncate">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                    </div>
                    <span className="truncate">Mahsulot ma'lumotlari</span>
                  </h3>
                  <p className="text-[10px] xs:text-xs sm:text-sm text-white/90 font-medium truncate">
                    {selectedProductForDetails.name}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowProductDetailsModal(false)} 
                  className="p-1.5 sm:p-2 md:p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 group ml-2 sm:ml-3 flex-shrink-0"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white group-hover:text-white/90" />
                </button>
              </div>
              
              {/* Stepper - MOBILE OPTIMIZED */}
              <div className="flex items-center justify-between">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <button
                        type="button"
                        onClick={() => setDetailsStep(step)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                          detailsStep === step
                            ? 'bg-white text-blue-600 shadow-lg scale-110'
                            : detailsStep > step
                            ? 'bg-green-500 text-white'
                            : 'bg-white/20 text-white/60'
                        }`}
                      >
                        {detailsStep > step ? '✓' : step}
                      </button>
                      <span className={`text-[9px] xs:text-[10px] sm:text-xs mt-0.5 sm:mt-1 font-medium ${
                        detailsStep === step ? 'text-white' : 'text-white/60'
                      }`}>
                        {step === 1 ? 'Asosiy' : step === 2 ? 'O\'lcham' : 'Narx'}
                      </span>
                    </div>
                    {step < 3 && (
                      <div className={`h-0.5 flex-1 mx-1 sm:mx-2 ${
                        detailsStep > step ? 'bg-green-500' : 'bg-white/20'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Content - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(95vh-220px)] sm:max-h-[calc(90vh-200px)] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              {/* Bosqich 1: Asosiy ma'lumotlar */}
              {detailsStep === 1 && (
                <>
                  {/* Rasmlar */}
                  {selectedProductForDetails.images && selectedProductForDetails.images.length > 0 && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-surface-700 mb-2 block">📸 Rasmlar</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {selectedProductForDetails.images.map((img: any, idx: number) => (
                          <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-surface-100">
                            <img 
                              src={`${UPLOADS_URL}${typeof img === 'string' ? img : img.path}`}
                              alt={`${selectedProductForDetails.name} ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kod va Nomi */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">Kod</label>
                      <p className="text-sm sm:text-base font-semibold text-surface-900">{selectedProductForDetails.code}</p>
                    </div>
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">Nomi</label>
                      <p className="text-sm sm:text-base font-semibold text-surface-900">{selectedProductForDetails.name}</p>
                    </div>
                  </div>

                  {/* Izoh */}
                  {(selectedProductForDetails as any).description && (
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">Izoh</label>
                      <p className="text-sm text-surface-700">{(selectedProductForDetails as any).description}</p>
                    </div>
                  )}

                  {/* Kategoriya */}
                  <div className="bg-surface-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-surface-500 mb-1 block">📂 Kategoriya</label>
                    <p className="text-sm sm:text-base font-semibold text-surface-900">
                      {(selectedProductForDetails as any).category || 'Boshqa'}
                    </p>
                  </div>

                  {/* Miqdor */}
                  <div className="bg-surface-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-surface-500 mb-1 block">📦 Miqdor</label>
                    <p className={`text-lg sm:text-xl font-bold ${
                      selectedProductForDetails.quantity > 10 ? 'text-success-600' :
                      selectedProductForDetails.quantity > 0 ? 'text-warning-600' :
                      'text-danger-600'
                    }`}>
                      {formatNumber(selectedProductForDetails.quantity)} {(selectedProductForDetails as any).unit || 'dona'}
                    </p>
                  </div>
                </>
              )}

              {/* Bosqich 2: O'lchamlar */}
              {detailsStep === 2 && (
                <>
                  {/* O'lchov birligi */}
                  <div className="bg-surface-50 rounded-lg p-3">
                    <label className="text-xs font-medium text-surface-500 mb-1 block">📏 O'lchov birligi</label>
                    <p className="text-sm sm:text-base font-semibold text-surface-900 capitalize">
                      {(selectedProductForDetails as any).unit || 'dona'}
                    </p>
                  </div>

                  {/* O'lchamlar */}
                  {(selectedProductForDetails as any).dimensions && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-surface-700 mb-2 block">📐 O'lchamlar</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(selectedProductForDetails as any).dimensions.width && (
                          <div className="bg-surface-50 rounded-lg p-3">
                            <label className="text-xs font-medium text-surface-500 mb-1 block">Eni (sm)</label>
                            <p className="text-sm font-semibold text-surface-900">
                              {(selectedProductForDetails as any).dimensions.width}
                            </p>
                          </div>
                        )}
                        {(selectedProductForDetails as any).dimensions.height && (
                          <div className="bg-surface-50 rounded-lg p-3">
                            <label className="text-xs font-medium text-surface-500 mb-1 block">Bo'yi (mm)</label>
                            <p className="text-sm font-semibold text-surface-900">
                              {(selectedProductForDetails as any).dimensions.height}
                            </p>
                          </div>
                        )}
                        {(selectedProductForDetails as any).dimensions.length && (
                          <div className="bg-surface-50 rounded-lg p-3">
                            <label className="text-xs font-medium text-surface-500 mb-1 block">Uzunligi (sm)</label>
                            <p className="text-sm font-semibold text-surface-900">
                              {(selectedProductForDetails as any).dimensions.length}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rulon/Karobka ma'lumotlari */}
                  {(selectedProductForDetails as any).unit === 'rulon' && (selectedProductForDetails as any).metersPerRoll && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <label className="text-xs font-medium text-blue-700 mb-1 block">🎯 Rulon ma'lumotlari</label>
                      <p className="text-sm font-semibold text-blue-900">
                        1 rulonda {(selectedProductForDetails as any).metersPerRoll} metr
                      </p>
                    </div>
                  )}

                  {(selectedProductForDetails as any).unit === 'karobka' && (selectedProductForDetails as any).unitsPerBox && (
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <label className="text-xs font-medium text-purple-700 mb-1 block">📦 Karobka ma'lumotlari</label>
                      <p className="text-sm font-semibold text-purple-900">
                        1 karobkada {(selectedProductForDetails as any).unitsPerBox} dona
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Bosqich 3: Narxlar (TAN NARXISIZ) */}
              {detailsStep === 3 && (
                <>
                  {/* Hozirgi narx */}
                  {(selectedProductForDetails as any).currentPrice && (
                    <div className="bg-gradient-to-br from-brand-50 to-purple-50 rounded-lg p-4 border-2 border-brand-200">
                      <label className="text-xs font-medium text-brand-700 mb-1 block">💰 Hozirgi narx</label>
                      <p className="text-2xl font-bold text-brand-600">
                        {formatNumber((selectedProductForDetails as any).currentPrice)} so'm
                      </p>
                    </div>
                  )}

                  {/* Dona narxi */}
                  {(selectedProductForDetails as any).unitPrice && (
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">🔢 Dona narxi</label>
                      <p className="text-lg font-bold text-surface-900">
                        {formatNumber((selectedProductForDetails as any).unitPrice)} so'm
                      </p>
                    </div>
                  )}

                  {/* Karobka narxi */}
                  {(selectedProductForDetails as any).boxPrice && (
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">📦 Karobka narxi</label>
                      <p className="text-lg font-bold text-surface-900">
                        {formatNumber((selectedProductForDetails as any).boxPrice)} so'm
                      </p>
                    </div>
                  )}

                  {/* Oldingi narx */}
                  {(selectedProductForDetails as any).previousPrice && (
                    <div className="bg-surface-50 rounded-lg p-3">
                      <label className="text-xs font-medium text-surface-500 mb-1 block">⏮️ Oldingi narx</label>
                      <p className="text-base font-semibold text-surface-700 line-through">
                        {formatNumber((selectedProductForDetails as any).previousPrice)} so'm
                      </p>
                    </div>
                  )}

                  {/* Pricing Tiers - Foizli chegirmalar */}
                  {(selectedProductForDetails as any).pricingTiers && (
                    <div>
                      <label className="text-xs sm:text-sm font-semibold text-surface-700 mb-2 block">🎯 Chegirmalar</label>
                      <div className="space-y-2">
                        {Object.entries((selectedProductForDetails as any).pricingTiers).map(([key, tier]: [string, any]) => (
                          <div key={key} className="bg-green-50 rounded-lg p-3 border border-green-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-green-700">
                                {tier.minQuantity}-{tier.maxQuantity} dona
                              </span>
                              <span className="text-sm font-bold text-green-900">
                                {tier.discountPercent}% chegirma
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer - Navigation Buttons */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-200/50 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)]">
              <div className="flex items-center justify-between gap-2">
                {detailsStep > 1 && (
                  <button
                    onClick={() => setDetailsStep(detailsStep - 1)}
                    className="px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm"
                  >
                    ← Orqaga
                  </button>
                )}
                
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    onClick={() => setShowProductDetailsModal(false)}
                    className="px-4 py-2 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm"
                  >
                    Yopish
                  </button>
                  
                  {detailsStep < 3 && (
                    <button
                      onClick={() => setDetailsStep(detailsStep + 1)}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all text-sm"
                    >
                      Keyingisi →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - Rasm kattalashtirish */}
      {showImageModal && selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop - orqada */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-300" 
            onClick={() => setShowImageModal(false)} 
          />
          
          {/* Modal Content - oldinda */}
          <div className="relative z-10 max-w-4xl w-full max-h-[90vh] animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-12 right-0 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:rotate-90 group"
            >
              <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
            </button>
            
            {/* Image Container */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-4 bg-gradient-to-r from-brand-600 to-purple-600">
                <h3 className="text-lg font-bold text-white">{selectedProduct.name}</h3>
                <p className="text-sm text-white/80">#{selectedProduct.code}</p>
              </div>
              
              <div className="p-4 max-h-[70vh] overflow-y-auto">
                {selectedProduct.images && selectedProduct.images.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {selectedProduct.images.map((img: any, idx: number) => {
                      const imagePath = typeof img === 'string' ? img : img.path;
                      return (
                        <img
                          key={idx}
                          src={`${UPLOADS_URL}${imagePath}`}
                          alt={`${selectedProduct.name} - ${idx + 1}`}
                          className="w-full h-auto rounded-lg shadow-lg"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-surface-400">
                    <Package className="w-16 h-16 mb-4" />
                    <p>Rasm mavjud emas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch QR Print Modal */}
      {showBatchQRModal && (
        <BatchQRPrint
          products={products.filter(p => selectedProducts.has(p._id))}
          onClose={() => {
            setShowBatchQRModal(false);
            setSelectionMode(false);
            setSelectedProducts(new Set());
          }}
        />
      )}

      {/* Floating Search Button - Appears after scrolling down */}
      {showFloatingSearch && !floatingSearchOpen && (
        <button
          onClick={() => setFloatingSearchOpen(true)}
          className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-40"
          title="Qidirish"
        >
          <Search className="w-6 h-6" />
        </button>
      )}

      {/* Floating Search Input - Slides from right */}
      {floatingSearchOpen && (
        <div className="fixed bottom-24 right-6 lg:bottom-8 lg:right-8 z-40 flex items-center gap-2 animate-slide-in-right">
          <div className="relative flex-1 min-w-[300px] sm:min-w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-600" />
            <input
              type="text"
              value={floatingSearchQuery}
              onChange={(e) => {
                setFloatingSearchQuery(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Tovar qidirish..."
              className="w-full pl-12 pr-12 py-4 bg-white border-2 border-purple-200 rounded-2xl shadow-2xl text-base focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
              autoFocus
            />
            {floatingSearchQuery && (
              <button
                onClick={() => {
                  setFloatingSearchQuery('');
                  setSearchQuery('');
                }}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setFloatingSearchOpen(false);
              setFloatingSearchQuery('');
            }}
            className="w-14 h-14 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105"
            title="Yopish"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>
        </div>
      )}
      
      </div>
      
      {/* Category Selection Modal */}
      {showCategoryModal && selectedProductForCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative z-10" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
            <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Kategoriyani tanlang</h3>
                <p className="text-sm text-white/80 truncate">{selectedProductForCategory.name}</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="hover:bg-white/20 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {categories.map((category) => {
                  const isSelected = (selectedProductForCategory as any).category === category.name;
                  return (
                    <button
                      key={category._id}
                      onClick={() => handleCategoryUpdate(category.name)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg scale-105'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{category.name}</span>
                        {isSelected && <Check className="w-5 h-5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
