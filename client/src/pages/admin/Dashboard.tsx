import { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useLanguage } from '../../context/LanguageContext';
import { 
  DollarSign, TrendingUp, ShoppingCart, Clock, RefreshCw, ArrowUpRight, ArrowDownRight, BarChart3, Activity, Package, Users, Zap
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Line, LineChart, Legend } from 'recharts';
import api from '../../utils/api';
import { formatNumber } from '../../utils/format';

export default function Dashboard() {
  const [period, setPeriod] = useState<'today' | 'week'>('today');
  const { t } = useLanguage();
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
  const [chartData, setChartData] = useState<{name: string; sales: number}[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchTopProducts();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [period]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopProducts = async () => {
    try {
      // Eng ko'p sotilgan 3 ta mahsulotni olish
      const res = await api.get('/stats/top-products');
      // Faqat birinchi 3 tasini olish
      const top3 = res.data.slice(0, 3);
      setTopProducts(top3);
    } catch (err) {
      console.error('Error fetching top products:', err);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await api.get(`/stats/chart?period=${period}`);
      setChartData(res.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
    }
  };

  const mainStats = [
    { 
      icon: DollarSign, 
      label: 'Umumiy daromad', 
      value: formatNumber(stats.totalRevenue || 0), 
      suffix: "UZS", 
      color: 'from-emerald-500 to-emerald-600',
      accentColor: 'bg-emerald-500',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      textColor: 'text-emerald-600',
      trend: '+12.5%',
      trendUp: true
    },
    { 
      icon: TrendingUp, 
      label: period === 'today' ? 'Bugungi savdo' : 'Haftalik savdo', 
      value: formatNumber(period === 'today' ? (stats.todaySales || 0) : (stats.weekSales || 0)), 
      suffix: "UZS", 
      color: 'from-blue-500 to-blue-600',
      accentColor: 'bg-blue-500',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-600',
      trend: '+8.2%',
      trendUp: true
    },
    { 
      icon: ShoppingCart, 
      label: 'Jami buyurtmalar', 
      value: (stats.totalReceipts || 0).toString(), 
      color: 'from-purple-500 to-purple-600',
      accentColor: 'bg-purple-500',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-600',
      trend: '+15.3%',
      trendUp: true
    },
    { 
      icon: Activity, 
      label: "Eng yuqori soat", 
      value: stats.peakHour || '-', 
      color: 'from-orange-500 to-orange-600',
      accentColor: 'bg-orange-500',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      textColor: 'text-orange-600',
      trend: '',
      trendUp: true
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-100/30 to-slate-100">
      <Header title={t('dashboard.title')} />
      
      {/* Main Container - Full Width, No Padding */}
      <div className="py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6 pb-24 lg:pb-8">
        
        {/* Page Header - Full Width */}
        <div className="px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-fade-in">
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 bg-clip-text text-transparent leading-tight">
              {t('dashboard.overview')}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">{t('dashboard.description')}</p>
          </div>
          
          {/* Controls - Better Mobile Spacing */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Period Selector - Glass Morphism */}
            <div className="flex p-1 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/20">
              <button 
                onClick={() => setPeriod('today')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                  period === 'today' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                }`}
              >
                {t('dashboard.today')}
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                  period === 'week' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
                }`}
              >
                {t('dashboard.thisWeek')}
              </button>
            </div>
            
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
          /* Loading Skeletons - Full Width */
          <div className="px-4 sm:px-6 md:px-8">
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {[1,2,3,4].map(i => (
              <div key={i} className="relative bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-xl border border-slate-200/50 overflow-hidden min-h-[140px] sm:min-h-[160px] md:min-h-[180px]">
                <div className="animate-pulse space-y-2 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg sm:rounded-xl" />
                    <div className="w-10 sm:w-12 h-4 sm:h-5 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="h-6 sm:h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg w-3/4" />
                    <div className="h-3 sm:h-4 bg-gradient-to-br from-slate-200 to-slate-300 rounded w-1/2" />
                  </div>
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            ))}
          </div>
          </div>
        ) : (
          <div>
            {/* Statistics Cards - Full Width */}
            <div className="px-4 sm:px-6 md:px-8">
              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
              {mainStats.map((stat, i) => (
                <div 
                  key={i} 
                  className="group relative animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Clean Card Design - Compact Height - Mobile Optimized */}
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden min-h-[140px] sm:min-h-[160px] md:min-h-[180px] flex flex-col border border-slate-200/50">
                    
                    {/* Top Colored Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-0.5 sm:h-1 ${stat.accentColor}`} />
                    
                    {/* Header Row - Icon and Trend - Mobile Optimized */}
                    <div className="flex items-start justify-between mb-auto">
                      {/* Icon - Smaller on Mobile */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl md:rounded-2xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 ${stat.iconColor}`} />
                      </div>
                      
                      {/* Trend Badge - Smaller on Mobile */}
                      {stat.trend && (
                        <div className={`flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] md:text-xs font-bold ${
                          stat.trendUp 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {stat.trendUp ? <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          <span>{stat.trend}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Value & Label - Bottom Aligned - Mobile Optimized */}
                    <div className="mt-auto space-y-0.5 sm:space-y-1">
                      {/* Large Value - Responsive */}
                      <div className="flex items-baseline gap-0.5 sm:gap-1 flex-wrap">
                        <h3 className={`text-base sm:text-xl md:text-2xl lg:text-3xl font-bold ${stat.textColor} leading-none tracking-tight`}>
                          {stat.value}
                        </h3>
                        {stat.suffix && (
                          <span className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-slate-400 uppercase">
                            {stat.suffix}
                          </span>
                        )}
                      </div>
                      
                      {/* Label - Smaller on Mobile */}
                      <p className="text-[9px] sm:text-[10px] md:text-xs font-medium text-slate-600 leading-tight line-clamp-2">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {/* Charts Section - Full Width */}
        <div className="px-4 sm:px-6 md:px-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          
          {/* Revenue Chart - Modern Card Design */}
          <div className="xl:col-span-2 relative group animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-5 sm:p-6 md:p-8 shadow-xl border border-slate-200/50 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              
              {/* Subtle Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-slate-50/40 opacity-60" />
              
              {/* Header - Clean & Modern */}
              <div className="relative z-10 mb-6 sm:mb-8">
                {/* Icon & Title Row */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-lg opacity-30" />
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">
                      {period === 'today' ? 'Bugungi daromad' : 'Haftalik daromad'}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-500 font-medium">
                      {period === 'today' ? 'Soatlik taqsimot' : 'Kunlik ko\'rsatkichlar'}
                    </p>
                  </div>
                </div>
                
                {/* Legend Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-blue-700">Savdo</span>
                </div>
              </div>
              
              {/* Chart Container - Enhanced */}
              <div className="relative z-10 h-64 sm:h-72 md:h-80 rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50/50 to-white/50 p-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                          <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#e2e8f0" 
                        vertical={false}
                        strokeOpacity={0.5}
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 2 }}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        dx={-5}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.2)',
                          padding: '12px 16px',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ 
                          color: '#0f172a', 
                          fontWeight: 700, 
                          marginBottom: '6px', 
                          fontSize: '13px'
                        }}
                        itemStyle={{
                          color: '#3b82f6',
                          fontWeight: 600,
                          fontSize: '14px'
                        }}
                        formatter={(value: number) => [`${formatNumber(value)} so'm`, 'Daromad']}
                        cursor={{ 
                          stroke: '#3b82f6', 
                          strokeWidth: 2, 
                          strokeDasharray: '5 5',
                          strokeOpacity: 0.5
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={3} 
                        fill="url(#colorSales)"
                        dot={{ 
                          fill: '#3b82f6', 
                          strokeWidth: 2, 
                          stroke: '#fff',
                          r: 4
                        }}
                        activeDot={{ 
                          r: 6, 
                          fill: '#3b82f6',
                          stroke: '#fff',
                          strokeWidth: 3,
                          filter: 'drop-shadow(0 4px 6px rgba(59, 130, 246, 0.4))'
                        }}
                        animationDuration={1200}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-slate-200 rounded-3xl blur-2xl opacity-40" />
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-slate-700 text-lg mb-2">Ma'lumot mavjud emas</p>
                    <p className="text-slate-500 text-sm text-center max-w-xs">Analitikani ko'rish uchun savdo qilishni boshlang</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Products - Modern Card Design */}
          <div className="relative group animate-slide-up" style={{ animationDelay: '500ms' }}>
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
    </div>
  );
}
