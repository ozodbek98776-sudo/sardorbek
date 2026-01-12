import { Outlet } from 'react-router-dom';
import { LogOut, Sparkles, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PWAInstallButton from '../components/PWAInstallButton.tsx';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAlert } from '../hooks/useAlert';

export default function HelperLayout() {
  const { user, logout } = useAuth();
  const [sending, setSending] = useState<'arrived' | 'left' | null>(null);
  const [uiMode, setUiMode] = useState<'idle' | 'arrived'>('idle');
  const { showAlert, AlertComponent } = useAlert();
  const [attendanceToday, setAttendanceToday] = useState<{ arrived: number; left: number }>({ arrived: 0, left: 0 });
  const [todayKey, setTodayKey] = useState<string>('');

  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  useEffect(() => {
    const checkAndUpdateAttendance = () => {
      const t = getTodayString();
      setTodayKey(t);
      const key = `attendance:${user?._id || 'guest'}:${t}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { arrived: 0, left: 0 };
      setAttendanceToday(parsed);
      // Agar arrived > 0 va left === 0 bo'lsa, arrived mode'da bo'ladi
      setUiMode(parsed.arrived > 0 && parsed.left === 0 ? 'arrived' : 'idle');
    };

    // Dastlabki yuklash
    checkAndUpdateAttendance();

    // Har daqiqada kun o'zgarishini tekshirish
    const interval = setInterval(() => {
      const currentDate = getTodayString();
      if (currentDate !== todayKey) {
        checkAndUpdateAttendance();
      }
    }, 60000); // Har daqiqada tekshirish

    return () => clearInterval(interval);
  }, [user?._id, todayKey]);

  const handleAttendance = async (type: 'arrived' | 'left') => {
    if (sending) return;
    const key = `attendance:${user?._id || 'guest'}:${todayKey || getTodayString()}`;
    const current = attendanceToday;
    
    // 2 marta bosish cheklovi
    if ((type === 'arrived' && current.arrived >= 2) || (type === 'left' && current.left >= 2)) {
      await showAlert('Bugun ushbu amal maksimal 2 marta bajarilishi mumkin', 'Ogohlantirish', 'warning');
      return;
    }
    
    try {
      setSending(type);
      await api.post('/telegram/attendance', { type });
      await showAlert(
        type === 'arrived' ? 'Keldingiz xabari yuborildi' : 'Ketdingiz xabari yuborildi',
       'Muvaffaqiyatli',
       'success'
      );
      if (type === 'arrived') {
        const updated = { ...current, arrived: current.arrived + 1 };
        localStorage.setItem(key, JSON.stringify(updated));
        setAttendanceToday(updated);
        // Agar arrived > 0 va left === 0 bo'lsa, arrived mode'ga o'tadi
        if (updated.arrived > 0 && updated.left === 0) {
          setUiMode('arrived');
        }
      } else {
        const updated = { ...current, left: current.left + 1 };
        localStorage.setItem(key, JSON.stringify(updated));
        setAttendanceToday(updated);
        // Logout qilish va login sahifasiga yo'naltirish
        logout();
        // window.location.replace() ishlatish - to'liq redirect qilish uchun
        window.location.replace('/login');
      }
    } catch (err: any) {
      await showAlert(
        err?.response?.data?.message || 'Xabar yuborishda xatolik',
        'Xatolik',
        'danger'
      );
    } finally {
      setSending(null);
      // "left" bo'lganda uiMode ni o'zgartirmaymiz, chunki logout qilamiz
    }
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-surface-200/60">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-surface-900">Sardorbek.Furnetura</span>
          </div>
          <div className="flex items-center gap-3">
            {uiMode === 'arrived' && <PWAInstallButton variant="icon" />}
            <div className="flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-xl">
              <User className="w-4 h-4 text-surface-500" />
              <span className="text-sm font-medium text-surface-700">{user?.name}</span>
            </div>
            <button onClick={logout} className="btn-icon text-surface-500 hover:text-danger-600 hover:bg-danger-50">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="p-4">
        <Outlet />
      </main>
      {uiMode === 'idle' && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mx-auto max-w-md flex gap-4">
              <button
                onClick={() => handleAttendance('arrived')}
                disabled={sending !== null || attendanceToday.arrived >= 2}
                className="pointer-events-auto flex-1 px-6 py-4 rounded-2xl bg-emerald-600 text-white font-bold shadow-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                {sending === 'arrived' ? 'Yuborilmoqda...' : 'Keldim'}
              </button>
              <button
                onClick={() => handleAttendance('left')}
                disabled={sending !== null || attendanceToday.left >= 2}
                className="pointer-events-auto flex-1 px-6 py-4 rounded-2xl bg-rose-600 text-white font-bold shadow-lg hover:bg-rose-700 disabled:opacity-60"
              >
                {sending === 'left' ? 'Yuborilmoqda...' : 'Ketdim'}
              </button>
            </div>
          </div>
        </div>
      )}
      {uiMode === 'arrived' && (
        <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={() => handleAttendance('arrived')}
            disabled={sending !== null || attendanceToday.arrived >= 2}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-md hover:bg-emerald-700 disabled:opacity-60 transition-all"
          >
            {sending === 'arrived' ? '...' : 'Keldim'}
          </button>
          <button
            onClick={() => handleAttendance('left')}
            disabled={sending !== null || attendanceToday.left >= 2}
            className="px-3 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow-md hover:bg-rose-700 disabled:opacity-60 transition-all"
          >
            {sending === 'left' ? '...' : 'Ketdim'}
          </button>
        </div>
      )}
      {AlertComponent}
    </div>
  );
}
