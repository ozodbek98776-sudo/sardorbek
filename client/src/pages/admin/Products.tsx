import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Header from '../../components/Header';
import { Plus, Package, X, Edit, Trash2, AlertTriangle, DollarSign, QrCode, Download, RotateCcw, Save, Image, Upload } from 'lucide-react';
import { Product } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import QRCodeGenerator, { exportQRCodeToPNG } from '../../components/QRCodeGenerator';
import { FRONTEND_URL, UPLOADS_URL } from '../../config/api';
import { useSocket } from '../../hooks/useSocket';
import { extractArrayFromResponse, safeFilter } from '../../utils/arrayHelpers';
import { CategoryFilter } from '../../components/kassa/CategoryFilter';
import { useCategories } from '../../hooks/useCategories';

export default function ProductsOptimized() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const socket = useSocket();
  const { categories } = useCategories(); // Kategoriyalarni yuklash
  
  // Core state - simplified
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [stockFilter, setStockFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Form state - simplified
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unitPrice: '',
    costPrice: '',
    quantity: '',
    category: '',
    subcategory: '', // Bo'lim uchun
    unit: 'dona' as 'dona' | 'kg' | 'metr' | 'litr' | 'karobka'
  });
  
  // Rasm yuklash uchun state
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });
  
  // Refs
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null); // Infinite scroll uchun
  
  // Tanlangan kategoriyaga tegishli bo'limlar
  const selectedCategorySubcategories = useMemo(() => {
    if (!formData.category) return [];
    const category = categories.find(c => c.name === formData.category);
    return (category as any)?.subcategories || [];
  }, [formData.category, categories]);
  
  // Convert categories to CategoryFilter format
  const categoriesForFilter = useMemo(() => {
    return categories.map(cat => ({
      _id: cat._id,
      name: cat.name
    }));
  }, [categories]);
  
  // Optimized debounce - 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Optimized filtered products
  const filteredProducts = useMemo(() => {
    const productsArray = Array.isArray(products) ? products : [];
    
    if (!debouncedSearch && stockFilter === 'all' && !categoryFilter) {
      return productsArray;
    }
    
    return safeFilter<Product>(productsArray, product => {
      // Search filter
      const matchesSearch = !debouncedSearch || 
        product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.code.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      // Stock filter
      const matchesStock = stockFilter === 'all' || 
        (stockFilter === 'low' && product.quantity <= 50 && product.quantity > 0) ||
        (stockFilter === 'out' && product.quantity === 0);
      
      // Category filter
      const matchesCategory = !categoryFilter || product.category === categoryFilter;
      
      return matchesSearch && matchesStock && matchesCategory;
    });
  }, [products, debouncedSearch, stockFilter, categoryFilter]);
  
  // Fetch products - optimized with pagination
  const fetchProducts = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      
      const response = await api.get('/products', {
        params: {
          page: pageNum,
          limit: 10, // 10 ta mahsulot
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined
        }
      });
      
      const responseData = response.data;
      
      // Response format: { data: [...], pagination: {...} }
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
        // Eski format
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
  }, [showAlert, debouncedSearch, categoryFilter]);

  // ⚡ Fetch statistics - alohida va tez
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await api.get('/products/statistics', {
        params: {
          search: debouncedSearch || undefined,
          category: categoryFilter || undefined
        }
      });
      
      const statsData = response.data;
      setStats({
        total: statsData.total || 0,
        lowStock: statsData.lowStock || 0,
        outOfStock: statsData.outOfStock || 0,
        totalValue: statsData.totalValue || 0
      });
      
      console.log('📊 Statistics loaded:', statsData);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Statistika yuklanmasa ham davom etamiz
    }
  }, [debouncedSearch, categoryFilter]);
  
  // Load products on mount
  useEffect(() => {
    fetchProducts(1, false);
    fetchStatistics(); // ⚡ Statistikani alohida yuklash
  }, [debouncedSearch, categoryFilter]);
  
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
  
  // Socket listeners - optimized
  useEffect(() => {
    if (!socket) return;
    
    const handleProductCreated = (newProduct: Product) => {
      setProducts(prev => [newProduct, ...prev]);
      fetchStatistics(); // ⚡ Statistikani yangilash
    };
    
    const handleProductUpdated = (updatedProduct: Product) => {
      setProducts(prev => prev.map(p => p._id === updatedProduct._id ? updatedProduct : p));
      fetchStatistics(); // ⚡ Statistikani yangilash
    };
    
    const handleProductDeleted = (data: { _id: string }) => {
      setProducts(prev => prev.filter(p => p._id !== data._id));
      fetchStatistics(); // ⚡ Statistikani yangilash
    };
    
    socket.on('product:created', handleProductCreated);
    socket.on('product:updated', handleProductUpdated);
    socket.on('product:deleted', handleProductDeleted);
    
    return () => {
      socket.off('product:created', handleProductCreated);
      socket.off('product:updated', handleProductUpdated);
      socket.off('product:deleted', handleProductDeleted);
    };
  }, [socket, fetchStatistics]);
  
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
      
      const data = {
        code: formData.code,
        name: formData.name,
        description: formData.description,
        unitPrice: Number(formData.unitPrice),
        costPrice: Number(formData.costPrice) || 0,
        quantity: Number(formData.quantity) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        unit: formData.unit,
        images: imagePaths
      };
      
      if (editingProduct) {
        const response = await api.put(`/products/${editingProduct._id}`, data);
        setProducts(prev => prev.map(p => p._id === editingProduct._id ? response.data : p));
        showAlert('Mahsulot yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        const response = await api.post('/products', data);
        setProducts(prev => [response.data, ...prev]);
        showAlert('Mahsulot qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      
      fetchStatistics(); // ⚡ Statistikani yangilash
      closeModal();
    } catch (error: any) {
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
      fetchStatistics(); // ⚡ Statistikani yangilash
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
      quantity: '',
      category: '',
      subcategory: '',
      unit: 'dona'
    });
    setSelectedImages([]);
    setUploadedImages([]);
    setShowModal(true);
  };
  
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      description: (product as any).description || '',
      unitPrice: String((product as any).unitPrice || product.price || 0),
      costPrice: String((product as any).costPrice || 0),
      quantity: String(product.quantity),
      category: (product as any).category || '',
      subcategory: (product as any).subcategory || '', // Bo'limni qo'shish
      unit: product.unit || 'dona'
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
    
    setUploadingImages(true);
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
    } finally {
      setUploadingImages(false);
    }
  };
  
  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRModal(true);
  };
  
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
  
  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      const imagePath = typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as any).path;
      return `${UPLOADS_URL}${imagePath}`;
    }
    return null;
  };
  
  const statItems = [
    { label: 'Jami', value: stats.total, icon: Package, color: 'blue', filter: 'all' },
    { label: 'Kam qolgan', value: stats.lowStock, icon: AlertTriangle, color: 'yellow', filter: 'low' },
    { label: 'Tugagan', value: stats.outOfStock, icon: X, color: 'red', filter: 'out' },
    { label: 'Jami qiymat', value: `${formatNumber(stats.totalValue)} so'm`, icon: DollarSign, color: 'green', filter: null },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 w-full h-full">
      {AlertComponent}
      
      <Header 
        title="Mahsulotlar"
        showSearch 
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fetchProducts(1, false)} 
              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
              title="Yangilash"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button 
              onClick={openAddModal} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Qo'shish
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4 w-full h-full">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStockFilter(stat.filter)}
              className={`bg-white rounded-lg border p-4 transition-all ${
                stat.filter ? 'cursor-pointer hover:shadow-md' : ''
              } ${
                stockFilter === stat.filter ? 'border-blue-500 shadow-md' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${stat.color}-50`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <CategoryFilter
          categories={categoriesForFilter}
          selectedCategory={categoryFilter}
          onCategoryChange={setCategoryFilter}
        />

        {/* Products Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-500">Yuklanmoqda...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Mahsulotlar topilmadi</h3>
            <p className="text-gray-500 text-center mb-6">
              {searchQuery ? 'Qidiruv bo\'yicha mahsulotlar topilmadi' : 'Birinchi mahsulotni qo\'shing'}
            </p>
            <button onClick={openAddModal} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Mahsulot qo'shish
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(product => {
                const productImage = getProductImage(product);
                
                return (
                  <div 
                    key={product._id}
                    className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200 relative"
                  >
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
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                              {(product as any).category}
                            </span>
                          )}
                          {(product as any).subcategory && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                              {(product as any).subcategory}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-blue-600">
                            {formatNumber((product as any).unitPrice || product.price || 0)}
                          </span>
                          <span className="text-sm text-gray-500">so'm</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <form 
            onSubmit={handleSubmit} 
            className="relative bg-white rounded-lg w-full max-w-md p-6 space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
              </h3>
              <button type="button" onClick={closeModal}>
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
                  {selectedCategorySubcategories.map((sub: any) => (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Tan narxi</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formatInputNumber(formData.costPrice)}
                  onChange={e => setFormData({...formData, costPrice: parseNumber(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sotish narxi</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formatInputNumber(formData.unitPrice)}
                  onChange={e => setFormData({...formData, unitPrice: parseNumber(e.target.value)})}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miqdor</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={formatInputNumber(formData.quantity)}
                onChange={e => setFormData({...formData, quantity: parseNumber(e.target.value)})}
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

      {/* QR Modal */}
      {showQRModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowQRModal(false)} />
          <div className="relative bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">QR Kod</h3>
              <button onClick={() => setShowQRModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeGenerator
                  ref={qrContainerRef}
                  value={`${FRONTEND_URL}/product/${selectedProduct._id}`}
                  size={200}
                  level="H"
                />
              </div>
              
              <div className="text-center">
                <h4 className="font-medium">{selectedProduct.name}</h4>
                <p className="text-sm text-gray-500">#{selectedProduct.code}</p>
              </div>
              
              <button 
                onClick={downloadQR} 
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                PNG yuklab olish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}