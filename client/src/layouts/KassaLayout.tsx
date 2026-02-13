import { useState, useCallback, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAlert } from '../hooks/useAlert';
import { useAuth } from '../context/AuthContext';
import Sidebar, { cashierMenuItems } from '../components/Sidebar';

export default function KassaLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [sending, setSending] = useState<'arrived' | 'left' | null>(null);
  const { showAlert, AlertComponent } = useAlert();
  const [attendanceToday, setAttendanceToday] = useState<{ arrived: number; left: number }>({ arrived: 0, left: 0 });
  const [todayKey, setTodayKey] = useState<string>('');

  const handleMenuToggle = () => {
    if ((window as any).toggleSidebar) {
      (window as any).toggleSidebar();
    }
  };
  
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

  const handleLogout = useCallback(() => {
    console.log('🔴 Kassa logout - avtomatik tozalash');
    localStorage.removeItem('kassaLoggedIn');
    localStorage.removeItem('kassaToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🗑️ LocalStorage tozalandi');
    window.location.href = '/login';
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
      {/* Sidebar */}
      <Sidebar 
        items={cashierMenuItems} 
        basePath="/kassa" 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      {/* Main Content */}
      <main className={`
        transition-all duration-300 ease-smooth
        ${collapsed ? 'lg:ml-0' : 'lg:ml-64'}
        ml-0
        min-h-screen
        p-0 m-0
      `}>
        {/* Header with Keldim/Ketdim buttons */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={handleMenuToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg lg:text-xl font-bold" style={{ color: '#2e1065' }}>
              Kassa Panel
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
        <div className="w-full h-full">
          <Outlet context={{ onMenuToggle: handleMenuToggle }} />
        </div>
      </main>

      {AlertComponent}
    </div>
  );
}
