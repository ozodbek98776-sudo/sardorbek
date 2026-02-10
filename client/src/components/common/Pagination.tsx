import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageNumbers = true,
  className = '',
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="
          flex items-center gap-2 px-4 py-2
          border border-gray-300 rounded-lg
          text-sm font-medium text-gray-700
          hover:bg-gray-50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Oldingi</span>
      </button>
      
      {/* Page Numbers */}
      {showPageNumbers && (
        <div className="flex items-center gap-2">
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`
                w-10 h-10 rounded-lg
                text-sm font-medium
                transition-colors
                ${page === currentPage
                  ? 'bg-brand-600 text-white'
                  : page === '...'
                  ? 'cursor-default'
                  : 'hover:bg-gray-100 text-gray-700'
                }
              `}
            >
              {page}
            </button>
          ))}
        </div>
      )}
      
      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="
          flex items-center gap-2 px-4 py-2
          border border-gray-300 rounded-lg
          text-sm font-medium text-gray-700
          hover:bg-gray-50
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        "
      >
        <span className="hidden sm:inline">Keyingi</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
