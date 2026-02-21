import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, DollarSign, TrendingUp, Award, Clock, Calendar, QrCode } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import { UniversalPageHeader, StatCard } from '../../../components/common';

interface HRStats {
  totalEmployees: number;
  activeEmployees: number;
  totalPayroll: number;
  avgSalary: number;
  pendingPayrolls: number;
  todayAttendance: number;
}

interface Activity {
  type: string;
  message: string;
  date: string;
  color: string;
}

export default function HRDashboard() {
  const { onMenuToggle } = useOutletContext<{ onMenuToggle: () => void }>();
  const [stats, setStats] = useState<HRStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    totalPayroll: 0,
    avgSalary: 0,
    pendingPayrolls: 0,
    todayAttendance: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchActivities();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hr/employees/stats/dashboard`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setStats({
          totalEmployees: response.data.stats.totalEmployees,
          activeEmployees: response.data.stats.activeEmployees,
          totalPayroll: response.data.stats.totalPayroll,
          avgSalary: response.data.stats.avgSalary,
          pendingPayrolls: 0, // TODO: Payroll modelidan olish kerak
          todayAttendance: 0 // TODO: Attendance modelidan olish kerak
        });
      }
    } catch (error) {
      console.error('Stats olishda xatolik:', error);
      // Xatolik bo'lsa, 0 qiymatlar ko'rsatish
      setStats({
        totalEmployees: 0,
        activeEmployees: 0,
        totalPayroll: 0,
        avgSalary: 0,
        pendingPayrolls: 0,
        todayAttendance: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/hr/employees/stats/recent-activity`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.success) {
        setActivities(response.data.activities);
      }
    } catch (error) {
      console.error('Activities olishda xatolik:', error);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} daqiqa oldin`;
    if (diffHours < 24) return `${diffHours} soat oldin`;
    return `${diffDays} kun oldin`;
  };

  const statCards = [
    {
      title: 'Jami Xodimlar',
      value: stats.totalEmployees,
      subtitle: `${stats.activeEmployees} faol`,
      icon: Users,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Oylik Maosh',
      value: `${(stats.totalPayroll / 1000000).toFixed(1)}M`,
      subtitle: `O'rtacha: ${(stats.avgSalary / 1000000).toFixed(1)}M`,
      icon: DollarSign,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Kutilayotgan To\'lovlar',
      value: stats.pendingPayrolls,
      subtitle: 'Tasdiqlash kerak',
      icon: Clock,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Bugungi Davomat',
      value: `${stats.todayAttendance}/${stats.activeEmployees}`,
      subtitle: 'Ishda',
      icon: Calendar,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader 
        title="HR Dashboard"
        onMenuToggle={onMenuToggle}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          <StatCard
            title="Jami xodimlar"
            value={stats.totalEmployees.toString()}
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Faol xodimlar"
            value={stats.activeEmployees.toString()}
            icon={Users}
            color="green"
          />
          <StatCard
            title="Jami maosh"
            value={`${(stats.totalPayroll / 1000000).toFixed(1)}M`}
            icon={DollarSign}
            color="purple"
          />
          <StatCard
            title="O'rtacha maosh"
            value={`${(stats.avgSalary / 1000000).toFixed(1)}M`}
            icon={TrendingUp}
            color="orange"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tezkor Harakatlar</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/hr/employees'}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Xodimlar</p>
              <p className="text-sm text-gray-600">Xodimlarni boshqarish</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/admin/hr/salary'}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-all"
          >
            <DollarSign className="w-5 h-5 text-yellow-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">Maosh Sozlash</p>
              <p className="text-sm text-gray-600">Maosh belgilash</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/admin/hr/kpi'}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <Award className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">KPI Boshqaruvi</p>
              <p className="text-sm text-gray-600">KPI va bonuslar</p>
            </div>
          </button>

          <button
            onClick={() => window.location.href = '/admin/hr/attendance-qr'}
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <QrCode className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">QR Davomat</p>
              <p className="text-sm text-gray-600">Check-in / Check-out</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">So'nggi Faoliyat</h2>
        {activities.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Hali faoliyat yo'q</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                <p className="text-sm text-gray-700 flex-1">{activity.message}</p>
                <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
                  {getTimeAgo(activity.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
