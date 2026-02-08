import { useState, useEffect, useRef, useCallback } from 'react';
import Header from '../../components/Header';
import { 
  DollarSign, Plus, Calendar, TrendingDown, Edit2, Trash2, Search
} from 'lucide-react';
import api from '../../utils/api';
import { formatNumber, formatDate } from '../../utils/format';
import { useAlert } from '../../hooks/useAlert';
import { ExpenseModal } from '../../components/ExpenseModal';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  products?: Array<{
    product: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  createdBy: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface ExpenseStats {
  total: number;
  today: number;
  week: number;
  month: number;
  byCategory: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
}

const categoryLabels: Record<string, string> = {
  kommunal: 'Kommunal',
  oylik: 'Ishchi oylik',
  ovqat: 'Ovqat',
  tovar: 'Tovar xaridi',
  boshqa: 'Boshqa'
};

const categoryColors: Record<string, string> = {
  kommunal: 'from-blue-400 to-blue-500',
  oylik: 'from-green-400 to-green-500',
  ovqat: 'from-orange-400 to-orange-500',
  tovar: 'from-purple-400 to-purple-500',
  boshqa: 'from-gray-400 to-gray-500'
};

// Skeleton Loader Component
const ExpenseRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-3 lg:px-6 py-3 lg:py-4"><div className="h-3 lg:h-4 bg-slate-200 rounded w-20 lg:w-24" /></td>
    <td className="px-3 lg:px-6 py-3 lg:py-4"><div className="h-5 lg:h-6 bg-slate-200 rounded-full w-16 lg:w-20" /></td>
    <td className="px-3 lg:px-6 py-3 lg:py-4 hidden sm:table-cell"><div className="h-3 lg:h-4 bg-slate-200 rounded w-32 lg:w-48" /></td>
    <td className="px-3 lg:px-6 py-3 lg:py-4"><div className="h-3 lg:h-4 bg-slate-200 rounded w-20 lg:w-28 ml-auto" /></td>
    <td className="px-3 lg:px-6 py-3 lg:py-4 hidden md:table-cell"><div className="h-3 lg:h-4 bg-slate-200 rounded w-16 lg:w-20" /></td>
    <td className="px-3 lg:px-6 py-3 lg:py-4">
      <div className="flex items-center justify-center gap-1 lg:gap-2">
        <div className="h-7 w-7 lg:h-8 lg:w-8 bg-slate-200 rounded-lg" />
        <div className="h-7 w-7 lg:h-8 lg:w-8 bg-slate-200 rounded-lg" />
      </div>
    </td>
  </tr>
);

