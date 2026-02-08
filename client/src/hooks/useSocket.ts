import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get base URL from API_BASE_URL (remove /api suffix)
    const isDevelopment = (import.meta as any).env.DEV;
    const envApiUrl = (import.meta as any).env?.VITE_API_URL;
    
    const socketUrl = envApiUrl 
      ? envApiUrl.replace('/api', '')
      : (isDevelopment 
        ? 'http://localhost:8002'  // Server port 8002 da
        : `${window.location.protocol}//${window.location.host}`);

    console.log('🔌 Socket.IO connecting to:', socketUrl);

    // Socket.IO connection with better error handling
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 3, // Faqat 3 marta urinish
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('⚠️ Socket.IO connection error (this is OK if server is not running):', error.message);
      // Don't spam console with errors
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}

