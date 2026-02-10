import { useEffect } from 'react';

/**
 * Modal ochilganda orqa sahifa scroll bo'lmasligi uchun hook
 * @param isOpen - Modal ochiq yoki yopiq holati
 */
export function useModalScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      // Hozirgi scroll pozitsiyasini saqlash
      const scrollY = window.scrollY;
      
      // Body'ni fix qilish va scroll pozitsiyasini saqlash
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Modal yopilganda asl holatga qaytarish
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        
        // Scroll pozitsiyasini qaytarish
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);
}
