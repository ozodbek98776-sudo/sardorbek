import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calculator, Users, FileText, Package, LogOut, Menu, X } from 'lucide-react';
import PWAInstallButton from '../components/PWAInstallButton.tsx';
import api from '../utils/api';
import { useAlert } from '../hooks/useAlert';

export default function KassaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sending, setSending] = useState<'arrived' | 'left' | null>(null);
  const [uiMode, setUiMode] = useState<'idle' | 'arrived'>('idle');
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
      const loginData = localStorage.getItem('kassaLoggedIn');
      if (loginData) {
        const parsed = JSON.parse(loginData);
        return {
          username: parsed.username || 'Kassa',
          isActive: true
        };
      }
    } catch (error) {
      console.error('Error getting user info:', error);
    }
    return { username: 'Kassa', isActive: false };
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
      setUiMode(parsed.arrived > 0 && parsed.left === 0 ? 'arrived' : 'idle');
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
        if (updated.arrived > 0 && updated.left === 0) {
          setUiMode('arrived');
        }
      } else {
        const key = `attendance:kassa:${userInfo.username}:${todayKey || getTodayString()}`;
        const current = attendanceToday;
        const updated = { ...current, left: current.left + 1 };
        localStorage.setItem(key, JSON.stringify(updated));
        setAttendanceToday(updated);
        handleLogout();
        window.location.replace('/kassa-login');
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
    // Kassa login ma'lumotlarini o'chirish
    localStorage.removeItem('kassaLoggedIn');
    localStorage.removeItem('kassaToken');
    
    // Kassa login sahifasiga yo'naltirish
    window.location.replace('/kassa-login');
  }, []);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/kassa' || path === '/kassa/') return 'Kassa';
    if (path === '/kassa/clients') return 'Mijozlar';
    if (path === '/kassa/products') return 'Tovarlar';
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

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{
        background: 'linear-gradient(180deg, #2e1065 0%, #4c1d95 100%)',
        borderRight: '1px solid rgba(6, 182, 212, 0.2)',
        boxShadow: '4px 0 24px -4px rgba(46, 16, 101, 0.3)'
      }}
      >
        {/* Logo/Header */}
        <div 
          className="p-5 flex items-center justify-between"
          style={{
            borderBottom: '1px solid rgba(6, 182, 212, 0.15)',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, transparent 100%)'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                boxShadow: '0 4px 12px -2px rgba(6, 182, 212, 0.4)'
              }}
            >
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Sardor Furnitura</h1>
              <p className="text-xs font-medium" style={{ color: '#c4b5fd' }}>Kassa tizimi</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-xl transition-colors"
            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#c4b5fd' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-1.5">
            {[
              { path: '/kassa', label: 'Kassa', icon: Calculator },
              { path: '/kassa/clients', label: 'Mijozlar', icon: Users },
              { path: '/kassa/debts', label: 'Qarz daftarcha', icon: FileText },
              { path: '/kassa/products', label: 'Tovarlar', icon: Package }
            ].map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsSidebarOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                style={{
                  background: location.pathname === path 
                    ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' 
                    : 'transparent',
                  color: location.pathname === path ? '#ffffff' : '#c4b5fd',
                  boxShadow: location.pathname === path ? '0 4px 12px -2px rgba(6, 182, 212, 0.4)' : 'none'
                }}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
        
        {/* User Profile Section */}
        <div 
          className="p-4"
          style={{
            borderTop: '1px solid rgba(6, 182, 212, 0.15)',
            background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.2) 100%)'
          }}
        >
          {/* Profile Card */}
          <div 
            className="rounded-2xl p-4 mb-3"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.15)'
            }}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                  boxShadow: '0 4px 12px -2px rgba(124, 58, 237, 0.4)'
                }}
              >
                <span className="text-base font-bold text-white">
                  {userInfo.username.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* User Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {userInfo.username === 'alisher' ? 'Namozov Alisher' : 
                   userInfo.username === 'kassa1' ? 'Kassa Xodimi' : 
                   userInfo.username === 'admin' ? 'Administrator' : 
                   userInfo.username}
                </h3>
                <p className="text-xs font-medium flex items-center gap-1" style={{ color: '#a5b4fc' }}>
                  <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                  Kassir • Faol
                </p>
              </div>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-semibold"
            style={{
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5'
            }}
            title="Kassa tizimidan chiqish"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 h-full">
        {/* Top Header */}
        <header 
          className="px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 245, 255, 0.95) 100%)',
            borderBottom: '1px solid rgba(91, 33, 182, 0.1)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 20px -4px rgba(46, 16, 101, 0.08)'
          }}
        >
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2.5 rounded-xl transition-colors"
            style={{ background: 'rgba(91, 33, 182, 0.08)', color: '#5b21b6' }}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <h2 className="text-lg lg:text-xl font-bold" style={{ color: '#2e1065' }}>
              {getPageTitle()}
            </h2>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium" style={{ color: '#6b7280' }}>Faol</span>
            </div>
          </div>
          
          {/* Install App Button */}
          <PWAInstallButton variant="navbar" />
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>

      {/* Keldim/Ketdim UI */}
      {uiMode === 'idle' && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'rgba(250, 245, 255, 0.7)', backdropFilter: 'blur(8px)' }} />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="mx-auto max-w-md flex gap-4">
              <button
                onClick={() => handleAttendance('arrived')}
                disabled={sending !== null}
                className="pointer-events-auto flex-1 px-6 py-4 rounded-2xl text-white font-bold shadow-lg disabled:opacity-60 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  boxShadow: '0 8px 24px -4px rgba(6, 182, 212, 0.4)'
                }}
              >
                {sending === 'arrived' ? 'Yuborilmoqda...' : 'Keldim'}
              </button>
              <button
                onClick={() => handleAttendance('left')}
                disabled={sending !== null}
                className="pointer-events-auto flex-1 px-6 py-4 rounded-2xl text-white font-bold shadow-lg disabled:opacity-60 transition-all"
                style={{
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  boxShadow: '0 8px 24px -4px rgba(220, 38, 38, 0.4)'
                }}
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
            disabled={sending !== null}
            className="px-3 py-2 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60 transition-all"
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
            className="px-3 py-2 rounded-xl text-white text-sm font-semibold shadow-md disabled:opacity-60 transition-all"
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              boxShadow: '0 4px 12px -2px rgba(220, 38, 38, 0.4)'
            }}
          >
            {sending === 'left' ? '...' : 'Ketdim'}
          </button>
        </div>
      )}
      {AlertComponent}
    </div>
  );
}
