import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface SwipeConfig {
  threshold?: number;     // Minimal surish masofasi (px)
  edgeThreshold?: number; // Chetidan qancha masofada surish boshlanishi kerak (px)
  disableOnInput?: boolean; // Inputlarda ishlashini o'chirish
}

/**
 * Mobil qurilmalar uchun iOS uslubidagi Edge Swipe navigatsiyasi
 * 
 * Mantiq:
 * - Chapdan o'ngga (Left -> Right) = Orqaga (Back)
 * - O'ngdan chapga (Right -> Left) = Oldinga (Forward)
 */
export const useBackSwipe = (config: SwipeConfig = {}) => {
  const navigate = useNavigate();
  const {
    threshold = 60,       // Minimal 60px surish kerak
    edgeThreshold = 30,   // Ekran chetidan 30px masofada boshlanishi kerak
    disableOnInput = true
  } = config;

  useEffect(() => {
    // Desktop qurilmalarda ishlamasligi uchun tekshiruv
    const isMobile = () => {
      return window.innerWidth <= 768 || 'ontouchstart' in window;
    };

    if (!isMobile()) return;

    let startX = 0;
    let startY = 0;
    let isEdgeSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      // Faqat ekran chetlaridan boshlangan surishlarni inobatga olamiz
      const isLeftEdge = startX <= edgeThreshold;
      const isRightEdge = startX >= window.innerWidth - edgeThreshold;
      
      isEdgeSwipe = isLeftEdge || isRightEdge;

      // Element tekshiruvi: Input, Modal, Slider va boshqalar
      if (disableOnInput) {
        const target = e.target as HTMLElement;
        const isInput = target.closest('input, textarea, select, input[type="range"]');
        const isModal = target.closest('.modal, .overlay, [role="dialog"], .swal2-container, .dialog');
        const isNoSwipe = target.closest('.no-swipe');

        if (isInput || isModal || isNoSwipe) {
          isEdgeSwipe = false;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeSwipe) return;

      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;

      const deltaX = endX - startX;
      const deltaY = endY - startY;

      // Agar vertikal (scroll) harakat gorizontal harakatdan katta bo'lsa, navigatsiya qilmaymiz
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      // Minimal masofa tekshiruvi
      if (Math.abs(deltaX) < threshold) {
        return;
      }

      // Chapdan o'ngga surish (Left -> Right) -> Orqaga (Back)
      // Chap chetdan boshlangan bo'lsa
      if (startX <= edgeThreshold && deltaX > threshold) {
        navigate(-1);
      }
      
      // O'ngdan chapga surish (Right -> Left) -> Oldinga (Forward)
      // O'ng chetdan boshlangan bo'lsa
      else if (startX >= window.innerWidth - edgeThreshold && deltaX < -threshold) {
        navigate(1);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, threshold, edgeThreshold, disableOnInput]);
};
