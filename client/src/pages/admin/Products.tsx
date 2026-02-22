import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Package, X, Edit, Trash2, QrCode, Printer, Search } from 'lucide-react';
import { Product } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { UPLOADS_URL } from '../../config/api';
import { useSocket } from '../../hooks/useSocket';
import { useRealtimeStats } from '../../hooks/useRealtimeStats';
import { extractArrayFromResponse } from '../../utils/arrayHelpers';
import { CategoryFilter } from '../../components/kassa/CategoryFilter';
import { useCategories } from '../../hooks/useCategories';
import { LoadingSpinner, EmptyState, ActionButton, Badge } from '../../components/common';
import BatchQRPrint from '../../components/BatchQRPrint';
import ProductModal from '../../components/ProductModal';
import { clearProductsCache } from '../../utils/indexedDbService';

export default function ProductsOptimized() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const socket = useSocket();
  const { categories } = useCategories(); // Kategoriyalarni yuklash
  
  // ⚡ Realtime statistics updates
  const realtimeStats = useRealtimeStats((newStats) => {
    console.log('📊 Realtime stats updated:', newStats);
    setStats(newStats);
  });
  
  // Core state - simplified
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [stockFilter] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false); // ⚡ Prevent double submission
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Statistics state - DB dagi jami mahsulotlar soni
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showBatchPrint, setShowBatchPrint] = useState(false);
  const [showSingleLabelPrint, setShowSingleLabelPrint] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductsForBatch, setSelectedProductsForBatch] = useState<Set<string>>(new Set());
  
  // Modal scroll lock
  useModalScrollLock(showModal || showSingleLabelPrint);
  
  // Form state - simplified
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unitPrice: '',
    costPrice: '',
    costPriceUsd: '', // USD da tan narxi
    boxPrice: '',
    quantity: '',
    category: '',
    subcategory: '', // Bo'lim uchun
    unit: 'dona' as 'dona' | 'kg' | 'metr' | 'litr' | 'karobka',
    // Karobka ma'lumotlari
    boxInfo: {
      unitsPerBox: '',
      boxWeight: ''
    },
    // Chegirma sozlamalari
    discount1: { minQuantity: '', percent: '' },
    discount2: { minQuantity: '', percent: '' },
    discount3: { minQuantity: '', percent: '' }
  });
  
  // Rasm yuklash uchun state
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  // MUAMMO 5 YECHIMI: Dastlabki rasmlarni saqlash - bekor qilinganda cleanup uchun
  const [initialUploadedImages, setInitialUploadedImages] = useState<string[]>([]);
  
  // Refs
  const loadMoreRef = useRef<HTMLDivElement>(null); // Infinite scroll uchun
  
  // Convert categories to CategoryFilter format
  const categoriesForFilter = useMemo(() => {
    return categories.map(cat => ({
      _id: cat._id,
      name: cat.name,
      subcategories: cat.subcategories
    }));
  }, [categories]);
  
  // Optimized filtered products - CLIENT-SIDE SEARCH UCHUN
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    
    // Backend'dan search qilgan mahsulotlar allaqachon filtered
    // Faqat kategoriya va stock filtri qo'llash
    let filtered = products;
    
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    if (stockFilter === 'lowStock') {
      filtered = filtered.filter(p => p.quantity > 0 && p.quantity <= 10);
    } else if (stockFilter === 'outOfStock') {
      filtered = filtered.filter(p => p.quantity === 0);
    }
    
    return filtered;
  }, [products, categoryFilter, stockFilter]);
  
  // ⚡ Fetch statistics - DB dagi jami mahsulotlar soni (search bo'yicha)
  const fetchStats = useCallback(async (searchTerm: string = '') => {
    try {
      console.log(`📊 Fetching stats for search: "${searchTerm}"`);
      
      const response = await api.get('/products/search-stats', {
        params: {
          search: searchTerm || undefined
        }
      });
      
      console.log(`📊 Stats response:`, response.data);
      
      setStats({
        total: response.data.total || 0,
        lowStock: response.data.lowStock || 0,
        outOfStock: response.data.outOfStock || 0,
        totalValue: response.data.totalValue || 0
      });
      
      console.log(`📊 Statistics updated (search: "${searchTerm}"):`, response.data);
    } catch (error: any) {
      console.error('❌ Error fetching statistics:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      // Xato bo'lsa ham, stats default qiymatlar bilan qoladi
    }
  }, []);
  
  // Fetch products - optimized with pagination
  const fetchProducts = useCallback(async (pageNum = 1, append = false, searchTerm = '') => {
    try {
      if (!append) setLoading(true);
      
      // Backend'ga so'rov yuborish
      const response = await api.get('/products', {
        params: {
          page: pageNum,
          limit: 10, // Boshida 10ta yuklash
          search: searchTerm || undefined, // ✅ Search parametri qo'shildi
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined,
          stockFilter: stockFilter !== 'all' ? stockFilter : undefined
        }
      });
      
      const responseData = response.data;
      
      if (responseData.data && responseData.pagination) {
        const productsData = responseData.data;
        
        if (append) {
          setProducts(prev => [...prev, ...productsData]);
        } else {
          setProducts(productsData);
        }
        
        setTotalProducts(responseData.pagination.total);
        setHasMore(responseData.pagination.hasMore);
        setCurrentPage(pageNum);
      } else {
        const productsData = extractArrayFromResponse<Product>(response);
        setProducts(productsData);
        setTotalProducts(productsData.length);
      }
      
    } catch (error) {
      console.error('Error fetching products:', error);
      showAlert('Mahsulotlarni yuklashda xatolik', 'Xatolik', 'danger');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [showAlert, categoryFilter, subcategoryFilter, stockFilter]);

  // Load products on mount and when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset pagination
    setProducts([]); // Clear products
    fetchProducts(1, false, searchQuery); // ✅ searchQuery qo'shildi
    // Statistics-ni birinchi marta yuklash (search bo'lmasa)
    fetchStats(searchQuery);
  }, [categoryFilter, subcategoryFilter, stockFilter, searchQuery, fetchProducts, fetchStats]);
  
  // ⚡ Search bo'lganda statistics yangilash
  useEffect(() => {
    if (searchQuery.trim()) {
      fetchStats(searchQuery);
    } else {
      fetchStats('');
    }
  }, [searchQuery, fetchStats]);
  
  // Infinite scroll - Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          console.log('🔄 Loading more products...', currentPage + 1);
          fetchProducts(currentPage + 1, true);
        }
      },
      { threshold: 0.5 }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [hasMore, loading, currentPage, fetchProducts]);
  
  // Socket listeners - products list-ni yangilash
  useEffect(() => {
    if (!socket) return;
    
    const handleProductCreated = (newProduct: Product) => {
      console.log('✅ Product created via socket:', newProduct.name);
      setProducts(prev => [newProduct, ...prev]);
    };
    
    const handleProductUpdated = (updatedProduct: Product) => {
      console.log('✅ Product updated via socket:', updatedProduct.name);
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    };
    
    const handleProductDeleted = (data: { _id: string }) => {
      console.log('✅ Product deleted via socket:', data._id);
      setProducts(prev => prev.filter(p => p._id !== data._id));
    };
    
    socket.on('product:created', handleProductCreated);
    socket.on('product:updated', handleProductUpdated);
    socket.on('product:deleted', handleProductDeleted);
    
    return () => {
      socket.off('product:created', handleProductCreated);
      socket.off('product:updated', handleProductUpdated);
      socket.off('product:deleted', handleProductDeleted);
    };
  }, [socket]);
  
  // Form handlers - simplified
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ⚡ Prevent double submission
    if (isSubmitting) {
      console.warn('⚠️ Form submission already in progress');
      return;
    }
    
    if (!formData.name) {
      showAlert('Mahsulot nomi majburiy', 'Xatolik', 'danger');
      return;
    }
    
    setIsSubmitting(true); // Disable button
    
    try {
      console.log('🖼️ Final image paths:', uploadedImages);
      
      // Prices array yaratish - Backend model ga mos
      const prices = [];
      
      // 1. Tan narxi (cost)
      const costPriceNum = parseNumber(formData.costPrice);
      if (costPriceNum && Number(costPriceNum) > 0) {
        prices.push({
          type: 'cost',
          amount: Number(costPriceNum),
          minQuantity: 1,
          discountPercent: 0,
          isActive: true
        });
      }
      
      // 2. Asosiy sotish narxi (unit)
      const unitPriceNum = parseNumber(formData.unitPrice);
      if (unitPriceNum && Number(unitPriceNum) > 0) {
        prices.push({
          type: 'unit',
          amount: Number(unitPriceNum),
          minQuantity: 1,
          discountPercent: 0,
          isActive: true
        });
      }
      
      // 3. Karobka narxi (box) - faqat karobka birligi tanlangan bo'lsa
      const boxPriceNum = parseNumber(formData.boxPrice);
      if (formData.unit === 'karobka' && boxPriceNum && Number(boxPriceNum) > 0) {
        prices.push({
          type: 'box',
          amount: Number(boxPriceNum),
          minQuantity: 1,
          discountPercent: 0,
          isActive: true
        });
      }
      
      // 4. Skidka narxlari (discount1, discount2, discount3)
      if (formData.discount1.minQuantity && formData.discount1.percent &&
          Number(formData.discount1.minQuantity) > 0 && Number(formData.discount1.percent) > 0) {
        prices.push({
          type: 'discount1',
          amount: 0,
          minQuantity: Number(formData.discount1.minQuantity),
          discountPercent: Number(formData.discount1.percent),
          isActive: true
        });
      }
      
      if (formData.discount2.minQuantity && formData.discount2.percent &&
          Number(formData.discount2.minQuantity) > 0 && Number(formData.discount2.percent) > 0) {
        prices.push({
          type: 'discount2',
          amount: 0,
          minQuantity: Number(formData.discount2.minQuantity),
          discountPercent: Number(formData.discount2.percent),
          isActive: true
        });
      }
      
      if (formData.discount3.minQuantity && formData.discount3.percent &&
          Number(formData.discount3.minQuantity) > 0 && Number(formData.discount3.percent) > 0) {
        prices.push({
          type: 'discount3',
          amount: 0,
          minQuantity: Number(formData.discount3.minQuantity),
          discountPercent: Number(formData.discount3.percent),
          isActive: true
        });
      }
      
      const data = {
        name: formData.name,
        description: formData.description,
        quantity: Number(parseNumber(formData.quantity)) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        unit: formData.unit,
        images: uploadedImages,
        prices: prices, // Backend model ga mos prices array
        // Karobka ma'lumotlari
        boxInfo: {
          unitsPerBox: Number(formData.boxInfo.unitsPerBox) || 1,
          boxWeight: Number(formData.boxInfo.boxWeight) || 0
        }
      };
      
      console.log('💾 Frontend - Saving product with data:', {
        name: data.name,
        pricesCount: data.prices.length,
        prices: data.prices,
        unit: data.unit,
        boxInfo: data.boxInfo
      });
      
      if (editingProduct) {
        console.log('📝 Updating product ID:', editingProduct._id);
        const response = await api.put(`/products/${editingProduct._id}`, data);
        console.log('✅ Update response:', response.data);
        // Cache'ni tozalash
        await clearProductsCache().catch(err => console.warn('Cache tozalashda xato:', err));
        // Socket will handle the update
        showAlert('Mahsulot yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        console.log('➕ Creating new product');
        const response = await api.post('/products', data);
        console.log('✅ Create response:', response.data);
        // Cache'ni tozalash
        await clearProductsCache().catch(err => console.warn('Cache tozalashda xato:', err));
        // Socket will handle adding the new product
        showAlert('Mahsulot qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      
      closeModal(true); // Save muvaffaqiyatli — cleanup qilma
    } catch (error: any) {
      console.error('❌ Error saving product:', error);
      const errorMsg = error.response?.data?.message || 'Xatolik yuz berdi';
      showAlert(errorMsg, 'Xatolik', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Mahsulotni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      // Cache'ni tozalash
      await clearProductsCache().catch(err => console.warn('Cache tozalashda xato:', err));
      showAlert('Mahsulot o\'chirildi', 'Muvaffaqiyat', 'success');
    } catch (error) {
      showAlert('Mahsulotni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };
  
  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      unitPrice: '',
      costPrice: '',
      costPriceUsd: '',
      boxPrice: '',
      quantity: '',
      category: '',
      subcategory: '',
      unit: 'dona',
      boxInfo: {
        unitsPerBox: '',
        boxWeight: ''
      },
      discount1: { minQuantity: '', percent: '' },
      discount2: { minQuantity: '', percent: '' },
      discount3: { minQuantity: '', percent: '' }
    });
    setUploadedImages([]);
    setInitialUploadedImages([]); // Yangi mahsulot - dastlabki rasmlar yo'q
    setShowModal(true);
  };
  
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    
    console.log('📝 Editing product - RAW:', product);
    console.log('📝 Product prices field:', (product as any).prices);
    
    // Prices array dan narxlarni olish - xavfsizlik tekshiruvi
    const pricesData = (product as any).prices;
    const prices = Array.isArray(pricesData) ? pricesData : [];
    
    console.log('📝 Extracted prices array:', prices);
    
    // Har bir narx turini topish
    const costPrice = prices.find((p: any) => p.type === 'cost');
    const unitPrice = prices.find((p: any) => p.type === 'unit');
    const boxPrice = prices.find((p: any) => p.type === 'box');
    const discount1 = prices.find((p: any) => p.type === 'discount1');
    const discount2 = prices.find((p: any) => p.type === 'discount2');
    const discount3 = prices.find((p: any) => p.type === 'discount3');
    
    // Eski format uchun backward compatibility
    // Agar prices array bo'sh bo'lsa, eski formatdagi narxlarni o'qiymiz
    const oldFormatUnitPrice = (product as any).unitPrice || product.price || 0;
    const oldFormatCostPrice = (product as any).costPrice || 0;
    const oldFormatBoxPrice = (product as any).boxPrice || 0;
    
    // Karobka ma'lumotlari
    const boxInfo = (product as any).boxInfo || { unitsPerBox: 1, boxWeight: 0 };
    
    console.log('📝 Editing product - PARSED:', {
      product,
      prices,
      costPrice: costPrice?.amount || oldFormatCostPrice,
      unitPrice: unitPrice?.amount || oldFormatUnitPrice,
      boxPrice: boxPrice?.amount || oldFormatBoxPrice,
      discount1: discount1 ? { minQuantity: discount1.minQuantity, percent: discount1.discountPercent } : null,
      discount2: discount2 ? { minQuantity: discount2.minQuantity, percent: discount2.discountPercent } : null,
      discount3: discount3 ? { minQuantity: discount3.minQuantity, percent: discount3.discountPercent } : null
    });
    
    setFormData({
      name: product.name,
      description: (product as any).description || '',
      // Yangi format bo'lsa prices array dan, eski format bo'lsa to'g'ridan-to'g'ri fieldlardan
      unitPrice: unitPrice?.amount ? String(unitPrice.amount) : (oldFormatUnitPrice ? String(oldFormatUnitPrice) : ''),
      costPrice: costPrice?.amount ? String(costPrice.amount) : (oldFormatCostPrice ? String(oldFormatCostPrice) : ''),
      costPriceUsd: '', // Will be calculated from costPrice
      boxPrice: boxPrice?.amount ? String(boxPrice.amount) : (oldFormatBoxPrice ? String(oldFormatBoxPrice) : ''),
      quantity: String(product.quantity),
      category: (product as any).category || '',
      subcategory: (product as any).subcategory || '',
      unit: product.unit || 'dona',
      boxInfo: {
        unitsPerBox: boxInfo.unitsPerBox ? String(boxInfo.unitsPerBox) : '',
        boxWeight: boxInfo.boxWeight ? String(boxInfo.boxWeight) : ''
      },
      discount1: {
        minQuantity: discount1?.minQuantity ? String(discount1.minQuantity) : '',
        percent: discount1?.discountPercent ? String(discount1.discountPercent) : ''
      },
      discount2: {
        minQuantity: discount2?.minQuantity ? String(discount2.minQuantity) : '',
        percent: discount2?.discountPercent ? String(discount2.discountPercent) : ''
      },
      discount3: {
        minQuantity: discount3?.minQuantity ? String(discount3.minQuantity) : '',
        percent: discount3?.discountPercent ? String(discount3.discountPercent) : ''
      }
    });
    
    // Mavjud rasmlarni yuklash
    const productImages = (product as any).images || [];
    const imagePaths = productImages.map((img: any) => 
      typeof img === 'string' ? img : img.path
    );
    setUploadedImages(imagePaths);
    setInitialUploadedImages(imagePaths); // Dastlabki rasmlarni saqlash
    
    setShowModal(true);
  };
  
  const closeModal = async (skipCleanup = false) => {
    // Cleanup faqat cancel/bekor qilinganda ishlaydi, save dan keyin EMAS
    if (!skipCleanup) {
      const newlyUploadedImages = uploadedImages.filter(
        img => !initialUploadedImages.includes(img)
      );

      if (newlyUploadedImages.length > 0) {
        try {
          await api.post('/products/cleanup-images', { imagePaths: newlyUploadedImages });
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }
    }

    setShowModal(false);
    setEditingProduct(null);
    setUploadedImages([]);
    setInitialUploadedImages([]);
  };
  
  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowSingleLabelPrint(true);
  };
  
  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      const imagePath = typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as any).path;
      return `${UPLOADS_URL}${imagePath}`;
    }
    return null;
  };

  // Batch print handlers
  const toggleProductSelection = (productId: string) => {
    setSelectedProductsForBatch(prev => {
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
    if (selectedProductsForBatch.size === filteredProducts.length) {
      setSelectedProductsForBatch(new Set());
    } else {
      setSelectedProductsForBatch(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const getSelectedProductsForBatch = () => {
    return filteredProducts.filter(p => selectedProductsForBatch.has(p._id));
  };

  const openBatchPrint = () => {
    if (selectedProductsForBatch.size === 0) {
      showAlert('Hech qanday mahsulot tanlanmagan', 'Ogohlantirish', 'warning');
      return;
    }
    setShowBatchPrint(true);
  };

  const closeBatchPrint = () => {
    setShowBatchPrint(false);
    setSelectedProductsForBatch(new Set());
  };
  
  return (
    <div className="min-h-screen bg-gray-50 w-full h-full">
      {AlertComponent}
      
      {/* Header - Responsive */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          {/* Top Row: Hamburger + Title + Actions */}
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Hamburger Button */}
              <button
                onClick={onMenuToggle}
                className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors active:scale-95 flex-shrink-0 shadow-md"
                title="Menyuni ochish/yopish"
              >
                <Plus className="w-5 h-5" />
              </button>
              
              {/* Title */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                Mahsulotlar
              </h1>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {selectedProductsForBatch.size > 0 && (
                <ActionButton 
                  icon={Printer}
                  variant="secondary"
                  onClick={openBatchPrint}
                >
                  Senik ({selectedProductsForBatch.size})
                </ActionButton>
              )}
              <ActionButton 
                icon={Plus}
                variant="primary"
                onClick={openAddModal}
              >
                Qo'shish
              </ActionButton>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 w-full h-full">
        {/* Search and Statistics - Kassa sahifasidagi kabi */}
        <div className="relative space-y-3">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 sm:p-3 border border-blue-200">
              <p className="text-[10px] sm:text-xs text-blue-600 font-semibold">Jami</p>
              <p className="text-lg sm:text-xl font-bold text-blue-700">{stats.total}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 sm:p-3 border border-orange-200">
              <p className="text-[10px] sm:text-xs text-orange-600 font-semibold">Kam qolgan</p>
              <p className="text-lg sm:text-xl font-bold text-orange-700">{stats.lowStock}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 sm:p-3 border border-red-200">
              <p className="text-[10px] sm:text-xs text-red-600 font-semibold">Tugagan</p>
              <p className="text-lg sm:text-xl font-bold text-red-700">{stats.outOfStock}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 sm:p-3 border border-green-200">
              <p className="text-[10px] sm:text-xs text-green-600 font-semibold">Jami qiymat</p>
              <p className="text-sm sm:text-base font-bold text-green-700 truncate">{formatNumber(stats.totalValue)}</p>
            </div>
          </div>
          
          {/* Search Input */}
          <div className="relative group">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
            <input
              type="text"
              placeholder="Mahsulot qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 text-xs sm:text-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={categoriesForFilter}
          selectedCategory={categoryFilter}
          selectedSubcategory={subcategoryFilter}
          onCategoryChange={setCategoryFilter}
          onSubcategoryChange={setSubcategoryFilter}
        />

        {/* Batch selection toolbar */}
        {filteredProducts.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              checked={selectedProductsForBatch.size === filteredProducts.length && filteredProducts.length > 0}
              onChange={selectAllProducts}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-sm text-blue-700 font-medium">
              {selectedProductsForBatch.size > 0 
                ? `${selectedProductsForBatch.size} ta mahsulot tanlandi`
                : 'Barchasini tanlash'
              }
            </span>
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <LoadingSpinner size="lg" text="Yuklanmoqda..." />
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Mahsulotlar topilmadi"
            description={searchQuery ? 'Qidiruv bo\'yicha mahsulotlar topilmadi' : 'Birinchi mahsulotni qo\'shing'}
            action={
              <ActionButton icon={Plus} onClick={openAddModal}>
                Mahsulot qo'shish
              </ActionButton>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map(product => {
                const productImage = getProductImage(product);

                const pricesData = (product as any).prices;
                const prices = Array.isArray(pricesData) ? pricesData : [];
                const unitPrice = prices.find((p: any) => p.type === 'unit');
                const displayPrice = unitPrice?.amount || (product as any).unitPrice || product.price || 0;
                const isOutOfStock = product.quantity <= 0;
                const isLowStock = product.quantity <= 10 && product.quantity > 0;

                return (
                  <div
                    key={product._id}
                    className="group bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 overflow-hidden relative"
                  >
                    {/* Checkbox */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProductsForBatch.has(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openQRModal(product)}
                        className="w-7 h-7 bg-white/90 hover:bg-purple-100 rounded-lg text-purple-600 flex items-center justify-center transition-colors shadow-sm"
                        title="QR kod"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="w-7 h-7 bg-white/90 hover:bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center transition-colors shadow-sm"
                        title="Tahrirlash"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="w-7 h-7 bg-white/90 hover:bg-red-100 rounded-lg text-red-600 flex items-center justify-center transition-colors shadow-sm"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image */}
                    <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                      {productImage ? (
                        <img
                          src={productImage}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                      {/* Stock badge */}
                      <div className="absolute bottom-2 left-2">
                        {isLowStock ? (
                          <span className="px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-lg shadow-lg animate-pulse">{product.quantity} ta</span>
                        ) : !isOutOfStock && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-lg shadow-lg">{product.quantity} ta</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      {isOutOfStock && (
                        <span className="inline-block px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded mb-1">TUGAGAN</span>
                      )}
                      <h3 className="font-bold text-slate-900 text-sm mb-1 truncate group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h3>
                      <p className="font-bold text-blue-600 text-base">
                        {formatNumber(displayPrice)}
                        <span className="text-xs ml-1">so'm</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Infinite scroll trigger */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-8 flex justify-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="text-sm text-gray-500">Yuklanmoqda...</p>
                </div>
              </div>
            )}

            {/* No more products */}
            {!hasMore && products.length > 0 && (
              <div className="py-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <Package className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-600 font-medium">
                    Barcha mahsulotlar yuklandi ({totalProducts} ta)
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <ProductModal
        isOpen={showModal}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingProduct={editingProduct}
        categories={categories}
        isSubmitting={isSubmitting}
        formData={formData}
        onFormChange={setFormData}
        uploadedImages={uploadedImages}
        onImagesChange={setUploadedImages}
      />

      {/* Single Label Print Modal */}
      {showSingleLabelPrint && selectedProduct && (
        <BatchQRPrint 
          products={[{
            _id: selectedProduct._id,
            name: selectedProduct.name,
            price: (selectedProduct as any).unitPrice || (selectedProduct as any).price || 0,
            unit: selectedProduct.unit,
            prices: (selectedProduct as any).prices
          }]}
          onClose={() => setShowSingleLabelPrint(false)}
        />
      )}

      {/* Batch QR Print Modal */}
      {showBatchPrint && (
        <BatchQRPrint 
          products={getSelectedProductsForBatch().map(p => ({
            _id: p._id,
            name: p.name,
            price: (p as any).unitPrice || (p as any).price || 0,
            unit: p.unit,
            prices: (p as any).prices
          }))}
          onClose={closeBatchPrint}
        />
      )}

    </div>
  );
}