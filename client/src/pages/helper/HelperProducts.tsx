import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Package, X, Edit, Search, QrCode, Trash2 } from 'lucide-react';
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
import { LoadingSpinner, EmptyState, ActionButton, Badge } from '../../components/common';
import ProductModal from '../../components/ProductModal';
import BatchQRPrint from '../../components/BatchQRPrint';
import { clearProductsCache } from '../../utils/indexedDbService';

export default function HelperProducts() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const socket = useSocket();
  const { categories } = useCategories();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showQRPrint, setShowQRPrint] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useModalScrollLock(showModal);

  const [formData, setFormData] = useState({
    name: '', description: '', unitPrice: '', costPrice: '', costPriceUsd: '',
    boxPrice: '', quantity: '', category: '', subcategory: '',
    unit: 'dona' as 'dona' | 'kg' | 'metr' | 'litr' | 'karobka' | 'qop',
    boxInfo: { unitsPerBox: '', boxWeight: '' },
    metrInfo: { metersPerOram: '' },
    pachkaInfo: { unitsPerPachka: '' },
    discount1: { minQuantity: '', percent: '' },
    discount2: { minQuantity: '', percent: '' },
    discount3: { minQuantity: '', percent: '' }
  });

  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [initialUploadedImages, setInitialUploadedImages] = useState<string[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const categoriesForFilter = useMemo(() => {
    return categories.map(cat => ({ _id: cat._id, name: cat.name, subcategories: cat.subcategories }));
  }, [categories]);

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    let filtered = products;
    if (categoryFilter) filtered = filtered.filter(p => p.category === categoryFilter);
    return filtered;
  }, [products, categoryFilter]);

  const fetchProducts = useCallback(async (pageNum = 1, append = false, searchTerm = '') => {
    try {
      if (!append) setLoading(true);
      const response = await api.get('/products', {
        params: {
          page: pageNum, limit: 10,
          search: searchTerm || undefined,
          category: categoryFilter || undefined,
          subcategory: subcategoryFilter || undefined
        }
      });
      const responseData = response.data;
      if (responseData.data && responseData.pagination) {
        if (append) setProducts(prev => [...prev, ...responseData.data]);
        else setProducts(responseData.data);
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
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, subcategoryFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setProducts([]);
    fetchProducts(1, false, searchQuery);
  }, [categoryFilter, subcategoryFilter, searchQuery, fetchProducts]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loading) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore && !loading) fetchProducts(currentPage + 1, true);
    }, { threshold: 0.5 });
    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, currentPage, fetchProducts]);

  useEffect(() => {
    if (!socket) return;
    const handleCreated = (p: Product) => setProducts(prev => [p, ...prev]);
    const handleUpdated = (p: Product) => setProducts(prev => prev.map(x => x._id === p._id ? p : x));
    const handleDeleted = (d: { _id: string }) => setProducts(prev => prev.filter(x => x._id !== d._id));
    socket.on('product:created', handleCreated);
    socket.on('product:updated', handleUpdated);
    socket.on('product:deleted', handleDeleted);
    return () => { socket.off('product:created', handleCreated); socket.off('product:updated', handleUpdated); socket.off('product:deleted', handleDeleted); };
  }, [socket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.name) { showAlert('Mahsulot nomi majburiy', 'Xatolik', 'danger'); return; }
    setIsSubmitting(true);
    try {
      const prices: Array<{ type: string; amount: number; minQuantity: number; discountPercent: number; isActive: boolean }> = [];
      // Tan narxi va chegirma — helper o'zgartira olmaydi, lekin editing da mavjud qiymatlarni saqlab qolish kerak
      if (editingProduct) {
        const existingPrices = (editingProduct as Record<string, unknown>).prices;
        const oldPrices = Array.isArray(existingPrices) ? existingPrices : [];
        const costPrice = oldPrices.find((p: Record<string, unknown>) => p.type === 'cost');
        if (costPrice) prices.push(costPrice as typeof prices[0]);
        // Chegirmalar
        ['discount1', 'discount2', 'discount3'].forEach(t => {
          const d = oldPrices.find((p: Record<string, unknown>) => p.type === t);
          if (d) prices.push(d as typeof prices[0]);
        });
      }
      // Sotish narxi (helper o'zgartira oladi)
      const unitPriceNum = parseNumber(formData.unitPrice);
      if (unitPriceNum && Number(unitPriceNum) > 0) {
        prices.push({ type: 'unit', amount: Number(unitPriceNum), minQuantity: 1, discountPercent: 0, isActive: true });
      }
      const boxPriceNum = parseNumber(formData.boxPrice);
      if (formData.unit === 'karobka' && boxPriceNum && Number(boxPriceNum) > 0) {
        prices.push({ type: 'box', amount: Number(boxPriceNum), minQuantity: 1, discountPercent: 0, isActive: true });
      }

      const data = {
        name: formData.name,
        description: formData.description,
        quantity: Number(parseNumber(formData.quantity)) || 0,
        category: formData.category,
        subcategory: formData.subcategory,
        unit: formData.unit,
        images: uploadedImages,
        prices,
        boxInfo: { unitsPerBox: Number(formData.boxInfo.unitsPerBox) || 1, boxWeight: Number(formData.boxInfo.boxWeight) || 0 },
        metrInfo: { metersPerOram: Number(formData.metrInfo?.metersPerOram) || 0 },
        pachkaInfo: { unitsPerPachka: Number(formData.pachkaInfo?.unitsPerPachka) || 0 }
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, data);
        await clearProductsCache().catch(() => {});
        showAlert('Mahsulot yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        await api.post('/products', data);
        await clearProductsCache().catch(() => {});
        showAlert('Mahsulot qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      closeModal(true);
      // Ro'yxatni yangilash
      fetchProducts(1, false, searchQuery);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFormData = () => ({
    name: '', description: '', unitPrice: '', costPrice: '', costPriceUsd: '',
    boxPrice: '', quantity: '', category: '', subcategory: '',
    unit: 'dona' as const,
    boxInfo: { unitsPerBox: '', boxWeight: '' },
    metrInfo: { metersPerOram: '' },
    pachkaInfo: { unitsPerPachka: '' },
    discount1: { minQuantity: '', percent: '' },
    discount2: { minQuantity: '', percent: '' },
    discount3: { minQuantity: '', percent: '' }
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData(resetFormData());
    setUploadedImages([]);
    setInitialUploadedImages([]);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    const pricesData = (product as Record<string, unknown>).prices;
    const prices = Array.isArray(pricesData) ? pricesData : [];
    const costPrice = prices.find((p: Record<string, unknown>) => p.type === 'cost');
    const unitPrice = prices.find((p: Record<string, unknown>) => p.type === 'unit');
    const boxPrice = prices.find((p: Record<string, unknown>) => p.type === 'box');
    const discount1 = prices.find((p: Record<string, unknown>) => p.type === 'discount1');
    const discount2 = prices.find((p: Record<string, unknown>) => p.type === 'discount2');
    const discount3 = prices.find((p: Record<string, unknown>) => p.type === 'discount3');
    const oldUnitPrice = (product as Record<string, unknown>).unitPrice || product.price || 0;
    const oldCostPrice = (product as Record<string, unknown>).costPrice || 0;
    const oldBoxPrice = (product as Record<string, unknown>).boxPrice || 0;
    const boxInfo = ((product as Record<string, unknown>).boxInfo || { unitsPerBox: 1, boxWeight: 0 }) as { unitsPerBox: number; boxWeight: number };

    setFormData({
      name: product.name,
      description: ((product as Record<string, unknown>).description as string) || '',
      unitPrice: (unitPrice as Record<string, unknown>)?.amount ? String((unitPrice as Record<string, unknown>).amount) : (oldUnitPrice ? String(oldUnitPrice) : ''),
      costPrice: (costPrice as Record<string, unknown>)?.amount ? String((costPrice as Record<string, unknown>).amount) : (oldCostPrice ? String(oldCostPrice) : ''),
      costPriceUsd: '',
      boxPrice: (boxPrice as Record<string, unknown>)?.amount ? String((boxPrice as Record<string, unknown>).amount) : (oldBoxPrice ? String(oldBoxPrice) : ''),
      quantity: String(product.quantity),
      category: ((product as Record<string, unknown>).category as string) || '',
      subcategory: ((product as Record<string, unknown>).subcategory as string) || '',
      unit: product.unit || 'dona',
      boxInfo: { unitsPerBox: boxInfo.unitsPerBox ? String(boxInfo.unitsPerBox) : '', boxWeight: boxInfo.boxWeight ? String(boxInfo.boxWeight) : '' },
      metrInfo: { metersPerOram: ((product as Record<string, unknown>).metrInfo as Record<string, unknown>)?.metersPerOram ? String(((product as Record<string, unknown>).metrInfo as Record<string, unknown>).metersPerOram) : '' },
      pachkaInfo: { unitsPerPachka: ((product as Record<string, unknown>).pachkaInfo as Record<string, unknown>)?.unitsPerPachka ? String(((product as Record<string, unknown>).pachkaInfo as Record<string, unknown>).unitsPerPachka) : '' },
      discount1: { minQuantity: (discount1 as Record<string, unknown>)?.minQuantity ? String((discount1 as Record<string, unknown>).minQuantity) : '', percent: (discount1 as Record<string, unknown>)?.discountPercent ? String((discount1 as Record<string, unknown>).discountPercent) : '' },
      discount2: { minQuantity: (discount2 as Record<string, unknown>)?.minQuantity ? String((discount2 as Record<string, unknown>).minQuantity) : '', percent: (discount2 as Record<string, unknown>)?.discountPercent ? String((discount2 as Record<string, unknown>).discountPercent) : '' },
      discount3: { minQuantity: (discount3 as Record<string, unknown>)?.minQuantity ? String((discount3 as Record<string, unknown>).minQuantity) : '', percent: (discount3 as Record<string, unknown>)?.discountPercent ? String((discount3 as Record<string, unknown>).discountPercent) : '' }
    });
    const productImages = ((product as Record<string, unknown>).images as string[]) || [];
    const imagePaths = productImages.map((img: unknown) => typeof img === 'string' ? img : (img as Record<string, string>).path);
    setUploadedImages(imagePaths);
    setInitialUploadedImages(imagePaths);
    setShowModal(true);
  };

  const closeModal = async (skipCleanup = false) => {
    if (!skipCleanup) {
      const newlyUploaded = uploadedImages.filter(img => !initialUploadedImages.includes(img));
      if (newlyUploaded.length > 0) {
        try { await api.post('/products/cleanup-images', { imagePaths: newlyUploaded }); } catch {}
      }
    }
    setShowModal(false);
    setEditingProduct(null);
    setUploadedImages([]);
    setInitialUploadedImages([]);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Mahsulotni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p._id !== id));
      await clearProductsCache().catch(() => {});
      showAlert('Mahsulot o\'chirildi', 'Muvaffaqiyat', 'success');
    } catch {
      showAlert('Mahsulotni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  const openQRModal = (product: Product) => {
    setSelectedProduct(product);
    setShowQRPrint(true);
  };

  const getProductImage = (product: Product) => {
    if (product.images && product.images.length > 0) {
      const imagePath = typeof product.images[0] === 'string' ? product.images[0] : (product.images[0] as Record<string, string>).path;
      return `${UPLOADS_URL}${imagePath}`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 w-full h-full">
      {AlertComponent}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button onClick={onMenuToggle} className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors flex-shrink-0 shadow-md">
                <Package className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Mahsulotlar</h1>
            </div>
            <ActionButton icon={Plus} variant="primary" onClick={openAddModal}>Qo'shish</ActionButton>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3 w-full">
        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            placeholder="Mahsulot qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2.5 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 text-sm transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="w-full aspect-square bg-gray-200 animate-pulse" />
                <div className="p-2.5 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Mahsulotlar topilmadi"
            description={searchQuery ? 'Qidiruv bo\'yicha topilmadi' : 'Birinchi mahsulotni qo\'shing'}
            action={<ActionButton icon={Plus} onClick={openAddModal}>Mahsulot qo'shish</ActionButton>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const productImage = getProductImage(product);
                const pricesData = (product as Record<string, unknown>).prices;
                const prices = Array.isArray(pricesData) ? pricesData : [];
                const unitPrice = prices.find((p: Record<string, unknown>) => p.type === 'unit');
                const displayPrice = (unitPrice as Record<string, number>)?.amount || (product as Record<string, unknown>).unitPrice as number || product.price || 0;
                const isOutOfStock = product.quantity <= 0;
                const isLowStock = product.quantity <= 10 && product.quantity > 0;

                return (
                  <div
                    key={product._id}
                    onClick={() => openEditModal(product)}
                    className="group relative bg-white rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all overflow-hidden cursor-pointer"
                  >
                    {/* Action Buttons */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openQRModal(product)} className="w-7 h-7 bg-white/90 hover:bg-purple-100 rounded-lg text-purple-600 flex items-center justify-center shadow-sm" title="QR kod">
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => openEditModal(product)} className="w-7 h-7 bg-white/90 hover:bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center shadow-sm" title="Tahrirlash">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(product._id)} className="w-7 h-7 bg-white/90 hover:bg-red-100 rounded-lg text-red-600 flex items-center justify-center shadow-sm" title="O'chirish">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Image */}
                    <div className="relative w-full aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
                      {productImage ? (
                        <img src={productImage} alt={product.name} loading="lazy" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-300" />
                      )}
                      <div className="absolute bottom-2 left-2">
                        {isOutOfStock ? (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-lg">TUGAGAN</span>
                        ) : isLowStock ? (
                          <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded-lg animate-pulse">{product.quantity} ta</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-lg">{product.quantity} ta</span>
                        )}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{product.name}</h3>
                      <p className="font-bold text-blue-600 text-base">
                        {formatNumber(displayPrice as number)}<span className="text-xs ml-1">so'm</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div ref={loadMoreRef} className="py-6 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {!hasMore && products.length > 0 && (
              <div className="py-4 text-center">
                <p className="text-sm text-gray-500">Barcha mahsulotlar yuklandi ({totalProducts} ta)</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Product Modal with restricted fields */}
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
        restrictedFields={true}
      />

      {showQRPrint && selectedProduct && (
        <BatchQRPrint
          products={[{
            _id: selectedProduct._id,
            name: selectedProduct.name,
            code: (selectedProduct as Record<string, unknown>).code as number,
            price: (() => {
              const pricesData = (selectedProduct as Record<string, unknown>).prices;
              const prices = Array.isArray(pricesData) ? pricesData : [];
              const unitPrice = prices.find((p: Record<string, unknown>) => p.type === 'unit');
              return (unitPrice as Record<string, number>)?.amount || (selectedProduct as Record<string, unknown>).unitPrice as number || selectedProduct.price || 0;
            })()
          }]}
          onClose={() => { setShowQRPrint(false); setSelectedProduct(null); }}
        />
      )}
    </div>
  );
}
