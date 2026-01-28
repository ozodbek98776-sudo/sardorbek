import { Search, ChevronDown, Bell, Settings, Menu, X, Home, ShoppingCart, Users, BarChart3, Package2, Warehouse, FileText, UserCircle, QrCode, ChevronRight, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DebtApprovalNotification from './DebtApprovalNotification';

interface FilterOption {
  value: string;
  label: string;
}

interface HeaderProps {
  title: string;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  actions?: React.ReactNode;
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
}

export default function Header({ title, showSearch, onSearch, actions, filterOptions, filterValue, onFilterChange }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    if (window.confirm('Tizimdan chiqmoqchimisiz?')) {
      logout();
      navigate('/login');
    }
  };

  // Menu ochilganda body scroll ni to'xtatish
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const menuItems = [
    { icon: Home, label: 'Bosh sahifa', path: '/' },
    { icon: Package2, label: 'Mahsulotlar', path: '/admin/products' },
    { icon: ShoppingCart, label: 'Kassa', path: '/admin/kassa' },
    { icon: Users, label: 'Mijozlar', path: '/admin/customers' },
    { icon: FileText, label: 'Qarzlar', path: '/admin/debts' },
    { icon: FileText, label: 'Cheklar', path: '/admin/staff-receipts' },
    { icon: UserCircle, label: 'Hodimlar', path: '/admin/helpers' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="px-2 sm:px-3 md:px-4 lg:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
          {/* Mobile Menu Button - Faqat mobilda ko'rinadi */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
            <div className="flex flex-col items-center gap-1">
              <img 
                src="/o5sk1awh.png" 
                alt="Logo" 
                className="h-7 w-auto max-h-7 sm:h-8 sm:max-h-8 rounded-xl border-2 border-slate-200"
              />
              <h1 className="text-[10px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">{title}</h1>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-500 font-medium">{t('header.live')}</span>
            </div>
          </div>
          
          {/* Right Section */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
            {/* Filter Dropdown */}
            {filterOptions && filterOptions.length > 0 && (
              <div className="relative hidden sm:block">
                <select
                  value={filterValue}
                  onChange={(e) => onFilterChange?.(e.target.value)}
                  className="appearance-none pl-2 sm:pl-3 pr-6 sm:pr-8 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-all duration-200"
                >
                  {filterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Search */}
            {showSearch && (
              <div className="relative group">
                <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder={t('header.search')}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-24 sm:w-32 md:w-48 lg:w-64 pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 placeholder:text-slate-400"
                />
              </div>
            )}

            {/* Notifications */}
            {isAdmin ? (
              <DebtApprovalNotification />
            ) : (
              <button className="relative p-1.5 sm:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-500 rounded-full" />
              </button>
            )}

            {/* Settings - hidden on very small screens */}
            <button 
              onClick={() => navigate('/admin/settings')}
              className="hidden sm:block p-1.5 sm:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200"
            >
              <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Logout Button */}
            <button 
              onClick={handleLogout}
              className="flex items-center justify-center p-1.5 sm:p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200"
              title="Chiqish"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            
            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </header>

      {/* Hamburger Menu - Faqat mobilda */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white z-50 shadow-2xl lg:hidden">
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    <img src="/o5sk1awh.png" alt="Logo" className="w-8 h-8 rounded-lg border-2 border-white/30" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Sardor Furnitura</h2>
                    <p className="text-brand-100 text-xs">Mebel furniturasi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] p-4">
              <div className="space-y-1">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-surface-50 transition-colors group"
                    >
                      <div className="w-11 h-11 bg-surface-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-110 transition-all">
                        <Icon className="w-5 h-5 text-surface-600 group-hover:text-brand-600" />
                      </div>
                      <span className="font-medium text-surface-900 group-hover:text-brand-600 transition-colors">
                        {item.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-surface-300 ml-auto group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>

              {/* Footer Info */}
              <div className="mt-6 p-4 bg-surface-50 rounded-xl">
                <p className="text-xs text-surface-500 text-center mb-2">
                  {user?.name || 'Foydalanuvchi'}
                </p>
                <p className="text-xs text-surface-400 text-center mb-4">
                  {new Date().toLocaleDateString('uz-UZ', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                
                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Chiqish</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
