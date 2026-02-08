import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { 
  Plus, Users, X, Phone, Edit, Trash2, MapPin, Search, DollarSign, 
  ShoppingCart, AlertCircle, Calendar, CreditCard, ChevronDown, Filter
} from 'lucide-react';
import { Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatPhone, displayPhone } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { regions, regionNames } from '../../data/regions';

export default function CustomersPro() {
  const { showConfirm, showAlert, AlertComponent } = useAlert();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedCustomerStats, setSelectedCustomerStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', region: '', district: '' });
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [showRegionFilter, setShowRegionFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'purchases'>('name');

  useEffect(() => { fetchCustomers(); }, []);

  useEffect(() => {
    if (showModal || showStatsModal) {
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
  }, [showModal, showStatsModal]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      // Handle both old format (direct array) and new format (wrapped in success object)
      let customersData = [];
      
      if (res.data && res.data.success && res.data.data) {
        // New format: { success: true, data: { data: [...], pagination: {...} } }
        customersData = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      } else if (res.data && res.data.data && Array.isArray(res.data.data)) {
        // Format: { data: [...], pagination: {...} }
        customersData = res.data.data;
      } else if (Array.isArray(res.data)) {
        // Old format: direct array
        customersData = res.data;
      } else {
        console.warn('Unexpected customers API response format:', res.data);
        customersData = [];
      }
      
      setCustomers(customersData);
    } catch (err) { 
      console.error('Error fetching customers:', err);
      showAlert('Mijozlarni yuklashda xatolik', 'Xatolik', 'danger');
      // Set empty array on error
      setCustomers([]);
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        phone: formData.phone,
        address: formData.region && formData.district ? `${formData.region}, ${formData.district}` : ''
      };
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer._id}`, data);
        showAlert('Mijoz yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        await api.post('/customers', data);
        showAlert('Mijoz qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      fetchCustomers();
      closeModal();
    } catch (err) { 
      console.error(err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Mijozni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await api.delete(`/customers/${id}`);
      setCustomers(prevCustomers => Array.isArray(prevCustomers) ? prevCustomers.filter(c => c._id !== id) : []);
      showAlert('Mijoz o\'chirildi', 'Muvaffaqiyat', 'success');
      setTimeout(() => setDeletingId(null), 2000);
    } catch (err) { 
      setDeletingId(null);
      console.error(err);
      showAlert('Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    const addressParts = (customer.address || '').split(', ');
    setFormData({
      name: customer.name,
      phone: customer.phone,
      region: addressParts[0] || '',
      district: addressParts[1] || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', region: '', district: '' });
  };

  const fetchCustomerStats = async (customerId: string) => {
    setLoadingStats(true);
    try {
      const response = await api.get(`/customers/${customerId}/stats`);
      setSelectedCustomerStats(response.data);
      setShowStatsModal(true);
    } catch (err) {
      console.error('Statistikani yuklashda xatolik:', err);
      showAlert('Statistikani yuklashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoadingStats(false);
    }
  };

  const closeStatsModal = () => {
    setShowStatsModal(false);
    setSelectedCustomerStats(null);
  };

  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(c => {
    const matchesSearch = searchQuery.trim() === '' ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery);
    
    let matchesRegion = true;
    if (filterRegion) {
      const addressParts = (c.address || '').split(', ');
      const customerRegion = addressParts[0] || '';
      const customerDistrict = addressParts[1] || '';
      matchesRegion = customerRegion === filterRegion;
      if (matchesRegion && filterDistrict) {
        matchesRegion = customerDistrict === filterDistrict;
      }
    }
    return matchesSearch && matchesRegion;
  }).sort((a, b) => {
    if (sortBy === 'debt') return (b.debt || 0) - (a.debt || 0);
    if (sortBy === 'purchases') return ((b as any).totalPurchases || 0) - ((a as any).totalPurchases || 0);
    return a.name.localeCompare(b.name);
  });

  const stats = {
    total: Array.isArray(customers) ? customers.length : 0,
    withDebt: Array.isArray(customers) ? customers.filter(c => c.debt > 0).length : 0,
    totalDebt: Array.isArray(customers) ? customers.reduce((sum, c) => sum + (c.debt || 0), 0) : 0,
    totalPurchases: Array.isArray(customers) ? customers.reduce((sum, c) => sum + ((c as any).totalPurchases || 0), 0) : 0
  };

  const clearFilter = () => {
    setFilterRegion('');
    setFilterDistrict('');
  };

  return (
    <div className="min-h-screen bg-slate-50 w-full h-full">
      {AlertComponent}
      
      <Header
        title="Mijozlar"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Qo'shish</span>
          </button>
        }
      />

      <div className="w-full p-1 sm:p-2 space-y-2 sm:space-y-3">

        {/* Stats Cards - Minimal & Clean */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-brand-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Jami</p>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-orange-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Qarzli</p>
                <p className="text-2xl font-bold text-slate-900">{stats.withDebt}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-red-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Qarz</p>
                <p className="text-lg font-bold text-red-600">{formatNumber(stats.totalDebt)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:border-green-300 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Xarid</p>
                <p className="text-lg font-bold text-green-600">{formatNumber(stats.totalPurchases)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Simple & Clean */}
        <div className="bg-white rounded-lg border-2 border-slate-200 p-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {/* Region Filter */}
            <div className="relative">
              <button 
                onClick={() => setShowRegionFilter(!showRegionFilter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterRegion ? 'bg-brand-100 text-brand-700 border-2 border-brand-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="max-w-[120px] truncate">
                  {filterRegion ? (filterDistrict ? `${filterRegion}, ${filterDistrict}` : filterRegion) : 'Hudud'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showRegionFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRegionFilter(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border-2 border-slate-200 z-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">Hudud filtri</span>
                      {filterRegion && (
                        <button onClick={clearFilter} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                          Tozalash
                        </button>
                      )}
                    </div>
                    <select 
                      className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-sm mb-2" 
                      value={filterRegion}
                      onChange={e => { setFilterRegion(e.target.value); setFilterDistrict(''); }}
                    >
                      <option value="">Barcha viloyatlar</option>
                      {regionNames.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                    {filterRegion && (
                      <select 
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-sm" 
                        value={filterDistrict}
                        onChange={e => setFilterDistrict(e.target.value)}
                      >
                        <option value="">Barcha tumanlar</option>
                        {regions[filterRegion]?.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Sort */}
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium bg-white"
            >
              <option value="name">Ism</option>
              <option value="debt">Qarz</option>
              <option value="purchases">Xarid</option>
            </select>
          </div>

          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{filteredCustomers.length}</span> ta
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-slate-200 flex flex-col items-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Mijozlar yo'q</h3>
            <p className="text-slate-500 mb-6 text-center">
              {filterRegion ? `${filterRegion} da mijozlar topilmadi` : 'Birinchi mijozni qo\'shing'}
            </p>
            {filterRegion ? (
              <button 
                onClick={clearFilter} 
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
              >
                Filterni tozalash
              </button>
            ) : (
              <button 
                onClick={() => setShowModal(true)} 
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg transition-colors"
              >
                Mijoz qo'shish
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredCustomers.map(customer => (
              <div 
                key={customer._id} 
                className="bg-white rounded-lg border-2 border-slate-200 hover:border-brand-300 hover:shadow-md transition-all p-3 cursor-pointer"
                onClick={() => fetchCustomerStats(customer._id)}
              >
                {/* Header - Compact */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-brand-600 text-sm">{customer.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm truncate leading-tight">{customer.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{displayPhone(customer.phone)}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openEditModal(customer); }} 
                      className="p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(customer._id); }}
                      disabled={deletingId === customer._id}
                      className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingId === customer._id ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Address - Compact */}
                {customer.address && (
                  <div className="mb-2 pb-1.5 border-b border-slate-100">
                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  </div>
                )}

                {/* Stats - Compact */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-green-50 rounded-lg p-1.5 border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-0.5">Xarid</p>
                    <p className="text-sm font-bold text-green-700 truncate">{formatNumber((customer as any).totalPurchases || 0)}</p>
                  </div>

                  <div className={`rounded-lg p-1.5 border ${
                    customer.debt > 0 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-xs font-semibold mb-0.5 ${customer.debt > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                      Qarz
                    </p>
                    <p className={`text-sm font-bold truncate ${customer.debt > 0 ? 'text-red-700' : 'text-blue-700'}`}>
                      {formatNumber(customer.debt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistika Modal - Clean Design */}
      {showStatsModal && selectedCustomerStats && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={closeStatsModal}
          />
          
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden relative z-10 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-brand-600 px-5 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{selectedCustomerStats.customer?.name}</h3>
                <p className="text-sm text-white/80">{displayPhone(selectedCustomerStats.customer?.phone)}</p>
              </div>
              <button onClick={closeStatsModal} className="hover:bg-brand-700 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 rounded-lg p-4 border-2 border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600 font-semibold">Jami qarz</p>
                      <p className="text-2xl font-bold text-red-700">{formatNumber(selectedCustomerStats.totalDebt || 0)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600 font-semibold">To'langan</p>
                      <p className="text-2xl font-bold text-green-700">{formatNumber(selectedCustomerStats.totalPaid || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Qarz tarixi */}
              {selectedCustomerStats.debts && selectedCustomerStats.debts.length > 0 && (
                <div>
                  <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-600" />
                    Qarz tarixi
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedCustomerStats.debts.map((debt: any, index: number) => (
                      <div key={debt._id || index} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              debt.status === 'paid' ? 'bg-green-500' : 
                              debt.status === 'partial' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm font-semibold text-slate-900">
                              {debt.status === 'paid' ? 'To\'langan' : 
                               debt.status === 'partial' ? 'Qisman' : 'To\'lanmagan'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(debt.createdAt).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-xs text-slate-500">Qarz</p>
                            <p className="font-bold text-red-600">{formatNumber(debt.amount)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">To'langan</p>
                            <p className="font-bold text-green-600">{formatNumber(debt.paidAmount || 0)}</p>
                          </div>
                        </div>
                        {debt.description && (
                          <p className="text-xs text-slate-600 mt-2 italic">{debt.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Xaridlar */}
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold">Jami xaridlar</p>
                    <p className="text-2xl font-bold text-blue-700">{formatNumber(selectedCustomerStats.totalPurchases || 0)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Xaridlar soni:</span>
                  <span className="font-bold text-blue-700">{selectedCustomerStats.purchaseCount || 0} ta</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3 flex justify-end border-t border-slate-200">
              <button 
                onClick={closeStatsModal}
                className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal - Clean Design */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50" 
          />
          
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-brand-600 px-5 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
              </h3>
              <button onClick={closeModal} className="hover:bg-brand-700 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Ism */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Ism</label>
                <input 
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" 
                  placeholder="Mijoz ismi" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>

              {/* Telefon */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" 
                    placeholder="+998 (XX) XXX-XX-XX" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} 
                    required 
                  />
                </div>
              </div>

              {/* Viloyat */}
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Viloyat</label>
                <select 
                  className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" 
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value, district: '' })}
                >
                  <option value="">Viloyatni tanlang</option>
                  {regionNames.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Tuman */}
              {formData.region && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Tuman</label>
                  <select 
                    className="w-full px-3 py-2.5 text-sm border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 transition-colors" 
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                  >
                    <option value="">Tumanni tanlang</option>
                    {regions[formData.region]?.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
