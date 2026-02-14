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
  onMenuToggle?: () => void; // Sidebar toggle uchun
}

export default function Header({ title, showSearch, onSearch, actions, filterOptions, filterValue, onFilterChange, showLogout, onMenuToggle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-slate-100 border-b border-slate-200/60 shadow-sm">
        <div className="px-1 sm:px-2 h-12 sm:h-14 flex items-center justify-between gap-1 sm:gap-2">
          {/* Hamburger Button - mobile va desktop'da ko'rinadi */}
          {onMenuToggle && (
            <button 
              onClick={onMenuToggle}
              className="p-1.5 sm:p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors active:scale-95 flex-shrink-0 flex items-center justify-center shadow-md"
              style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
              title="Menyuni ochish/yopish"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

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
    </>
  );
}
