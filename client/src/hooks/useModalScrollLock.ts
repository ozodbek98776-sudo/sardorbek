import { useEffect, useRef } from 'react';

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 * @param isOpen - Modal ochiq yoki yopiq holati
 */
export function useModalScrollLock(isOpen: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);
}
