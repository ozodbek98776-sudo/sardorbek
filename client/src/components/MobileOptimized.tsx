import React from 'react';

/**
 * Mobile-optimized grid component
 * Automatically adjusts columns based on screen size
 */
export const MobileGrid = ({ 
  children, 
  cols = { '2xs': 1, 'xs': 1, 'sm': 2, 'md': 3, 'lg': 4 },
  gap = 'gap-3'
}: { 
  children: React.ReactNode;
  cols?: Record<string, number>;
  gap?: string;
}) => {
  return (
    <div className={`grid ${gap} 2xs:grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized card component
 * Responsive padding and text sizes
 */
export const MobileCard = ({ 
  children, 
  className = '',
  onClick
}: { 
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        card
        2xs:p-2 2xs:rounded-lg
        xs:p-2.5 xs:rounded-lg
        sm:p-3 sm:rounded-xl
        md:p-4 md:rounded-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * Mobile-optimized button component
 * Touch-friendly with proper sizing
 */
export const MobileButton = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: { 
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  [key: string]: any;
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    success: 'btn-success'
  }[variant];

  const sizeClass = {
    sm: 'btn-sm 2xs:text-2xs 2xs:py-1.5 xs:text-xs xs:py-2',
    md: 'btn-md 2xs:text-xs 2xs:py-2 xs:text-sm xs:py-2.5',
    lg: 'btn-lg 2xs:text-sm 2xs:py-2.5 xs:text-base xs:py-3'
  }[size];

  return (
    <button 
      className={`${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Mobile-optimized input component
 */
export const MobileInput = ({ 
  className = '',
  ...props
}: { 
  className?: string;
  [key: string]: any;
}) => {
  return (
    <input 
      className={`
        input
        2xs:text-xs 2xs:py-2 2xs:px-2
        xs:text-xs xs:py-2 xs:px-2.5
        sm:text-sm sm:py-2.5 sm:px-3
        ${className}
      `}
      {...props}
    />
  );
};

/**
 * Mobile-optimized modal component
 * Full-screen on small devices
 */
export const MobileModal = ({ 
  isOpen, 
  onClose, 
  children,
  title
}: { 
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="overlay fixed inset-0 z-50 flex items-end 2xs:items-center xs:items-center sm:items-center">
      <div className="modal 2xs:w-full 2xs:rounded-t-2xl xs:w-full xs:rounded-t-2xl sm:w-auto sm:rounded-2xl 2xs:max-h-[90vh] xs:max-h-[90vh]">
        {title && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold 2xs:text-base xs:text-base">{title}</h2>
            <button 
              onClick={onClose}
              className="btn-icon-sm"
            >
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto 2xs:max-h-[calc(90vh-60px)] xs:max-h-[calc(90vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile-optimized table component
 * Horizontal scroll on small devices
 */
export const MobileTable = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`table-container 2xs:overflow-x-auto xs:overflow-x-auto sm:overflow-visible ${className}`}>
      <table className="w-full">
        {children}
      </table>
    </div>
  );
};

/**
 * Mobile-optimized stat card
 */
export const MobileStatCard = ({ 
  icon: Icon,
  label,
  value,
  suffix = '',
  trend,
  trendUp = true
}: { 
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  suffix?: string;
  trend?: string;
  trendUp?: boolean;
}) => {
  return (
    <MobileCard>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 2xs:text-2xs xs:text-xs sm:text-sm font-medium mb-1">
            {label}
          </p>
          <div className="flex items-baseline gap-1">
            <p className="font-bold 2xs:text-lg xs:text-xl sm:text-2xl">
              {value}
            </p>
            {suffix && (
              <span className="text-gray-500 2xs:text-2xs xs:text-xs">
                {suffix}
              </span>
            )}
          </div>
          {trend && (
            <p className={`text-2xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="stat-icon 2xs:w-8 2xs:h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10">
          <Icon className="w-4 h-4 2xs:w-3 2xs:h-3 xs:w-4 xs:h-4 text-purple-600" />
        </div>
      </div>
    </MobileCard>
  );
};

/**
 * Mobile-optimized product card
 */
export const MobileProductCard = ({ 
  image,
  name,
  code,
  price,
  quantity,
  onClick
}: { 
  image?: string;
  name: string;
  code: string;
  price: number;
  quantity: number;
  onClick?: () => void;
}) => {
  return (
    <MobileCard onClick={onClick} className="cursor-pointer hover:shadow-lg transition-shadow">
      {image && (
        <div className="w-full h-24 2xs:h-20 xs:h-24 sm:h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
          <img src={image} alt={name} className="w-full h-full object-cover" />
        </div>
      )}
      <div>
        <p className="font-semibold 2xs:text-xs xs:text-sm sm:text-base truncate">
          {name}
        </p>
        <p className="text-gray-500 2xs:text-2xs xs:text-xs">
          Kod: {code}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="font-bold text-purple-600 2xs:text-sm xs:text-base sm:text-lg">
            {price.toLocaleString()} UZS
          </p>
          <span className="badge badge-primary 2xs:text-2xs xs:text-xs">
            {quantity}
          </span>
        </div>
      </div>
    </MobileCard>
  );
};

/**
 * Mobile-optimized list item
 */
export const MobileListItem = ({ 
  title,
  subtitle,
  value,
  icon: Icon,
  onClick,
  className = ''
}: { 
  title: string;
  subtitle?: string;
  value?: string | number;
  icon?: React.ComponentType<any>;
  onClick?: () => void;
  className?: string;
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        flex items-center justify-between p-3 2xs:p-2 xs:p-2.5 sm:p-3
        border-b border-gray-100 hover:bg-gray-50 transition-colors
        cursor-pointer
        ${className}
      `}
    >
      <div className="flex items-center gap-3 2xs:gap-2 xs:gap-2.5 flex-1">
        {Icon && (
          <div className="flex-shrink-0">
            <Icon className="w-5 h-5 2xs:w-4 2xs:h-4 xs:w-4 xs:h-4 text-purple-600" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium 2xs:text-xs xs:text-sm sm:text-base truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-gray-500 2xs:text-2xs xs:text-xs truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {value && (
        <p className="font-semibold text-purple-600 2xs:text-xs xs:text-sm sm:text-base ml-2 flex-shrink-0">
          {value}
        </p>
      )}
    </div>
  );
};

/**
 * Mobile-optimized empty state
 */
export const MobileEmptyState = ({ 
  icon: Icon,
  title,
  description,
  action
}: { 
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 2xs:py-6 xs:py-8 sm:py-12 px-4">
      <div className="stat-icon 2xs:w-12 2xs:h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 mb-4">
        <Icon className="w-6 h-6 2xs:w-5 2xs:h-5 xs:w-6 xs:h-6 text-gray-400" />
      </div>
      <h3 className="font-semibold text-gray-900 2xs:text-sm xs:text-base sm:text-lg mb-1">
        {title}
      </h3>
      <p className="text-gray-500 text-center 2xs:text-2xs xs:text-xs sm:text-sm mb-4">
        {description}
      </p>
      {action && (
        <MobileButton onClick={action.onClick} size="sm">
          {action.label}
        </MobileButton>
      )}
    </div>
  );
};
