import { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign, Filter } from 'lucide-react';
import api from '../utils/api';
import { formatNumber } from '../utils/format';
import { useModalScrollLock } from '../hooks/useModalScrollLock';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  createdAt: string;
}

interface FinanceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDateFilter?: 'today' | 'week' | 'month' | 'all';
  title?: string;
  showOnlyIncome?: boolean;
}

export function FinanceHistoryModal({ 
  isOpen, 
  onClose,
  initialDateFilter = 'all',
  title = 'Moliyaviy Tarix',
  showOnlyIncome = false
}: FinanceHistoryModalProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>(showOnlyIncome ? 'income' : 'all');
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
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
      } else {
        // all - last 3 months
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        setStartDate(threeMonthsAgo);
        setEndDate(today);
      }
    }
  }, [isOpen, initialDateFilter]);

  useEffect(() => {
    if (isOpen) {
      fetchTransactions();
    }
  }, [isOpen, startDate, endDate]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Parallel ravishda receipts va expenses ni olish
      const [receiptsRes, expensesRes] = await Promise.all([
        api.get('/receipts', {
          params: {
            limit: 1000,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            endDate: endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined
          }
        }),
        api.get('/expenses', {
          params: {
            limit: 1000,
            startDate: startDate ? new Date(startDate).toISOString() : undefined,
            endDate: endDate ? new Date(new Date(endDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : undefined
          }
        })
      ]);

      console.log('📊 Receipts API response:', receiptsRes.data);
      console.log('📊 Expenses API response:', expensesRes.data);

      // Handle receipts response format
      let receiptsData = [];
      
      if (receiptsRes.data && receiptsRes.data.success && receiptsRes.data.data) {
        if (Array.isArray(receiptsRes.data.data.data)) {
          receiptsData = receiptsRes.data.data.data;
        } else if (Array.isArray(receiptsRes.data.data)) {
          receiptsData = receiptsRes.data.data;
        }
      } else if (Array.isArray(receiptsRes.data)) {
        receiptsData = receiptsRes.data;
      }

      // Handle expenses response format
      let expensesData = [];
      
      if (expensesRes.data && expensesRes.data.success && expensesRes.data.expenses) {
        expensesData = expensesRes.data.expenses;
      } else if (Array.isArray(expensesRes.data)) {
        expensesData = expensesRes.data;
      }

      console.log('📊 Parsed receipts data:', receiptsData.length, 'items');
      console.log('📊 Parsed expenses data:', expensesData.length, 'items');

      // Receipts ni transactions formatiga o'tkazish (Kirim)
      const incomeTransactions: Transaction[] = receiptsData.map((receipt: any) => ({
        _id: receipt._id,
        type: 'income' as const,
        amount: receipt.total || 0,
        description: `Chek #${receipt.receiptNumber || receipt._id.slice(-6)}`,
        category: 'Savdo',
        date: receipt.createdAt,
        createdAt: receipt.createdAt
      }));

      // Expenses ni transactions formatiga o'tkazish (Chiqim)
      const expenseTransactions: Transaction[] = expensesData.map((expense: any) => ({
        _id: expense._id,
        type: 'expense' as const,
        amount: expense.amount || 0,
        description: expense.note || 'Xarajat',
        category: getCategoryName(expense.category),
        date: expense.date || expense.createdAt,
        createdAt: expense.createdAt
      }));

      // Barcha tranzaksiyalarni birlashtirish va sanaga ko'ra saralash
      const allTransactions = [...incomeTransactions, ...expenseTransactions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      console.log('📊 Total transactions:', allTransactions.length, 'items');

      setTransactions(allTransactions);
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Kategoriya nomlarini o'zbek tiliga o'girish
  const getCategoryName = (category: string): string => {
    const categoryNames: Record<string, string> = {
      'komunal': 'Komunal',
      'soliqlar': 'Soliqlar',
      'ovqatlanish': 'Ovqatlanish',
      'dostavka': 'Dostavka',
      'tovar_xarid': 'Tovar xaridi',
      'shaxsiy': 'Shaxsiy',
      'maosh': 'Maosh'
    };
    return categoryNames[category] || category;
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    return true;
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;

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
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
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

        {/* Summary Cards */}
        <div className="p-3 sm:p-6 bg-gradient-to-br from-slate-50 to-purple-50/30 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {/* Total Income */}
            <div className="bg-white rounded-xl p-2 sm:p-4 border-2 border-green-200">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-600">Kirim</p>
              </div>
              <p className="text-sm sm:text-2xl font-bold text-green-600">
                {formatNumber(totalIncome)}
              </p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">so'm</p>
            </div>

            {/* Total Expense */}
            <div className="bg-white rounded-xl p-2 sm:p-4 border-2 border-red-200">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
                </div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-600">Chiqim</p>
              </div>
              <p className="text-sm sm:text-2xl font-bold text-red-600">
                {formatNumber(totalExpense)}
              </p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">so'm</p>
            </div>

            {/* Net Profit */}
            <div className={`bg-white rounded-xl p-2 sm:p-4 border-2 ${netProfit >= 0 ? 'border-blue-200' : 'border-orange-200'}`}>
              <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                  <DollarSign className={`w-3 h-3 sm:w-4 sm:h-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                </div>
                <p className="text-[10px] sm:text-xs font-semibold text-slate-600">Sof foyda</p>
              </div>
              <p className={`text-sm sm:text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatNumber(Math.abs(netProfit))}
              </p>
              <p className="text-[9px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1">so'm</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200">
          <div className="flex flex-col gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
              <div className="flex gap-1 flex-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    filter === 'all' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Barchasi
                </button>
                <button
                  onClick={() => setFilter('income')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    filter === 'income' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Kirim
                </button>
                <button
                  onClick={() => setFilter('expense')}
                  className={`flex-1 sm:flex-initial px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                    filter === 'expense' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Chiqim
                </button>
              </div>
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
                    className="w-full px-2 py-1.5 rounded-lg text-xs sm:text-sm border-2 border-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Gacha</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg text-xs sm:text-sm border-2 border-slate-200 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="flex-1 overflow-y-auto scroll-smooth-instagram momentum-scroll p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-semibold">Ma'lumot topilmadi</p>
              <p className="text-slate-500 text-sm mt-1">Tanlangan filtr bo'yicha tranzaksiyalar yo'q</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div 
                  key={transaction._id}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                    transaction.type === 'income' 
                      ? 'bg-green-50/50 border-green-200 hover:border-green-300' 
                      : 'bg-red-50/50 border-red-200 hover:border-red-300'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    transaction.type === 'income' 
                      ? 'bg-green-100' 
                      : 'bg-red-100'
                  }`}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        transaction.type === 'income' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {transaction.category}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(transaction.date).toLocaleDateString('uz-UZ', {
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
                    <p className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatNumber(transaction.amount)}
                    </p>
                    <p className="text-xs text-slate-500">so'm</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
