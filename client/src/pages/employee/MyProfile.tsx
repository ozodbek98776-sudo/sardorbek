import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, DollarSign, Target, Calendar, TrendingUp, Award, MapPin, CheckCircle, XCircle, Clock, Loader2, LogIn, LogOut, AlertTriangle, QrCode } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeStats } from '../../hooks/useRealtimeStats';
import { UniversalPageHeader, StatCard } from '../../components/common';
import api from '../../utils/api';

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

type AttendanceStep = 'idle' | 'scanning' | 'gps_loading' | 'checking' | 'success' | 'error' | 'gps_denied';

interface TodayAttendance {
  checkIn: string;
  checkOut?: string;
  workHours?: number;
  isLate?: boolean;
  lateMinutes?: number;
  checkInMethod?: string;
}

export default function MyProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ⚡ Realtime statistics updates
  const realtimeStats = useRealtimeStats((newStats) => {
    console.log('📊 Realtime stats updated:', newStats);
  });

  const [loading, setLoading] = useState(true);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonthRecords, setCurrentMonthRecords] = useState<DailyRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Attendance state
  const [attStep, setAttStep] = useState<AttendanceStep>('idle');
  const [todayAtt, setTodayAtt] = useState<TodayAttendance | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [attMessage, setAttMessage] = useState('');
  const [attError, setAttError] = useState('');
  const [storeToken, setStoreToken] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMyData();
      fetchAttendanceStatus();
    }
  }, [user]);

  const fetchAttendanceStatus = async () => {
    try {
      const res = await api.get('/hr/location-attendance/status');
      const data = res.data.data;
      setCanCheckIn(data.canCheckIn);
      setCanCheckOut(data.canCheckOut);
      setTodayAtt(data.attendance);
    } catch {
      // Status olishda xatolik — silent
    }
  };

  const handleQRScan = () => {
    setShowScanner(true);
    setAttStep('scanning');
    setAttError('');
    setAttMessage('');
  };

  const processStoreToken = (token: string) => {
    // URL yoki token parse
    let extractedToken = token;
    if (token.includes('store=')) {
      const url = new URL(token);
      extractedToken = url.searchParams.get('store') || '';
    }
    if (!extractedToken.startsWith('STORE-')) {
      setAttStep('error');
      setAttError('Bu davomat QR kodi emas');
      return;
    }
    setStoreToken(extractedToken);
    setShowScanner(false);
    requestGPS(extractedToken);
  };

  const requestGPS = (token: string) => {
    if (!navigator.geolocation) {
      setAttStep('gps_denied');
      setAttError('GPS qo\'llab-quvvatlanmaydi');
      return;
    }
    setAttStep('gps_loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => performAttendance(token, pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      (err) => {
        setAttStep('gps_denied');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setAttError('GPS ruxsat berilmadi. Brauzer sozlamalaridan joylashuvga ruxsat bering.');
            break;
          case err.POSITION_UNAVAILABLE:
            setAttError('GPS signal topilmadi.');
            break;
          default:
            setAttError('GPS vaqti tugadi. Qayta urinib ko\'ring.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const performAttendance = async (token: string, lat: number, lng: number, accuracy: number) => {
    setAttStep('checking');
    try {
      const endpoint = canCheckIn ? '/hr/location-attendance/check-in' : '/hr/location-attendance/check-out';
      const res = await api.post(endpoint, { storeToken: token, latitude: lat, longitude: lng, accuracy });
      setAttStep('success');
      setAttMessage(res.data.message);
      fetchAttendanceStatus();
    } catch (err: unknown) {
      setAttStep('error');
      const error = err as { response?: { data?: { message?: string } } };
      setAttError(error.response?.data?.message || 'Xatolik yuz berdi');
    }
  };

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

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

        {/* Attendance Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Bugungi Davomat</h2>
            </div>
          </div>

          {/* Today's attendance info */}
          {todayAtt ? (
            <div className="flex items-center gap-4 mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-green-800">Keldi: <strong>{formatTime(todayAtt.checkIn)}</strong></span>
                  {todayAtt.isLate && (
                    <span className="text-yellow-600 text-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> {todayAtt.lateMinutes} daq. kechikish
                    </span>
                  )}
                  {todayAtt.checkOut && (
                    <span className="text-blue-700">Ketdi: <strong>{formatTime(todayAtt.checkOut)}</strong></span>
                  )}
                  {todayAtt.workHours != null && todayAtt.workHours > 0 && (
                    <span className="text-gray-600">{todayAtt.workHours.toFixed(1)} soat</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-500">Bugun hali check-in qilinmagan</p>
            </div>
          )}

          {/* Attendance action */}
          {attStep === 'idle' && (canCheckIn || canCheckOut) && (
            <button
              onClick={handleQRScan}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
                canCheckIn
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
              }`}
            >
              <QrCode className="w-6 h-6" />
              {canCheckIn ? 'Keldim (Check-in)' : 'Ketdim (Check-out)'}
            </button>
          )}

          {attStep === 'idle' && !canCheckIn && !canCheckOut && todayAtt?.checkOut && (
            <div className="text-center py-3 text-sm text-gray-500">
              Bugungi davomat to'liq qayd etilgan
            </div>
          )}

          {/* Scanner input */}
          {showScanner && attStep === 'scanning' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">Do'kondagi QR kodni skanerlang yoki tokenni kiriting:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="STORE-... yoki URL"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                      processStoreToken((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  onClick={() => { setShowScanner(false); setAttStep('idle'); }}
                  className="px-4 py-3 bg-gray-200 text-gray-600 rounded-xl hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Telefoningiz kamerasi bilan QR skanerlang — u avtomatik bu sahifani ochadi
              </p>
            </div>
          )}

          {/* GPS loading */}
          {attStep === 'gps_loading' && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600">GPS aniqlanmoqda...</p>
            </div>
          )}

          {/* Checking */}
          {attStep === 'checking' && (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 mx-auto text-indigo-500 animate-spin mb-2" />
              <p className="text-sm text-gray-600">{canCheckIn ? 'Check-in' : 'Check-out'} amalga oshirilmoqda...</p>
            </div>
          )}

          {/* Success */}
          {attStep === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <p className="text-green-700 font-medium">{attMessage}</p>
              <button
                onClick={() => setAttStep('idle')}
                className="mt-3 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
              >
                Yopish
              </button>
            </div>
          )}

          {/* Error */}
          {(attStep === 'error' || attStep === 'gps_denied') && (
            <div className="text-center py-4">
              <XCircle className="w-10 h-10 mx-auto text-red-500 mb-2" />
              <p className="text-red-700 text-sm mb-3">{attError}</p>
              <button
                onClick={() => { setAttStep('idle'); setAttError(''); }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
              >
                Qayta urinish
              </button>
            </div>
          )}
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
