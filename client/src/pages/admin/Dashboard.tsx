import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Package, BarChart3, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { extractArrayFromResponse } from '../../utils/arrayHelpers';
import { useAlert } from '../../hooks/useAlert';
import { FinanceHistoryModal } from '../../components/FinanceHistoryModal';
import { ExpensesHistoryModal } from '../../components/ExpensesHistoryModal';
import { StatCard, LoadingSpinner, EmptyState, UniversalPageHeader } from '../../components/common';

export default function Dashboard() {
  const { showAlert, AlertComponent } = useAlert();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    dateFilter: 'today' | 'week' | 'month' | 'all';
    title: string;
    showOnlyIncome?: boolean;
  }>({
    dateFilter: 'all',
    title: 'Moliyaviy Tarix',
    showOnlyIncome: false
  });
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todaySales: 0,
    weekSales: 0,
    monthSales: 0,
    totalReceipts: 0,
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    peakHour: '',
    todayExpenses: 0
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PERFORMANCE YAXSHILANDI - Parallel API chaqiruvlar va error handling
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        // Bugungi sana uchun filter
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        
        // Parallel API chaqiruvlar - tezroq yuklash
        const [statsRes, topProductsRes, expensesRes] = await Promise.all([
          api.get('/stats'),
          api.get('/stats/top-products'),
          api.get('/expenses', {
            params: {
              startDate: startOfDay,
              endDate: endOfDay,
              limit: 1000
            }
          })
        ]);
        
        if (!isMounted) return;
        
        // Bugungi xarajatlarni hisoblash
        let todayExpenses = 0;
        if (expensesRes.data.success && expensesRes.data.expenses) {
          todayExpenses = expensesRes.data.expenses.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0);
        }
        
        setStats({
          ...statsRes.data,
          todayExpenses
        });
        
        // Safe array operations
        const topProductsData = extractArrayFromResponse(topProductsRes);
        const top3 = topProductsData.slice(0, 3);
        setTopProducts(top3);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Error fetching dashboard data:', err);
        
        // Rate limiting xatosini ignore qilish
        if (err.message && !err.message.includes('so\'rov')) {
          showAlert('Ma\'lumotlarni yuklashda xatolik', 'Xatolik', 'danger');
        }
        setTopProducts([]);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAllData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      <UniversalPageHeader 
        title={t('dashboard.title')}
        onMenuToggle={onMenuToggle}
      />
      
      {/* Main Container - FULL SCREEN */}
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 h-full w-full">

        {loading ? (
          <LoadingSpinner size="lg" text="Yuklanmoqda..." />
        ) : (
          <>
            {/* Statistics Cards - Universal StatCard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                <StatCard
                  title="Umumiy daromad"
                  value={`${formatNumber(stats.totalRevenue || 0)} UZS`}
                  icon={DollarSign}
                  color="green"
                  onClick={() => {
                    setModalConfig({ dateFilter: 'all', title: 'Umumiy Daromad', showOnlyIncome: false });
                    setShowFinanceModal(true);
                  }}
                />
                <StatCard
                  title="Bugungi savdo"
                  value={`${formatNumber(stats.todaySales || 0)} UZS`}
                  icon={TrendingUp}
                  color="blue"
                  onClick={() => {
                    setModalConfig({ dateFilter: 'today', title: 'Bugungi Savdo', showOnlyIncome: true });
                    setShowFinanceModal(true);
                  }}
                />
                <StatCard
                  title="Saqlangan mahsulotlar"
                  value={(stats.totalProducts || 0).toString()}
                  icon={Package}
                  color="purple"
                  onClick={() => {
                    navigate('/admin/products');
                  }}
                />
                <StatCard
                  title="Bugungi xarajatlar"
                  value={`${formatNumber(stats.todayExpenses || 0)} UZS`}
                  icon={TrendingDown}
                  color="red"
                  onClick={() => {
                    setShowExpensesModal(true);
                  }}
                />
            </div>

            {/* Top Products Section - Full Width */}
            <div className="w-full px-4 sm:px-6 md:px-8 py-4">
          <div className="w-full">
            {/* Top Products - Modern Card Design */}
            <div className="relative group animate-slide-up" style={{ animationDelay: '400ms' }}>
              <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl border border-slate-200/50 hover:shadow-2xl transition-all duration-500 overflow-hidden">
                
                {/* Subtle Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-pink-50/40 opacity-60" />
                
                {/* Header - Clean & Modern */}
                <div className="relative z-10 mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500 rounded-2xl blur-lg opacity-30" />
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                        <Package className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Top mahsulotlar</h3>
                      <p className="text-sm sm:text-base text-slate-500 font-medium">Eng ko'p sotilganlar</p>
                    </div>
                  </div>
                </div>
                
                {/* Content - Enhanced Design */}
                <div className="relative z-10">
                  {topProducts.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {topProducts.map((product, index) => (
                        <div 
                          key={product._id}
                          className="group/item flex items-center gap-3 sm:gap-4 p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-white rounded-xl sm:rounded-2xl border border-slate-200 hover:border-purple-200 hover:shadow-lg transition-all duration-300 cursor-pointer"
                        >
                          {/* Rank Badge - Enhanced */}
                          <div className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-lg transition-transform group-hover/item:scale-110 ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                            index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' :
                            'bg-gradient-to-br from-orange-300 to-orange-400 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {/* Product Info - Enhanced */}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 text-sm sm:text-base truncate mb-1">{product._id}</p>
                            <p className="text-xs sm:text-sm text-slate-500 font-medium">{product.totalSold} ta sotildi</p>
                          </div>
                          
                          {/* Revenue - Enhanced */}
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-purple-600 text-base sm:text-lg">{formatNumber(product.revenue)}</p>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-semibold">so'm</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Package}
                      title="Ma'lumot yo'q"
                      description="Hali sotuvlar amalga oshirilmagan"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
          </>
        )}
      </div>

      {/* Finance History Modal */}
      <FinanceHistoryModal
        isOpen={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        initialDateFilter={modalConfig.dateFilter}
        title={modalConfig.title}
        showOnlyIncome={modalConfig.showOnlyIncome}
      />

      {/* Expenses History Modal */}
      <ExpensesHistoryModal
        isOpen={showExpensesModal}
        onClose={() => setShowExpensesModal(false)}
        initialDateFilter="today"
        title="Bugungi Xarajatlar"
      />
    </div>
  );
}
