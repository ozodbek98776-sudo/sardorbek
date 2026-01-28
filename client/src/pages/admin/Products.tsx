import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Header from '../../components/Header';
import { Plus, Minus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, Upload, Printer, Ruler, Box, Scale, RotateCcw, BarChart3, Clock, Calendar, TrendingUp, ShoppingCart, CheckSquare, Save } from 'lucide-react';
import { Product, Warehouse } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { QRCodeSVG } from 'qrcode.react';
import QRCode from 'qrcode';
import { FRONTEND_URL } from '../../config/api';
import QRPrintLabel from '../../components/QRPrintLabel';
import BatchQRPrint from '../../components/BatchQRPrint';
import logger from '../../utils/logger';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
const UPLOADS_URL = (import.meta as any).env?.VITE_UPLOADS_URL || 'http://localhost:5000';

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
  const [products, setProducts] = useState<Product[]>([]); // Barcha mahsulotlar
  const [currentPage, setCurrentPage] = useState(1); // Joriy sahifa
  const [totalPages, setTotalPages] = useState(1); // Jami sahifalar
  const [totalProducts, setTotalProducts] = useState(0); // Jami mahsulotlar soni
  const [loadingMore, setLoadingMore] = useState(false); // Yana yuklanmoqda
  const [mainWarehouse, setMainWarehouse] = useState<Warehouse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showBatchQRModal, setShowBatchQRModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [productStats, setProductStats] = useState<ProductStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState<string>('7'); // 7, 30, 90, 365, all
  
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dollarRate, setDollarRate] = useState(12500);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityMode, setQuantityMode] = useState<'add' | 'subtract'>('add');
  const [quantityInput, setQuantityInput] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ⚡ Debounce qidiruv - 300ms kutish
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal ochilganda body scroll ni to'xtatish
  useEffect(() => {
    if (showModal || showQRModal || showBatchQRModal || showStatsModal || showQuantityModal || showImageModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup - component unmount bo'lganda
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showQRModal, showBatchQRModal, showStatsModal, showQuantityModal, showImageModal]);
  const [formData, setFormData] = useState({
    code: '', name: '', description: '', quantity: '',
    previousPrice: '', 
    currentPrice: '', // Dona narxi
    costPrice: '', // Tan narxi so'mda
    costPriceInDollar: '', // Tan narxi dollarda
    unitPrice: '', // Dona narxi
    boxPrice: '', // Karobka narxi
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
  const [codeError, setCodeError] = useState('');
  const [showPackageInput, setShowPackageInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadQR = () => {
    if (!selectedProduct) return;
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${selectedProduct.code}-${selectedProduct.name}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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

  const printXprinterLabel = (product: Product) => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) {
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = document.createElement('img');

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const printWindow = window.open('', '_blank', 'width=400,height=600');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>QR - ${product.name}</title>
            <style>
              body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
              img { width: 260px; height: 260px; }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // ⚡ Filtered products - useMemo bilan optimize qilish
  const filteredProducts = useMemo(() => {
    // Agar qidiruv bo'lmasa va filter 'all' bo'lsa, barcha mahsulotlarni qaytarish
    if (!debouncedSearch && stockFilter === 'all') {
      return products;
    }

    return products.filter(p => {
      const matchesSearch = !debouncedSearch || 
                           p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           p.code.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStock = stockFilter === 'all' || 
                          (stockFilter === 'low' && p.quantity <= (p.minStock || 50) && p.quantity > 0) ||
                          (stockFilter === 'out' && p.quantity === 0);
      return matchesSearch && matchesStock;
    });
  }, [products, debouncedSearch, stockFilter]);

  // ⚡ Mahsulotlarni yuklash - useCallback bilan
  const fetchProducts = useCallback(async (page = 1) => {
    const startTime = performance.now();
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
      
      // Yumshoq validatsiya - faqat _id va name majburiy
      const validProducts = productsData.filter((p: Product) => {
        if (!p || !p._id) return false;
        if (!p.name || p.name.trim() === '') return false;
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
        requestIdleCallback(() => {
          const stats = {
            total: pagination.total || 0,
            lowStock: validProducts.filter((p: Product) => p.quantity <= (p.minStock || 50) && p.quantity > 0).length,
            outOfStock: validProducts.filter((p: Product) => p.quantity === 0).length,
            totalValue: validProducts.reduce((sum: number, p: Product) => sum + ((p.price || 0) * (p.quantity || 0)), 0)
          };
          setOverallStats(stats);
        }, { timeout: 2000 });
      }
      
    } catch (err: any) {
      console.error('Error fetching products:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Maxsulotlarni yuklashda xatolik';
      showAlert(errorMsg, 'Xatolik', 'danger');
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
  }, [fetchProducts]);

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
      setImages([...images, ...res.data.images]);
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
      await api.delete('/products/delete-image', { data: { imagePath } });
      setImages(images.filter(img => img !== imagePath));
    } catch (err) {
      logger.error('Error deleting image:', err);
      showAlert('Rasmni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const getProductImage = (product: any) => {
    if (product.images && product.images.length > 0) {
      const imagePath = typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path;
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
        await api.put(`/products/${editingProduct._id}`, data);
        logger.log('Tovar yangilandi:', editingProduct._id);
        // Tahrirlash bo'lsa, 1 sekund kutib, keyin yangilash
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchProducts();
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
          
          // Yangi maxsulotni qo'shib, sorting qilish
          setProducts(prev => {
            const updated = [...prev, productWithWarehouse];
            // Numeric sorting qilish
            updated.sort((a, b) => {
              const codeA = parseInt(a.code) || 0;
              const codeB = parseInt(b.code) || 0;
              if (codeA === 0 && codeB === 0) {
                return String(a.code).localeCompare(String(b.code));
              }
              return codeA - codeB;
            });
            return updated;
          });
          logger.log('Yangi tovar darhol UI ga qo\'shildi:', response.data.name);
          
          // Qidiruv va filter o'chirish - barcha maxsulotlarni ko'rish uchun
          setSearchQuery('');
          setStockFilter('all');
        }
      }
      
      closeModal();
      showAlert(editingProduct ? 'Tovar yangilandi' : 'Tovar qo\'shildi', 'Muvaffaqiyat', 'success');
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
    setImages(p.images || []);
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
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

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setDollarRate(12500); // Dollar kursini reset qilish
    setFormData({ 
      code: '', name: '', description: '', quantity: '',
      previousPrice: '', currentPrice: '',
      costPrice: '', costPriceInDollar: '', unitPrice: '', boxPrice: '',
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
    setCodeError('');
    setShowPackageInput(false);
  };

  const openQuantityModal = (mode: 'add' | 'subtract') => {
    setQuantityMode(mode);
    setQuantityInput('');
    setShowQuantityModal(true);
  };

  const applyQuantityChange = () => {
    const change = Number(quantityInput) || 0;
    if (change <= 0) return;
    
    const currentQty = Number(formData.quantity) || 0;
    let newQty = quantityMode === 'add' ? currentQty + change : currentQty - change;
    if (newQty < 0) newQty = 0;
    
    setFormData({ ...formData, quantity: String(newQty) });
    setShowQuantityModal(false);
    setQuantityInput('');
  };

  const openAddModal = async () => {
    try {
      const res = await api.get('/products/next-code');
      setFormData({ 
        code: res.data.code, name: '', description: '', quantity: '',
        previousPrice: '', currentPrice: '',
        costPrice: '', costPriceInDollar: '', unitPrice: '', boxPrice: '',
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
    } catch (err) {
      logger.error('Error getting next code:', err);
      showAlert('Keyingi kodni olishda xatolik', 'Xatolik', 'danger');
    }
    setPackageData({ packageCount: '', unitsPerPackage: '', totalCost: '' });
    setImages([]);
    setCodeError('');
    setShowPackageInput(false);
    setShowModal(true);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Tovarlar"
        showSearch 
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <button 
              onClick={() => fetchProducts()} 
              className="btn-secondary"
              title="Tovarlarni qayta yuklash"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Yangilash</span>
            </button>
            
            {/* Selection Mode Toggle */}
            {!selectionMode ? (
              <button 
                onClick={() => setSelectionMode(true)} 
                className="btn-secondary"
                title="Bir nechta QR chiqarish"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Tanlash</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={selectAllProducts} 
                  className="btn-secondary text-xs"
                >
                  {selectedProducts.size === filteredProducts.length ? 'Bekor' : 'Barchasi'}
                </button>
                <button 
                  onClick={openBatchQRPrint} 
                  className="btn-primary"
                  disabled={selectedProducts.size === 0}
                >
                  <Printer className="w-4 h-4" />
                  <span className="hidden sm:inline">QR ({selectedProducts.size})</span>
                  <span className="sm:hidden">{selectedProducts.size}</span>
                </button>
                <button 
                  onClick={cancelSelection} 
                  className="btn-icon-sm bg-surface-200 hover:bg-surface-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Yangi tovar</span>
            </button>
          </div>
        }
      />

      <div className="p-2 sm:p-3 md:p-4 lg:p-6 space-y-3 sm:space-y-4 md:space-y-6 max-w-[1800px] mx-auto">
        {/* Compact Stats - Kichik va Professional */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-2.5 md:gap-3">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`bg-white rounded-lg sm:rounded-xl border-2 transition-all ${
                stat.filter ? 'cursor-pointer hover:shadow-lg hover:scale-[1.02]' : ''
              } ${
                stockFilter === stat.filter ? 'border-brand-500 shadow-md' : 'border-surface-200'
              }`}
            >
              <div className="p-2 sm:p-2.5 md:p-3">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                    <stat.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4.5 md:h-4.5 text-${stat.color}-600`} />
                  </div>
                  <p className="text-[10px] sm:text-xs text-surface-500 font-medium">{stat.label}</p>
                </div>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-surface-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="card p-0 overflow-hidden">
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
              {/* List View - Rasimsiz, Tez */}
              <div 
                ref={scrollContainerRef}
                className="overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 250px)' }}
              >
                <table className="w-full">
                  <thead className="bg-surface-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-surface-200">
                      {selectionMode && (
                        <th className="px-3 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-surface-300"
                          />
                        </th>
                      )}
                      <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Kod</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Nomi</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-surface-600 uppercase">Narxi</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-surface-600 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {filteredProducts.map(product => {
                      const isSelected = selectedProducts.has(product._id);
                      const productImage = getProductImage(product);
                      
                      return (
                        <tr 
                          key={product._id}
                          className={`hover:bg-surface-50 transition-colors ${
                            isSelected ? 'bg-brand-50' : ''
                          }`}
                        >
                          {selectionMode && (
                            <td className="px-3 py-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleProductSelection(product._id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 rounded border-surface-300"
                              />
                            </td>
                          )}
                          <td className="px-3 py-3">
                            <span className="font-mono text-sm font-semibold text-surface-900">#{product.code}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {/* Rasm - har doim ko'rsatish (placeholder yoki haqiqiy rasm) */}
                              <div 
                                className="w-10 h-10 rounded-lg overflow-hidden border border-surface-200 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-brand-500 transition-all bg-surface-50"
                                onClick={(e) => {
                                  e.stopPropagation();
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
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-100 to-surface-200">
                                    <Package className="w-5 h-5 text-surface-400" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-surface-900 truncate">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs text-surface-500 mt-0.5 line-clamp-1">{product.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-sm font-bold text-brand-700">
                              {formatNumber((product as any).unitPrice || product.price)}
                              <span className="text-xs text-brand-400 ml-1">so'm</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); openQRModal(product); }} 
                                className="p-2 hover:bg-brand-50 rounded-lg transition-colors text-surface-600 hover:text-brand-600"
                                title="QR kod"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openEditModal(product); }} 
                                className="p-2 hover:bg-amber-50 rounded-lg transition-colors text-surface-600 hover:text-amber-600"
                                title="Tahrirlash"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }} 
                                className="p-2 hover:bg-red-50 rounded-lg transition-colors text-surface-600 hover:text-red-600"
                                title="O'chirish"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* End indicator */}
                {currentPage >= totalPages && !loadingMore && filteredProducts.length > 0 && (
                  <div className="flex justify-center items-center py-6 border-t border-surface-100">
                    <div className="text-surface-400 text-sm">
                      ✅ Barcha maxsulotlar yuklandi ({totalProducts} ta)
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          {/* Backdrop with blur - orqa fon */}
          <div 
            className="absolute inset-0 bg-gradient-to-br from-black/70 via-purple-900/30 to-black/70 backdrop-blur-md transition-all duration-300" 
            onClick={closeModal} 
          />
          
          {/* Modal oyna - professional design */}
          <form 
            onSubmit={handleSubmit} 
            className="relative z-10 bg-white rounded-3xl w-full max-w-xs sm:max-w-sm md:max-w-2xl max-h-[90vh] overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.4)] border border-white/20 animate-scaleIn transform transition-all duration-300"
            style={{
              animation: 'modalSlideUp 0.3s ease-out'
            }}
          >
            {/* Header - Gradient with animation */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 px-4 sm:px-6 py-4 sm:py-5 border-b border-white/20 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 mb-1">
                    {editingProduct ? (
                      <>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        Tovarni tahrirlash
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        Yangi tovar qo'shish
                      </>
                    )}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 font-medium">
                    {editingProduct ? 'Tovar ma\'lumotlarini yangilang' : 'Yangi tovar ma\'lumotlarini kiriting'}
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={closeModal} 
                  className="p-2 sm:p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90 hover:scale-110 active:scale-95 group ml-3"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:text-white/90" />
                </button>
              </div>
            </div>

            {/* Form Content - Scrollable */}
            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Image Upload */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Rasmlar (max 8 ta - JPG, PNG, WebP)</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-2 mb-1 sm:mb-2">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative aspect-square group bg-surface-100 rounded-lg overflow-hidden">
                      <img 
                        src={`${UPLOADS_URL}${img}`} 
                        alt={`Rasm ${idx + 1}`} 
                        loading="lazy"
                        className="w-full h-full object-cover" 
                      />
                      {/* Delete button - rasm ichida, o'ng yuqori burchakda */}
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-6 h-6 sm:w-7 sm:h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                        title="Rasmni o'chirish"
                      >
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
                      </button>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                    </div>
                  ))}
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

              {/* Tavsif */}
              <div>
                <label className="text-xs sm:text-sm font-medium text-surface-700 mb-1 sm:mb-2 block">Qisqacha tavsif (ixtiyoriy)</label>
                <textarea 
                  className="input min-h-[60px] sm:min-h-[80px] resize-none text-sm" 
                  placeholder="Mahsulot haqida qisqacha ma'lumot..."
                  value={formData.description || ''}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  maxLength={500}
                />
                <p className="text-[10px] sm:text-xs text-surface-400 mt-0.5 sm:mt-1">{(formData.description || '').length}/500</p>
              </div>

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
                    {editingProduct ? (
                      <div className="flex items-center gap-1 sm:gap-2">
                        <div className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-surface-100 rounded-lg text-center font-semibold text-surface-900 text-sm">
                          {formatNumber(formData.quantity || 0)}
                        </div>
                        <button type="button" onClick={() => openQuantityModal('add')} className="btn-icon-sm bg-success-100 text-success-600 hover:bg-success-200">
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button type="button" onClick={() => openQuantityModal('subtract')} className="btn-icon-sm bg-danger-100 text-danger-600 hover:bg-danger-200">
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        className="input text-sm" 
                        placeholder="0" 
                        value={formatInputNumber(formData.quantity)} 
                        onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})} 
                        required 
                      />
                    )}
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

                {/* Karobka narxi */}
                <div className="mb-4">
                  <label className="text-xs font-medium text-surface-600 mb-1 block">📦 Karobka narxi (so'm)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="0"
                    value={formatInputNumber(formData.boxPrice)}
                    onChange={e => setFormData({...formData, boxPrice: parseNumber(e.target.value)})}
                  />
                </div>

                {/* Foizli chegirmalar - 3 ta daraja */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg p-2 border border-emerald-200">
                  <h5 className="text-[10px] font-semibold text-emerald-800 mb-1.5 flex items-center gap-1">
                    🎯 Chegirmalar
                  </h5>
                  
                  {/* Tier 1 */}
                  <div className="bg-white rounded p-1.5 mb-1 border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">1</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center" 
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
                      <span className="text-[9px] text-emerald-600">-</span>
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center" 
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
                      <span className="text-[9px] text-emerald-600">=</span>
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center font-bold" 
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
                      <span className="text-[9px] font-bold text-emerald-700">%</span>
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="bg-white rounded p-1.5 mb-1 border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">2</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center" 
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
                      <span className="text-[9px] text-blue-600">-</span>
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center" 
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
                      <span className="text-[9px] text-blue-600">=</span>
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center font-bold" 
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
                      <span className="text-[9px] font-bold text-blue-700">%</span>
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="bg-white rounded p-1.5 border border-emerald-100">
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">3</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <input 
                        type="text" 
                        className="input text-xs w-12 text-center" 
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
                      <span className="text-xs text-purple-600">dan</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center" 
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
                      <span className="text-xs text-purple-600">gacha</span>
                      <span className="text-xs text-purple-600 mx-1">=</span>
                      <input 
                        type="text" 
                        className="input text-sm w-16 text-center font-bold" 
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
                      <span className="text-xs font-bold text-purple-700">%</span>
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
                        <span className="text-xs text-blue-600">dan</span>
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
                        <span className="text-xs text-blue-600">gacha</span>
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
            </div>

            {/* Footer - Sticky Buttons with enhanced design */}
            <div className="sticky bottom-0 bg-gradient-to-r from-slate-50 via-blue-50 to-purple-50 px-4 sm:px-6 py-4 sm:py-5 border-t border-slate-200/50 shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.1)] backdrop-blur-sm">
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 sm:px-7 py-2.5 sm:py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Bekor qilish</span>
                  <span className="sm:hidden">Bekor</span>
                </button>
                <button
                  type="submit"
                  disabled={!!codeError || uploading}
                  className="px-6 sm:px-10 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-purple-700 hover:to-blue-700 transition-all duration-300 hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <Save className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" />
                  <span className="relative z-10">{editingProduct ? 'Yangilash' : 'Saqlash'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
              
              {/* Eski QR Preview (yuklab olish uchun) */}
              <div className="mt-6 pt-6 border-t border-surface-200 w-full">
                <p className="text-sm font-medium text-surface-700 mb-3 text-center">Katta QR (yuklab olish uchun)</p>
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl border border-surface-200">
                    <QRCodeSVG
                      id="qr-code-svg"
                      value={`${FRONTEND_URL}/product/${selectedProduct._id}`}
                      size={150}
                      level="H"
                      includeMargin
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

      {/* Quantity Adjustment Modal */}
      {showQuantityModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm" 
            onClick={() => setShowQuantityModal(false)} 
          />
          <div className="modal w-full max-w-sm p-6 relative z-[71]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-surface-900">
                {quantityMode === 'add' ? "Miqdor qo'shish" : "Miqdor ayirish"}
              </h3>
              <button onClick={() => setShowQuantityModal(false)} className="btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className={`rounded-xl p-4 mb-6 ${quantityMode === 'add' ? 'bg-success-50' : 'bg-danger-50'}`}>
              <p className="text-sm text-surface-600 mb-1">Hozirgi miqdor</p>
              <p className={`text-2xl font-bold ${quantityMode === 'add' ? 'text-success-600' : 'text-danger-600'}`}>
                {formatNumber(formData.quantity || 0)} dona
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {quantityMode === 'add' ? "Qo'shiladigan miqdor" : "Ayiriladigan miqdor"}
                </label>
                <input 
                  type="text" 
                  className="input text-center text-lg font-semibold" 
                  placeholder="0" 
                  value={formatInputNumber(quantityInput)}
                  onChange={e => setQuantityInput(parseNumber(e.target.value))}
                  autoFocus
                />
              </div>

              {quantityInput && Number(quantityInput) > 0 && (
                <div className="bg-surface-50 rounded-xl p-4">
                  <p className="text-sm text-surface-600 mb-1">Yangi miqdor</p>
                  <p className="text-xl font-bold text-surface-900">
                    {formatNumber(
                      quantityMode === 'add' 
                        ? (Number(formData.quantity) || 0) + Number(quantityInput)
                        : Math.max(0, (Number(formData.quantity) || 0) - Number(quantityInput))
                    )} dona
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuantityModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button 
                  type="button" 
                  onClick={applyQuantityChange} 
                  className={`flex-1 ${quantityMode === 'add' ? 'btn-success' : 'btn-danger'}`}
                  disabled={!quantityInput || Number(quantityInput) <= 0}
                >
                  {quantityMode === 'add' ? "Qo'shish" : "Ayirish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Statistics Modal - Compact & Professional */}
      {showStatsModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm">
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

      {/* Image Modal - Rasm kattalashtirish */}
      {showImageModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-all duration-300" 
            onClick={() => setShowImageModal(false)} 
          />
          
          {/* Modal Content */}
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
    </div>
  );
}
