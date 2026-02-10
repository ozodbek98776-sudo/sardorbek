import { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  enabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  enabled = true,
  threshold = 80 
}: PullToRefreshProps) {
  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh,
    threshold,
    enabled
  });

  const progress = Math.min((pullDistance / threshold) * 100, 100);
  const rotation = (pullDistance / threshold) * 360;

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-50"
        style={{
          height: `${Math.min(pullDistance, threshold * 1.5)}px`,
          opacity: pullDistance > 0 ? 1 : 0
        }}
      >
        <div className="bg-white rounded-full p-3 shadow-lg">
          <RefreshCw 
            className={`w-6 h-6 text-brand-500 transition-transform ${
              isRefreshing ? 'animate-spin' : ''
            }`}
            style={{
              transform: isRefreshing ? undefined : `rotate(${rotation}deg)`
            }}
          />
        </div>
      </div>

      {/* Progress bar */}
      {pullDistance > 0 && !isRefreshing && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-200 z-50"
          style={{
            width: `${progress}%`,
            opacity: progress / 100
          }}
        />
      )}

      {/* Content */}
      <div
        style={{
          transform: `translateY(${isRefreshing ? threshold : pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
}
