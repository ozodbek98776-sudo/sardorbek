import { useLayoutEffect, useEffect, useRef } from 'react';

// Global scroll pozitsiya — scroll event bilan doim yangilanadi
let lastScrollY = 0;
let listenerAttached = false;

function trackScroll() {
  lastScrollY = window.scrollY;
}

function ensureScrollListener() {
  if (!listenerAttached) {
    window.addEventListener('scroll', trackScroll, { passive: true });
    listenerAttached = true;
  }
}

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 */
export function useModalScrollLock(isOpen: boolean) {
  const savedYRef = useRef(0);

  // Scroll listener ni o'rnatish
  useEffect(() => {
    ensureScrollListener();
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      // Eng oxirgi scroll pozitsiya
      savedYRef.current = lastScrollY || window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${savedYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        const y = savedYRef.current;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, y);
      };
    }
  }, [isOpen]);
}
