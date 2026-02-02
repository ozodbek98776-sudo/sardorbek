import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { 
  Plus, AlertTriangle, X, DollarSign, Calendar, User, 
  CheckCircle2, AlertCircle, Trash2, Wallet, ArrowDownLeft, ArrowUpRight, Phone, UserPlus, Edit
} from 'lucide-react';
import { Debt, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber, formatPhone } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { regions, regionNames } from '../../data/regions';
import { useAuth } from '../../context/AuthContext';

export default function Debts() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { showConfirm, showAlert, AlertComponent } = useAlert();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState({
    total: 0, approved: 0, today: 0, overdue: 0, paid: 0, blacklist: 0, totalAmount: 0, pendingApproval: 0
  });
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [debtType, setDebtType] = useState<'receivable' | 'payable'>('receivable');
  const [formData, setFormData] = useState({ 
    customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' 
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', region: '', district: '' });
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  useEffect(() => {
    fetchDebts();
    fetchCustomers();
    fetchStats();
  }, [debtType]);

  const fetchDebts = async () => {
    try {
      const res = await api.get(`/debts?type=${debtType}`);
      setDebts(res.data);
    } catch (err) { console.error('Error fetching debts:', err); }
    finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) { console.error('Error fetching customers:', err); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/debts/stats?type=${debtType}`);
      setStats(res.data);
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        type: debtType,
        customer: debtType === 'receivable' ? formData.customer : undefined,
        creditorName: debtType === 'payable' ? formData.creditorName : undefined,
        amount: Number(formData.amount),
        dueDate: formData.dueDate,
        description: formData.description,
        collateral: formData.collateral
      };
      
      if (editingDebt) {
        await api.put(`/debts/${editingDebt._id}`, data);
      } else {
        await api.post('/debts', data);
        // Yangi qarz qo'shilganda xabar berish
        showAlert('Qarz muvaffaqiyatli qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      fetchDebts();
      fetchStats();
      closeModal();
    } catch (err) { 
      console.error('Error saving debt:', err);
      showAlert('Qarz qo\'shishda xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;
    try {
      await api.post(`/debts/${selectedDebt._id}/payment`, {
        amount: Number(paymentAmount),
        method: 'cash'
      });
      fetchDebts();
      fetchStats();
      setShowPaymentModal(false);
      setSelectedDebt(null);
      setPaymentAmount('');
    } catch (err) { console.error('Error making payment:', err); }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm("Qarzni o'chirishni tasdiqlaysizmi?", "O'chirish");
    if (!confirmed) return;
    try {
      await api.delete(`/debts/${id}`);
      fetchDebts();
      fetchStats();
    } catch (err) { console.error('Error deleting debt:', err); }
  };

  const handleApprove = async (id: string) => {
    const confirmed = await showConfirm("Bu qarzni tasdiqlaysizmi? Tasdiqlangandan keyin mijozning umumiy qarziga qo'shiladi.", "Tasdiqlash");
    if (!confirmed) return;
    try {
      await api.post(`/debts/${id}/approve`);
      fetchDebts();
      fetchStats();
    } catch (err) { console.error('Error approving debt:', err); }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Rad etish sababini kiriting (ixtiyoriy):");
    if (reason === null) return;
    
    const confirmed = await showConfirm("Bu qarzni rad etasizmi? Rad etilgan qarz o'chiriladi.", "Rad etish");
    if (!confirmed) return;
    try {
      await api.post(`/debts/${id}/reject`, { reason });
      fetchDebts();
      fetchStats();
    } catch (err) { console.error('Error rejecting debt:', err); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDebt(null);
    setFormData({ customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' });
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', phone: '', region: '', district: '' });
  };

  const cleanupUnknownDebts = async () => {
    const confirmed = await showConfirm(
      "Noma'lum mijozli barcha qarzlar o'chiriladi. Davom etasizmi?", 
      "Tozalash"
    );
    if (!confirmed) return;
    
    try {
      const res = await api.delete('/debts/cleanup/unknown');
      showAlert(res.data.message, 'Muvaffaqiyat', 'success');
      fetchDebts();
      fetchStats();
    } catch (err: any) {
      console.error('Error cleaning up unknown debts:', err);
      showAlert(
        err.response?.data?.message || 'Tozalashda xatolik yuz berdi', 
        'Xatolik', 
        'danger'
      );
    }
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setDebtType(debt.type);
    setFormData({
      customer: debt.customer?._id || '',
      creditorName: debt.creditorName || '',
      amount: String(debt.amount),
      dueDate: debt.dueDate.split('T')[0],
      description: debt.description || '',
      collateral: debt.collateral || ''
    });
    setShowModal(true);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return;
    try {
      const data = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        address: newCustomer.region && newCustomer.district ? `${newCustomer.region}, ${newCustomer.district}` : ''
      };
      const res = await api.post('/customers', data);
      await fetchCustomers();
      setFormData({ ...formData, customer: res.data._id });
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', region: '', district: '' });
    } catch (err) { console.error('Error creating customer:', err); }
  };

  const filteredDebts = debts.filter(debt => {
    const name = debt.customer?.name || debt.creditorName || '';
    const phone = debt.customer?.phone || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         phone.includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 86400000);
      const dueDate = new Date(debt.dueDate);
      matchesStatus = dueDate >= today && dueDate < tomorrow && debt.status !== 'paid';
    } else if (statusFilter !== 'all') {
      matchesStatus = debt.status === statusFilter;
    }
    
    return matchesSearch && matchesStatus;
  });

  const statItems = [
    { label: 'AKTIV', value: stats.approved, icon: CheckCircle2, color: 'success', filter: 'approved' },
    { label: "QORA RO'YXAT", value: stats.blacklist, icon: AlertTriangle, color: 'danger', filter: 'blacklist' },
    { label: "MUDDATI O'TGAN", value: stats.overdue, icon: AlertCircle, color: 'danger', filter: 'overdue' },
    { label: 'JAMI QARZ', value: `${formatNumber(stats.totalAmount)} so'm`, icon: Wallet, color: 'accent', filter: null },
  ];

  const getDebtorName = (debt: Debt) => {
    if (debt.customer?.name) return debt.customer.name;
    return debt.creditorName || 'Noma\'lum';
  };

  const getDebtorPhone = (debt: Debt) => {
    return debt.customer?.phone || '';
  };

  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {AlertComponent}
      <Header 
        title="Qarz daftarcha"
        showSearch
        onSearch={setSearchQuery}
        actions={
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowModal(true)} 
              className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-2 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-md transition-all active:scale-95"
              title="Yangi qarz qo'shish"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-[10px] sm:text-xs font-medium">Qo'shish</span>
            </button>
          </div>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-[1800px] mx-auto">
        {/* Type Toggle - only for admin */}
        {isAdmin && (
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-surface-100 rounded-xl">
              <button
                onClick={() => { setDebtType('receivable'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  debtType === 'receivable' 
                    ? 'bg-white text-success-600 shadow-sm' 
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <ArrowDownLeft className="w-4 h-4" />
                Menga qarzdor
              </button>
              <button
                onClick={() => { setDebtType('payable'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  debtType === 'payable' 
                    ? 'bg-white text-danger-600 shadow-sm' 
                    : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Men qarzdorman
              </button>
            </div>
          </div>
        )}

        {/* Stats - Compact Design */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => stat.filter && setStatusFilter(stat.filter)}
              className={`group relative ${stat.filter ? 'cursor-pointer' : ''}`}
            >
              {/* Compact Card */}
              <div className={`relative bg-white rounded-xl p-2 sm:p-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden h-[80px] sm:h-[90px] flex flex-col ${
                statusFilter === stat.filter ? 'ring-2 ring-brand-500' : 'border border-surface-200'
              }`}>
                {/* Top Border Accent */}
                <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
                  stat.color === 'success' ? 'from-emerald-500 to-emerald-600' :
                  stat.color === 'danger' ? 'from-red-500 to-red-600' :
                  stat.color === 'accent' ? 'from-purple-500 to-purple-600' :
                  'from-purple-500 to-purple-600'
                }`} />
                
                {/* Content */}
                <div className="relative z-10 flex flex-col h-full justify-between">
                  {/* Icon - Small */}
                  <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center ${
                    stat.color === 'success' ? 'bg-emerald-50' :
                    stat.color === 'danger' ? 'bg-red-50' :
                    stat.color === 'accent' ? 'bg-purple-50' :
                    'bg-purple-50'
                  }`}>
                    <stat.icon className={`w-3 h-3 sm:w-4 sm:h-4 ${
                      stat.color === 'success' ? 'text-emerald-600' :
                      stat.color === 'danger' ? 'text-red-600' :
                      stat.color === 'accent' ? 'text-purple-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                  
                  {/* Value & Label */}
                  <div>
                    <p className={`text-base sm:text-lg font-bold mb-0.5 ${
                      stat.color === 'success' ? 'text-emerald-600' :
                      stat.color === 'danger' ? 'text-red-600' :
                      stat.color === 'accent' ? 'text-purple-600' :
                      'text-purple-600'
                    }`}>
                      {stat.value}
                    </p>
                    
                    {/* Label - Larger for mobile readability */}
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wide leading-tight truncate">
                      {stat.label}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Debts List */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="spinner text-brand-600 w-8 h-8 mb-4" />
              <p className="text-surface-500">Yuklanmoqda...</p>
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-surface-400" />
              </div>
              <h3 className="text-lg font-semibold text-surface-900 mb-2">Qarzlar topilmadi</h3>
              <p className="text-surface-500 text-center max-w-md">
                {searchQuery || statusFilter !== 'all' ? 'Filtr bo\'yicha qarzlar topilmadi' : 'Hozircha qarzlar yo\'q'}
              </p>
            </div>
          ) : (
            <>
              {/* Pro Design Cards - barcha ekranlar uchun */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-5 p-3 sm:p-4 md:p-5">
                {filteredDebts.map(debt => {
                  const isPaid = debt.status === 'paid';
                  const isOverdue = debt.status === 'overdue';
                  const isApproved = debt.status === 'approved';
                  const isBlacklist = debt.status === 'blacklist';
                  const remaining = debt.amount - debt.paidAmount;
                  const paidPercent = Math.round((debt.paidAmount / debt.amount) * 100);
                  
                  // To'lov muddati yaqinlashganini tekshirish
                  const dueDate = new Date(debt.dueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  // Rang logikasi: 
                  // - Muddati o'tgan yoki bugun = qizil
                  // - 3 kun qolgan = to'q sariq (orange)
                  // - 7 kun qolgan = sariq
                  // - Boshqa = normal
                  const isUrgent = !isPaid && (isOverdue || daysUntilDue <= 0); // Muddati o'tgan
                  const isWarning = !isPaid && !isUrgent && daysUntilDue <= 3; // 3 kun qolgan
                  const isCaution = !isPaid && !isUrgent && !isWarning && daysUntilDue <= 7; // 7 kun qolgan
                  
                  // Karta chegarasi rangi
                  const borderColor = isUrgent ? 'border-red-400 ring-2 ring-red-200' : 
                                     isWarning ? 'border-orange-400 ring-2 ring-orange-200' : 
                                     isCaution ? 'border-amber-400 ring-1 ring-amber-200' : 
                                     isBlacklist ? 'border-slate-700 ring-2 ring-slate-400' :
                                     'border-surface-200 hover:border-brand-300';
                  
                  return (
                    <div key={debt._id} className={`bg-white rounded-xl sm:rounded-2xl border ${borderColor} hover:shadow-xl transition-all duration-300 overflow-hidden group ${isUrgent ? 'animate-pulse-slow' : ''}`}>
                      {/* Header with Avatar and Status */}
                      <div className={`relative p-3 sm:p-4 ${
                        isBlacklist ? 'bg-gradient-to-br from-slate-800 to-slate-900' :
                        isUrgent ? 'bg-gradient-to-br from-red-100 to-rose-100' :
                        isWarning ? 'bg-gradient-to-br from-orange-50 to-amber-50' :
                        isCaution ? 'bg-gradient-to-br from-amber-50 to-yellow-50' :
                        debtType === 'receivable' 
                          ? 'bg-gradient-to-br from-emerald-50 to-green-50' 
                          : 'bg-gradient-to-br from-red-50 to-rose-50'
                      }`}>
                        {/* Muddat ogohlantirishi */}
                        {!isPaid && daysUntilDue <= 7 && (
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold ${
                            isUrgent ? 'bg-red-500 text-white animate-pulse' :
                            isWarning ? 'bg-orange-500 text-white' :
                            'bg-amber-500 text-white'
                          }`}>
                            {isOverdue || daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} kun o'tdi!` :
                             daysUntilDue === 0 ? 'Bugun!' :
                             `${daysUntilDue} kun qoldi`}
                          </div>
                        )}
                        
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ${
                              isBlacklist ? 'bg-gradient-to-br from-slate-900 to-black' :
                              isUrgent ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                              isWarning ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                              isCaution ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                              debtType === 'receivable' 
                                ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                                : 'bg-gradient-to-br from-red-400 to-rose-500'
                            }`}>
                              <User className={`w-6 h-6 ${isBlacklist ? 'text-amber-300' : 'text-white'}`} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-surface-900 truncate text-sm sm:text-base">{getDebtorName(debt)}</h4>
                              {getDebtorPhone(debt) && (
                                <p className="text-xs sm:text-sm text-surface-500 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {getDebtorPhone(debt)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 ${
                            isBlacklist
                              ? 'bg-gradient-to-r from-slate-900 to-black text-amber-300 shadow-lg shadow-slate-500'
                              : isApproved
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-200'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-200'
                          }`}>
                            {isBlacklist ? <AlertTriangle className="w-3 h-3" /> : isApproved ? <CheckCircle2 className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                            <span>
                              {isBlacklist ? 'Qora ro\'yxat' :
                               isPaid ? "To'langan" :
                               isOverdue ? "Muddati o'tgan" : 
                               isApproved ? 'Aktiv' : 'Jarayonda'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {!isPaid && (
                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] sm:text-xs text-surface-600 mb-1">
                              <span>To'langan: {paidPercent}%</span>
                              <span>{formatNumber(debt.paidAmount)} / {formatNumber(debt.amount)}</span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${
                              isUrgent ? 'bg-red-200' : isWarning ? 'bg-orange-200' : isCaution ? 'bg-amber-200' : 'bg-white/60'
                            }`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isUrgent ? 'bg-red-500' :
                                  isWarning ? 'bg-orange-500' :
                                  isCaution ? 'bg-amber-500' :
                                  debtType === 'receivable' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${paidPercent}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-3 sm:p-4">
                        {/* Amount Cards */}
                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                          <div className="bg-surface-50 rounded-xl p-1.5 sm:p-3 border border-surface-100">
                            <p className="text-[9px] sm:text-xs text-surface-500 uppercase tracking-wide font-semibold mb-0.5 sm:mb-1">Jami qarz</p>
                            <p className="font-bold text-surface-900 text-xs sm:text-base">{formatNumber(debt.amount)}</p>
                            <p className="text-[9px] text-surface-400">so'm</p>
                          </div>
                          <div className={`rounded-xl p-1.5 sm:p-3 border ${
                            debtType === 'receivable' 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <p className="text-[9px] sm:text-xs text-surface-500 uppercase tracking-wide font-semibold mb-0.5 sm:mb-1">Qoldiq</p>
                            <p className={`font-bold text-xs sm:text-base ${
                              debtType === 'receivable' ? 'text-emerald-600' : 'text-red-600'
                            }`}>{formatNumber(remaining)}</p>
                            <p className="text-[9px] text-surface-400">so'm</p>
                          </div>
                        </div>

                        {/* Due Date & Collateral */}
                        <div className="flex items-center justify-between mb-2 sm:mb-3 text-[10px] sm:text-sm">
                          <div className="flex flex-col gap-0.5 sm:gap-1">
                            <div className="flex items-center gap-1 sm:gap-1.5 text-surface-600">
                              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>{new Date(debt.dueDate).toLocaleDateString('uz-UZ')}</span>
                            </div>
                            {/* Muddat berilgan kunlar */}
                            {debt.extensionDays > 0 && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-md text-blue-700 text-[9px] sm:text-[10px] font-medium border border-blue-200">
                                📅 {debt.extensionDays} kun muddat
                              </div>
                            )}
                          </div>
                          {debtType === 'receivable' && debt.collateral && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 rounded-lg text-amber-700 text-[9px] sm:text-[10px] font-medium border border-amber-200 max-w-[100px] truncate">
                              🔒 {debt.collateral}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-1.5 sm:gap-2 pt-2 sm:pt-3 border-t border-surface-100 flex-wrap">
                              {/* O'chirish tugmasi - faqat admin uchun */}
                              {isAdmin && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.delete(`/debts/${debt._id}`);
                                      fetchDebts();
                                      fetchStats();
                                    } catch (err) { 
                                      console.error('Error deleting debt:', err); 
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-100 text-red-700 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold hover:bg-red-200 transition-all whitespace-nowrap"
                                  title="Qarzni o'chirish"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="hidden sm:inline">O'chirish</span>
                                </button>
                              )}

                              {/* Muddati berish tugmasi - faqat admin va faqat to'lanmagan qarzlar uchun */}
                              {isAdmin && !isPaid && (
                                <>
                                  {debt.extensionCount === undefined || debt.extensionCount < 3 ? (
                                    <button
                                      onClick={async () => {
                                        const input = prompt("Necha kun muddat berilsin?");
                                        if (!input) return;
                                        const days = parseInt(input, 10);
                                        if (Number.isNaN(days) || days <= 0) return;
                                        try {
                                          await api.post(`/debts/${debt._id}/extend`, { days });
                                          fetchDebts();
                                          fetchStats();
                                        } catch (err: any) {
                                          console.error('Error extending debt:', err);
                                          showAlert(err.response?.data?.message || 'Muddat berishda xatolik', 'Xatolik', 'danger');
                                        }
                                      }}
                                      className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-amber-100 text-amber-700 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold hover:bg-amber-200 transition-all whitespace-nowrap"
                                    >
                                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                      <span>Muddat</span>
                                    </button>
                                  ) : null}
                                </>
                              )}

                              {/* Oddiy to'lov tugmasi (bo'lib-bo'lib to'lash uchun) */}
                              {!isPaid && (
                                <button 
                                  onClick={() => { setSelectedDebt(debt); setShowPaymentModal(true); }} 
                                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold hover:bg-emerald-200 transition-all whitespace-nowrap"
                                >
                                  <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span>To'lov</span>
                                </button>
                              )}

                              {/* Qora ro'yxatdan chiqarish tugmasi - faqat admin uchun */}
                              {isAdmin && isBlacklist && (
                                <button
                                  onClick={async () => {
                                    const confirmed = await showConfirm(
                                      "Ushbu mijozni qora ro'yxatdan chiqarasizmi?",
                                      "Qora ro'yxatdan chiqarish"
                                    );
                                    if (!confirmed) return;
                                    try {
                                      await api.post(`/debts/${debt._id}/remove-blacklist`);
                                      fetchDebts();
                                      fetchStats();
                                      showAlert("Mijoz qora ro'yxatdan chiqarildi", 'Muvaffaqiyat', 'success');
                                    } catch (err: any) {
                                      console.error('Error removing from blacklist:', err);
                                      showAlert(err.response?.data?.message || "Qora ro'yxatdan chiqarishda xatolik", 'Xatolik', 'danger');
                                    }
                                  }}
                                  className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 text-amber-300 rounded-lg text-[10px] sm:text-xs md:text-sm font-semibold hover:bg-slate-900 transition-all whitespace-nowrap"
                                >
                                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                  <span className="hidden sm:inline">Qora ro'yxatdan chiqarish</span>
                                  <span className="sm:hidden">Chiqarish</span>
                                </button>
                              )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="overlay -z-10" onClick={closeModal} />
          <div className="modal w-full sm:w-auto max-w-md relative z-10 flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 flex items-center justify-between p-4 sm:p-6 gap-4">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 truncate">{editingDebt ? 'Qarzni tahrirlash' : 'Yangi qarz'}</h3>
              <button onClick={closeModal} className="flex-shrink-0 btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
            
            {/* Debt Type Toggle in Modal - only for admin */}
            {isAdmin && (
              <div className="flex p-1 bg-surface-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setDebtType('receivable')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    debtType === 'receivable' ? 'bg-white text-success-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Menga qarzdor
                </button>
                <button
                  type="button"
                  onClick={() => setDebtType('payable')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    debtType === 'payable' ? 'bg-white text-danger-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Men qarzdorman
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Ogohlantirish xabari */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700">
                    <p className="font-medium mb-1">Diqqat!</p>
                    <p>Qo'shilgan qarz darhol mijozning umumiy qarziga qo'shiladi. Shuning uchun ma'lumotlarni diqqat bilan kiriting.</p>
                  </div>
                </div>
              </div>
              {debtType === 'receivable' ? (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Mijoz</label>
                  {showNewCustomerForm ? (
                    <div className="space-y-3 p-3 bg-surface-50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-brand-600">Yangi mijoz</span>
                        <button type="button" onClick={() => setShowNewCustomerForm(false)} className="text-surface-400 hover:text-surface-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        className="input" 
                        placeholder="Mijoz ismi" 
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} 
                      />
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                        <input 
                          type="text" 
                          className="input pl-12" 
                          placeholder="+998 (XX) XXX-XX-XX" 
                          value={newCustomer.phone}
                          onChange={e => setNewCustomer({ ...newCustomer, phone: formatPhone(e.target.value) })} 
                        />
                      </div>
                      <select 
                        className="select text-sm" 
                        value={newCustomer.region}
                        onChange={e => setNewCustomer({ ...newCustomer, region: e.target.value, district: '' })}
                      >
                        <option value="">Viloyatni tanlang</option>
                        {regionNames.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                      {newCustomer.region && (
                        <select 
                          className="select text-sm" 
                          value={newCustomer.district}
                          onChange={e => setNewCustomer({ ...newCustomer, district: e.target.value })}
                        >
                          <option value="">Tumanni tanlang</option>
                          {regions[newCustomer.region]?.map(district => (
                            <option key={district} value={district}>{district}</option>
                          ))}
                        </select>
                      )}
                      <button 
                        type="button" 
                        onClick={handleCreateCustomer}
                        disabled={!newCustomer.name || !newCustomer.phone}
                        className="btn-primary w-full"
                      >
                        <UserPlus className="w-4 h-4" />
                        Mijozni yaratish
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <select className="select flex-1" value={formData.customer}
                        onChange={e => setFormData({...formData, customer: e.target.value})} required>
                        <option value="">Tanlang</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => setShowNewCustomerForm(true)}
                        className="btn-icon bg-brand-100 text-brand-600 hover:bg-brand-200"
                        title="Yangi mijoz qo'shish"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Kimga qarzdorman</label>
                  <input type="text" className="input" placeholder="Ism yoki kompaniya nomi" 
                    value={formData.creditorName}
                    onChange={e => setFormData({...formData, creditorName: e.target.value})} required />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Summa (so'm)</label>
                <input type="text" className="input" placeholder="0" value={formatInputNumber(formData.amount)}
                  onChange={e => setFormData({...formData, amount: parseNumber(e.target.value)})} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Muddat</label>
                <input type="date" className="input" value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})} required />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700 mb-2 block">Izoh (ixtiyoriy)</label>
                <input type="text" className="input" placeholder="Qarz haqida izoh" 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              {debtType === 'receivable' && (
                <div>
                  <label className="text-sm font-medium text-surface-700 mb-2 block">Zalog (ixtiyoriy)</label>
                  <input type="text" className="input" placeholder="Zalogga nima qoldirdi" 
                    value={formData.collateral}
                    onChange={e => setFormData({...formData, collateral: e.target.value})} />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Bekor qilish</button>
                <button type="submit" className="btn-primary flex-1">Saqlash</button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedDebt && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="overlay -z-10" onClick={() => setShowPaymentModal(false)} />
          <div className="modal w-full sm:w-auto max-w-md relative z-10 flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 flex items-center justify-between p-4 sm:p-6 gap-4">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900">To'lov qilish</h3>
              <button onClick={() => setShowPaymentModal(false)} className="flex-shrink-0 btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6">
                <div className={`rounded-xl p-4 mb-6 ${debtType === 'receivable' ? 'bg-success-50' : 'bg-danger-50'}`}>
                  <p className="text-sm text-surface-600 mb-1">Qoldiq summa</p>
                  <p className={`text-2xl font-bold ${debtType === 'receivable' ? 'text-success-600' : 'text-danger-600'}`}>
                    {formatNumber(selectedDebt.amount - selectedDebt.paidAmount)} so'm
                  </p>
                </div>
                <form onSubmit={handlePayment} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-surface-700 mb-2 block">To'lov summasi</label>
                    <input type="text" className="input" placeholder="0" value={formatInputNumber(paymentAmount)}
                      onChange={e => setPaymentAmount(parseNumber(e.target.value))} required />
                  </div>
                  <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary flex-1">
                  Bekor qilish
                </button>
                <button type="submit" className="btn-success flex-1">To'lash</button>
              </div>
            </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
