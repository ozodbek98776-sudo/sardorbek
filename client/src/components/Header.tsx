import { Search, ChevronDown, Menu, X, Home, ShoppingCart, Users, BarChart3, Package2, Warehouse, FileText, UserCircle, QrCode, ChevronRight, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

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
  showLogout?: boolean;
}

export default function Header({ title, showSearch, onSearch, actions, filterOptions, filterValue, onFilterChange, showLogout }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Avtomatik logout - tasdiqlash so'ramasdan
    console.log('🔴 Header logout - avtomatik tozalash');
    
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('🗑️ LocalStorage tozalandi');
    
    // Force reload to login page
    window.location.href = '/login';
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
    { icon: ShoppingCart, label: 'Kassa', path: '/kassa/pos' }, // External link
    { icon: Users, label: 'Mijozlar', path: '/admin/customers' },
    { icon: FileText, label: 'Qarzlar', path: '/admin/debts' },
    { icon: UserCircle, label: 'Hodimlar', path: '/admin/helpers' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-100 border-b border-slate-200/60 shadow-sm">
        <div className="px-1 sm:px-2 h-12 sm:h-14 flex items-center justify-between gap-1 sm:gap-2">
          {/* Sidebar Toggle Button - Hamburger icon - Only visible on mobile/tablet */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="lg:hidden p-1.5 sm:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors active:scale-95 flex-shrink-0 flex items-center justify-center"
            style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
            title="Menyuni ochish"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search Input - Inline in header */}
          {showSearch ? (
            <div className="flex-1 max-w-lg relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full h-10 sm:h-11 md:h-12 pl-10 sm:pl-12 pr-10 sm:pr-12 rounded-xl border border-slate-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:bg-white transition-all duration-200 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    onSearch?.('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1" />
          )}
          
          {/* Right Section */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4 flex-shrink-0">
            {/* Filter Dropdown */}
            {filterOptions && filterOptions.length > 0 && (
              <div className="relative hidden sm:block">
                <select
                  value={filterValue}
                  onChange={(e) => onFilterChange?.(e.target.value)}
                  className="appearance-none pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer transition-all duration-200"
                >
                  {filterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Logout Button - Visible on all screens */}
            {showLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 flex-shrink-0 text-sm sm:text-base font-semibold"
                title="Chiqish"
              >
                <LogOut className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                <span className="hidden xs:inline">Chiqish</span>
              </button>
            )}
            
            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </header>

      {/* Sidebar Menu - Chap tarafdan */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-[70]"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* Menu Panel - LEFT SIDE */}
          <div className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-white z-[80] shadow-2xl animate-slide-in-left">
            {/* Menu Header */}
            <div className="bg-gradient-to-r from-brand-500 to-brand-600 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <img src="/o5sk1awh.png" alt="Logo" className="w-8 h-8 rounded-lg border-2 border-white/30" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">Sardor Furnitura</h2>
                    <p className="text-brand-100 text-xs">Mebel furniturasi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setMenuOpen(false)}
                  className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Menu Items */}
            <div className="overflow-y-auto h-[calc(100vh-140px)] p-3">
              <div className="space-y-0.5">
                {menuItems.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-50 transition-colors group"
                    >
                      <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center group-hover:bg-brand-50 group-hover:scale-110 transition-all">
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
              <div className="mt-4 p-3 bg-gradient-to-br from-red-50 to-red-100/50 rounded-xl border border-red-200">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user?.name?.charAt(0).toUpperCase() || 'A'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-surface-900">
                      {user?.name || 'Foydalanuvchi'}
                    </p>
                    <p className="text-xs text-surface-500">
                      {user?.role === 'admin' ? 'Administrator' : 'Foydalanuvchi'}
                    </p>
                  </div>
                </div>
                
                {/* Logout Button - Ko'zga tashlanadigan */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 font-semibold"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
