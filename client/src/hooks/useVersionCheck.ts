import { useEffect, useRef } from 'react';

const CHECK_INTERVAL = 2 * 60 * 1000; // 2 daqiqa

export function useVersionCheck() {
  const currentVersion = useRef<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data = await res.json();
        const v: string = data.v;

        if (!currentVersion.current) {
          currentVersion.current = v;
          return;
        }

        if (currentVersion.current !== v) {
          window.location.reload();
        }
      } catch {
        // Tarmoq xatosi — keyingi tekshirishda ko'riladi
      }
    };

    fetchVersion();
    const id = setInterval(fetchVersion, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);
}
