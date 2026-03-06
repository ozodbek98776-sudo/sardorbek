import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const POLL_INTERVAL = 2 * 60 * 1000; // 2 daqiqa (socket ishlamasa)

export function useVersionCheck() {
  const httpVersion = useRef<string | null>(null);
  const socketVersion = useRef<string | null>(null);

  // --- HTTP polling (zapas) ---
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { v } = await res.json();
        if (!httpVersion.current) { httpVersion.current = v; return; }
        if (httpVersion.current !== v) window.location.reload();
      } catch { /* tarmoq xatosi */ }
    };
    check();
    const id = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  // --- Socket.io (darhol) ---
  useEffect(() => {
    const url = window.location.origin;
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
    });

    socket.on('app:version', (v: string) => {
      if (!socketVersion.current) { socketVersion.current = v; return; }
      if (socketVersion.current !== v) window.location.reload();
    });

    return () => { socket.disconnect(); };
  }, []);
}
