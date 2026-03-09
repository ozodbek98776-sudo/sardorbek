import { useEffect } from 'react';

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 * @param isOpen - Modal ochiq yoki yopiq holati
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    }
  }, [isOpen]);
}
