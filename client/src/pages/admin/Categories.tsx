import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Edit, Trash2, ChevronDown, ChevronRight, Save, X, FolderPlus, ArrowLeft, Package, Folder } from 'lucide-react';
import { useCategories, Category } from '../../hooks/useCategories';
import { useAlert } from '../../hooks/useAlert';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';
import { extractArrayFromResponse } from '../../utils/arrayHelpers';
import { LoadingSpinner, EmptyState, Modal, ActionButton, Badge, UniversalPageHeader } from '../../components/common';

interface Subcategory {
  _id: string;
  name: string;
  order: number;
}

interface Product {
  _id: string;
  code: string;
  name: string;
  price: number;
  unitPrice?: number;
  quantity: number;
  category?: string;
  images?: any[];
}

export default function Categories() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const { categories, loading, refetch } = useCategories();
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const [showModal, setShowModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [formData, setFormData] = useState({ name: '', order: 0 });
  const [subFormData, setSubFormData] = useState({ name: '', order: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Yangi state - bo'limlar oynasi uchun
  const [showSubcategoriesView, setShowSubcategoriesView] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<Category | null>(null);
  
  // Mahsulotlar uchun state
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (showModal || showSubModal) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [showModal, showSubModal]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Kategoriya bosilganda bo'limlar oynasini ochish
  const openSubcategoriesView = async (category: Category) => {
    setViewingCategory(category);
    setShowSubcategoriesView(true);
    
    // Kategoriyaga tegishli mahsulotlarni yuklash
    setLoadingProducts(true);
    try {
      const response = await api.get(`/products?category=${encodeURIComponent(category.name)}`);
      const productsData = extractArrayFromResponse<Product>(response);
      setCategoryProducts(productsData);
    } catch (err) {
      console.error('Error loading products:', err);
      showAlert('Mahsulotlarni yuklashda xatolik', 'Xatolik', 'danger');
      setCategoryProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Orqaga qaytish - bo'limlar oynasini yopish
  const closeSubcategoriesView = () => {
    setShowSubcategoriesView(false);
    setViewingCategory(null);
    setCategoryProducts([]);
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', order: categories.length });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, order: category.order });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData({ name: '', order: 0 });
  };

  const openSubModal = (category: Category, subcategory?: Subcategory) => {
    setSelectedCategory(category);
    setEditingSubcategory(subcategory || null);
    setSubFormData({
      name: subcategory?.name || '',
      order: subcategory?.order || ((category as any).subcategories?.length || 0)
    });
    setShowSubModal(true);
  };

  const closeSubModal = () => {
    setShowSubModal(false);
    setSelectedCategory(null);
    setEditingSubcategory(null);
    setSubFormData({ name: '', order: 0 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAlert('Kategoriya nomini kiriting', 'Xatolik', 'danger');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, formData);
        showAlert('Kategoriya yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        await api.post('/categories', formData);
        showAlert('Kategoriya qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      closeModal();
      refetch();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    const confirmed = await showConfirm(
      `"${category.name}" kategoriyasini o'chirishni tasdiqlaysizmi?`,
      "O'chirish"
    );
    if (!confirmed) return;

    setDeleting(category._id);
    try {
      await api.delete(`/categories/${category._id}`);
      showAlert('Kategoriya o\'chirildi', 'Muvaffaqiyat', 'success');
      refetch();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setDeleting(null);
    }
  };

  const handleSubSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFormData.name.trim()) {
      showAlert('Bo\'lim nomini kiriting', 'Xatolik', 'danger');
      return;
    }
    if (!selectedCategory) return;

    setSaving(true);
    try {
      if (editingSubcategory) {
        await api.put(
          `/categories/${selectedCategory._id}/subcategories/${editingSubcategory._id}`,
          subFormData
        );
        showAlert('Bo\'lim yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        await api.post(
          `/categories/${selectedCategory._id}/subcategories`,
          subFormData
        );
        showAlert('Bo\'lim qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      closeSubModal();
      refetch();
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSub = async (category: Category, subcategory: Subcategory) => {
    const confirmed = await showConfirm(
      `"${subcategory.name}" bo'limini o'chirishni tasdiqlaysizmi?`,
      "O'chirish"
    );
    if (!confirmed) return;

    try {
      await api.delete(`/categories/${category._id}/subcategories/${subcategory._id}`);
      showAlert('Bo\'lim o\'chirildi', 'Muvaffaqiyat', 'success');
      await refetch();
      
      // Agar bo'limlar oynasi ochiq bo'lsa, viewingCategory ni yangilash
      if (showSubcategoriesView && viewingCategory?._id === category._id) {
        const updatedCategories = await api.get('/categories');
        const updatedCategory = updatedCategories.data.find((c: Category) => c._id === category._id);
        if (updatedCategory) {
          setViewingCategory(updatedCategory);
        }
      }
    } catch (err: any) {
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 w-full h-full">
      {AlertComponent}
      
      <UniversalPageHeader
        title="Kategoriyalar"
        subtitle={`${categories.length} ta kategoriya`}
        icon={Folder}
        onMenuToggle={onMenuToggle}
        actions={
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30 hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Kategoriya qo'shish</span>
          </button>
        }
      />

      <div className="w-full p-1 sm:p-2">
        {loading ? (
          <LoadingSpinner size="lg" text="Yuklanmoqda..." />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="Kategoriyalar yo'q"
            description="Birinchi kategoriyani qo'shing va mahsulotlarni guruhlang"
            action={
              <ActionButton icon={Plus} onClick={openAddModal}>
                Kategoriya qo'shish
              </ActionButton>
            }
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-200">
              {categories.map((category) => {
                const subcategories = (category as any).subcategories || [];
                
                return (
                  <div key={category._id}>
                    {/* Category Row - Click to view subcategories */}
                    <div 
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                      onClick={() => openSubcategoriesView(category)}
                    >
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FolderPlus className="w-6 h-6 text-purple-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors">{category.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="info" size="sm">
                            {subcategories.length} ta bo'lim
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(category); }}
                          className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-all hover:scale-110"
                          title="Tahrirlash"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(category); }}
                          disabled={deleting === category._id}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all hover:scale-110 disabled:opacity-50"
                          title="O'chirish"
                        >
                          {deleting === category._id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative z-10" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
            <div className="bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{editingCategory ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'}</h3>
                <p className="text-sm text-white/80">Kategoriya ma'lumotlari</p>
              </div>
              <button onClick={closeModal} className="hover:bg-white/20 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kategoriya nomi</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Masalan: Mebel furnitura"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tartib raqami</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-brand-500 transition-colors"
                  min="0"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-brand-500/30 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {showSubModal && selectedCategory && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSubModal} />
          
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative z-10" onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
            <div className="bg-gradient-to-r from-green-600 via-green-700 to-emerald-800 px-6 py-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{editingSubcategory ? 'Bo\'limni tahrirlash' : 'Yangi bo\'lim'}</h3>
                <p className="text-sm text-white/80">{selectedCategory.name}</p>
              </div>
              <button onClick={closeSubModal} className="hover:bg-white/20 p-2 rounded-xl transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Bo'lim nomi</label>
                <input
                  type="text"
                  value={subFormData.name}
                  onChange={e => setSubFormData({ ...subFormData, name: e.target.value })}
                  placeholder="Masalan: Stullar"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeSubModal} className="flex-1 px-4 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors">
                  Bekor qilish
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/30 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategories View - Full Screen */}
      {showSubcategoriesView && viewingCategory && (
        <div className="fixed inset-0 z-[9998] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 animate-fade-in">
          {/* Header with Back Button */}
          <div className="bg-white border-b border-slate-200 shadow-sm">
            <div className="w-full px-4 py-4 flex items-center gap-4">
              <button
                onClick={closeSubcategoriesView}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all hover:scale-105"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Orqaga</span>
              </button>
              
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900">{viewingCategory.name}</h2>
                <p className="text-sm text-slate-500">
                  {((viewingCategory as any).subcategories || []).length} ta bo'lim
                </p>
              </div>

              <button
                onClick={() => openSubModal(viewingCategory)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/30 hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                <span>Bo'lim qo'shish</span>
              </button>
            </div>
          </div>

          {/* Subcategories List */}
          <div className="w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-6 space-y-6">
            {/* Bo'limlar */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">Bo'limlar</h3>
              {((viewingCategory as any).subcategories || []).length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center py-12 px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-3">
                    <FolderPlus className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Bo'limlar yo'q</h3>
                  <p className="text-slate-500 mb-4 text-center max-w-md text-sm">
                    Birinchi bo'limni qo'shing
                  </p>
                  <button
                    onClick={() => openSubModal(viewingCategory)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/30 hover:scale-105"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Bo'lim qo'shish
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {((viewingCategory as any).subcategories || []).map((sub: Subcategory) => (
                    <div
                      key={sub._id}
                      className="bg-white rounded-xl shadow-md border border-slate-200 p-3 hover:shadow-lg transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate group-hover:text-purple-600 transition-colors text-sm">
                            {sub.name}
                          </h3>
                          <p className="text-xs text-slate-500">Tartib: {sub.order}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openSubModal(viewingCategory, sub)}
                            className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-all hover:scale-110"
                            title="Tahrirlash"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteSub(viewingCategory, sub)}
                            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all hover:scale-110"
                            title="O'chirish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Mahsulotlar */}
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                Mahsulotlar ({categoryProducts.length})
              </h3>
              {loadingProducts ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center py-12 px-4">
                  <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mb-3" />
                  <p className="text-slate-500">Yuklanmoqda...</p>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 flex flex-col items-center py-12 px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-3">
                    <Package className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Mahsulotlar yo'q</h3>
                  <p className="text-slate-500 text-center max-w-md text-sm">
                    Bu kategoriyada hali mahsulotlar yo'q
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {categoryProducts.map((product) => {
                    const productImage = product.images && product.images.length > 0
                      ? `${UPLOADS_URL}${typeof product.images[0] === 'string' ? product.images[0] : product.images[0].path}`
                      : null;
                    
                    return (
                      <div
                        key={product._id}
                        className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-all group"
                      >
                        {/* Product Image */}
                        <div className="relative w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100">
                          {productImage ? (
                            <img 
                              src={productImage} 
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-12 h-12 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3">
                          <div className="text-xs font-mono text-slate-500 mb-1">
                            #{product.code}
                          </div>
                          <h4 className="font-semibold text-sm text-slate-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                            {product.name}
                          </h4>
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-bold text-purple-600">
                              {formatNumber(product.unitPrice || product.price)}
                            </span>
                            <span className="text-xs text-slate-500">so'm</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Omborda: {product.quantity} ta
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
