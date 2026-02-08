import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { Users, Plus, Edit2, Trash2, User, Phone, Lock, ShoppingCart, Shield, DollarSign, X, Receipt, Calendar, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useHelpersStore, Helper } from '../../store/helpersStore';

// Format number helper
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('uz-UZ').format(num);
};

// Helper Card Component - Memoized - Minimal Professional Design
const HelperCard = memo(({ 
  helper, 
  onEdit, 
  onDelete, 
  onViewReceipts 
}: { 
  helper: Helper;
  onEdit: (helper: Helper) => void;
  onDelete: (id: string) => void;
  onViewReceipts: (helper: Helper) => void;
}) => {
  return (
    <div className="group relative bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200/60 hover:border-blue-300/60 hover:shadow-lg transition-all duration-300">
      {/* Gradient Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg" />
      
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
            {helper.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{helper.name}</h3>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
              helper.role === 'cashier' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {helper.role === 'cashier' ? 'Kassir' : 'Yordamchi'}
            </span>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(helper)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 transition-colors">
            <Edit2 className="w-3 h-3 text-blue-600" />
          </button>
          <button onClick={() => onDelete(helper._id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors">
            <Trash2 className="w-3 h-3 text-red-600" />
          </button>
        </div>
      </div>

      {/* Contact Info - Compact */}
      <div className="space-y-1 mb-2 text-[11px] text-gray-600">
        <div className="flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-gray-400" />
          <span className="truncate">{helper.phone}</span>
        </div>
        {helper.login && (
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-gray-400" />
            <span className="truncate">{helper.login}</span>
          </div>
        )}
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded p-1.5 text-center border border-blue-100/50">
          <p className="text-base font-bold text-blue-600">{helper.receiptCount}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Cheklar</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded p-1.5 text-center border border-emerald-100/50">
          <p className="text-xs font-bold text-emerald-600">{formatNumber(helper.totalAmount)}</p>
          <p className="text-[9px] text-gray-500 uppercase tracking-wide">Savdo</p>
        </div>
      </div>

      {/* Bonus Info - Compact */}
      {helper.bonusPercentage > 0 && (
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded p-1.5 text-center border border-orange-100/50">
            <p className="text-xs font-bold text-orange-600">{helper.bonusPercentage}%</p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wide">Bonus</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded p-1.5 text-center border border-green-100/50">
            <p className="text-[10px] font-bold text-green-600">
              {formatNumber((helper.totalAmount * helper.bonusPercentage) / 100)}
            </p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wide">Jami</p>
          </div>
        </div>
      )}

      {/* Action Button - Compact */}
      <button 
        onClick={() => onViewReceipts(helper)}
        className="w-full py-1.5 px-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm hover:shadow-md"
      >
        <Receipt className="w-3 h-3" />
        Cheklar
      </button>
    </div>
  );
});

HelperCard.displayName = 'HelperCard';

