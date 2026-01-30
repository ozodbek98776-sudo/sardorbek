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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      <Header title={t('dashboard.title')} />
      
      {/* Main Container - Mobile First with Safe Margins */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6 pb-24 lg:pb-8 max-w-7xl mx-auto">
        
        {/* Page Header - Improved Mobile Layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 animate-fade-in">
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
          /* Loading Skeletons - Improved Animation */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 overflow-hidden min-h-[140px] sm:min-h-[160px]">
                <div className="animate-pulse space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl" />
                    <div className="w-12 h-5 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg w-3/4" />
                    <div className="h-4 bg-gradient-to-br from-slate-200 to-slate-300 rounded w-1/2" />
                  </div>
                </div>
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Statistics Cards - Equal Height Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {mainStats.map((stat, i) => (
                <div 
                  key={i} 
                  className="group relative animate-slide-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  {/* Clean Card Design - Fixed Equal Height */}
                  <div className="relative bg-white rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] overflow-hidden h-[200px] flex flex-col">
                    
                    {/* Top Colored Accent Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${stat.accentColor}`} />
                    
                    {/* Header Row - Icon and Trend */}
                    <div className="flex items-start justify-between mb-auto">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl ${stat.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <stat.icon className={`w-8 h-8 ${stat.iconColor}`} />
                      </div>
                      
                      {/* Trend Badge */}
                      {stat.trend && (
                        <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          stat.trendUp 
                            ? 'bg-emerald-50 text-emerald-700' 
                            : 'bg-red-50 text-red-700'
                        }`}>
                          {stat.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span>{stat.trend}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Value & Label - Bottom Aligned */}
                    <div className="mt-auto space-y-1.5">
                      {/* Large Value */}
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <h3 className={`text-base sm:text-lg md:text-xl lg:text-2xl font-bold ${stat.textColor} leading-none tracking-tight`}>
                          {stat.value}
                        </h3>
                        {stat.suffix && (
                          <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase">
                            {stat.suffix}
                          </span>
                        )}
                      </div>
                      
                      {/* Label */}
                      <p className="text-[7px] sm:text-[8px] md:text-[9px] font-medium text-slate-600 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                        {stat.label}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Charts Section - Mobile Optimized Stack */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          
          {/* Revenue Chart - Full Width on Mobile */}
          <div className="xl:col-span-2 relative group animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 opacity-50" />
              
              {/* Header - Better Mobile Layout */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-5 sm:mb-6 gap-3">
                <div className="flex items-center gap-3">
                  {/* Icon with Glow */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl blur-md opacity-40" />
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
                      {period === 'today' ? 'Bugungi daromad' : 'Haftalik daromad'}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium">
                      {period === 'today' ? 'Soatlik taqsimot' : 'Kunlik ko\'rsatkichlar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200/50 shadow-sm flex-shrink-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" />
                  <span className="text-xs sm:text-sm text-blue-700 font-bold">Savdo</span>
                </div>
              </div>
              
              {/* Chart - Responsive Height */}
              <div className="relative z-10 h-56 sm:h-64 md:h-72 rounded-xl overflow-hidden">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                          <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                        </linearGradient>
                        <filter id="shadow">
                          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#3b82f6" floodOpacity="0.4"/>
                        </filter>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#cbd5e1" 
                        vertical={false}
                        strokeOpacity={0.4}
                      />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1', strokeWidth: 1.5 }}
                        tick={{ fill: '#64748b', fontWeight: 600 }}
                        dx={-10}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                          border: 'none',
                          borderRadius: '16px',
                          boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                          padding: '16px 20px',
                          backdropFilter: 'blur(10px)'
                        }}
                        labelStyle={{ 
                          color: '#0f172a', 
                          fontWeight: 800, 
                          marginBottom: '8px', 
                          fontSize: '14px',
                          letterSpacing: '-0.02em'
                        }}
                        itemStyle={{
                          color: '#3b82f6',
                          fontWeight: 700,
                          fontSize: '15px'
                        }}
                        formatter={(value: number) => [`${formatNumber(value)} so'm`, 'Daromad']}
                        cursor={{ 
                          stroke: '#3b82f6', 
                          strokeWidth: 2, 
                          strokeDasharray: '5 5',
                          strokeOpacity: 0.6
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#3b82f6" 
                        strokeWidth={3.5} 
                        fill="url(#colorSales)"
                        filter="url(#shadow)"
                        dot={{ 
                          fill: '#3b82f6', 
                          strokeWidth: 3, 
                          stroke: '#fff',
                          r: 5
                        }}
                        activeDot={{ 
                          r: 7, 
                          fill: '#3b82f6',
                          stroke: '#fff',
                          strokeWidth: 3,
                          filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.5))'
                        }}
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl blur-xl opacity-50" />
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                        <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-slate-600 text-base sm:text-lg">Ma'lumot mavjud emas</p>
                    <p className="text-slate-400 mt-2 text-center text-xs sm:text-sm max-w-xs px-4">Analitikani ko'rish uchun savdo qilishni boshlang</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Products - Full Width on Mobile */}
          <div className="relative group animate-slide-up" style={{ animationDelay: '500ms' }}>
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 md:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-pink-50/30 opacity-50" />
              
              {/* Header - Better Mobile Layout */}
              <div className="relative z-10 flex items-center justify-between mb-5 sm:mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Icon with Glow */}
                  <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl blur-md opacity-40" />
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">Top mahsulotlar</h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium">Eng ko'p sotilganlar</p>
                  </div>
                </div>
              </div>
              
              {/* Content - Better Touch Targets */}
              <div className="relative z-10">
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div 
                        key={product._id}
                        className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                      >
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg' :
                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md' :
                          'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-md'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm sm:text-base truncate">{product._id}</p>
                          <p className="text-xs sm:text-sm text-slate-500">{product.totalSold} ta sotildi</p>
                        </div>
                        
                        {/* Revenue */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-purple-600 text-sm sm:text-base">{formatNumber(product.revenue)}</p>
                          <p className="text-[10px] sm:text-xs text-slate-400">so'm</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 sm:h-56 text-slate-400">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl blur-xl opacity-50" />
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-lg">
                        <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-slate-600 text-base sm:text-lg">Ma'lumot yo'q</p>
                    <p className="text-slate-400 mt-2 text-center text-xs sm:text-sm max-w-xs px-4">Hali sotuvlar amalga oshirilmagan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
