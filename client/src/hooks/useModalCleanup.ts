import { useEffect } from 'react';

/**
 * Modal ochilganda va yopilganda body holatini to'g'ri boshqarish
 */
export const useModalCleanup = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      // Modal ochilganda scroll ni bloklash
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Modal yopilganda scroll ni qayta yoqish
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      
      // Scroll pozitsiyasini qaytarish
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }

    // Cleanup - component unmount bo'lganda
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);
};
