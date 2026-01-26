/**
 * Offline Detection Utility
 * Works with the limited offline Service Worker
 */
import { useState, useEffect } from 'react';

export interface ServerStatus {
  online: boolean;
  lastChecked: Date;
}

class OfflineDetectionService {
  private serverStatus: ServerStatus = {
    online: navigator.onLine,
    lastChecked: new Date()
  };

  private listeners: ((status: ServerStatus) => void)[] = [];
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Start periodic server checks
    this.startPeriodicCheck();
  }

  /**
   * Check if server is reachable
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const isOnline = response.ok;
      this.updateStatus(isOnline);
      return isOnline;
    } catch (error) {
      console.log('Server check failed:', error);
      this.updateStatus(false);
      return false;
    }
  }

  /**
   * Get current server status
   */
  getStatus(): ServerStatus {
    return { ...this.serverStatus };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: ServerStatus) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Show user-friendly offline message
   */
  showOfflineMessage(): void {
    // You can integrate this with your existing alert system
    console.warn('Server is offline. Some features may not be available.');
  }

  private updateStatus(online: boolean): void {
    const wasOnline = this.serverStatus.online;
    this.serverStatus = {
      online,
      lastChecked: new Date()
    };

    // Notify listeners if status changed
    if (wasOnline !== online) {
      this.listeners.forEach(callback => callback(this.getStatus()));
      
      if (!online) {
        this.showOfflineMessage();
      }
    }
  }

  private handleOnline(): void {
    console.log('Browser detected online');
    // Verify server is actually reachable
    this.checkServerStatus();
  }

  private handleOffline(): void {
    console.log('Browser detected offline');
    this.updateStatus(false);
  }

  private startPeriodicCheck(): void {
    // Check server status every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkServerStatus();
    }, 30000);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

// Export singleton instance
export const offlineDetection = new OfflineDetectionService();

/**
 * React hook for using offline detection
 */
export function useOfflineDetection() {
  const [status, setStatus] = useState<ServerStatus>(offlineDetection.getStatus());

  useEffect(() => {
    const unsubscribe = offlineDetection.onStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    ...status,
    checkServer: () => offlineDetection.checkServerStatus(),
    isOffline: !status.online
  };
}
