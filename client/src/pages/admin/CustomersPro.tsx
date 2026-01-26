import { useEffect, useState } from 'react';
import Header from '../../components/Header';
import { 
  Plus, Users, X, Phone, Edit, Trash2, MapPin, ChevronDown, Search,
  TrendingUp, DollarSign, ShoppingCart, AlertCircle, Eye, EyeOff
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
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', region: '', district: '' });
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [showRegionFilter, setShowRegionFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'debt' | 'purchases'>('name');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) { 
      console.error(err);
      showAlert('Mijozlarni yuklashda xatolik', 'Xatolik', 'danger');
    }
    finally { setLoading(false); }
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
      
      // Local state ni yangilash - tez
      setCustomers(customers.filter(c => c._id !== id));
      
      showAlert('Mijoz o\'chirildi', 'Muvaffaqiyat', 'success');
      
      // 2 sekunddan keyin loading state o'chadi
      setTimeout(() => {
        setDeletingId(null);
      }, 2000);
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

  const filteredCustomers = customers.filter(c => {
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
    total: customers.length,
    withDebt: customers.filter(c => c.debt > 0).length,
    totalDebt: customers.reduce((sum, c) => sum + (c.debt || 0), 0),
    totalPurchases: customers.reduce((sum, c) => sum + ((c as any).totalPurchases || 0), 0)
  };

  const getFilterLabel = () => {
    if (!filterRegion) return 'Barcha hududlar';
    if (!filterDistrict) return filterRegion;
    return `${filterRegion}, ${filterDistrict}`;
  };

  const clearFilter = () => {
    setFilterRegion('');
    setFilterDistrict('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100 pb-20 lg:pb-0">
      {AlertComponent}
      
      <Header
        title="Mijozlar"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yangi mijoz</span>
          </button>
        }
      />

      <div className="max-w-[1800px] mx-auto p-4 lg:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs lg:text-sm font-semibold text-slate-600 uppercase">Jami Mijozlar</p>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs lg:text-sm font-semibold text-slate-600 uppercase">Qarz Bor</p>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl lg:text-3xl font-bold text-slate-900">{stats.withDebt}</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs lg:text-sm font-semibold text-slate-600 uppercase">Jami Qarz</p>
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-red-600">{formatNumber(stats.totalDebt)}</p>
          </div>

          <div className="bg-white rounded-xl border-2 border-slate-200 p-4 lg:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs lg:text-sm font-semibold text-slate-600 uppercase">Jami Xarid</p>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-xl lg:text-2xl font-bold text-green-600">{formatNumber(stats.totalPurchases)}</p>
          </div>
        </div>

        {/* Filters & Sort */}
        <div className="bg-white rounded-xl border-2 border-slate-200 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Region Filter */}
            <div className="relative">
              <button 
                onClick={() => setShowRegionFilter(!showRegionFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filterRegion ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">{getFilterLabel()}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {showRegionFilter && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowRegionFilter(false)} />
                  <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-700">Hudud bo'yicha filter</span>
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
              className="px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 text-sm font-medium bg-white"
            >
              <option value="name">Ism bo'yicha</option>
              <option value="debt">Qarz bo'yicha</option>
              <option value="purchases">Xarid bo'yicha</option>
            </select>
          </div>

          <p className="text-sm text-slate-500">
            {filteredCustomers.length} ta mijoz
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="spinner text-brand-600 w-8 h-8" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-slate-200 flex flex-col items-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            {filterRegion ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Bu hududda mijozlar yo'q</h3>
                <p className="text-slate-500 mb-6 text-center">
                  <span className="font-medium text-brand-600">{filterDistrict ? `${filterRegion}, ${filterDistrict}` : filterRegion}</span> da hech qanday mijoz topilmadi
                </p>
                <button 
                  onClick={clearFilter} 
                  className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Filterni tozalash
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Mijozlar yo'q</h3>
                <p className="text-slate-500 mb-6">Birinchi mijozni qo'shing</p>
                <button onClick={() => setShowModal(true)} className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-lg transition-colors">
                  Mijoz qo'shish
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {filteredCustomers.map(customer => (
              <div key={customer._id} className="bg-white rounded-xl border-2 border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-lg text-brand-600">{customer.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{customer.name}</h3>
                      <p className="text-sm text-slate-500">{displayPhone(customer.phone)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditModal(customer)} 
                      className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                      title="Tahrirlash"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer._id)}
                      disabled={deletingId === customer._id}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="O'chirish"
                    >
                      {deletingId === customer._id ? (
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Address */}
                {customer.address && (
                  <div className="mb-4 pb-4 border-b border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Manzil</p>
                    <p className="text-sm text-slate-700 font-medium">{customer.address}</p>
                  </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Purchases */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-1">Xaridlar</p>
                    <p className="text-lg font-bold text-green-700">{formatNumber((customer as any).totalPurchases || 0)}</p>
                    <p className="text-xs text-green-600 mt-1">{(customer as any).purchaseCount || 0} ta</p>
                  </div>

                  {/* Debt */}
                  <div className={`rounded-lg p-3 border ${
                    customer.debt > 0 
                      ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200' 
                      : 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                  }`}>
                    <p className={`text-xs font-semibold mb-1 ${customer.debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {customer.debt > 0 ? 'Qarz' : 'Qarz yo\'q'}
                    </p>
                    <p className={`text-lg font-bold ${customer.debt > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                      {formatNumber(customer.debt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-4 text-white flex items-center justify-between">
              <h3 className="text-lg font-bold">
                {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
              </h3>
              <button onClick={closeModal} className="hover:bg-brand-600 p-1 rounded-lg transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Ism</label>
                <input 
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" 
                  placeholder="Mijoz ismi" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-12 pr-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" 
                    placeholder="+998 (XX) XXX-XX-XX" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: formatPhone(e.target.value) })} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 mb-2 block">Viloyat</label>
                <select 
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" 
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value, district: '' })}
                >
                  <option value="">Viloyatni tanlang</option>
                  {regionNames.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {formData.region && (
                <div>
                  <label className="text-sm font-semibold text-slate-700 mb-2 block">Tuman</label>
                  <select 
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20" 
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

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition-colors"
                >
                  Bekor qilish
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold rounded-lg transition-all shadow-lg"
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
