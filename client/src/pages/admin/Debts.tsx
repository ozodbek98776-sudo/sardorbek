import { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plus, AlertTriangle, X, DollarSign, Calendar, User, 
  CheckCircle2, AlertCircle, Trash2, Wallet, ArrowDownLeft, ArrowUpRight, Phone, UserPlus, TrendingUp, CreditCard
} from 'lucide-react';
import { Debt, Customer } from '../../types';
import api from '../../utils/api';
import { formatNumber, formatInputNumber, parseNumber, formatPhone } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { useModalScrollLock } from '../../hooks/useModalScrollLock';
import { regions, regionNames } from '../../data/regions';
import { useAuth } from '../../context/AuthContext';
import { StatCard, LoadingSpinner, EmptyState, Badge, ActionButton, UniversalPageHeader } from '../../components/common';

export default function Debts() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [debtType, setDebtType] = useState<'receivable' | 'payable'>('receivable');
  const [modalDebtType, setModalDebtType] = useState<'receivable' | 'payable'>('receivable');
  const [formData, setFormData] = useState({ 
    customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' 
  });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showArchive, setShowArchive] = useState(false); // Arxiv ko'rinishi
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', region: '', district: '' });
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch debts with pagination support
  const fetchDebts = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) {
        setLoading(true);
        console.log('📦 Loading debts page:', pageNum);
      } else {
        setLoadingMore(true);
        console.log('📦 Loading more debts, page:', pageNum);
      }

      const res = await api.get(`/debts?type=${debtType}&page=${pageNum}&limit=50`);
      
      let debtsData = [];
      let paginationData = null;
      
      if (res.data && res.data.success && res.data.data) {
        // ServiceWrapper format with pagination: { success: true, data: { data: [...], pagination: {...} } }
        if (Array.isArray(res.data.data.data)) {
          debtsData = res.data.data.data;
          paginationData = res.data.data.pagination;
        } else if (Array.isArray(res.data.data)) {
          // ServiceWrapper format without pagination: { success: true, data: [...] }
          debtsData = res.data.data;
        }
      } else if (Array.isArray(res.data)) {
        // Direct array format (fallback)
        debtsData = res.data;
      } else {
        console.warn('Unexpected debts API response format:', res.data);
        debtsData = [];
      }
      
      console.log('✅ Loaded debts:', debtsData.length, 'Pagination:', paginationData);
      
      if (append) {
        setDebts(prev => [...prev, ...debtsData]);
      } else {
        setDebts(debtsData);
      }
      
      // Update pagination state
      if (paginationData) {
        setHasMore(paginationData.hasMore || false);
        setCurrentPage(paginationData.page || pageNum);
      } else {
        // If no pagination data, assume no more pages
        setHasMore(false);
      }
    } catch (err) { 
      console.error('Error fetching debts:', err);
      showAlert(
        err.response?.data?.message || 'Qarzlarni yuklashda xatolik yuz berdi', 
        'Xatolik', 
        'danger'
      );
      setDebts(append ? debts : []);
      setHasMore(false);
    } finally { 
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debtType, showAlert]);

  // Load more debts
  const loadMoreDebts = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = currentPage + 1;
      console.log('🔄 Loading more debts, next page:', nextPage);
      fetchDebts(nextPage, true);
    }
  }, [loadingMore, hasMore, loading, currentPage, fetchDebts]);

  // Initial load and when debtType changes
  useEffect(() => {
    setDebts([]);
    setCurrentPage(1);
    setHasMore(true);
    fetchDebts(1, false);
    fetchCustomers();
    fetchStats();
  }, [debtType, fetchDebts]);

  // Infinite scroll observer
  useEffect(() => {
    if (loading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore) {
          console.log('🔍 Reached bottom, loading more debts...');
          loadMoreDebts();
        }
      },
      { rootMargin: '200px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, loadingMore, loadMoreDebts]);

  // Modal scroll lock
  useModalScrollLock(showModal || showPaymentModal);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      
      // Handle response format from serviceWrapper
      let customersData = [];
      
      if (res.data && res.data.success && res.data.data) {
        // ServiceWrapper format with pagination: { success: true, data: { data: [...], pagination: {...} } }
        if (Array.isArray(res.data.data.data)) {
          customersData = res.data.data.data;
        } else if (Array.isArray(res.data.data)) {
          // ServiceWrapper format without pagination: { success: true, data: [...] }
          customersData = res.data.data;
        }
      } else if (Array.isArray(res.data)) {
        // Direct array format (fallback)
        customersData = res.data;
      } else {
        console.warn('Unexpected customers API response format:', res.data);
        customersData = [];
      }
      
      setCustomers(customersData);
    } catch (err) { 
      console.error('Error fetching customers:', err);
      showAlert(
        err.response?.data?.message || 'Mijozlarni yuklashda xatolik yuz berdi', 
        'Xatolik', 
        'danger'
      );
      setCustomers([]);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get(`/debts/stats?type=${debtType}`);
      
      // Handle response format from serviceWrapper
      let statsData = res.data;
      
      if (res.data && res.data.success && res.data.data) {
        // ServiceWrapper format: { success: true, data: {...} }
        statsData = res.data.data;
      }
      
      console.log('📊 Stats loaded:', statsData);
      setStats(statsData);
    } catch (err) { 
      console.error('Error fetching stats:', err); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validatsiya
    if (modalDebtType === 'receivable' && !formData.customer) {
      showAlert('Mijozni tanlang', 'Xatolik', 'danger');
      return;
    }
    
    if (modalDebtType === 'payable' && !formData.creditorName) {
      showAlert('Kreditor ismini kiriting', 'Xatolik', 'danger');
      return;
    }
    
    if (!formData.amount || Number(formData.amount) <= 0) {
      showAlert('Qarz summasini kiriting', 'Xatolik', 'danger');
      return;
    }
    
    if (!formData.dueDate) {
      showAlert('Muddatni kiriting', 'Xatolik', 'danger');
      return;
    }
    
    try {
      const data = {
        type: modalDebtType,
        customer: modalDebtType === 'receivable' ? formData.customer : undefined,
        creditorName: modalDebtType === 'payable' ? formData.creditorName : undefined,
        amount: Number(formData.amount),
        dueDate: formData.dueDate,
        description: formData.description || `${modalDebtType === 'receivable' ? 'Mijoz' : 'Kreditor'} qarzi`,
        collateral: formData.collateral
      };
      
      console.log('📤 Submitting debt data:', data);
      
      if (editingDebt) {
        const response = await api.put(`/debts/${editingDebt._id}`, data);
        console.log('✅ Debt updated:', response.data);
        showAlert('Qarz muvaffaqiyatli yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        const response = await api.post('/debts', data);
        console.log('✅ Debt created:', response.data);
        showAlert('Qarz muvaffaqiyatli qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      
      // Reset and reload from page 1
      setDebts([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchDebts(1, false);
      fetchStats();
      closeModal();
    } catch (err: any) { 
      console.error('❌ Error saving debt:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Qarz qo\'shishda xatolik yuz berdi';
      showAlert(errorMessage, 'Xatolik', 'danger');
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
      // Reset and reload from page 1
      setDebts([]);
      setCurrentPage(1);
      setHasMore(true);
      fetchDebts(1, false);
      fetchStats();
      setShowPaymentModal(false);
      setSelectedDebt(null);
      setPaymentAmount('');
    } catch (err) { console.error('Error making payment:', err); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDebt(null);
    setModalDebtType(debtType); // Reset to main debtType
    setFormData({ customer: '', creditorName: '', amount: '', dueDate: '', description: '', collateral: '' });
    setShowNewCustomerForm(false);
    setNewCustomer({ name: '', phone: '', region: '', district: '' });
  };

  const openEditModal = (debt: Debt) => {
    setEditingDebt(debt);
    setModalDebtType(debt.type);
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

  const filteredDebts = (Array.isArray(debts) ? debts : []).filter(debt => {
    const name = debt.customer?.name || debt.creditorName || '';
    const phone = debt.customer?.phone || '';
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         phone.includes(searchQuery);
    
    // Arxiv filtri - faqat to'langan yoki to'lanmagan qarzlarni ko'rsatish
    const isPaid = debt.status === 'paid';
    if (showArchive && !isPaid) return false; // Arxivda faqat to'langan qarzlar
    if (!showArchive && isPaid) return false; // Asosiy sahifada to'langan qarzlar ko'rinmasin
    
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
    { 
      label: 'AKTIV', 
      count: stats.approved || 0, 
      amount: null,
      icon: CheckCircle2, 
      color: 'success', 
      filter: 'approved' 
    },
    { 
      label: "QORA RO'YXAT", 
      count: stats.blacklist || 0, 
      amount: null,
      icon: AlertTriangle, 
      color: 'danger', 
      filter: 'blacklist' 
    },
    { 
      label: "MUDDATI O'TGAN", 
      count: stats.overdue || 0, 
      amount: null,
      icon: AlertCircle, 
      color: 'danger', 
      filter: 'overdue' 
    },
    { 
      label: "TO'LANGAN (ARXIV)", 
      count: stats.paid || 0, 
      amount: null,
      icon: CheckCircle2, 
      color: 'info', 
      filter: 'archive' 
    },
    { 
      label: 'JAMI QARZ', 
      count: stats.total || 0,
      amount: stats.totalAmount || 0,
      icon: Wallet, 
      color: 'accent', 
      filter: null 
    },
  ];

  const getDebtorName = (debt: Debt) => {
    if (debt.customer?.name) return debt.customer.name;
    return debt.creditorName || 'Noma\'lum';
  };

  const getDebtorPhone = (debt: Debt) => {
    return debt.customer?.phone || '';
  };

  return (
    <div className="min-h-screen bg-surface-50 w-full h-full">
      {AlertComponent}
      
      <UniversalPageHeader 
        title={showArchive ? "Qarz daftarcha - Arxiv" : "Qarz daftarcha"}
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onMenuToggle={onMenuToggle}
        actions={
          <div className="flex items-center gap-1">
            {showArchive && (
              <button 
                onClick={() => {
                  setShowArchive(false);
                  setStatusFilter('all');
                }} 
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-500 hover:bg-surface-600 text-white shadow-sm hover:shadow-md transition-all active:scale-95"
                title="Asosiy sahifaga qaytish"
              >
                <X className="w-3 h-3" />
                <span className="text-[10px] font-medium">Orqaga</span>
              </button>
            )}
            <button 
              onClick={() => {
                setModalDebtType(debtType);
                setShowModal(true);
              }} 
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-sm hover:shadow-md transition-all active:scale-95"
              title="Yangi qarz qo'shish"
            >
              <Plus className="w-3 h-3" />
              <span className="text-[10px] font-medium">Qo'shish</span>
            </button>
          </div>
        }
      />

      <div className="p-1 sm:p-2 space-y-2 sm:space-y-3 w-full">
        {/* Type Toggle - only for admin */}
        {isAdmin && (
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-surface-100 rounded-lg">
              <button
                onClick={() => { setDebtType('receivable'); setStatusFilter('all'); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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

        {/* Stats - Ultra Professional Design */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {statItems.map((stat, i) => (
            <div 
              key={i} 
              onClick={() => {
                if (stat.filter === 'archive') {
                  setShowArchive(true);
                  setStatusFilter('all');
                } else if (stat.filter) {
                  setShowArchive(false);
                  setStatusFilter(stat.filter);
                }
              }}
              className={`group relative ${stat.filter ? 'cursor-pointer' : ''}`}
            >
              {/* Glassmorphism Card */}
              <div className={`relative bg-gradient-to-br from-white to-slate-50/50 backdrop-blur-xl rounded-3xl p-6 shadow-lg hover:shadow-2xl transition-all duration-700 ${stat.filter ? 'hover:-translate-y-2 hover:scale-105' : ''} overflow-hidden border border-white/20`}>
                {/* Animated Gradient Border */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${
                  stat.color === 'success' ? 'from-emerald-400 via-teal-400 to-cyan-400' :
                  stat.color === 'danger' ? 'from-red-400 via-rose-400 to-pink-400' :
                  stat.color === 'info' ? 'from-blue-400 via-indigo-400 to-purple-400' :
                  stat.color === 'accent' ? 'from-purple-400 via-violet-400 to-indigo-400' :
                  'from-blue-400 via-sky-400 to-cyan-400'
                } opacity-0 group-hover:opacity-10 transition-opacity duration-700`} />
                
                {/* Top Accent Line with Glow */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
                  stat.color === 'success' ? 'from-emerald-400 via-teal-500 to-emerald-400' :
                  stat.color === 'danger' ? 'from-red-400 via-rose-500 to-red-400' :
                  stat.color === 'info' ? 'from-blue-400 via-indigo-500 to-blue-400' :
                  stat.color === 'accent' ? 'from-purple-400 via-violet-500 to-purple-400' :
                  'from-blue-400 via-sky-500 to-blue-400'
                } shadow-lg ${
                  stat.color === 'success' ? 'shadow-emerald-500/50' :
                  stat.color === 'danger' ? 'shadow-red-500/50' :
                  stat.color === 'info' ? 'shadow-blue-500/50' :
                  stat.color === 'accent' ? 'shadow-purple-500/50' :
                  'shadow-blue-500/50'
                }`} />
                
                {/* Icon Container with Glow */}
                <div className="flex items-start justify-between mb-5">
                  <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center ${
                    stat.color === 'success' ? 'bg-gradient-to-br from-emerald-50 to-teal-50' :
                    stat.color === 'danger' ? 'bg-gradient-to-br from-red-50 to-rose-50' :
                    stat.color === 'info' ? 'bg-gradient-to-br from-blue-50 to-indigo-50' :
                    stat.color === 'accent' ? 'bg-gradient-to-br from-purple-50 to-violet-50' :
                    'bg-gradient-to-br from-blue-50 to-sky-50'
                  } group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-md`}>
                    {/* Icon Glow Effect */}
                    <div className={`absolute inset-0 rounded-2xl ${
                      stat.color === 'success' ? 'bg-emerald-400' :
                      stat.color === 'danger' ? 'bg-red-400' :
                      stat.color === 'info' ? 'bg-blue-400' :
                      stat.color === 'accent' ? 'bg-purple-400' :
                      'bg-blue-400'
                    } opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
                    <stat.icon className={`w-7 h-7 relative z-10 ${
                      stat.color === 'success' ? 'text-emerald-600' :
                      stat.color === 'danger' ? 'text-red-600' :
                      stat.color === 'info' ? 'text-blue-600' :
                      stat.color === 'accent' ? 'text-purple-600' :
                      'text-blue-600'
                    }`} />
                  </div>
                  {/* Trending Indicator */}
                  {stat.filter && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/60 backdrop-blur-sm">
                      <TrendingUp className="w-3 h-3 text-green-600" />
                      <span className="text-[10px] font-bold text-green-600">Live</span>
                    </div>
                  )}
                </div>
                
                {/* Value Section with Animation */}
                <div className="space-y-2 relative z-10">
                  {/* Main Value with Gradient Text */}
                  <h3 className={`text-3xl font-black leading-none tracking-tight bg-gradient-to-br ${
                    stat.color === 'success' ? 'from-emerald-600 to-teal-600' :
                    stat.color === 'danger' ? 'from-red-600 to-rose-600' :
                    stat.color === 'info' ? 'from-blue-600 to-indigo-600' :
                    stat.color === 'accent' ? 'from-purple-600 to-violet-600' :
                    'from-blue-600 to-sky-600'
                  } bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-500 origin-left`}>
                    {stat.count ?? 0}
                  </h3>
                  
                  {/* Amount (if exists) */}
                  {stat.amount !== null && stat.amount !== undefined && (
                    <p className={`text-sm font-bold ${
                      stat.color === 'success' ? 'text-emerald-600' :
                      stat.color === 'danger' ? 'text-red-600' :
                      stat.color === 'info' ? 'text-blue-600' :
                      stat.color === 'accent' ? 'text-purple-600' :
                      'text-blue-600'
                    }`}>
                      {formatNumber(stat.amount)} so'm
                    </p>
                  )}
                  
                  {/* Label with Better Typography */}
                  <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
                    {stat.label}
                  </p>
                </div>

                {/* Animated Background Orbs */}
                <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full ${
                  stat.color === 'success' ? 'bg-gradient-to-br from-emerald-200 to-teal-200' :
                  stat.color === 'danger' ? 'bg-gradient-to-br from-red-200 to-rose-200' :
                  stat.color === 'info' ? 'bg-gradient-to-br from-blue-200 to-indigo-200' :
                  stat.color === 'accent' ? 'bg-gradient-to-br from-purple-200 to-violet-200' :
                  'bg-gradient-to-br from-blue-200 to-sky-200'
                } opacity-20 group-hover:scale-150 group-hover:opacity-30 transition-all duration-700 blur-2xl`} />
                <div className={`absolute -left-4 -top-4 w-24 h-24 rounded-full ${
                  stat.color === 'success' ? 'bg-gradient-to-br from-teal-200 to-emerald-200' :
                  stat.color === 'danger' ? 'bg-gradient-to-br from-rose-200 to-red-200' :
                  stat.color === 'info' ? 'bg-gradient-to-br from-indigo-200 to-blue-200' :
                  stat.color === 'accent' ? 'bg-gradient-to-br from-violet-200 to-purple-200' :
                  'bg-gradient-to-br from-sky-200 to-blue-200'
                } opacity-10 group-hover:scale-125 group-hover:opacity-20 transition-all duration-700 blur-2xl`} />
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
              {/* Minimal Professional Design Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredDebts.map(debt => {
                  const isPaid = debt.status === 'paid';
                  const isOverdue = debt.status === 'overdue';
                  const isApproved = debt.status === 'approved';
                  const isBlacklist = debt.status === 'blacklist';
                  const remaining = debt.amount - debt.paidAmount;
                  const paidPercent = Math.round((debt.paidAmount / debt.amount) * 100);
                  
                  const dueDate = new Date(debt.dueDate);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  
                  const isUrgent = !isPaid && (isOverdue || daysUntilDue <= 0);
                  const isWarning = !isPaid && !isUrgent && daysUntilDue <= 3;
                  const isCaution = !isPaid && !isUrgent && !isWarning && daysUntilDue <= 7;
                  
                  const borderColor = isUrgent ? 'border-red-400 ring-1 ring-red-200' : 
                                     isWarning ? 'border-orange-400 ring-1 ring-orange-200' : 
                                     isCaution ? 'border-amber-400 ring-1 ring-amber-200' : 
                                     isBlacklist ? 'border-slate-700 ring-1 ring-slate-400' :
                                     'border-surface-200 hover:border-brand-300';
                  
                  return (
                    <div key={debt._id} className={`group relative bg-white rounded-2xl border-2 ${borderColor} hover:shadow-2xl transition-all duration-300 overflow-hidden ${isUrgent ? 'animate-pulse-slow' : ''}`}>
                      {/* Minimal Header */}
                      <div className={`relative p-4 ${
                        isBlacklist ? 'bg-gradient-to-br from-slate-800 to-slate-900' :
                        isUrgent ? 'bg-gradient-to-br from-red-50 to-rose-50' :
                        isWarning ? 'bg-gradient-to-br from-orange-50 to-amber-50' :
                        isCaution ? 'bg-gradient-to-br from-amber-50 to-yellow-50' :
                        debtType === 'receivable' 
                          ? 'bg-gradient-to-br from-emerald-50 to-green-50' 
                          : 'bg-gradient-to-br from-red-50 to-rose-50'
                      }`}>
                        {/* Muddat badge */}
                        {!isPaid && daysUntilDue <= 7 && (
                          <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isUrgent ? 'bg-red-500 text-white animate-pulse' :
                            isWarning ? 'bg-orange-500 text-white' :
                            'bg-amber-500 text-white'
                          }`}>
                            {isOverdue || daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} kun kech` :
                             daysUntilDue === 0 ? 'Bugun' :
                             `${daysUntilDue} kun qoldi`}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-3">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg ${
                            isBlacklist ? 'bg-gradient-to-br from-slate-900 to-black' :
                            isUrgent ? 'bg-gradient-to-br from-red-500 to-rose-600' :
                            isWarning ? 'bg-gradient-to-br from-orange-400 to-amber-500' :
                            isCaution ? 'bg-gradient-to-br from-amber-400 to-yellow-500' :
                            debtType === 'receivable' 
                              ? 'bg-gradient-to-br from-emerald-400 to-green-500' 
                              : 'bg-gradient-to-br from-red-400 to-rose-500'
                          }`}>
                            <User className={`w-7 h-7 ${isBlacklist ? 'text-amber-300' : 'text-white'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-surface-900 truncate text-base">{getDebtorName(debt)}</h4>
                            {getDebtorPhone(debt) && (
                              <p className="text-sm text-surface-500 truncate">{getDebtorPhone(debt)}</p>
                            )}
                          </div>
                          
                          {/* Status Badge */}
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                            isBlacklist
                              ? 'bg-gradient-to-r from-slate-900 to-black text-amber-300'
                              : isApproved
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
                          }`}>
                            {isBlacklist ? <AlertTriangle className="w-3.5 h-3.5" /> : isApproved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                            <span>
                              {isBlacklist ? 'Qora ro\'yxat' :
                               isPaid ? "To'landi" :
                               isOverdue ? "Muddati o'tdi" : 
                               isApproved ? 'Aktiv' : 'Kutish'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {!isPaid && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-surface-600 mb-1.5">
                              <span className="font-semibold">{paidPercent}% to'landi</span>
                              <span className="font-semibold">{formatNumber(debt.paidAmount)} so'm</span>
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
                      <div className="p-4">
                        {/* Amount Cards - Minimal */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
                            <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Jami qarz</p>
                            <p className="font-bold text-surface-900 text-base">{formatNumber(debt.amount)} so'm</p>
                          </div>
                          <div className={`rounded-xl p-3 border ${
                            debtType === 'receivable' 
                              ? 'bg-emerald-50 border-emerald-200' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <p className="text-xs text-surface-500 uppercase font-semibold mb-1">Qoldiq</p>
                            <p className={`font-bold text-base ${
                              debtType === 'receivable' ? 'text-emerald-600' : 'text-red-600'
                            }`}>{formatNumber(remaining)} so'm</p>
                          </div>
                        </div>

                        {/* Due Date & Collateral - Minimal */}
                        <div className="flex items-center justify-between mb-4 text-sm">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-surface-600">
                              <Calendar className="w-4 h-4" />
                              <span className="font-medium">{new Date(debt.dueDate).toLocaleDateString('uz-UZ')}</span>
                            </div>
                            {/* Muddat berilgan kunlar */}
                            {debt.extensionDays > 0 && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg text-blue-700 text-xs font-semibold border border-blue-200">
                                📅 {debt.extensionDays} kun muddat
                              </div>
                            )}
                          </div>
                          {debtType === 'receivable' && debt.collateral && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-lg text-amber-700 text-xs font-semibold border border-amber-200 max-w-[120px] truncate">
                              🔒 {debt.collateral}
                            </div>
                          )}
                        </div>

                        {/* Actions - Minimal */}
                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-100 flex-wrap">
                              {/* Tahrirlash tugmasi - faqat admin uchun */}
                              {isAdmin && !isPaid && (
                                <button
                                  onClick={() => openEditModal(debt)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-200 transition-all"
                                  title="Tahrirlash"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  <span>Tahrirlash</span>
                                </button>
                              )}

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
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-all"
                                  title="O'chirish"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>O'chirish</span>
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
                                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-200 transition-all"
                                    >
                                      <Calendar className="w-4 h-4" />
                                      <span>Muddat</span>
                                    </button>
                                  ) : null}
                                </>
                              )}

                              {/* Oddiy to'lov tugmasi (bo'lib-bo'lib to'lash uchun) */}
                              {!isPaid && (
                                <button 
                                  onClick={() => { setSelectedDebt(debt); setShowPaymentModal(true); }} 
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-semibold hover:bg-emerald-200 transition-all"
                                >
                                  <DollarSign className="w-4 h-4" />
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
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 text-amber-300 rounded-lg text-sm font-semibold hover:bg-slate-900 transition-all"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Chiqarish</span>
                                </button>
                              )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Infinite Scroll Loading Indicator */}
              {!loading && hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-brand-600">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
                      <span className="text-sm font-medium">Yuklanmoqda...</span>
                    </div>
                  )}
                </div>
              )}

              {/* End of List Indicator */}
              {!loading && !hasMore && debts.length > 0 && (
                <div className="flex justify-center py-6">
                  <p className="text-sm text-slate-500">Barcha qarzlar yuklandi</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Debt Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="modal w-full sm:w-auto max-w-md relative z-10 flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 flex items-center justify-between p-4 sm:p-6 gap-4">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900 truncate">{editingDebt ? 'Qarzni tahrirlash' : 'Yangi qarz'}</h3>
              <button onClick={closeModal} className="flex-shrink-0 btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll">
              <div className="p-4 sm:p-6">
            
            {/* Debt Type Toggle in Modal - only for admin */}
            {isAdmin && !editingDebt && (
              <div className="flex p-1 bg-surface-100 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setModalDebtType('receivable');
                    setFormData({ ...formData, creditorName: '' });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    modalDebtType === 'receivable' ? 'bg-white text-success-600 shadow-sm' : 'text-surface-500'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  Menga qarzdor
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModalDebtType('payable');
                    setFormData({ ...formData, customer: '' });
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    modalDebtType === 'payable' ? 'bg-white text-danger-600 shadow-sm' : 'text-surface-500'
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
              {modalDebtType === 'receivable' ? (
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
                        {(Array.isArray(customers) ? customers : []).map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
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
              {modalDebtType === 'receivable' && (
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
          <div className="modal w-full sm:w-auto max-w-md relative z-10 flex flex-col">
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100 flex items-center justify-between p-4 sm:p-6 gap-4">
              <h3 className="text-lg sm:text-xl font-semibold text-surface-900">To'lov qilish</h3>
              <button onClick={() => setShowPaymentModal(false)} className="flex-shrink-0 btn-icon-sm"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll">
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
