import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'cyan' | 'indigo' | 'yellow' | 'gray';
  onClick?: () => void;
  loading?: boolean;
  className?: string;
  subtitle?: string;
  badge?: string;
}

const colorClasses = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  green: {
    bg: 'from-green-500 to-green-600',
    light: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  orange: {
    bg: 'from-orange-500 to-orange-600',
    light: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  red: {
    bg: 'from-red-500 to-red-600',
    light: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
  },
  cyan: {
    bg: 'from-cyan-500 to-cyan-600',
    light: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
  },
  indigo: {
    bg: 'from-indigo-500 to-indigo-600',
    light: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
  },
  yellow: {
    bg: 'from-yellow-500 to-yellow-600',
    light: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
  },
  gray: {
    bg: 'from-gray-500 to-gray-600',
    light: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  onClick,
  loading = false,
  className = '',
  subtitle,
  badge,
}: StatCardProps) {
  const colors = colorClasses[color];
  
  const CardWrapper = onClick ? 'button' : 'div';
  
  return (
    <CardWrapper
      onClick={onClick}
      className={`
        group relative bg-white rounded-xl sm:rounded-2xl 
        p-5 sm:p-6 md:p-7 
        border ${colors.border}
        shadow-sm hover:shadow-lg
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-100' : ''}
        ${className}
      `}
    >
      {/* Gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${colors.bg} rounded-t-xl sm:rounded-t-2xl`} />
      
      {/* Content */}
      <div className="flex flex-col items-center text-center space-y-4">
        {/* Icon */}
        {Icon && (
          <div className={`
            flex-shrink-0
            w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 
            rounded-xl sm:rounded-2xl ${colors.light}
            flex items-center justify-center
            group-hover:scale-110 transition-transform duration-200
          `}>
            <Icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${colors.text}`} />
          </div>
        )}
        
        {/* Title */}
        <p className="text-sm sm:text-base font-medium text-gray-500">{title}</p>
        
        {/* Value */}
        <div className="w-full">
          {loading ? (
            <div className="h-10 sm:h-12 md:h-14 w-full bg-gray-200 animate-pulse rounded" />
          ) : (
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 break-words">{value}</p>
          )}
        </div>
        
        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-400">{subtitle}</p>
        )}
      </div>
    </CardWrapper>
  );
}
