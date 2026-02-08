import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useLanguage } from '../../context/LanguageContext';
import { 
  DollarSign, TrendingUp, ShoppingCart, RefreshCw, ArrowUpRight, ArrowDownRight, Activity, Package, Clock
} from 'lucide-react';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';
import { extractArrayFromResponse } from '../../utils/arrayHelpers';
import { useAlert } from '../../hooks/useAlert';
import { FinanceHistoryModal } from '../../components/FinanceHistoryModal';

export default function Dashboard() {
  const { showAlert, AlertComponent } = useAlert();
  const { t } = useLanguage();
  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    dateFilter: 'today' | 'week' | 'month' | 'all';
    title: string;
  }>({
    dateFilter: 'all',
    title: 'Moliyaviy Tarix'
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
    peakHour: ''
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PERFORMANCE YAXSHILANDI - Parallel API chaqiruvlar va error handling
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        // Parallel API chaqiruvlar - tezroq yuklash
        const [statsRes, topProductsRes] = await Promise.all([
          api.get('/stats'),
          api.get('/stats/top-products')
        ]);
        
        setStats(statsRes.data);
        // Safe array operations
        const topProductsData = extractArrayFromResponse(topProductsRes);
        const top3 = topProductsData.slice(0, 3);
        setTopProducts(top3);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        showAlert('Ma\'lumotlarni yuklashda xatolik', 'Xatolik', 'danger');
        setTopProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Refresh button uchun fetchStats function
  const fetchStats = async () => {
    try {
      setLoading(true);
      // Parallel API chaqiruvlar - tezroq yuklash
      const [statsRes, topProductsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/stats/top-products')
      ]);
      
      setStats(statsRes.data);
      // Safe array operations
      const topProductsData = extractArrayFromResponse(topProductsRes);
      const top3 = topProductsData.slice(0, 3);
      setTopProducts(top3);
      
      showAlert('Ma\'lumotlar yangilandi', 'Muvaffaqiyat', 'success');
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
      showAlert('Ma\'lumotlarni yangilashda xatolik', 'Xatolik', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const mainStats = [
    { 
      icon: DollarSign, 
      label: 'Umumiy daromad', 
      value: formatNumber(stats.totalRevenue || 0), 
      suffix: "UZS", 
      borderColor: 'from-emerald-400 to-emerald-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-600',
      trend: '+12.5%',
      trendUp: true,
      modalConfig: { dateFilter: 'all' as const, title: 'Umumiy Daromad' }
    },
    { 
      icon: TrendingUp, 
      label: 'Bugungi savdo', 
      value: formatNumber(stats.todaySales || 0), 
      suffix: "UZS", 
      borderColor: 'from-blue-400 to-blue-500',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      valueColor: 'text-blue-600',
      trend: '+8.2%',
      trendUp: true,
      modalConfig: { dateFilter: 'today' as const, title: 'Bugungi Savdo' }
    },
    { 
      icon: ShoppingCart, 
      label: 'Saqlangan mahsulotlar', 
      value: (stats.totalProducts || 0).toString(), 
      borderColor: 'from-purple-400 to-purple-500',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      valueColor: 'text-purple-600',
      trend: '',
      trendUp: true,
      modalConfig: { dateFilter: 'all' as const, title: 'Barcha Mahsulotlar' }
    },
    { 
      icon: Activity, 
      label: "Eng yuqori soat", 
      value: stats.peakHour || '-', 
      borderColor: 'from-orange-400 to-orange-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      valueColor: 'text-orange-600',
      trend: '',
      trendUp: true,
      modalConfig: { dateFilter: 'today' as const, title: 'Bugungi Savdo' }
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      {AlertComponent}
      <Header title={t('dashboard.title')} />
      
      {/* Main Container - FULL SCREEN */}
      <div className="p-1 sm:p-2 space-y-2 sm:space-y-3 h-full w-full">
        
        {/* Page Header - FULL WIDTH */}
        <div className="px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 bg-clip-text text-transparent leading-tight">
              {t('dashboard.overview')}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">{t('dashboard.description')}</p>
          </div>
          
          {/* Controls - Better Mobile Spacing */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Refresh Button - Larger Touch Target */}
            <button 
              onClick={fetchStats} 
              className="p-2.5 sm:p-3 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              title={t('dashboard.refresh')}
            >
              <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          /* Loading Skeletons - Pro Design */
          <div className="px-4 sm:px-6 md:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {[1,2,3,4].map(i => (
              <div key={i} className="relative bg-white rounded-2xl p-6 shadow-sm overflow-hidden border border-slate-100">
                <div className="animate-pulse space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl" />
                    <div className="w-16 h-6 bg-slate-100 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-9 bg-slate-100 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
            ))}
          </div>
          </div>
        ) : (
          <div>
            {/* Statistics Cards - Pro Design */}
            <div className="px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {mainStats.map((stat, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    setModalConfig(stat.modalConfig);
                    setShowFinanceModal(true);
                  }}
                  className="group relative animate-slide-up cursor-pointer"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Pro Card Design */}
                  <div className="relative bg-white rounded-2xl p-3 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 overflow-hidden border border-slate-100">
                    {/* Top Gradient Border */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.borderColor}`} />
                    
                    {/* Icon Container */}
                    <div className="flex items-start justify-between mb-3 sm:mb-6">
                      <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center ${stat.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                        <stat.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${stat.iconColor}`} />
                      </div>
                      
                      {/* Trend Badge */}
                      {stat.trend && (
                        <div className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold ${
                          stat.trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {stat.trendUp ? <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                          <span>{stat.trend}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Value Section */}
                    <div className="space-y-1 sm:space-y-2">
                      {/* Main Value */}
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <h3 className={`text-lg sm:text-2xl font-bold ${stat.valueColor} leading-none tracking-tight`}>
                          {stat.value}
                        </h3>
                        {stat.suffix && (
                          <span className="text-[9px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wide">{stat.suffix}</span>
                        )}
                      </div>
                      
                      {/* Label */}
                      <p className="text-[11px] sm:text-sm text-slate-600 font-medium">
                        {stat.label}
                      </p>
                    </div>

                    {/* Subtle Background Decoration */}
                    <div className={`absolute -right-6 -bottom-6 w-24 h-24 ${stat.iconBg} rounded-full opacity-20 group-hover:scale-150 transition-transform duration-500`} />
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Top Products Section - Full Width */}
        <div className="px-4 sm:px-6 md:px-8">
          <div className="max-w-2xl mx-auto">
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
                    <div className="flex flex-col items-center justify-center h-56 sm:h-64">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-slate-200 rounded-3xl blur-2xl opacity-40" />
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center shadow-lg">
                          <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                        </div>
                      </div>
                      <p className="font-bold text-slate-700 text-lg mb-2">Ma'lumot yo'q</p>
                      <p className="text-slate-500 text-sm text-center max-w-xs">Hali sotuvlar amalga oshirilmagan</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Finance History Modal */}
      <FinanceHistoryModal
        isOpen={showFinanceModal}
        onClose={() => setShowFinanceModal(false)}
        initialDateFilter={modalConfig.dateFilter}
        title={modalConfig.title}
      />
    </div>
  );
}
