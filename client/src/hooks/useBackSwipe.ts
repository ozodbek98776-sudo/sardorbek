import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeConfig {
  threshold?: number;        // Minimal surish masofasi (px)
  edgeThreshold?: number;    // Chetidan qancha masofada surish boshlanishi kerak (px)
  disableOnInput?: boolean;  // Inputlarda ishlashini o'chirish
  fullScreenSwipe?: boolean; // Ekranning istalgan joyidan swipe qilish
}

/**
 * Mobil qurilmalar uchun professional Swipe navigatsiyasi
 * 
 * Mantiq:
 * - O'ngga swipe (Left -> Right) = Orqaga (Back)
 * - Chapga swipe (Right -> Left) = Oldinga (Forward) [faqat edge mode da]
 * 
 * Rejimlar:
 * - Edge Mode (fullScreenSwipe: false): Faqat ekran chetlaridan
 * - Full Screen Mode (fullScreenSwipe: true): Ekranning istalgan joyidan
 */
export const useBackSwipe = (config: SwipeConfig = {}) => {
  const navigate = useNavigate();
  const {
    threshold = 80,           // Minimal 80px surish kerak (professional feel)
    edgeThreshold = 30,       // Ekran chetidan 30px masofada
    disableOnInput = true,
    fullScreenSwipe = true    // Default: ekranning istalgan joyidan
  } = config;

  useEffect(() => {
    // Desktop qurilmalarda ishlamasligi uchun tekshiruv
    const isMobile = () => {
      return window.innerWidth <= 768 || 'ontouchstart' in window;
    };

    if (!isMobile()) return;

    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    let isValidSwipe = false;
    let swipeStartTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = startX;
      currentY = startY;
      swipeStartTime = Date.now();
      isValidSwipe = false;

      // Element tekshiruvi: Input, Modal, Slider va boshqalar
      if (disableOnInput) {
        const target = e.target as HTMLElement;
        const isInput = target.closest('input, textarea, select, input[type="range"]');
        const isModal = target.closest('.modal, .overlay, [role="dialog"], .swal2-container, .dialog');
        const isNoSwipe = target.closest('.no-swipe');
        const isScrollable = target.closest('.overflow-auto, .overflow-scroll, .overflow-y-auto, .overflow-x-auto');

        if (isInput || isModal || isNoSwipe) {
          return;
        }

        // Scrollable elementlarda faqat edge swipe
        if (isScrollable && fullScreenSwipe) {
          const isLeftEdge = startX <= edgeThreshold;
          if (!isLeftEdge) return;
        }
      }

      // Full screen mode: ekranning istalgan joyidan
      // Edge mode: faqat ekran chetlaridan
      if (fullScreenSwipe) {
        isValidSwipe = true;
      } else {
        const isLeftEdge = startX <= edgeThreshold;
        const isRightEdge = startX >= window.innerWidth - edgeThreshold;
        isValidSwipe = isLeftEdge || isRightEdge;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isValidSwipe) return;

      const touch = e.touches[0];
      currentX = touch.clientX;
      currentY = touch.clientY;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;

      // Agar vertikal harakat gorizontaldan katta bo'lsa, swipe ni bekor qilish
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        isValidSwipe = false;
        return;
      }

      // O'ngga swipe (orqaga qaytish) uchun scroll ni bloklash
      if (deltaX > 20 && Math.abs(deltaY) < Math.abs(deltaX)) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isValidSwipe) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const swipeDuration = Date.now() - swipeStartTime;

      // Vertikal harakat tekshiruvi
      if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        return;
      }

      // Minimal masofa tekshiruvi
      if (Math.abs(deltaX) < threshold) {
        return;
      }

      // Tezlik hisoblash (velocity) - professional feel uchun
      const velocity = Math.abs(deltaX) / swipeDuration;
      const isQuickSwipe = velocity > 0.3; // 0.3 px/ms dan tez

      // O'ngga swipe (Left -> Right) -> Orqaga (Back)
      if (deltaX > threshold || (isQuickSwipe && deltaX > threshold * 0.6)) {
        // Smooth animation effect
        requestAnimationFrame(() => {
          navigate(-1);
        });
      }
      
      // Chapga swipe (Right -> Left) -> Oldinga (Forward)
      // Faqat edge mode da va o'ng chetdan boshlanganda
      else if (!fullScreenSwipe && startX >= window.innerWidth - edgeThreshold && 
               (deltaX < -threshold || (isQuickSwipe && deltaX < -threshold * 0.6))) {
        requestAnimationFrame(() => {
          navigate(1);
        });
      }
    };

    // Passive: false - preventDefault ishlatish uchun
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, threshold, edgeThreshold, disableOnInput, fullScreenSwipe]);
};
