import { useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Product } from '../../types';
import { formatNumber } from '../../utils/format';
import { UPLOADS_URL } from '../../config/api';
import { Package2 } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: Product[];
  isSearching: boolean;
  showResults: boolean;
  onProductSelect: (product: Product) => void;
  onClose: () => void;
  stats?: {
    total: number;
    lowStock: number;
    outOfStock: number;
    totalValue: number;
  };
}

export function SearchBar({ 
  query, 
  onQueryChange, 
  results, 
  isSearching,
  showResults,
  onProductSelect,
  onClose,
  stats
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      if (e.key === 'Escape' && showResults) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showResults, onClose]);
  
  return (
    <div className="relative space-y-3">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 sm:p-3 border border-blue-200">
            <p className="text-[10px] sm:text-xs text-blue-600 font-semibold">Jami</p>
            <p className="text-lg sm:text-xl font-bold text-blue-700">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2 sm:p-3 border border-orange-200">
            <p className="text-[10px] sm:text-xs text-orange-600 font-semibold">Kam qolgan</p>
            <p className="text-lg sm:text-xl font-bold text-orange-700">{stats.lowStock}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-2 sm:p-3 border border-red-200">
            <p className="text-[10px] sm:text-xs text-red-600 font-semibold">Tugagan</p>
            <p className="text-lg sm:text-xl font-bold text-red-700">{stats.outOfStock}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 sm:p-3 border border-green-200">
            <p className="text-[10px] sm:text-xs text-green-600 font-semibold">Jami qiymat</p>
            <p className="text-sm sm:text-base font-bold text-green-700 truncate">{formatNumber(stats.totalValue)}</p>
          </div>
        </div>
      )}
      
      {/* Search Input */}
      <div className="relative group">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Mahsulot qidirish... (Ctrl+K)"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full pl-9 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-white border-2 border-slate-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 text-xs sm:text-sm transition-all"
        />
        {query && (
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg sm:rounded-xl border-2 border-slate-200 overflow-hidden shadow-lg z-50">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {results.length} ta natija
            </span>
            <button
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Yopish (Esc)
            </button>
          </div>
          
          <div className="max-h-64 sm:max-h-96 overflow-y-auto thin-scrollbar">
            {results.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {results.slice(0, 10).map(product => (
                  <button
                    key={product._id}
                    onClick={() => onProductSelect(product)}
                    disabled={product.quantity <= 0}
                    className={`w-full flex items-center gap-2 sm:gap-4 p-2 sm:p-4 hover:bg-slate-50 transition-colors text-left ${
                      product.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-100 to-brand-50 rounded-xl border-2 border-brand-200 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                      {product.quantity <= 0 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                          <span className="text-white text-[8px] font-bold">TUGAGAN</span>
                        </div>
                      )}
                      {product.images && product.images.length > 0 ? (
                        <img 
                          src={`${UPLOADS_URL}${product.images[0]}`}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              parent.innerHTML = '<svg class="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                            }
                          }}
                        />
                      ) : (
                        <Package2 className="w-5 h-5 sm:w-6 sm:h-6 text-brand-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate text-[10px] sm:text-xs">{product.name}</p>
                      <p className="text-[9px] sm:text-[10px] text-slate-500">Kod: {product.code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-brand-600 text-[10px] sm:text-xs">{formatNumber(product.price)} so'm</p>
                      <p className={`text-[9px] sm:text-[10px] font-semibold ${
                        product.quantity <= 0 ? 'text-red-600' : 
                        product.quantity <= 10 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {product.quantity} ta
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center text-slate-500">
                <Package2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-30" />
                <p className="text-xs sm:text-sm">Mahsulot topilmadi</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
