import { useLayoutEffect, useRef } from 'react';

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 * scrollY ni har renderda saqlaydi (isOpen=false da), keyin isOpen=true bo'lganda ishlatadi
 */
export function useModalScrollLock(isOpen: boolean) {
  const scrollYRef = useRef(0);
  const wasOpenRef = useRef(false);

  // isOpen=false da scroll pozitsiyani doim saqlash
  if (!isOpen && !wasOpenRef.current) {
    scrollYRef.current = window.scrollY;
  }

  useLayoutEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollYRef.current}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        const y = scrollYRef.current;
        wasOpenRef.current = false;
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
