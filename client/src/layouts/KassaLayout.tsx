import { useCallback, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { Calculator, Users, FileText, Package, User, LogOut } from 'lucide-react';

export default function KassaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Navigate funksiyasini memoize qilish
  const navigateToLogin = useCallback(() => {
    navigate('/kassa-login', { replace: true });
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

  // CHIQISH FUNKSIYASI
  const handleLogout = useCallback(() => {
    const confirmLogout = window.confirm('Kassa tizimidan chiqishni xohlaysizmi?');
    if (confirmLogout) {
      // Kassa login ma'lumotlarini o'chirish
      localStorage.removeItem('kassaLoggedIn');
      localStorage.removeItem('kassaToken');
      
      // Login sahifasiga yo'naltirish
      navigateToLogin();
    }
  }, [navigateToLogin]);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/kassa' || path === '/kassa/') return 'Kassa';
    if (path === '/kassa/clients') return 'Mijozlar';
    if (path === '/kassa/debts') return 'Qarz daftarcha';
    if (path === '/kassa/products') return 'Tovarlar';
    if (path === '/kassa/staff') return 'Ishchilar';
    return 'Kassa';
  };

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-surface-200 flex flex-col">
        {/* Logo/Header */}
        <div className="p-6 border-b border-surface-200">
          <h1 className="text-lg font-bold text-surface-900">Sardor Furnitura</h1>
          <p className="text-sm text-surface-500">Kassa tizimi</p>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {[
              { path: '/kassa', label: 'Kassa', icon: Calculator },
              { path: '/kassa/clients', label: 'Mijozlar', icon: Users },
              { path: '/kassa/debts', label: 'Qarz daftarcha', icon: FileText },
              { path: '/kassa/products', label: 'Tovarlar', icon: Package },
              { path: '/kassa/staff', label: 'Ishchilar', icon: User }
            ].map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
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
        
        {/* User Info & Logout */}
        <div className="p-4 border-t border-surface-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-900">{userInfo.username}</p>
              <p className="text-xs text-success-600 font-medium">🟢 Faol sessiya</p>
            </div>
          </div>
          
          {/* Chiqish tugmasi */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded-lg transition-colors text-sm"
            title="Kassa tizimidan chiqish"
          >
            <LogOut className="w-4 h-4" />
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-surface-200 px-6 h-16 flex items-center">
          <h2 className="text-xl font-semibold text-surface-900">
            {getPageTitle()}
          </h2>
        </header>
        
        {/* Content Area */}
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}