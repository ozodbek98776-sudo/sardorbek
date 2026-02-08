import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Users, FileText, Package, LogOut, Menu, X } from 'lucide-react';
import api from '../utils/api';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../context/AuthContext';

export default function KassaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sending, setSending] = useState<'arrived' | 'left' | null>(null);
  const { showAlert, AlertComponent } = useAlert();
  const [attendanceToday, setAttendanceToday] = useState<{ arrived: number; left: number }>({ arrived: 0, left: 0 });
  const [todayKey, setTodayKey] = useState<string>('');
  
  // Qo'shimcha himoya choralari
  useEffect(() => {
    // URL ni doimiy kassa sahifasida ushlab turish
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith('/kassa')) {
      navigate('/kassa', { replace: true });
    }
    
    // Browser navigation ni bloklash
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    
    window.addEventListener('popstate', handlePopState);
    window.history.pushState(null, '', window.location.href);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);
  
  // Foydalanuvchi ma'lumotlarini olish
  const getUserInfo = () => {
    try {
      // AuthContext dan user ma'lumotlarini olish
      if (user && user.role === 'cashier') {
        return {
          username: user.name || 'Kassir',
          isActive: true
        };
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
    return { username: 'Kassir', isActive: false };
  };
  
  const userInfo = getUserInfo();

  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Attendance ma'lumotlarini yuklash
  useEffect(() => {
    const checkAndUpdateAttendance = () => {
      const t = getTodayString();
      setTodayKey(t);
      const key = `attendance:kassa:${userInfo.username}:${t}`;
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : { arrived: 0, left: 0 };
      setAttendanceToday(parsed);
    };

    checkAndUpdateAttendance();

    const interval = setInterval(() => {
      const currentDate = getTodayString();
      if (currentDate !== todayKey) {
        checkAndUpdateAttendance();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [userInfo.username, todayKey]);

  const handleAttendance = async (type: 'arrived' | 'left') => {
    if (sending) return;
    // TEST REJIMI: Bir marta bosish cheklovi o'chirilgan
    // const key = `attendance:kassa:${userInfo.username}:${todayKey || getTodayString()}`;
    // const current = attendanceToday;
    // if ((type === 'arrived' && current.arrived >= 2) || (type === 'left' && current.left >= 2)) {
    //   await showAlert('Bugun ushbu amal maksimal 2 marta bajarilishi mumkin', 'Ogohlantirish', 'warning');
    //   return;
    // }
    
    try {
      setSending(type);
      await api.post('/telegram/attendance/kassa', { type, username: userInfo.username });
      await showAlert(
        type === 'arrived' ? 'Keldingiz xabari yuborildi' : 'Ketdingiz xabari yuborildi',
       'Muvaffaqiyatli',
       'success'
      );
      if (type === 'arrived') {
        const key = `attendance:kassa:${userInfo.username}:${todayKey || getTodayString()}`;
        const current = attendanceToday;
        const updated = { ...current, arrived: current.arrived + 1 };
        localStorage.setItem(key, JSON.stringify(updated));
        setAttendanceToday(updated);
      } else {
        const key = `attendance:kassa:${userInfo.username}:${todayKey || getTodayString()}`;
        const current = attendanceToday;
        const updated = { ...current, left: current.left + 1 };
        localStorage.setItem(key, JSON.stringify(updated));
        setAttendanceToday(updated);
        handleLogout();
        // handleLogout ichida allaqachon /login ga yo'naltirish bor
      }
    } catch (err: any) {
      await showAlert(
        err?.response?.data?.message || 'Xabar yuborishda xatolik',
        'Xatolik',
        'danger'
      );
    } finally {
      setSending(null);
    }
  };

  // CHIQISH FUNKSIYASI - AVTOMATIK
  const handleLogout = useCallback(() => {
    console.log('🔴 Kassa logout - avtomatik tozalash');
    
    // Barcha login ma'lumotlarini o'chirish
    localStorage.removeItem('kassaLoggedIn');
    localStorage.removeItem('kassaToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    console.log('🗑️ LocalStorage tozalandi');
    
    // Login sahifasiga yo'naltirish
    window.location.href = '/login';
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/kassa' || path === '/kassa/') return 'Kassa POS';
    if (path === '/kassa/pos' || path === '/kassa/kassa') return 'Kassa POS';
    if (path === '/kassa/receipts') return 'Cheklar';
    if (path === '/kassa/clients') return 'Mijozlar';
    return 'Kassa';
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 lg:hidden" 
          style={{ background: 'rgba(46, 16, 101, 0.6)', backdropFilter: 'blur(8px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop only */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, #2e1065 0%, #4c1d95 100%)',
          borderRight: '1px solid rgba(6, 182, 212, 0.2)',
          boxShadow: '4px 0 24px -4px rgba(46, 16, 101, 0.3)'
        }}
      >
        {/* Sidebar Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Kassa Panel</h1>
              <p className="text-xs text-cyan-300">{userInfo.username}</p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            to="/kassa/kassa"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === '/kassa/kassa' || location.pathname === '/kassa/pos'
                ? 'bg-cyan-500/20 text-white shadow-lg'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="font-semibold">Kassa POS</span>
          </Link>

          <Link
            to="/kassa/receipts"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === '/kassa/receipts'
                ? 'bg-cyan-500/20 text-white shadow-lg'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-semibold">Cheklar</span>
          </Link>

          <Link
            to="/kassa/clients"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === '/kassa/clients'
                ? 'bg-cyan-500/20 text-white shadow-lg'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="font-semibold">Mijozlar</span>
          </Link>

          <Link
            to="/kassa/debts"
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              location.pathname === '/kassa/debts'
                ? 'bg-cyan-500/20 text-white shadow-lg'
                : 'text-purple-200 hover:bg-white/10'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-semibold">Qarzlar</span>
          </Link>
        </nav>

        {/* Sidebar Footer - Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white rounded-xl transition-all font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span>Chiqish</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with Keldim/Ketdim buttons */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg lg:text-xl font-bold" style={{ color: '#2e1065' }}>
              {getPageTitle()}
            </h2>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Faol</span>
            </div>
          </div>

          {/* Keldim/Ketdim Tugmalari */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAttendance('arrived')}
              disabled={sending !== null}
              className="px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-md disabled:opacity-60 transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 12px -2px rgba(6, 182, 212, 0.4)'
              }}
            >
              {sending === 'arrived' ? '...' : 'Keldim'}
            </button>
            <button
              onClick={() => handleAttendance('left')}
              disabled={sending !== null}
              className="px-3 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold shadow-md disabled:opacity-60 transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.4)'
              }}
            >
              {sending === 'left' ? '...' : 'Ketdim'}
            </button>
          </div>
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-100/80 backdrop-blur-2xl border-t border-slate-200/60 z-50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
        <div className="grid grid-cols-4 h-[72px] max-w-lg mx-auto">
          {[
            { path: '/kassa/kassa', icon: Package, label: 'Kassa POS' },
            { path: '/kassa/receipts', icon: FileText, label: 'Cheklar' },
            { path: '/kassa/clients', icon: Users, label: 'Mijozlar' },
            { path: '/kassa/debts', icon: FileText, label: 'Qarzlar' }
          ].map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
                  active 
                    ? 'text-cyan-600' 
                    : 'text-slate-400 active:text-slate-600'
                }`}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full" />
                )}
                
                <div className={`p-2 rounded-2xl transition-all duration-300 ${
                  active 
                    ? 'bg-gradient-to-br from-cyan-50 to-cyan-100 shadow-sm' 
                    : 'hover:bg-slate-50'
                }`}>
                  <Icon className={`w-5 h-5 transition-all duration-300 ${
                    active ? 'scale-110 text-cyan-600' : ''
                  }`} />
                </div>
                <span className={`text-[10px] font-semibold transition-all duration-300 ${
                  active ? 'text-cyan-600' : 'text-slate-500'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        
        {/* Safe area padding for iOS */}
        <div className="h-safe-area-inset-bottom bg-slate-100/80" />
      </nav>

      {AlertComponent}
    </div>
  );
}