export default function Expenses() {
  const { showAlert, AlertComponent } = useAlert();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('month'); // Default: oxirgi 30 kun
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    category: 'kommunal',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // ⚡ OPTIMIZED: Fetch statistics with caching (5 minutes)
  const fetchStatistics = useCallback(async () => {
    try {
      setLoadingStats(true);
      
      // Check cache first with filter-specific key
      const cacheKey = `expenses_stats_${categoryFilter}_${dateFilter}`;
      const cached = sessionStorage.getItem(cacheKey);
      const cacheTime = sessionStorage.getItem(`${cacheKey}_time`);
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 300000) { // 5 minutes cache
          console.log('📊 Using cached stats');
          setStats(JSON.parse(cached));
          setLoadingStats(false);
          return;
        }
      }
      
      const statsRes = await api.get('/expenses/stats');
      console.log('📊 Stats response:', statsRes.data);
      
      const statsData = statsRes.data.success ? statsRes.data.data : statsRes.data;
      setStats(statsData);
      
      // Cache the stats with filter-specific key
      sessionStorage.setItem(cacheKey, JSON.stringify(statsData));
      sessionStorage.setItem(`${cacheKey}_time`, Date.now().toString());
    } catch (err: any) {
      console.error('❌ Error fetching stats:', err);
      // Don't show error for stats - page can still work without them
    } finally {
      setLoadingStats(false);
    }
  }, [categoryFilter, dateFilter]);

  // ⚡ OPTIMIZED: Fetch expenses with pagination and retry logic
  const fetchExpenses = useCallback(async (pageNum: number, append: boolean = false, retryCount: number = 0) => {
    try {
      if (pageNum === 1) {
        setLoadingExpenses(true);
      } else {
        setLoadingMore(true);
      }

      const params: any = { 
        category: categoryFilter,
        limit: 20,
        skip: (pageNum - 1) * 20
      };
      
      if (dateFilter !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'today') {
          params.startDate = today.toISOString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          params.startDate = weekAgo.toISOString();
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          params.startDate = monthAgo.toISOString();
        }
      }
      
      const expensesRes = await api.get('/expenses', { params });
      console.log('📊 Expenses response:', expensesRes.data);
      
      const expensesData = expensesRes.data.success ? expensesRes.data.data : expensesRes.data;
      const newExpenses = Array.isArray(expensesData) ? expensesData : [];
      
      if (append) {
        setExpenses(prev => [...prev, ...newExpenses]);
      } else {
        setExpenses(newExpenses);
      }
      
      setHasMore(newExpenses.length === 20);
      setPage(pageNum);
    } catch (err: any) {
      console.error('❌ Error fetching expenses:', err);
      
      // Retry once if timeout
      if (err.message.includes('vaqti tugadi') && retryCount === 0) {
        console.log('🔄 Retrying expenses request...');
        setTimeout(() => {
          fetchExpenses(pageNum, append, retryCount + 1);
        }, 1000);
        return;
      }
      
      // Show user-friendly error
      if (err.message.includes('vaqti tugadi')) {
        showAlert(
          'Server juda sekin javob beryapti. Internet tezligingizni tekshiring yoki keyinroq qayta urinib ko\'ring.',
          'Ulanish muammosi',
          'danger'
        );
      } else {
        showAlert(err.response?.data?.message || 'Ma\'lumotlarni yuklashda xatolik', 'Xatolik', 'danger');
      }
      
      // Set empty array on error
      if (!append) {
        setExpenses([]);
      }
    } finally {
      setLoadingExpenses(false);
      setLoadingMore(false);
    }
  }, [categoryFilter, dateFilter, showAlert]);

  // ⚡ OPTIMIZED: Parallel loading - expenses first (priority), then stats
  useEffect(() => {
    // Clear all cache when filters change
    const cacheKey = `expenses_stats_${categoryFilter}_${dateFilter}`;
    sessionStorage.removeItem(cacheKey);
    sessionStorage.removeItem(`${cacheKey}_time`);
    
    // Load expenses immediately (priority)
    fetchExpenses(1, false);
    
    // Load stats after a short delay (lazy loading)
    const statsTimer = setTimeout(() => {
      fetchStatistics();
    }, 100);
    
    return () => clearTimeout(statsTimer);
  }, [categoryFilter, dateFilter, fetchExpenses, fetchStatistics]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingExpenses) {
          fetchExpenses(page + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingExpenses, page, fetchExpenses]);

  const handleSubmit = async (submitData: any) => {
    try {
      if (editingExpense) {
        const res = await api.put(`/expenses/${editingExpense._id}`, submitData);
        console.log('✅ Update response:', res.data);
        showAlert('Xarajat yangilandi', 'Muvaffaqiyat', 'success');
      } else {
        const res = await api.post('/expenses', submitData);
        console.log('✅ Create response:', res.data);
        showAlert('Xarajat qo\'shildi', 'Muvaffaqiyat', 'success');
      }
      
      setShowModal(false);
      setEditingExpense(null);
      setFormData({
        category: 'kommunal',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      // Clear all stats cache to force refresh
      const cacheKey = `expenses_stats_${categoryFilter}_${dateFilter}`;
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(`${cacheKey}_time`);
      
      fetchStatistics();
      fetchExpenses(1, false);
    } catch (err: any) {
      console.error('❌ Submit error:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
      throw err; // Re-throw to let modal handle it
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      date: new Date(expense.date).toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xarajatni o\'chirmoqchimisiz?')) return;
    
    try {
      const res = await api.delete(`/expenses/${id}`);
      console.log('✅ Delete response:', res.data);
      showAlert('Xarajat o\'chirildi', 'Muvaffaqiyat', 'success');
      
      // Clear all stats cache to force refresh
      const cacheKey = `expenses_stats_${categoryFilter}_${dateFilter}`;
      sessionStorage.removeItem(cacheKey);
      sessionStorage.removeItem(`${cacheKey}_time`);
      
      fetchStatistics();
      fetchExpenses(1, false);
    } catch (err: any) {
      console.error('❌ Delete error:', err);
      showAlert(err.response?.data?.message || 'Xatolik yuz berdi', 'Xatolik', 'danger');
    }
  };

  // Enhanced search - category, amount, date bo'yicha ham qidirish
  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchQuery.toLowerCase();
    
    // Description bo'yicha
    if (expense.description.toLowerCase().includes(searchLower)) return true;
    
    // Category bo'yicha
    if (categoryLabels[expense.category].toLowerCase().includes(searchLower)) return true;
    
    // Amount bo'yicha
    if (expense.amount.toString().includes(searchQuery)) return true;
    
    // Date bo'yicha
    if (formatDate(expense.date).includes(searchQuery)) return true;
    
    // Created by bo'yicha
    if (expense.createdBy?.name?.toLowerCase().includes(searchLower)) return true;
    
    return false;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      <Header title="Xarajatlar" />
      
      {/* Main Content - Fully Responsive */}
      <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
        <div className="h-full max-w-[1920px] mx-auto">
          {/* Desktop: Side by side | Mobile: Stacked */}
          <div className="h-full flex flex-col lg:flex-row lg:gap-4 lg:p-4">
            
            {/* Left: Stats & Filters - Scrollable */}
            <div className="flex-1 overflow-y-auto px-3 py-3 lg:px-0 lg:py-0 space-y-3 lg:space-y-4">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {loadingStats ? (
                  // Skeleton for stats cards
                  <>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100 animate-pulse">
                        <div className="flex items-center justify-between mb-3 lg:mb-4">
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-200" />
                        </div>
                        <div className="h-6 lg:h-8 bg-slate-200 rounded w-3/4 mb-2" />
                        <div className="h-3 lg:h-4 bg-slate-200 rounded w-1/2" />
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-red-50 flex items-center justify-center">
                          <TrendingDown className="w-5 h-5 lg:w-6 lg:h-6 text-red-600" />
                        </div>
                      </div>
                      <h3 className="text-lg lg:text-2xl font-bold text-red-600 mb-1">
                        {formatNumber(stats?.total || 0)}
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-600 font-medium">Jami xarajat</p>
                    </div>

                    <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-orange-600" />
                        </div>
                      </div>
                      <h3 className="text-lg lg:text-2xl font-bold text-orange-600 mb-1">
                        {formatNumber(stats?.today || 0)}
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-600 font-medium">Bugun</p>
                    </div>

                    <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
                        </div>
                      </div>
                      <h3 className="text-lg lg:text-2xl font-bold text-blue-600 mb-1">
                        {formatNumber(stats?.week || 0)}
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-600 font-medium">Hafta</p>
                    </div>

                    <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                      <div className="flex items-center justify-between mb-3 lg:mb-4">
                        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                          <Calendar className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg lg:text-2xl font-bold text-purple-600 mb-1">
                        {formatNumber(stats?.month || 0)}
                      </h3>
                      <p className="text-xs lg:text-sm text-slate-600 font-medium">Oy</p>
                    </div>
                  </>
                )}
              </div>

              {/* Category Stats */}
              {stats?.byCategory && stats.byCategory.length > 0 && (
                <div className="bg-white rounded-xl lg:rounded-2xl p-4 lg:p-6 shadow-sm border border-slate-100">
                  <h3 className="text-base lg:text-lg font-bold text-slate-900 mb-3 lg:mb-4">Kategoriya bo'yicha</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 lg:gap-4">
                    {stats.byCategory.map(cat => (
                      <div key={cat._id} className="text-center">
                        <div className={`w-full h-2 rounded-full bg-gradient-to-r ${categoryColors[cat._id]} mb-2`} />
                        <p className="text-xs lg:text-sm font-semibold text-slate-900 mb-1">
                          {formatNumber(cat.total)} so'm
                        </p>
                        <p className="text-xs text-slate-500">{categoryLabels[cat._id]}</p>
                        <p className="text-xs text-slate-400">{cat.count} ta</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters and Actions */}
              <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-2 lg:gap-3">
                  {/* Category Filter */}
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-3 lg:px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs lg:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Barcha kategoriya</option>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>

                  {/* Date Filter */}
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 lg:px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs lg:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Barcha vaqt</option>
                    <option value="today">Bugun</option>
                    <option value="week">Hafta</option>
                    <option value="month">Oy</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setEditingExpense(null);
                    setFormData({
                      category: 'kommunal',
                      amount: '',
                      description: '',
                      date: new Date().toISOString().split('T')[0]
                    });
                    setShowModal(true);
                  }}
                  className="px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all text-xs lg:text-sm"
                >
                  <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                  <span className="hidden sm:inline">Xarajat qo'shish</span>
                  <span className="sm:hidden">Qo'shish</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Izlash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 lg:pl-12 pr-3 lg:pr-4 py-2.5 lg:py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
                />
              </div>

              {/* Expenses List */}
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loadingExpenses ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700">Sana</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700">Kategoriya</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700 hidden sm:table-cell">Tavsif</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-right text-xs lg:text-sm font-semibold text-slate-700">Summa</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700 hidden md:table-cell">Kim qo'shdi</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs lg:text-sm font-semibold text-slate-700">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                          <ExpenseRowSkeleton key={i} />
                        ))}
                      </tbody>
                    </table>
                    <div className="p-4 text-center">
                      <p className="text-slate-500 text-sm">Ma'lumotlar yuklanmoqda...</p>
                      <p className="text-slate-400 text-xs mt-1">Agar uzoq vaqt davom etsa, internet tezligingizni tekshiring</p>
                    </div>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="p-8 lg:p-12 text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                      <DollarSign className="w-8 h-8 lg:w-10 lg:h-10 text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-semibold text-base lg:text-lg mb-2">Xarajatlar topilmadi</p>
                    <p className="text-slate-500 text-xs lg:text-sm mb-4 lg:mb-6">
                      {searchQuery ? 'Qidiruv bo\'yicha natija topilmadi' : 'Hali xarajat qo\'shilmagan'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => {
                          setEditingExpense(null);
                          setFormData({
                            category: 'kommunal',
                            amount: '',
                            description: '',
                            date: new Date().toISOString().split('T')[0]
                          });
                          setShowModal(true);
                        }}
                        className="px-4 lg:px-6 py-2 lg:py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold inline-flex items-center gap-2 hover:shadow-lg transition-all text-sm lg:text-base"
                      >
                        <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
                        Birinchi xarajatni qo'shish
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700">Sana</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700">Kategoriya</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700 hidden sm:table-cell">Tavsif</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-right text-xs lg:text-sm font-semibold text-slate-700">Summa</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-left text-xs lg:text-sm font-semibold text-slate-700 hidden md:table-cell">Kim qo'shdi</th>
                          <th className="px-3 lg:px-6 py-3 lg:py-4 text-center text-xs lg:text-sm font-semibold text-slate-700">Amallar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredExpenses.map((expense) => (
                          <tr key={expense._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-600">
                              {formatDate(expense.date)}
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <span className={`inline-flex px-2 lg:px-3 py-1 rounded-lg text-xs font-semibold bg-gradient-to-r ${categoryColors[expense.category]} text-white`}>
                                {categoryLabels[expense.category]}
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-900 font-medium hidden sm:table-cell">
                              {expense.description}
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-right">
                              <span className="text-xs lg:text-sm font-bold text-red-600">
                                {formatNumber(expense.amount)} so'm
                              </span>
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs lg:text-sm text-slate-600 hidden md:table-cell">
                              {expense.createdBy?.name || 'N/A'}
                            </td>
                            <td className="px-3 lg:px-6 py-3 lg:py-4">
                              <div className="flex items-center justify-center gap-1 lg:gap-2">
                                <button
                                  onClick={() => handleEdit(expense)}
                                  className="p-1.5 lg:p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(expense._id)}
                                  className="p-1.5 lg:p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        
                        {/* Loading more skeleton */}
                        {loadingMore && (
                          <>
                            {[1, 2, 3].map(i => (
                              <ExpenseRowSkeleton key={`loading-${i}`} />
                            ))}
                          </>
                        )}
                      </tbody>
                    </table>
                    
                    {/* Infinite scroll trigger */}
                    {hasMore && !loadingMore && (
                      <div ref={loadMoreRef} className="h-16 lg:h-20 flex items-center justify-center">
                        <p className="text-slate-400 text-xs lg:text-sm">Yana yuklash uchun scroll qiling...</p>
                      </div>
                    )}
                    
                    {!hasMore && filteredExpenses.length > 0 && (
                      <div className="p-3 lg:p-4 text-center">
                        <p className="text-slate-400 text-xs lg:text-sm">Barcha xarajatlar yuklandi</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <ExpenseModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        editingExpense={editingExpense}
        initialData={formData}
      />
    </div>
  );
}
