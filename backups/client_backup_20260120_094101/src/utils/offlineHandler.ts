import { useState, useEffect } from 'react';

// Offline detection and handling utility
export class OfflineHandler {
  private static instance: OfflineHandler;
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): OfflineHandler {
    if (!OfflineHandler.instance) {
      OfflineHandler.instance = new OfflineHandler();
    }
    return OfflineHandler.instance;
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public addListener(callback: (online: boolean) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Check if error response indicates server is offline
  public static isServerOfflineError(error: any): boolean {
    if (!error?.response) return false;
    
    const { status, data } = error.response;
    return status === 503 && data?.offline === true;
  }

  // Create user-friendly offline message
  public static getOfflineMessage(error: any): string {
    if (this.isServerOfflineError(error)) {
      return error.response.data.message || 'Server is currently offline. Please try again later.';
    }
    return 'Network error occurred. Please check your connection.';
  }
}

// Hook for React components
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handler = OfflineHandler.getInstance();
    const unsubscribe = handler.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return isOnline;
}

// Export for convenience
export const offlineHandler = OfflineHandler.getInstance();