import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, DollarSign, Target, Calendar, TrendingUp, Award, MapPin, CheckCircle, XCircle, Clock, Loader2, AlertTriangle, QrCode } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeStats } from '../../hooks/useRealtimeStats';
import { UniversalPageHeader } from '../../components/common';
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

  const realtimeStats = useRealtimeStats((newStats) => {
    console.log('📊 Realtime stats updated:', newStats);
  });

  const [loading, setLoading] = useState(true);
  const [salaryInfo, setSalaryInfo] = useState<SalaryInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMonthRecords, setCurrentMonthRecords] = useState<DailyRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [attStep, setAttStep] = useState<AttendanceStep>('idle');
  const [todayAtt, setTodayAtt] = useState<TodayAttendance | null>(null);
  const [canCheckIn, setCanCheckIn] = useState(false);
  const [canCheckOut, setCanCheckOut] = useState(false);
  const [attMessage, setAttMessage] = useState('');
  const [attError, setAttError] = useState('');
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
      const salaryRes = await axios.get(`${API_BASE_URL}/hr/salary/my-salary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const storedTasks = localStorage.getItem(`kpi_tasks_${user?._id}`);
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      const storedRecords = localStorage.getItem(`kpi_records_${user?._id}`);
      if (storedRecords) {
        const allRecords = JSON.parse(storedRecords);
        const currentMonth = new Date().toISOString().slice(0, 7);
        setCurrentMonthRecords(allRecords.filter((r: DailyRecord) => r.date.startsWith(currentMonth)));
      }
      setSalaryInfo(salaryRes.data);
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompletion = (taskId: string) => {
    const existingRecord = currentMonthRecords.find(r => r.date === selectedDate && r.taskId === taskId);
    let updatedRecords;
    if (existingRecord) {
      updatedRecords = currentMonthRecords.map(r =>
        r.date === selectedDate && r.taskId === taskId ? { ...r, completed: !r.completed } : r
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
    const completedDays = new Set(currentMonthRecords.filter(r => r.completed).map(r => r.date)).size;
    const totalBonus = tasks.reduce((sum, task) => {
      const taskCompletions = currentMonthRecords.filter(r => r.taskId === task.id && r.completed).length;
      return sum + (task.dailyReward * taskCompletions);
    }, 0);
    return { completedDays, totalBonus };
  };

  const stats = calculateMonthlyStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Yuklanmoqda...</p>
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

      <div className="p-3 space-y-3">
        {/* User Info Card */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-md p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold truncate">{user?.name}</h2>
              <p className="text-purple-200 text-xs capitalize">{user?.role}</p>
              {user?.phone && <p className="text-purple-200 text-[11px] mt-0.5">{user.phone}</p>}
            </div>
          </div>
        </div>

        {/* Attendance Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Bugungi Davomat</h2>
          </div>

          {todayAtt ? (
            <div className="flex items-center gap-2.5 mb-3 p-2.5 bg-green-50 rounded-lg border border-green-200">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  <span className="text-green-800">Keldi: <strong>{formatTime(todayAtt.checkIn)}</strong></span>
                  {todayAtt.isLate && (
                    <span className="text-yellow-600 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" /> {todayAtt.lateMinutes} daq.
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
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500">Bugun hali check-in qilinmagan</p>
            </div>
          )}

          {attStep === 'idle' && (canCheckIn || canCheckOut) && (
            <button
              onClick={handleQRScan}
              className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                canCheckIn
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
              }`}
            >
              <QrCode className="w-5 h-5" />
              {canCheckIn ? 'Keldim (Check-in)' : 'Ketdim (Check-out)'}
            </button>
          )}

          {attStep === 'idle' && !canCheckIn && !canCheckOut && todayAtt?.checkOut && (
            <p className="text-center py-2 text-xs text-gray-500">Bugungi davomat to'liq qayd etilgan</p>
          )}

          {showScanner && attStep === 'scanning' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-600">QR kodni skanerlang yoki tokenni kiriting:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="STORE-... yoki URL"
                  className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                      processStoreToken((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <button
                  onClick={() => { setShowScanner(false); setAttStep('idle'); }}
                  className="px-3 py-2.5 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300"
                >
                  Bekor
                </button>
              </div>
            </div>
          )}

          {attStep === 'gps_loading' && (
            <div className="text-center py-3">
              <Loader2 className="w-6 h-6 mx-auto text-indigo-500 animate-spin mb-1" />
              <p className="text-xs text-gray-600">GPS aniqlanmoqda...</p>
            </div>
          )}

          {attStep === 'checking' && (
            <div className="text-center py-3">
              <Loader2 className="w-6 h-6 mx-auto text-indigo-500 animate-spin mb-1" />
              <p className="text-xs text-gray-600">{canCheckIn ? 'Check-in' : 'Check-out'} amalga oshirilmoqda...</p>
            </div>
          )}

          {attStep === 'success' && (
            <div className="text-center py-3">
              <CheckCircle className="w-8 h-8 mx-auto text-green-500 mb-1" />
              <p className="text-green-700 font-medium text-sm">{attMessage}</p>
              <button onClick={() => setAttStep('idle')} className="mt-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                Yopish
              </button>
            </div>
          )}

          {(attStep === 'error' || attStep === 'gps_denied') && (
            <div className="text-center py-3">
              <XCircle className="w-8 h-8 mx-auto text-red-500 mb-1" />
              <p className="text-red-700 text-xs mb-2">{attError}</p>
              <button
                onClick={() => { setAttStep('idle'); setAttError(''); }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs"
              >
                Qayta urinish
              </button>
            </div>
          )}
        </div>

        {/* Salary Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
            <DollarSign className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 leading-tight">Asosiy Maosh</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{(salaryInfo?.baseSalary || 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
            <Award className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 leading-tight">KPI Bonus</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{stats.totalBonus.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
            <TrendingUp className="w-5 h-5 text-purple-500 mx-auto mb-1" />
            <p className="text-[10px] text-gray-500 leading-tight">Taxminiy</p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">{((salaryInfo?.baseSalary || 0) + stats.totalBonus).toLocaleString()}</p>
          </div>
        </div>

        {/* KPI Section */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-600" />
                <h2 className="text-sm font-bold text-gray-900">KPI Vazifalarim</h2>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              {tasks.map(task => {
                const isCompleted = getTaskStatus(task.id);
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                      isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <button
                        onClick={() => toggleTaskCompletion(task.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-300'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                          {task.name}
                        </p>
                        <p className="text-[11px] text-gray-500">{task.dailyReward.toLocaleString()} so'm/kun</p>
                      </div>
                    </div>
                    {isCompleted && (
                      <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-medium flex-shrink-0 ml-2">
                        Bajarildi
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Monthly Summary */}
            <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h3 className="font-semibold text-purple-900 text-xs mb-2">Joriy Oy</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-purple-700">Bajarilgan Kunlar</p>
                  <p className="text-lg font-bold text-purple-900">{stats.completedDays}</p>
                </div>
                <div>
                  <p className="text-[11px] text-purple-700">Jami Bonus</p>
                  <p className="text-lg font-bold text-purple-900">{stats.totalBonus.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {tasks.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <Target className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 text-sm">KPI vazifalari belgilanmagan</p>
            <p className="text-xs text-gray-400 mt-1">Administrator tomonidan qo'shilishini kuting</p>
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-800">
              Har kuni vazifalaringizni bajarib belgilang. Oylik maosh = asosiy maosh + KPI bonus.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
