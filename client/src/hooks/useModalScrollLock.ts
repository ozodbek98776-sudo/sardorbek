import { useLayoutEffect, useRef } from 'react';

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 * useLayoutEffect — paint dan oldin ishlaydi, scroll jump bo'lmaydi
 */
export function useModalScrollLock(isOpen: boolean) {
  const scrollYRef = useRef(0);

  useLayoutEffect(() => {
    if (isOpen) {
      scrollYRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        const y = scrollYRef.current;
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
