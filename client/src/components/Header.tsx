import { Search, ChevronDown, Bell, Settings, Menu, X, Home, ShoppingCart, Users, BarChart3, Package2, Warehouse, FileText, UserCircle, QrCode, ChevronRight, LogOut, Receipt } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  // Search ochilganda focus qilish
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

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
    { icon: Receipt, label: 'Cheklar', path: '/admin/staff-receipts' },
    { icon: UserCircle, label: 'Hodimlar', path: '/admin/helpers' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
        <div className="px-1.5 sm:px-3 md:px-4 lg:px-6 h-10 sm:h-12 md:h-14 flex items-center justify-between gap-1 sm:gap-2 md:gap-3 lg:gap-4">
          {/* Sidebar Toggle Button - Hamburger icon - Only visible on mobile/tablet */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-0.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors active:scale-95 flex-shrink-0 flex items-center justify-center"
            style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
            title="Menyuni ochish"
          >
            <Menu className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
          </button>

          {/* Logo removed - space for other elements */}
          <div className="flex-1" />
          
          {/* Right Section */}
          <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2 lg:gap-3 flex-shrink-0">
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

            {/* Search Icon Button */}
            {showSearch && (
              <button 
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex items-center justify-center p-0.5 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200 flex-shrink-0"
                style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px' }}
                title="Qidirish"
              >
                <Search className="w-3.5 h-3.5" style={{ width: '14px', height: '14px' }} />
              </button>
            )}

            {/* Notifications */}
            {isAdmin ? (
              <DebtApprovalNotification />
            ) : (
              <button className="relative p-0.5 sm:p-1.5 md:p-2 rounded-md sm:rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200 flex-shrink-0 flex items-center justify-center">
                <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
                <div className="absolute -top-0.5 -right-0.5 w-1.5 sm:w-2 h-1.5 sm:h-2 bg-red-500 rounded-full" />
              </button>
            )}

            {/* Settings - hidden on very small screens */}
            <button 
              onClick={() => navigate('/admin/settings')}
              className="hidden sm:flex items-center justify-center p-1.5 md:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200 flex-shrink-0"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Logout Button removed */}
            
            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </header>

      {/* Dropdown Search Bar - Navbar ostida */}
      {showSearch && searchOpen && (
        <div className="sticky top-10 sm:top-12 md:top-14 z-30 bg-white border-b border-slate-200 shadow-lg animate-fade-in">
          <div className="px-3 sm:px-4 md:px-6 py-3">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('header.search')}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all duration-200 placeholder:text-slate-400"
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setSearchQuery('');
                  onSearch?.('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Menu - Chap tarafdan */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60]"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel - LEFT SIDE */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-[70] shadow-2xl animate-slide-in-left">
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
