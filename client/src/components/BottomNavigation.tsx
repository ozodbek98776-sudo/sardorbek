import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Admin panelda yoki kassir panelda ekanligini aniqlash
  const isInAdminPanel = location.pathname.startsWith('/admin');
  const isInKassaPanel = location.pathname.startsWith('/kassa');

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Bosh sahifa', exact: true },
    { 
      path: isInAdminPanel ? '/admin/kassa' : '/kassa/kassa',
      icon: ShoppingCart, 
      label: 'Kassa',
      onClick: () => {
        // Admin panelda bo'lsa admin kassa, kassir panelda bo'lsa kassir kassa
        if (isInAdminPanel) {
          navigate('/admin/kassa');
        } else {
          navigate('/kassa/kassa');
        }
      }
    },
    { path: '/admin/products', icon: Package, label: 'Tovarlar' },
    { path: '/admin/debts', icon: Receipt, label: 'Qarzlar' }
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    // Kassa uchun maxsus tekshirish
    if (path === '/admin/kassa' || path === '/kassa/kassa') {
      return location.pathname === '/admin/kassa' || 
             location.pathname === '/kassa/kassa';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-100/80 backdrop-blur-2xl border-t border-slate-200/60 z-50 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]">
      <div className="grid grid-cols-4 h-[72px] max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.exact);
          
          return (
            <button
              key={item.path}
              onClick={() => item.onClick ? item.onClick() : navigate(item.path)}
              className={`relative flex flex-col items-center justify-center gap-0.5 transition-all duration-300 ${
                active 
                  ? 'text-blue-600' 
                  : 'text-slate-400 active:text-slate-600'
              }`}
            >
              {/* Active indicator */}
              {active && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
              )}
              
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                active 
                  ? 'bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm' 
                  : 'hover:bg-slate-50'
              }`}>
                <Icon className={`w-5 h-5 transition-all duration-300 ${
                  active ? 'scale-110 text-blue-600' : ''
                }`} />
              </div>
              <span className={`text-[10px] font-semibold transition-all duration-300 ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom bg-slate-100/80" />
    </nav>
  );
}
