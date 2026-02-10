import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, DollarSign, X, Calendar, Eye, Trash2, CheckCircle, Clock, FileText } from 'lucide-react';
import { Debt } from '../../types';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';

export default function KassaDebts() {
  const { showAlert, showConfirm, AlertComponent } = useAlert();
  const location = useLocation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_approval' | 'approved' | 'paid'>('all');
  const [loading, setLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  useEffect(() => {
    fetchDebts();
    
    const originalHandler = window.onbeforeunload;
    window.onbeforeunload = null;
    
    return () => {
      window.onbeforeunload = originalHandler;
    };
  }, []);

  useEffect(() => {
    fetchDebts();
  }, [location.pathname]);

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/debts/kassa');
      
      // Handle response format from serviceWrapper
      let debtsData = [];
      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // ServiceWrapper format: { success: true, data: [...] }
        debtsData = res.data.data;
      } else if (Array.isArray(res.data)) {
        // Direct array format (fallback)
        debtsData = res.data;
      } else {
        console.warn('Unexpected debts API response format:', res.data);
        debtsData = [];
      }
      
      setDebts(debtsData);
    } catch (err) {
      console.error('Error fetching debts:', err);
      setDebts([]);
    } finally {
      setLoading(false);
    }
  };



  const handleDeleteDebt = async (debtId: string) => {
    const confirmed = await showConfirm('Qarzni o\'chirishni tasdiqlaysizmi?', 'O\'chirish');
    if (!confirmed) return;

    try {
      await api.delete(`/debts/${debtId}`);
      showAlert('Qarz o\'chirildi', 'Muvaffaqiyat', 'success');
      fetchDebts();
    } catch (err) {
      showAlert('Qarzni o\'chirishda xatolik', 'Xatolik', 'danger');
    }
  };

  // Filtrlangan qarzlar
  const filteredDebts = (Array.isArray(debts) ? debts : []).filter(debt => {
    const matchesSearch = debt.customer?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         debt.customer?.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Statistika
  const debtsArray = Array.isArray(debts) ? debts : [];
  const stats = {
    total: debtsArray.length,
    pending: debtsArray.filter(d => d.status === 'pending_approval').length,
    approved: debtsArray.filter(d => d.status === 'approved').length,
    paid: debtsArray.filter(d => d.status === 'paid').length,
    totalAmount: debtsArray.reduce((sum, d) => sum + d.amount, 0),
    totalPaid: debtsArray.reduce((sum, d) => sum + d.paidAmount, 0),
    totalRemaining: debtsArray.reduce((sum, d) => sum + (d.amount - d.paidAmount), 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
      case 'blacklist': return 'bg-gray-900 text-white border-gray-900';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_approval': return 'Kutilmoqda';
      case 'approved': return 'Tasdiqlangan';
      case 'paid': return 'To\'langan';
      case 'overdue': return 'Muddati o\'tgan';
      case 'blacklist': return 'Qora ro\'yxat';
      default: return status;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 w-full">
      {AlertComponent}
      
      {/* Sticky Header */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="p-1 sm:p-2 space-y-2">
          {/* Statistika Kartalari */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2">
            <div 
              onClick={() => setStatusFilter('all')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'all' 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[9px] font-medium mb-0.5 ${statusFilter === 'all' ? 'text-white/80' : 'text-slate-500'}`}>
                    Jami qarzlar
                  </p>
                  <p className={`text-lg font-bold ${statusFilter === 'all' ? 'text-white' : 'text-slate-900'}`}>
                    {stats.total}
                  </p>
                </div>
                <FileText className={`w-6 h-6 ${statusFilter === 'all' ? 'text-white/80' : 'text-blue-500'}`} />
              </div>
            </div>

            <div 
              onClick={() => setStatusFilter('pending_approval')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'pending_approval' 
                  ? 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[9px] font-medium mb-0.5 ${statusFilter === 'pending_approval' ? 'text-white/80' : 'text-slate-500'}`}>
                    Kutilmoqda
                  </p>
                  <p className={`text-lg font-bold ${statusFilter === 'pending_approval' ? 'text-white' : 'text-slate-900'}`}>
                    {stats.pending}
                  </p>
                </div>
                <Clock className={`w-6 h-6 ${statusFilter === 'pending_approval' ? 'text-white/80' : 'text-yellow-500'}`} />
              </div>
            </div>

            <div 
              onClick={() => setStatusFilter('approved')}
              className={`p-2 rounded-lg cursor-pointer transition-all ${
                statusFilter === 'approved' 
                  ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-md' 
                  : 'bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-[9px] font-medium mb-0.5 ${statusFilter === 'approved' ? 'text-white/80' : 'text-slate-500'}`}>
                    Tasdiqlangan
                  </p>
                  <p className={`text-lg font-bold ${statusFilter === 'approved' ? 'text-white' : 'text-slate-900'}`}>
                    {stats.approved}
                  </p>
                </div>
                <CheckCircle className={`w-6 h-6 ${statusFilter === 'approved' ? 'text-white/80' : 'text-purple-500'}`} />
              </div>
            </div>

            <div className="p-2 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-medium text-slate-500 mb-0.5">Jami qarz</p>
                  <p className="text-sm font-bold text-slate-900">{formatNumber(stats.totalRemaining)}</p>
                </div>
                <DollarSign className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>

          {/* Qidiruv */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Mijoz ismi yoki telefon..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Qarzlar ro'yxati */}
      <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-3 lg:p-4 thin-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Qarzlar yuklanmoqda...</p>
          </div>
        ) : filteredDebts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">
              {searchQuery ? 'Qarz topilmadi' : 'Qarzlar ro\'yxati bo\'sh'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
            {filteredDebts.map(debt => (
              <div 
                key={debt._id} 
                className="bg-white rounded-xl p-2.5 border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                      <span className="text-xs font-bold text-white">
                        {debt.customer?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-slate-900 text-[11px] truncate">{debt.customer?.name || 'Noma\'lum'}</h3>
                      <p className="text-[9px] text-slate-500 truncate">{debt.customer?.phone || ''}</p>
                    </div>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold border flex-shrink-0 ${getStatusColor(debt.status)}`}>
                    {getStatusText(debt.status)}
                  </span>
                </div>

                {/* Summa */}
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <div className="bg-red-50 rounded-lg p-1.5">
                    <p className="text-[8px] font-medium text-red-700 mb-0.5">Jami qarz</p>
                    <p className="text-xs font-bold text-red-900 truncate">{formatNumber(debt.amount)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-1.5">
                    <p className="text-[8px] font-medium text-green-700 mb-0.5">To'langan</p>
                    <p className="text-xs font-bold text-green-900 truncate">{formatNumber(debt.paidAmount)}</p>
                  </div>
                </div>

                {/* Qoldiq */}
                <div className="bg-orange-50 rounded-lg p-1.5 mb-1.5">
                  <p className="text-[8px] font-medium text-orange-700 mb-0.5">Qoldiq</p>
                  <p className="text-sm font-bold text-orange-900 truncate">{formatNumber(debt.amount - debt.paidAmount)}</p>
                </div>

                {/* Sana */}
                {debt.dueDate && (
                  <div className="flex items-center gap-1 text-[8px] text-slate-500 mb-1.5">
                    <Calendar className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">Muddat: {new Date(debt.dueDate).toLocaleDateString('uz-UZ')}</span>
                  </div>
                )}

                {/* Tugmalar */}
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedDebt(debt);
                      setShowViewModal(true);
                    }}
                    className="flex-1 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center justify-center gap-1 text-[9px] font-medium"
                  >
                    <Eye className="w-2.5 h-2.5" />
                    Ko'rish
                  </button>
                  <button
                    onClick={() => handleDeleteDebt(debt._id)}
                    className="px-1.5 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto scroll-smooth-instagram momentum-scroll">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Qarz tafsilotlari</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Mijoz ma'lumotlari</h4>
                <div className="space-y-2">
                  <p><span className="text-slate-500">Ism:</span> <span className="font-medium">{selectedDebt.customer?.name}</span></p>
                  <p><span className="text-slate-500">Telefon:</span> <span className="font-medium">{selectedDebt.customer?.phone}</span></p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-900 mb-3">Qarz ma'lumotlari</h4>
                <div className="space-y-2">
                  <p><span className="text-slate-500">Jami summa:</span> <span className="font-bold text-red-600">{formatNumber(selectedDebt.amount)} so'm</span></p>
                  <p><span className="text-slate-500">To'langan:</span> <span className="font-bold text-green-600">{formatNumber(selectedDebt.paidAmount)} so'm</span></p>
                  <p><span className="text-slate-500">Qoldiq:</span> <span className="font-bold text-orange-600">{formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm</span></p>
                  <p><span className="text-slate-500">Holat:</span> <span className={`px-2 py-1 rounded text-sm font-semibold ${getStatusColor(selectedDebt.status)}`}>{getStatusText(selectedDebt.status)}</span></p>
                  {selectedDebt.dueDate && (
                    <p><span className="text-slate-500">Muddat:</span> <span className="font-medium">{new Date(selectedDebt.dueDate).toLocaleDateString('uz-UZ')}</span></p>
                  )}
                </div>
              </div>

              {selectedDebt.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="font-semibold text-slate-900 mb-2">Izoh</h4>
                  <p className="text-slate-600">{selectedDebt.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-6 py-3 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 transition-all font-medium"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
