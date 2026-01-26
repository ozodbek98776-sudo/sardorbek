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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
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
      
      <div className="p-3 lg:p-6 space-y-6 pb-20 lg:pb-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-900 via-purple-700 to-purple-600 bg-clip-text text-transparent">
              {t('dashboard.overview')}
            </h2>
            <p className="text-slate-600 text-sm lg:text-base">{t('dashboard.description')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex p-1 bg-white rounded-xl shadow-md border border-slate-200/50 backdrop-blur-sm">
              <button 
                onClick={() => setPeriod('today')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  period === 'today' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t('dashboard.today')}
              </button>
              <button 
                onClick={() => setPeriod('week')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  period === 'week' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t('dashboard.thisWeek')}
              </button>
            </div>
            <button 
              onClick={fetchStats} 
              className="p-2.5 rounded-xl bg-white border border-slate-200/50 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-300 shadow-md hover:shadow-lg"
              title={t('dashboard.refresh')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid 2xs:grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white/70 backdrop-blur-sm rounded-lg sm:rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-6 shadow-md border border-slate-200/50">
                <div className="animate-pulse">
                  <div className="w-12 h-12 bg-slate-200 rounded-xl mb-4" />
                  <div className="h-4 bg-slate-200 rounded mb-3 w-3/4" />
                  <div className="h-5 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Main Stats - Compact Pro Design */}
            <div className="grid 2xs:grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {mainStats.map((stat, i) => (
                <div key={i} className="group relative overflow-hidden">
                  {/* Card Container - Fixed Height for Equal Cards */}
                  <div className="relative bg-white rounded-2xl p-4 shadow-lg border border-slate-200/60 hover:shadow-2xl hover:border-slate-300/80 transition-all duration-500 hover:-translate-y-2 h-[130px] flex flex-col">
                    {/* Animated Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-[0.08] transition-all duration-500`} />
                    
                    {/* Decorative Circle */}
                    <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-[0.06] rounded-full blur-2xl group-hover:opacity-[0.12] transition-all duration-500`} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      {/* Header: Icon + Trend */}
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                          <stat.icon className="w-5 h-5 text-white" />
                        </div>
                        {stat.trend && (
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm ${
                            stat.trendUp 
                              ? 'bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200/50' 
                              : 'bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200/50'
                          }`}>
                            {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{stat.trend}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content: Value + Label - Flex grow to fill space */}
                      <div className="flex-1 flex flex-col justify-end">
                        {/* Value */}
                        <div className="flex items-baseline gap-1 mb-1 flex-wrap">
                          <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent leading-none tracking-tight">
                            {stat.value}
                          </h3>
                          {stat.suffix && (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              {stat.suffix}
                            </span>
                          )}
                        </div>
                        
                        {/* Label - Smaller */}
                        <p className="text-slate-600 font-medium text-[11px] leading-tight">
                          {t(stat.label)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Bottom Accent Line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="xl:col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-slate-200/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center shadow-sm">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {period === 'today' ? 'Bugungi daromad' : 'Haftalik daromad'}
                  </h3>
                  <p className="text-slate-600 text-sm">
                    {period === 'today' ? 'Soatlik taqsimot' : 'Kunlik ko\'rsatkichlar'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/50">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full" />
                <span className="text-xs text-slate-700 font-semibold">Savdo</span>
              </div>
            </div>
            <div className="h-64 rounded-xl overflow-hidden">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                      </linearGradient>
                      <filter id="shadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.3"/>
                      </filter>
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
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      dy={10}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                      tick={{ fill: '#64748b', fontWeight: 500 }}
                      dx={-10}
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        padding: '16px 20px',
                        backdropFilter: 'blur(10px)'
                      }}
                      labelStyle={{ 
                        color: '#0f172a', 
                        fontWeight: 700, 
                        marginBottom: '8px', 
                        fontSize: '13px',
                        letterSpacing: '-0.01em'
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
                      filter="url(#shadow)"
                      dot={{ 
                        fill: '#3b82f6', 
                        strokeWidth: 3, 
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
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="font-semibold text-slate-600">Ma'lumot mavjud emas</p>
                  <p className="text-slate-400 mt-1 text-center text-sm max-w-xs">Analitikani ko'rish uchun savdo qilishni boshlang</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-md border border-slate-200/50">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center shadow-sm">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Top mahsulotlar</h3>
                  <p className="text-slate-600 text-sm">Eng ko'p sotilganlar</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <Clock className="w-8 h-8 text-slate-400" />
              </div>
              <p className="font-semibold text-slate-600">Tez orada</p>
              <p className="text-slate-400 mt-1 text-center text-sm">Mahsulot analitikasi bu yerda ko'rinadi</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
