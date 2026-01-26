import React from 'react';

/**
 * Mobile-optimized Kassa layout wrapper
 * Ensures proper spacing and responsiveness for Kassa page
 */
export const MobileKassaLayout = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      w-full min-h-screen
      2xs:p-2 xs:p-3 sm:p-4 md:p-6 lg:p-8
      2xs:pb-[100px] xs:pb-[100px] sm:pb-[100px] md:pb-6 lg:pb-8
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized Kassa grid for cart and search
 */
export const MobileKassaGrid = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      grid
      2xs:grid-cols-1 xs:grid-cols-1 sm:grid-cols-1
      md:grid-cols-3 lg:grid-cols-4
      gap-3 2xs:gap-2 xs:gap-2.5 sm:gap-3
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized cart section
 */
export const MobileCartSection = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      2xs:col-span-1 xs:col-span-1 sm:col-span-1
      md:col-span-3 lg:col-span-4
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized product search section
 */
export const MobileSearchSection = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      2xs:col-span-1 xs:col-span-1 sm:col-span-1
      md:col-span-3 lg:col-span-4
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized product grid
 */
export const MobileProductGrid = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      grid
      2xs:grid-cols-2 xs:grid-cols-2 sm:grid-cols-3
      md:grid-cols-4 lg:grid-cols-5
      gap-2 2xs:gap-1.5 xs:gap-2 sm:gap-2.5
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized cart item
 */
export const MobileCartItem = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      bg-white rounded-lg p-2 2xs:p-1.5 xs:p-2 sm:p-3
      border border-gray-200
      2xs:text-xs xs:text-xs sm:text-sm
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized payment modal
 */
export const MobilePaymentModal = ({ 
  isOpen,
  onClose,
  children
}: { 
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end 2xs:items-center xs:items-center sm:items-center">
      <div className="
        bg-white w-full 2xs:w-full xs:w-full sm:w-full md:w-auto
        rounded-t-2xl 2xs:rounded-t-xl xs:rounded-t-xl sm:rounded-2xl
        p-4 2xs:p-3 xs:p-3 sm:p-4
        max-h-[90vh] overflow-y-auto
        md:rounded-2xl md:max-w-md
      ">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
};

/**
 * Mobile-optimized summary card
 */
export const MobileSummaryCard = ({ 
  label,
  value,
  className = ''
}: { 
  label: string;
  value: string | number;
  className?: string;
}) => {
  return (
    <div className={`
      bg-gradient-to-br from-purple-50 to-blue-50
      rounded-lg p-3 2xs:p-2 xs:p-2.5 sm:p-3
      border border-purple-200
      ${className}
    `}>
      <p className="text-gray-600 2xs:text-xs xs:text-xs sm:text-sm font-medium mb-1">
        {label}
      </p>
      <p className="font-bold text-purple-600 2xs:text-lg xs:text-xl sm:text-2xl">
        {value}
      </p>
    </div>
  );
};

/**
 * Mobile-optimized action buttons row
 */
export const MobileActionButtons = ({ 
  children,
  className = ''
}: { 
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`
      grid grid-cols-2 gap-2 2xs:gap-1.5 xs:gap-2 sm:gap-3
      ${className}
    `}>
      {children}
    </div>
  );
};

/**
 * Mobile-optimized full-width button
 */
export const MobileFullButton = ({ 
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  className = ''
}: { 
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  disabled?: boolean;
  className?: string;
}) => {
  const variantClass = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white'
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full
        py-3 2xs:py-2 xs:py-2.5 sm:py-3
        px-4 2xs:px-3 xs:px-3 sm:px-4
        rounded-lg 2xs:rounded-md xs:rounded-lg sm:rounded-lg
        font-semibold 2xs:text-sm xs:text-sm sm:text-base
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClass}
        ${className}
      `}
    >
      {children}
    </button>
  );
};
