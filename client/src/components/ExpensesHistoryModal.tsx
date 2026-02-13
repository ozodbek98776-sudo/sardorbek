import { useState, useEffect } from 'react';
import { X, TrendingDown, Calendar, Filter } from 'lucide-react';
import api from '../utils/api';
import { formatNumber } from '../utils/format';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface Expense {
  _id: string;
  category: string;
  amount: number;
  note?: string;
  date: string;
  type?: string;
  source: string;
  created_by?: {
    name: string;
  };
  createdAt: string;
}

interface ExpensesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateFilter?: 'today' | 'week' | 'month' | 'all';
  title?: string;
}

export function ExpensesHistoryModal({ 
  isOpen, 
  onClose,
  initialDateFilter = 'today',
  title = 'Xarajatlar Tarixi'
}: ExpensesHistoryModalProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('');
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
  });

  // Modal scroll lock
  useModalScrollLock(isOpen);

  // Initialize date range based on initialDateFilter
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      
      if (initialDateFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().split('T')[0];
        setStartDate(today);
        setEndDate(today);
      } else if (initialDateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        setStartDate(weekAgo);
        setEndDate(today);
      } else if (initialDateFilter === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        setStartDate(monthStart);
        setEndDate(monthEnd);
      }
    }
  }, [isOpen, initialDateFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchExpenses();
    }
  }, [isOpen, startDate, endDate, category]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 1000
      };

      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString();
      if (category) params.category = category;

      const response = await api.get('/expenses', { params });

      if (response.data.success && response.data.expenses) {
        setExpenses(response.data.expenses);
      }
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  // Kategoriya nomlarini o'zbek tiliga o'girish
  const getCategoryName = (cat: string): string => {
    const categoryNames: Record<string, string> = {
      'komunal': 'Komunal',
      'soliqlar': 'Soliqlar',
      'ovqatlanish': 'Ovqatlanish',
      'dostavka': 'Dostavka',
      'tovar_xarid': 'Tovar xaridi',
      'shaxsiy': 'Shaxsiy',
      'maosh': 'Maosh'
    };
    return categoryNames[cat] || cat;
  };

  // Kategoriya ranglari
  const getCategoryColor = (cat: string): string => {
    const colors: Record<string, string> = {
      'komunal': 'blue',
      'soliqlar': 'red',
      'ovqatlanish': 'green',
      'dostavka': 'yellow',
      'tovar_xarid': 'purple',
      'shaxsiy': 'pink',
      'maosh': 'indigo'
    };
    return colors[cat] || 'gray';
  };

  // Calculate total
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (!isOpen) return null;

  return (
    <div 
      data-modal="true"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 animate-fadeIn"
      style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-slideUp"
        style={{ marginBottom: '80px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h3 className="text-base sm:text-xl font-bold">{title}</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-white/20 rounded-xl transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Summary Card */}
        <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-50 to-red-50/30 border-b border-slate-200">
          <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-red-200">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">Jami xarajat</p>
                <p className="text-xl sm:text-3xl font-bold text-red-600">
                  {formatNumber(totalExpenses)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-500 mt-2">
              <span>{expenses.length} ta xarajat</span>
              <span className="font-semibold">so'm</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200">
          <div className="flex flex-col gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border-2 border-slate-200 focus:border-red-500 focus:outline-none"
              >
                <option value="">Barcha kategoriyalar</option>
                <option value="komunal">Komunal</option>
                <option value="soliqlar">Soliqlar</option>
                <option value="ovqatlanish">Ovqatlanish</option>
                <option value="dostavka">Dostavka</option>
                <option value="tovar_xarid">Tovar xaridi</option>
                <option value="shaxsiy">Shaxsiy</option>
                <option value="maosh">Maosh</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
              <div className="flex gap-2 flex-1 items-center">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Dan</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs sm:text-sm border-2 border-slate-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Gacha</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs sm:text-sm border-2 border-slate-200 focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold">Ma'lumot topilmadi</p>
              <p className="text-slate-500 text-sm mt-1">Tanlangan filtr bo'yicha xarajatlar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => {
                const color = getCategoryColor(expense.category);
                return (
                  <div 
                    key={expense._id}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md bg-red-50/50 border-red-200 hover:border-red-300`}
                  >
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-red-100`}>
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{expense.note || 'Xarajat'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold bg-${color}-100 text-${color}-700`}>
                          {getCategoryName(expense.category)}
                        </span>
                        {expense.type && (
                          <span className="text-xs text-slate-500">• {expense.type}</span>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(expense.date).toLocaleDateString('uz-UZ', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">
                        -{formatNumber(expense.amount)}
                      </p>
                      <p className="text-xs text-slate-500">so'm</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
