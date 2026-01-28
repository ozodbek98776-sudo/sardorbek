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
      label: 'dashboard.totalRevenue', 
      value: formatNumber(stats.totalRevenue || 0), 
      suffix: "UZS", 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      trend: '+12.5%',
      trendUp: true
    },
    { 
      icon: TrendingUp, 
      label: period === 'today' ? 'dashboard.todaySales' : 'dashboard.weeklySales', 
      value: formatNumber(period === 'today' ? (stats.todaySales || 0) : (stats.weekSales || 0)), 
      suffix: "UZS", 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      trend: '+8.2%',
      trendUp: true
    },
    { 
      icon: ShoppingCart, 
      label: 'dashboard.totalOrders', 
      value: (stats.totalReceipts || 0).toString(), 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      trend: '+15.3%',
      trendUp: true
    },
    { 
      icon: Activity, 
      label: "dashboard.peakHour", 
      value: stats.peakHour || '-', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      trend: '',
      trendUp: true
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
      <Header title={t('dashboard.title')} />
      
      <div className="p-3 sm:p-4 lg:p-6 space-y-5 sm:space-y-6 pb-20 lg:pb-6 max-w-7xl mx-auto">
        {/* Header Section - Enhanced */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 bg-clip-text text-transparent leading-tight">
              {t('dashboard.overview')}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm lg:text-base font-medium">{t('dashboard.description')}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Period Selector - Glass Design */}
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
            {/* Refresh Button - Glass Design */}
            <button 
              onClick={fetchStats} 
              className="p-2.5 rounded-xl bg-white/90 backdrop-blur-xl border border-white/20 text-slate-600 hover:text-slate-900 hover:bg-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              title={t('dashboard.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 overflow-hidden">
                <div className="animate-pulse space-y-4">
                  {/* Icon Skeleton */}
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl" />
                    <div className="w-12 h-6 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg" />
                  </div>
                  {/* Text Skeleton */}
                  <div className="space-y-2">
                    <div className="h-8 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg w-3/4" />
                    <div className="h-4 bg-gradient-to-br from-slate-200 to-slate-300 rounded w-1/2" />
                  </div>
                </div>
                {/* Shimmer Effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats - Modern Premium Design */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {mainStats.map((stat, i) => (
                <div key={i} className="group relative h-full">
                  {/* Glass Card with Gradient Border - Fixed Height */}
                  <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 hover:scale-[1.02] overflow-hidden h-[160px] sm:h-[180px] flex flex-col">
                    {/* Animated Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700`} />
                    
                    {/* Decorative Glow Effect */}
                    <div className={`absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-[0.08] rounded-full blur-3xl group-hover:opacity-[0.15] group-hover:scale-125 transition-all duration-700`} />
                    
                    {/* Top Border Accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-60 group-hover:opacity-100 transition-all duration-500`} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Icon & Trend Badge */}
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        {/* Icon with Pulse Effect */}
                        <div className="relative">
                          <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} rounded-xl blur-md opacity-40 group-hover:opacity-60 transition-all duration-500`} />
                          <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                            <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow-lg" />
                          </div>
                        </div>
                        
                        {/* Trend Badge */}
                        {stat.trend && (
                          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-md backdrop-blur-sm ${
                            stat.trendUp 
                              ? 'bg-emerald-50/80 text-emerald-700 border border-emerald-200/60' 
                              : 'bg-red-50/80 text-red-700 border border-red-200/60'
                          }`}>
                            {stat.trendUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{stat.trend}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Value & Label - Flex grow to fill remaining space */}
                      <div className="flex-1 flex flex-col justify-end space-y-1">
                        {/* Value with Gradient Text */}
                        <div className="flex items-baseline gap-1 flex-wrap">
                          <h3 className={`text-xl sm:text-2xl font-extrabold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent leading-none tracking-tight`}>
                            {stat.value}
                          </h3>
                          {stat.suffix && (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              {stat.suffix}
                            </span>
                          )}
                        </div>
                        
                        {/* Label with Icon Color */}
                        <p className={`${stat.textColor} font-semibold text-xs leading-tight`}>
                          {t(stat.label)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Shine Effect on Hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Charts Section - Enhanced Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Revenue Chart - Premium Glass Design */}
          <div className="xl:col-span-2 relative group">
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 opacity-50" />
              
              {/* Header */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                <div className="flex items-center gap-3">
                  {/* Icon with Glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl blur-md opacity-40" />
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                      <BarChart3 className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                      {period === 'today' ? 'Bugungi daromad' : 'Haftalik daromad'}
                    </h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium">
                      {period === 'today' ? 'Soatlik taqsimot' : 'Kunlik ko\'rsatkichlar'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200/50 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" />
                  <span className="text-xs text-blue-700 font-bold">Savdo</span>
                </div>
              </div>
              
              {/* Chart */}
              <div className="relative z-10 h-64 sm:h-72 rounded-xl overflow-hidden">
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
                      <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <BarChart3 className="w-10 h-10 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-slate-600 text-lg">Ma'lumot mavjud emas</p>
                    <p className="text-slate-400 mt-2 text-center text-sm max-w-xs">Analitikani ko'rish uchun savdo qilishni boshlang</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Products - Premium Glass Design */}
          <div className="relative group">
            <div className="relative bg-white/90 backdrop-blur-xl rounded-2xl p-5 sm:p-6 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-500 overflow-hidden">
              {/* Decorative Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-pink-50/30 opacity-50" />
              
              {/* Header */}
              <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {/* Icon with Glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl blur-md opacity-40" />
                    <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Package className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Top mahsulotlar</h3>
                    <p className="text-slate-600 text-xs sm:text-sm font-medium">Eng ko'p sotilganlar</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {topProducts.map((product, index) => (
                      <div 
                        key={product._id}
                        className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md transition-all"
                      >
                        {/* Rank */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white shadow-lg' :
                          index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-md' :
                          'bg-gradient-to-br from-orange-300 to-orange-400 text-white shadow-md'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{product._id}</p>
                          <p className="text-xs text-slate-500">{product.totalSold} ta sotildi</p>
                        </div>
                        
                        {/* Sales Count */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-purple-600 text-sm">{formatNumber(product.revenue)} so'm</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300 rounded-2xl blur-xl opacity-50" />
                      <div className="relative w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                        <Clock className="w-10 h-10 text-slate-400" />
                      </div>
                    </div>
                    <p className="font-bold text-slate-600 text-lg">Ma'lumot yo'q</p>
                    <p className="text-slate-400 mt-2 text-center text-sm max-w-xs px-4">Hali sotuvlar amalga oshirilmagan</p>
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
