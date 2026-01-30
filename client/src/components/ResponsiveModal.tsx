import React from 'react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closeButton?: boolean;
  className?: string;
}

/**
 * Fully responsive modal component
 * - Bottom sheet on mobile (320px-640px)
 * - Centered modal on tablet and desktop (641px+)
 * - Sticky header and footer with scroll
 * - Touch-friendly sizing
 */
export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  closeButton = true,
  className = ''
}: ResponsiveModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    fullscreen: 'max-w-none w-full'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10 transition-opacity duration-100"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.1s ease-out' }}
      />

      {/* Modal Container */}
      <div
        className={`
          bg-white w-full sm:w-auto
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl
          max-h-[90vh] sm:max-h-[95vh]
          overflow-hidden
          flex flex-col
          ${sizeClasses[size]}
          ${size === 'fullscreen' ? 'h-full sm:h-auto' : ''}
          ${className}
        `}
        style={{ 
          animation: 'modalSlideUp 0.1s ease-out',
          willChange: 'transform, opacity'
        }}
      >
        {/* Header */}
        {(title || closeButton) && (
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-surface-100">
            <div className="flex items-start justify-between p-4 sm:p-6 gap-4">
              <div className="flex-1 min-w-0">
                {title && (
                  <h3 className="text-lg sm:text-xl font-bold text-surface-900 truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-sm text-surface-500 mt-1 truncate">
                    {subtitle}
                  </p>
                )}
              </div>
              {closeButton && (
                <button
                  onClick={onClose}
                  className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur-sm border-t border-surface-100">
            <div className="p-4 sm:p-6">
              {footer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
