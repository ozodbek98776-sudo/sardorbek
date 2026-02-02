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
        ? 'http://localhost:8000'
        : `${window.location.protocol}//${window.location.host}`);

    console.log('🔌 Socket.IO connecting to:', socketUrl);

    // Socket.IO connection
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
}
