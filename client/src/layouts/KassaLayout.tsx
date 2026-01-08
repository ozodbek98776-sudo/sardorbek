import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calculator, Users, FileText, Package, LogOut, Menu, X } from 'lucide-react';
import PWAInstallButton from '../components/PWAInstallButton.tsx';

export default function KassaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Navigate funksiyasini memoize qilish
  const navigateToLogin = useCallback(() => {
    navigate('/login', { replace: true });
  }, [navigate]);
  
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

  // CHIQISH FUNKSIYASI - AVTOMATIK
  const handleLogout = useCallback(() => {
    // Kassa login ma'lumotlarini o'chirish
    localStorage.removeItem('kassaLoggedIn');
    localStorage.removeItem('kassaToken');
    
    // Avtomatik login sahifasiga yo'naltirish
    navigateToLogin();
  }, [navigateToLogin]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/kassa' || path === '/kassa/') return 'Kassa';
    if (path === '/kassa/clients') return 'Mijozlar';
    if (path === '/kassa/products') return 'Tovarlar';
    return 'Kassa';
  };

  return (
    <div className="h-screen bg-surface-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo/Header */}
        <div className="p-4 lg:p-6 border-b border-surface-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-surface-900">Sardor Furnitura</h1>
            <p className="text-sm text-surface-500">Kassa tizimi</p>
          </div>
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { path: '/kassa', label: 'Kassa', icon: Calculator },
              { path: '/kassa/clients', label: 'Mijozlar', icon: Users },
              { path: '/kassa/debts', label: 'Qarz daftarcha', icon: FileText },
              { path: '/kassa/products', label: 'Tovarlar', icon: Package }
            ].map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile when navigating
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  location.pathname === path
                    ? 'bg-brand-100 text-brand-700'
                    : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
        
        {/* User Profile Section */}
        <div className="p-3 border-t border-surface-200">
          {/* Profile Card - Compact Design */}
          <div className="bg-white rounded-2xl p-3 mb-3 border border-surface-200 shadow-sm">
            <div className="flex items-center gap-3">
              {/* Avatar - Smaller */}
              <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-white">
                  {userInfo.username.charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* User Info - Compact */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">
                  {userInfo.username === 'alisher' ? 'Namozov Alisher' : 
                   userInfo.username === 'kassa1' ? 'Kassa Xodimi' : 
                   userInfo.username === 'admin' ? 'Administrator' : 
                   userInfo.username}
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-tight">
                  Kassir
                </p>
              </div>
            </div>
          </div>
          
          {/* Logout Button - Smaller */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors text-xs font-medium"
            title="Kassa tizimidan chiqish"
          >
            <LogOut className="w-3.5 h-3.5" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0 h-full">
        {/* Top Header */}
        <header className="bg-white border-b border-surface-200 px-4 lg:px-6 h-14 lg:h-16 flex items-center justify-between flex-shrink-0">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-surface-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <h2 className="text-lg lg:text-xl font-semibold text-surface-900">
            {getPageTitle()}
          </h2>
          
          {/* Install App Button */}
          <PWAInstallButton variant="navbar" />
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}