// Main Component
export default function HelpersOptimized() {
  const {
    loading,
    receiptsLoading,
    error,
    selectedHelper,
    selectedHelperReceipts,
    currentPage,
    totalPages,
    searchQuery,
    roleFilter,
    sortBy,
    sortOrder,
    fetchHelpers,
    fetchHelperReceipts,
    addHelper,
    updateHelper,
    deleteHelper,
    setSelectedHelper,
    setSearchQuery,
    setRoleFilter,
    setSortBy,
    setSortOrder,
    clearError,
    getFilteredHelpers
  } = useHelpersStore();

  // Debug: Log helpers state
  const helpers = useHelpersStore(state => state.helpers);
  console.log('🔍 Helpers from store:', helpers);
  console.log('🔍 Helpers count:', helpers.length);

  const [showModal, setShowModal] = useState(false);
  const [showReceiptsModal, setShowReceiptsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Helper | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    login: '',
    phone: '',
    password: '',
    role: 'cashier' as 'cashier' | 'helper',
    bonusPercentage: 0
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch helpers on mount
  useEffect(() => {
    const abortController = new AbortController();
    
    // Delay to prevent double fetch in React Strict Mode
    const timer = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.log('🔄 Component mounted, fetching helpers with forceRefresh=true');
        fetchHelpers(true); // Force refresh on mount
      }
    }, 100);

    return () => {
      abortController.abort();
      clearTimeout(timer);
    };
  }, [fetchHelpers]);

  // Get filtered helpers - add helpers to dependencies
  const filteredHelpers = useMemo(() => {
    const result = getFilteredHelpers();
    console.log('🔍 Filtered helpers:', result);
    console.log('🔍 Filtered helpers length:', result.length);
    return result;
  }, [
    helpers, // MUHIM: helpers state o'zgarganda qayta hisoblash
    getFilteredHelpers,
    searchQuery,
    roleFilter,
    sortBy,
    sortOrder
  ]);

  // Handle phone change
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('998')) {
      value = '998' + value;
    }
    if (value.length > 12) value = value.slice(0, 12);
    const formatted = value.length > 0 ? `+${value}` : '';
    setFormData(prev => ({ ...prev, phone: formatted }));
  }, []);

  // Open add modal
  const openAddModal = useCallback(() => {
    setEditingUser(null);
    setFormData({
      name: '',
      login: '',
      phone: '',
      password: '',
      role: 'cashier',
      bonusPercentage: 0
    });
    setShowModal(true);
  }, []);

  // Open edit modal
  const openEditModal = useCallback((helper: Helper) => {
    setEditingUser(helper);
    setFormData({
      name: helper.name,
      login: helper.login || '',
      phone: helper.phone,
      password: '',
      role: helper.role,
      bonusPercentage: helper.bonusPercentage || 0
    });
    setShowModal(true);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingUser(null);
    clearError();
  }, [clearError]);

  // Handle submit
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingUser) {
        // Edit mode - faqat o'zgargan ma'lumotlarni yuborish
        const updateData: any = {
          name: formData.name,
          login: formData.login,
          phone: formData.phone,
          role: formData.role,
          bonusPercentage: formData.bonusPercentage
        };
        
        // Faqat parol o'zgargan bo'lsa yuborish
        if (formData.password && formData.password.trim()) {
          updateData.password = formData.password;
        }
        
        await updateHelper(editingUser._id, updateData);
      } else {
        // Add mode - barcha ma'lumotlar kerak
        const addData = {
          name: formData.name,
          login: formData.login,
          phone: formData.phone,
          password: formData.password,
          role: formData.role,
          bonusPercentage: formData.bonusPercentage
        };
        
        await addHelper(addData);
      }
      closeModal();
    } catch (error) {
      // Error handled in store
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  }, [editingUser, formData, addHelper, updateHelper, closeModal]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Rostdan ham o\'chirmoqchimisiz?')) return;

    try {
      await deleteHelper(id);
    } catch (error) {
      // Error handled in store
    }
  }, [deleteHelper]);

  // Handle view receipts
  const handleViewReceipts = useCallback((helper: Helper) => {
    setSelectedHelper(helper);
    fetchHelperReceipts(helper._id, 1);
    setShowReceiptsModal(true);
  }, [setSelectedHelper, fetchHelperReceipts]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    if (selectedHelper) {
      fetchHelperReceipts(selectedHelper._id, page);
    }
  }, [selectedHelper, fetchHelperReceipts]);

  // Toggle sort
  const toggleSort = useCallback((field: 'name' | 'receipts' | 'amount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder, setSortBy, setSortOrder]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900">Hodimlar</h1>
            <p className="text-sm text-surface-500">{filteredHelpers.length} ta hodim</p>
          </div>
        </div>
        <button onClick={openAddModal} className="btn-primary">
          <Plus className="w-5 h-5" />
          Hodim qo'shish
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-center justify-between">
          <p className="text-danger-700">{error}</p>
          <button onClick={clearError} className="text-danger-700 hover:text-danger-900">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
            <input
              type="text"
              placeholder="Ism, telefon yoki login bo'yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="input"
          >
            <option value="all">Barcha rollar</option>
            <option value="cashier">Kassir</option>
            <option value="helper">Yordamchi</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input"
          >
            <option value="name">Ism bo'yicha</option>
            <option value="receipts">Cheklar soni</option>
            <option value="amount">Savdo hajmi</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="spinner w-8 h-8 text-brand-600" />
        </div>
      ) : filteredHelpers.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto mb-4 text-surface-400" />
          <p className="text-surface-500">Hodimlar topilmadi</p>
          <button onClick={openAddModal} className="btn-primary mt-4">
            <Plus className="w-5 h-5" />
            Birinchi hodimni qo'shing
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredHelpers.map(helper => (
            <HelperCard
              key={helper._id}
              helper={helper}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onViewReceipts={handleViewReceipts}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <h3 className="text-xl font-bold">
                {editingUser ? 'Hodimni tahrirlash' : 'Yangi hodim'}
              </h3>
              <button onClick={closeModal} className="btn-icon-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Ism</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Hodim ismi"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Login */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Login</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="text"
                    className="input pl-10"
                    placeholder="Login"
                    value={formData.login}
                    onChange={e => setFormData({ ...formData, login: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="tel"
                    className="input pl-10"
                    placeholder="+998 XX XXX XX XX"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">
                  {editingUser ? 'Yangi parol (ixtiyoriy)' : 'Parol'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder={editingUser ? "O'zgartirmaslik uchun bo'sh qoldiring" : "Parol"}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    {...(!editingUser && { required: true, minLength: 6 })}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'cashier' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.role === 'cashier'
                        ? 'border-success-500 bg-success-50'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <ShoppingCart className={`w-5 h-5 mx-auto mb-1 ${formData.role === 'cashier' ? 'text-success-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Kassir</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'helper' })}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.role === 'helper'
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <Shield className={`w-5 h-5 mx-auto mb-1 ${formData.role === 'helper' ? 'text-brand-600' : 'text-surface-400'}`} />
                    <p className="font-medium text-surface-900">Yordamchi</p>
                  </button>
                </div>
              </div>

              {/* Bonus Percentage */}
              {formData.role === 'cashier' && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">
                    Bonus foizi (%)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="number"
                      className="input pl-10"
                      placeholder="Masalan: 1"
                      value={formData.bonusPercentage ?? 0}
                      min="0"
                      max="100"
                      step="0.1"
                      onChange={e => setFormData({ ...formData, bonusPercentage: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <p className="text-xs text-surface-500 mt-1">
                    {formData.bonusPercentage ?? 0}% bonus
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={closeModal} disabled={submitting} className="btn-secondary flex-1">
                  Bekor
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    'Saqlash'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipts Modal */}
      {showReceiptsModal && selectedHelper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowReceiptsModal(false)} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
            <div className="p-6 border-b bg-gradient-to-r from-brand-50 to-blue-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {selectedHelper.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedHelper.name}</h3>
                    <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                      selectedHelper.role === 'cashier' ? 'bg-success-100 text-success-700' : 'bg-brand-100 text-brand-700'
                    }`}>
                      {selectedHelper.role === 'cashier' ? 'Kassir' : 'Yordamchi'}
                    </span>
                  </div>
                </div>
                <button onClick={() => setShowReceiptsModal(false)} className="btn-icon-sm">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <Receipt className="w-5 h-5 text-brand-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{selectedHelper.receiptCount}</p>
                  <p className="text-xs text-surface-500">Cheklar</p>
                </div>
                <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-success-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-success-600">{formatNumber(selectedHelper.totalAmount)}</p>
                  <p className="text-xs text-surface-500">Savdo</p>
                </div>
                {selectedHelper.bonusPercentage > 0 && (
                  <>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                      <span className="text-orange-500 font-bold text-xl">%</span>
                      <p className="text-lg font-bold text-orange-600">{selectedHelper.bonusPercentage}%</p>
                      <p className="text-xs text-surface-500">Bonus foizi</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                      <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-2" />
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber((selectedHelper.totalAmount * selectedHelper.bonusPercentage) / 100)}
                      </p>
                      <p className="text-xs text-surface-500">Jami bonus</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 overflow-auto max-h-[calc(90vh-200px)]">
              {receiptsLoading ? (
                <div className="flex justify-center py-20">
                  <div className="spinner w-8 h-8 text-brand-600" />
                </div>
              ) : selectedHelperReceipts.length === 0 ? (
                <div className="text-center py-20">
                  <Receipt className="w-12 h-12 mx-auto mb-4 text-surface-400" />
                  <p className="text-surface-500">Cheklar topilmadi</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {selectedHelperReceipts.map(receipt => (
                      <div key={receipt._id} className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center">
                              <Receipt className="w-5 h-5 text-brand-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold">Chek #{receipt._id.slice(-6)}</h4>
                              <div className="flex items-center gap-2 text-sm text-surface-500">
                                <Calendar className="w-4 h-4" />
                                {new Date(receipt.createdAt).toLocaleString('uz-UZ')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-brand-600">{formatNumber(receipt.total)}</p>
                            <p className="text-sm text-surface-500">so'm</p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <h5 className="text-sm font-medium mb-3">Mahsulotlar:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {receipt.items.map((item, index) => (
                              <div key={index} className="flex justify-between items-center py-2 px-3 bg-surface-50 rounded-lg">
                                <span className="text-sm font-medium">{item.name}</span>
                                <div className="text-right">
                                  <span className="text-sm text-surface-600">
                                    {item.quantity} × {formatNumber(item.price)}
                                  </span>
                                  <p className="text-sm font-semibold">{formatNumber(item.total)} so'm</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Oldingi
                      </button>
                      <span className="px-4 py-2 text-sm">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn-secondary disabled:opacity-50"
                      >
                        Keyingi
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
