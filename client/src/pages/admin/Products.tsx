import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Upload, Save, Printer } from 'lucide-react';
import { Product } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { UPLOADS_URL } from '../../config/api';
import { useSocket } from '../../hooks/useSocket';
import { extractArrayFromResponse } from '../../utils/arrayHelpers';
import { CategoryFilter } from '../../components/kassa/CategoryFilter';
import { useCategories } from '../../hooks/useCategories';
import { StatCard, LoadingSpinner, EmptyState, ActionButton, Badge, UniversalPageHeader } from '../../components/common';
import BatchQRPrint from '../../components/BatchQRPrint';
import { convertUsdToUzs } from '../../utils/exchangeRate';
import { clearProductsCache } from '../../utils/indexedDbService';

export default function ProductsOptimized() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const socket = useSocket();
  const { categories } = useCategories(); // Kategoriyalarni yuklash
  
  // Core state - simplified
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [stockFilter] = useState('all');
  
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
    code: '',
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
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs
  const loadMoreRef = useRef<HTMLDivElement>(null); // Infinite scroll uchun
  
  // Tanlangan kategoriyaga tegishli bo'limlar
  const selectedCategorySubcategories = useMemo(() => {
    if (!formData.category) return [];
    const category = categories.find(c => c.name === formData.category);
    return category?.subcategories || [];
  }, [formData.category, categories]);
  
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
      setProducts(prev => [newProduct, ...prev]);
    };
    
    const handleProductUpdated = (updatedProduct: Product) => {
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
    };
    
    const handleProductDeleted = (data: { _id: string }) => {
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
    
    if (!formData.name || !formData.unitPrice) {
      showAlert('Nom va narx majburiy', 'Xatolik', 'danger');
      return;
    }
    
    try {
      // Avval rasmlarni yuklash
      const imagePaths = await uploadImages();
      
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
        code: formData.code,
        name: formData.name,
        description: formData.description,
        quantity: Number(parseNumber(formData.quantity)) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        unit: formData.unit,
        images: imagePaths,
        prices: prices, // Backend model ga mos prices array
        // Karobka ma'lumotlari
        boxInfo: {
          unitsPerBox: Number(formData.boxInfo.unitsPerBox) || 1,
          boxWeight: Number(formData.boxInfo.boxWeight) || 0
        }
      };
      
      console.log('💾 Frontend - Saving product with data:', {
        code: data.code,
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
      
      closeModal();
    } catch (error: any) {
      console.error('❌ Error saving product:', error);
      const errorMsg = error.response?.data?.message || 'Xatolik yuz berdi';
      showAlert(errorMsg, 'Xatolik', 'danger');
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
      code: '',
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
    setSelectedImages([]);
    setUploadedImages([]);
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
      code: product.code,
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
    setSelectedImages([]);
    
    setShowModal(true);
  };
  
  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setSelectedImages([]);
    setUploadedImages([]);
  };
  
  // Rasm tanlash
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length + uploadedImages.length > 8) {
      showAlert('Maksimal 8 ta rasm yuklash mumkin', 'Ogohlantirish', 'warning');
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
  };
  
  // Rasmni o'chirish (yangi tanlangan)
  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Rasmni o'chirish (yuklangan)
  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  // Rasmlarni serverga yuklash
  const uploadImages = async (): Promise<string[]> => {
    if (selectedImages.length === 0) return uploadedImages;
    
    try {
      const formData = new FormData();
      selectedImages.forEach(file => {
        formData.append('images', file);
      });
      
      const response = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newImagePaths = response.data.images || [];
      return [...uploadedImages, ...newImagePaths];
    } catch (error) {
      console.error('Error uploading images:', error);
      showAlert('Rasmlarni yuklashda xatolik', 'Xatolik', 'danger');
      return uploadedImages;
    }
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
      
      <UniversalPageHeader 
        title="Mahsulotlar"
        showSearch 
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuToggle={onMenuToggle}
        actions={
          <div className="flex items-center gap-2">
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
        }
      />

      <div className="p-4 space-y-4 w-full h-full">
        {/* Stats Cards - O'zgaradigan statistika (DB dagi jami mahsulotlar soni) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Jami"
            value={stats.total}
            icon={Package}
            color="blue"
          />
          <StatCard
            title="Kam qolgan"
            value={stats.lowStock}
            icon={AlertTriangle}
            color="orange"
          />
          <StatCard
            title="Tugagan"
            value={stats.outOfStock}
            icon={X}
            color="red"
          />
          <StatCard
            title="Jami qiymat"
            value={`${formatNumber(stats.totalValue)} so'm`}
            icon={DollarSign}
            color="green"
          />
        </div>

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

        {/* Category Filter */}
        <CategoryFilter
          categories={categoriesForFilter}
          selectedCategory={categoryFilter}
          selectedSubcategory={subcategoryFilter}
          onCategoryChange={setCategoryFilter}
          onSubcategoryChange={setSubcategoryFilter}
        />

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const productImage = getProductImage(product);
                
                // Narxlarni prices array dan olish - xavfsizlik tekshiruvi
                const pricesData = (product as any).prices;
                const prices = Array.isArray(pricesData) ? pricesData : [];
                const unitPrice = prices.find((p: any) => p.type === 'unit');
                const costPrice = prices.find((p: any) => p.type === 'cost');
                const displayPrice = unitPrice?.amount || (product as any).unitPrice || product.price || 0;
                
                return (
                  <div 
                    key={product._id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 relative"
                  >
                    {/* Checkbox for batch selection */}
                    <div className="absolute top-2 left-2 z-10">
                      <input
                        type="checkbox"
                        checked={selectedProductsForBatch.has(product._id)}
                        onChange={() => toggleProductSelection(product._id)}
                        className="w-5 h-5 rounded cursor-pointer"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                      <button 
                        onClick={() => openQRModal(product)} 
                        className="w-8 h-8 bg-purple-50 hover:bg-purple-100 rounded-lg text-purple-600 flex items-center justify-center transition-colors"
                        title="QR kod"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => openEditModal(product)} 
                        className="w-8 h-8 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center transition-colors"
                        title="Tahrirlash"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product._id)} 
                        className="w-8 h-8 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 flex items-center justify-center transition-colors"
                        title="O'chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4">
                      {/* Product Image */}
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-gray-100 mb-3">
                        {productImage ? (
                          <img 
                            src={productImage} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="space-y-2">
                        <div className="text-xs text-gray-500 font-mono">#{product.code}</div>
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                        
                        {/* Kategoriya va Bo'lim */}
                        <div className="flex flex-wrap gap-1">
                          {(product as any).category && (
                            <Badge variant="primary" size="sm">
                              {(product as any).category}
                            </Badge>
                          )}
                          {(product as any).subcategory && (
                            <Badge variant="info" size="sm">
                              {(product as any).subcategory}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Narxlar */}
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-bold text-blue-600">
                              {formatNumber(displayPrice)}
                            </span>
                            <span className="text-sm text-gray-500">so'm</span>
                          </div>
                          {costPrice && (
                            <div className="text-xs text-gray-500">
                              Tan narxi: {formatNumber(costPrice.amount)} so'm
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Miqdor:</span>
                          <span className={`font-medium ${
                            product.quantity === 0 ? 'text-red-600' : 
                            product.quantity <= 50 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {product.quantity} {product.unit || 'dona'}
                          </span>
                        </div>
                      </div>
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <form 
            onSubmit={handleSubmit} 
            className="relative bg-white rounded-lg w-full max-w-md p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
              <h3 className="text-lg font-semibold">
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
              </h3>
              <button type="button" onClick={closeModal} className="hover:bg-gray-100 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kod</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.code} 
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birlik</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value as any})}
                >
                  <option value="dona">Dona</option>
                  <option value="kg">Kilogram</option>
                  <option value="metr">Metr</option>
                  <option value="litr">Litr</option>
                  <option value="karobka">Karobka</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nomi</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Izoh</label>
              <textarea 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={2}
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategoriya</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value, subcategory: ''})}
                  required
                >
                  <option value="">Kategoriya tanlang</option>
                  {categories.map(category => (
                    <option key={category._id} value={category.name}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bo'lim</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.subcategory}
                  onChange={e => setFormData({...formData, subcategory: e.target.value})}
                  disabled={!formData.category || selectedCategorySubcategories.length === 0}
                >
                  <option value="">Bo'lim tanlanmagan</option>
                  {selectedCategorySubcategories.map((sub) => (
                    <option key={sub._id} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
                {formData.category && selectedCategorySubcategories.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">Bu kategoriyada bo'limlar yo'q</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.costPriceUsd || ''}
                    onChange={e => {
                      const value = e.target.value ? Number(e.target.value) : '';
                      setFormData({...formData, costPriceUsd: String(value)});
                      // Auto-convert to UZS
                      if (value) {
                        const uzsValue = convertUsdToUzs(Number(value));
                        setFormData(prev => ({...prev, costPrice: String(uzsValue)}));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi (UZS)</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  value={formData.costPrice ? formatInputNumber(formData.costPrice) : ''}
                  onChange={e => {
                    const value = parseNumber(e.target.value);
                    setFormData({...formData, costPrice: value});
                  }}
                  placeholder="0"
                  title="USD dan avtomatik hisoblanadi yoki to'g'ridan-to'g'ri kiritish mumkin"
                />
                {formData.costPriceUsd && (
                  <p className="text-xs text-blue-600 mt-1">
                    {Number(formData.costPriceUsd).toFixed(2)} USD = {formatNumber(Number(formData.costPrice))} UZS
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sotish narxi *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.unitPrice ? formatInputNumber(formData.unitPrice) : ''}
                  onChange={e => {
                    const value = parseNumber(e.target.value);
                    setFormData({...formData, unitPrice: value});
                  }}
                  required
                  placeholder="0"
                />
              </div>
            </div>

            {/* Karobka narxi va ma'lumotlari - faqat karobka tanlangan bo'lsa */}
            {formData.unit === 'karobka' && (
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Karobka ma'lumotlari
                </label>
                
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Karobka narxi</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.boxPrice ? formatInputNumber(formData.boxPrice) : ''}
                      onChange={e => {
                        const value = parseNumber(e.target.value);
                        setFormData({...formData, boxPrice: value});
                      }}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Karobkada nechta</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.boxInfo.unitsPerBox}
                      onChange={e => setFormData({
                        ...formData, 
                        boxInfo: {...formData.boxInfo, unitsPerBox: e.target.value}
                      })}
                      placeholder="24"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Og'irligi (kg)</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.boxInfo.boxWeight}
                      onChange={e => setFormData({
                        ...formData, 
                        boxInfo: {...formData.boxInfo, boxWeight: e.target.value}
                      })}
                      placeholder="10"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Masalan: 1 karobkada 24 dona, og'irligi 10 kg
                </p>
              </div>
            )}

            {/* Chegirma sozlamalari */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Chegirma sozlamalari (ixtiyoriy)
              </label>
              
              {/* 1-chegirma */}
              <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs font-medium text-green-900 mb-2">1-chegirma</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                      value={formData.discount1.minQuantity}
                      onChange={e => setFormData({
                        ...formData, 
                        discount1: {...formData.discount1, minQuantity: e.target.value}
                      })}
                      placeholder="10"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                      value={formData.discount1.percent}
                      onChange={e => setFormData({
                        ...formData, 
                        discount1: {...formData.discount1, percent: e.target.value}
                      })}
                      placeholder="5"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* 2-chegirma */}
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-900 mb-2">2-chegirma</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      value={formData.discount2.minQuantity}
                      onChange={e => setFormData({
                        ...formData, 
                        discount2: {...formData.discount2, minQuantity: e.target.value}
                      })}
                      placeholder="50"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                      value={formData.discount2.percent}
                      onChange={e => setFormData({
                        ...formData, 
                        discount2: {...formData.discount2, percent: e.target.value}
                      })}
                      placeholder="10"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              {/* 3-chegirma */}
              <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs font-medium text-purple-900 mb-2">3-chegirma</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Minimal miqdor</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                      value={formData.discount3.minQuantity}
                      onChange={e => setFormData({
                        ...formData, 
                        discount3: {...formData.discount3, minQuantity: e.target.value}
                      })}
                      placeholder="100"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Chegirma %</label>
                    <input 
                      type="number" 
                      className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500"
                      value={formData.discount3.percent}
                      onChange={e => setFormData({
                        ...formData, 
                        discount3: {...formData.discount3, percent: e.target.value}
                      })}
                      placeholder="15"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Masalan: 10 dona olsa 5% chegirma, 50 dona olsa 10% chegirma
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miqdor</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formData.quantity ? formatInputNumber(formData.quantity) : ''}
                onChange={e => {
                  const value = parseNumber(e.target.value);
                  setFormData({...formData, quantity: value});
                }}
              />
            </div>

            {/* Rasm yuklash */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rasmlar (maksimal 8 ta)</label>
              
              {/* Yuklangan va tanlangan rasmlar */}
              <div className="grid grid-cols-4 gap-2 mb-2">
                {/* Yuklangan rasmlar */}
                {uploadedImages.map((imagePath, index) => (
                  <div key={`uploaded-${index}`} className="relative group">
                    <img 
                      src={`${UPLOADS_URL}${imagePath}`}
                      alt={`Rasm ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeUploadedImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Yangi tanlangan rasmlar */}
                {selectedImages.map((file, index) => (
                  <div key={`selected-${index}`} className="relative group">
                    <img 
                      src={URL.createObjectURL(file)}
                      alt={`Yangi rasm ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg border border-blue-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeSelectedImage(index)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {/* Rasm qo'shish tugmasi */}
                {(uploadedImages.length + selectedImages.length) < 8 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Qo'shish</span>
                  </button>
                )}
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
              
              <p className="text-xs text-gray-500">
                {uploadedImages.length + selectedImages.length}/8 ta rasm
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingProduct ? 'Yangilash' : 'Saqlash'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Single Label Print Modal */}
      {showSingleLabelPrint && selectedProduct && (
        <BatchQRPrint 
          products={[{
            _id: selectedProduct._id,
            code: selectedProduct.code,
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
            code: p.code,
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