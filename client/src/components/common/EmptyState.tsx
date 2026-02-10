import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-8 sm:py-12 px-4 ${className}`}>
      {/* Icon or Emoji */}
      <div className="mb-3 sm:mb-4">
        {Icon ? (
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
          </div>
        ) : emoji ? (
          <div className="text-4xl sm:text-6xl mb-2">{emoji}</div>
        ) : null}
      </div>
      
      {/* Title */}
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {/* Description */}
      {description && (
        <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      
      {/* Action */}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
