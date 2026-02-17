import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './useSocket';

export interface StatsData {
  total: number;
  lowStock: number;
  outOfStock: number;
  totalValue: number;
}

/**
 * Hook for listening to realtime statistics updates via Socket.IO
 * Listens for events: stats:updated, product:created, product:updated, product:deleted
 * receipt:created, debt:created, debt:updated, customer:created, customer:updated
 */
export function useRealtimeStats(onStatsUpdate?: (stats: StatsData) => void) {
  const socket = useSocket();
  const [stats, setStats] = useState<StatsData>({
    total: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0
  });

  useEffect(() => {
    if (!socket) return;

    // Listen for direct stats updates
    const handleStatsUpdated = (newStats: StatsData) => {
      console.log('📊 Stats updated via socket:', newStats);
      setStats(newStats);
      onStatsUpdate?.(newStats);
    };

    // Listen for product changes that affect stats
    const handleProductChange = () => {
      console.log('🔄 Product change detected, stats will be updated by server');
      // Stats will be updated via stats:updated event
    };

    // Listen for receipt changes that affect stats
    const handleReceiptChange = () => {
      console.log('🔄 Receipt change detected, stats will be updated by server');
      // Stats will be updated via stats:updated event
    };

    // Listen for debt changes that affect stats
    const handleDebtChange = () => {
      console.log('🔄 Debt change detected, stats will be updated by server');
      // Stats will be updated via stats:updated event
    };

    // Listen for customer changes that affect stats
    const handleCustomerChange = () => {
      console.log('🔄 Customer change detected, stats will be updated by server');
      // Stats will be updated via stats:updated event
    };

    // Register all listeners
    socket.on('stats:updated', handleStatsUpdated);
    socket.on('product:created', handleProductChange);
    socket.on('product:updated', handleProductChange);
    socket.on('product:deleted', handleProductChange);
    socket.on('receipt:created', handleReceiptChange);
    socket.on('debt:created', handleDebtChange);
    socket.on('debt:updated', handleDebtChange);
    socket.on('customer:created', handleCustomerChange);
    socket.on('customer:updated', handleCustomerChange);

    return () => {
      socket.off('stats:updated', handleStatsUpdated);
      socket.off('product:created', handleProductChange);
      socket.off('product:updated', handleProductChange);
      socket.off('product:deleted', handleProductChange);
      socket.off('receipt:created', handleReceiptChange);
      socket.off('debt:created', handleDebtChange);
      socket.off('debt:updated', handleDebtChange);
      socket.off('customer:created', handleCustomerChange);
      socket.off('customer:updated', handleCustomerChange);
    };
  }, [socket, onStatsUpdate]);

  return stats;
}
