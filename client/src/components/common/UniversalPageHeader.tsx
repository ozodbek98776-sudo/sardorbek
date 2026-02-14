import { ReactNode } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import SearchInput from './SearchInput';
import FilterDropdown, { FilterOption } from './FilterDropdown';

export interface UniversalPageHeaderProps {
  title: string;
  
  // Search
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  
  // Filter
  filterOptions?: FilterOption[];
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  
  // Actions
  actions?: ReactNode;
  
  // Navigation
  onMenuToggle?: () => void;
  onBack?: () => void; // Orqaga tugmasi
  
  className?: string;
}

export default function UniversalPageHeader({
  title,
  showSearch,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  filterOptions,
  filterValue = '',
  onFilterChange,
  actions,
  onMenuToggle,
  onBack,
  className = '',
}: UniversalPageHeaderProps) {
  return (
    <div className={`bg-white border-b border-gray-200 sticky top-0 z-30 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        {/* Top Row: Hamburger/Back + Title + Actions */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Back Button yoki Hamburger Button */}
            {onBack ? (
              <button
                onClick={onBack}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors active:scale-95 flex-shrink-0"
                title="Orqaga"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : onMenuToggle ? (
              <button
                onClick={onMenuToggle}
                className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors active:scale-95 flex-shrink-0 shadow-md"
                title="Menyuni ochish/yopish"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : null}
            
            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
              {title}
            </h1>
          </div>
          
          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
        
        {/* Bottom Row: Search + Filter */}
        {(showSearch || filterOptions) && (
          <div className="flex flex-col sm:flex-row gap-3">
            {showSearch && onSearchChange && (
              <div className="flex-1">
                <SearchInput
                  value={searchValue}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                />
              </div>
            )}
            
            {filterOptions && onFilterChange && (
              <div className="w-full sm:w-48">
                <FilterDropdown
                  options={filterOptions}
                  value={filterValue}
                  onChange={onFilterChange}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
