import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, DollarSign, Target, Calendar, TrendingUp, Award } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeStats } from '../../hooks/useRealtimeStats';
import { UniversalPageHeader, StatCard } from '../../components/common';

interface Task {
  id: string;
  name: string;
  dailyReward: number;
}

interface DailyRecord {
  date: string;
  taskId: string;
  completed: boolean;
}

interface SalaryInfo {
  baseSalary: number;
  effectiveFrom: string;
  totalKPIBonus: number;
  estimatedSalary: number;
}

export default function MyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // ⚡ Realtime statistics updates
  const realtimeStats = useRealtimeStats((newStats) => {
    console.log('📊 Realtime stats updated:', newStats);
    // Stats will be used for dashboard-level statistics
  });
  
  const [loading, setLoading] = useState(true);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonthRecords, setCurrentMonthRecords] = useState<DailyRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user) {
      fetchMyData();
    }
  }, [user]);

  const fetchMyData = async () => {
    try {
      setLoading(true);
      
      // Maosh ma'lumotlarini olish
      const salaryRes = await axios.get(`${API_BASE_URL}/hr/salary/my-salary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // KPI vazifalarini olish
      const storedTasks = localStorage.getItem(`kpi_tasks_${user?._id}`);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
      
      // Joriy oy rekordlarini olish
      const storedRecords = localStorage.getItem(`kpi_records_${user?._id}`);
      if (storedRecords) {
        const allRecords = JSON.parse(storedRecords);
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthRecords = allRecords.filter((r: DailyRecord) => r.date.startsWith(currentMonth));
        setCurrentMonthRecords(monthRecords);
      }
      
      setSalaryInfo(salaryRes.data);
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    const recordKey = `${selectedDate}_${taskId}`;
    const existingRecord = currentMonthRecords.find(r => r.date === selectedDate && r.taskId === taskId);
    
    let updatedRecords;
    if (existingRecord) {
      updatedRecords = currentMonthRecords.map(r => 
        r.date === selectedDate && r.taskId === taskId 
          ? { ...r, completed: !r.completed }
          : r
      );
    } else {
      updatedRecords = [...currentMonthRecords, { date: selectedDate, taskId, completed: true }];
    }
    
    setCurrentMonthRecords(updatedRecords);
    localStorage.setItem(`kpi_records_${user?._id}`, JSON.stringify(updatedRecords));
  };

  const getTaskStatus = (taskId: string) => {
    const record = currentMonthRecords.find(r => r.date === selectedDate && r.taskId === taskId);
    return record?.completed || false;
  };

  const calculateMonthlyStats = () => {
    const completedDays = new Set(
      currentMonthRecords.filter(r => r.completed).map(r => r.date)
    ).size;
    
    const totalBonus = tasks.reduce((sum, task) => {
      const taskCompletions = currentMonthRecords.filter(
        r => r.taskId === task.id && r.completed
      ).length;
      return sum + (task.dailyReward * taskCompletions);
    }, 0);
    
    return { completedDays, totalBonus };
  };

  const stats = calculateMonthlyStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-3"></div>
          <p className="text-gray-600">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <UniversalPageHeader 
        title="Mening Profilim"
        onBack={() => navigate(-1)}
      />

      <div className="p-4 sm:p-6 space-y-6">
        {/* User Info Card */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-purple-100 capitalize">{user?.role}</p>
              {user?.phone && <p className="text-purple-200 text-sm mt-1">{user.phone}</p>}
            </div>
          </div>
        </div>

        {/* Salary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            title="Asosiy Maosh"
            value={`${salaryInfo?.baseSalary?.toLocaleString() || 0} so'm`}
            color="blue"
          />
          <StatCard
            icon={Award}
            title="KPI Bonus (Joriy Oy)"
            value={`${stats.totalBonus.toLocaleString()} so'm`}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            title="Taxminiy Maosh"
            value={`${((salaryInfo?.baseSalary || 0) + stats.totalBonus).toLocaleString()} so'm`}
            color="purple"
          />
        </div>

        {/* KPI Section */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Mening KPI Vazifalarim</h2>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {tasks.map(task => {
                const isCompleted = getTaskStatus(task.id);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? 'bg-green-50 border-green-300'
                        : 'bg-gray-50 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-purple-500'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <p className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                          {task.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          Kunlik bonus: {task.dailyReward.toLocaleString()} so'm
                        </p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-medium">
                        Bajarildi
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly Summary */}
            <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-3">Joriy Oy Statistikasi</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-purple-700">Bajarilgan Kunlar</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.completedDays}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-700">Jami Bonus</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalBonus.toLocaleString()} so'm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">Sizga hali KPI vazifalari belgilanmagan</p>
            <p className="text-sm text-gray-500 mt-2">Administrator tomonidan vazifalar qo'shilishini kuting</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">Eslatma</p>
              <p className="text-sm text-blue-800">
                Har kuni vazifalaringizni bajarib, belgilang. Oylik maoshingiz asosiy maosh + KPI bonuslaridan iborat bo'ladi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
