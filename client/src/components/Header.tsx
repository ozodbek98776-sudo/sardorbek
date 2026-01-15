import { Search, ChevronDown, Bell, Settings } from 'lucide-react';
import { useState } from 'react';
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
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60 shadow-sm">
      <div className="px-2 sm:px-3 md:px-4 lg:px-6 h-12 sm:h-14 flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        {/* Title */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0 flex-shrink">
          <img 
            src="/o5sk1awh.png" 
            alt="Logo" 
            className="h-8 w-auto max-h-8"
          />
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 truncate">{title}</h1>
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
          <button className="hidden sm:block p-1.5 sm:p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all duration-200">
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          
          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </header>
  );
}
