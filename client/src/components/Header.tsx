import { Search, ChevronDown, Bell, Menu, X, Home, ShoppingCart, Users, BarChart3, Package2, Warehouse, FileText, UserCircle, QrCode, ChevronRight, LogOut, LogIn } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import DebtApprovalNotification from './DebtApprovalNotification';
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [lastAttendance, setLastAttendance] = useState<'in' | 'out' | null>(
    localStorage.getItem('lastAttendance') as 'in' | 'out' | null
  );
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

  const handleAttendance = async () => {
    if (attendanceLoading) return;
    
    const type = lastAttendance === 'in' ? 'out' : 'in';
    setAttendanceLoading(true);

    try {
      // Kassa user uchun
      if (user?.role === 'cashier' || user?.role === 'helper') {
        await api.post('/telegram/attendance/kassa', {
          type,
          username: user.name
        });
      } else {
        // Admin uchun
        await api.post('/telegram/attendance', { type });
      }

      setLastAttendance(type);
      localStorage.setItem('lastAttendance', type);
      
      // Success feedback
      const message = type === 'in' ? '✅ Keldim!' : '👋 Ketdim!';
      alert(message);
    } catch (error) {
      console.error('Attendance error:', error);
      alert('Xatolik yuz berdi');
    } finally {
      setAttendanceLoading(false);
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
    { icon: UserCircle, label: 'Hodimlar', path: '/admin/helpers' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-100 border-b border-slate-200/60 shadow-sm">
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

            {/* Keldim/Ketdim Button */}
            <button
              onClick={handleAttendance}
              disabled={attendanceLoading}
              className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 flex-shrink-0 text-xs sm:text-sm font-semibold disabled:opacity-50 ${
                lastAttendance === 'in'
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
              }`}
              title={lastAttendance === 'in' ? 'Ketdim' : 'Keldim'}
            >
              {attendanceLoading ? (
                <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : lastAttendance === 'in' ? (
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              ) : (
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              )}
              <span className="hidden xs:inline">{lastAttendance === 'in' ? 'Ketdim' : 'Keldim'}</span>
            </button>

            {/* Settings - REMOVED (Task 28) */}

            {/* Logout Button - Visible on all screens */}
            {showLogout && (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 flex-shrink-0 text-xs sm:text-sm font-semibold"
                title="Chiqish"
              >
                <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xs:inline">Chiqish</span>
              </button>
            )}
            
            {/* Custom Actions */}
            {actions}
          </div>
        </div>
      </header>

      {/* Dropdown Search Bar - X tugma yonida */}
      {showSearch && searchOpen && (
        <div className="fixed top-10 sm:top-12 md:top-14 right-1.5 sm:right-3 md:right-4 lg:right-6 z-50 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-brand-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Qidirish..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-64 sm:w-80 md:w-96 h-10 sm:h-11 pl-10 sm:pl-11 pr-10 sm:pr-11 rounded-xl border-2 border-slate-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all duration-200 text-sm sm:text-base text-slate-900 placeholder:text-slate-400 bg-white shadow-lg hover:border-brand-300"
            />
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
                onSearch?.('');
              }}
              className="absolute right-3 sm:right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* Sidebar Menu - Chap tarafdan */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50"
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
