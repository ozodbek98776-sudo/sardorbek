import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { closeTopModal, hasOpenModal } from './useSwipeToClose';

interface SwipeConfig {
  threshold?: number;
  edgeThreshold?: number;
  disableOnInput?: boolean;
  fullScreenSwipe?: boolean;
  overlayId?: string;
}

/**
 * Professional iOS-style swipe-back with visual feedback.
 *
 * - Sahifa/modal real-time siljiydi (translateX)
 * - Chap tomonda qorong'u overlay
 * - Modal ochiq bo'lsa — modal yopadi, aks holda navigate(-1)
 * - 60fps: faqat transform + opacity (GPU accelerated)
 */
export const useBackSwipe = (config: SwipeConfig = {}) => {
  const navigate = useNavigate();
  const {
    threshold = 80,
    edgeThreshold = 30,
    disableOnInput = true,
    fullScreenSwipe = true,
    overlayId = 'swipe-overlay'
  } = config;

  // Refs — state o'zgarishlarisiz tez ishlash uchun
  const stateRef = useRef({
    startX: 0,
    startY: 0,
    currentX: 0,
    isValidSwipe: false,
    startTime: 0,
    targetEl: null as HTMLElement | null,   // siljitilayotgan element
    isModal: false,                          // modal mi yoki sahifa mi
    directionLocked: false,                  // gorizontal/vertikal aniqlandi
    swiping: false                           // hozir swipe qilyaptimi
  });

  useEffect(() => {
    const isMobile = window.innerWidth <= 1024 || 'ontouchstart' in window;
    if (!isMobile) return;

    const screenW = () => window.innerWidth;

    // Siljitish uchun target element topish
    const findSwipeTarget = (el: HTMLElement): { target: HTMLElement; isModal: boolean } | null => {
      // Modal content (data-modal ichidagi content div)
      const modal = el.closest('[data-modal="true"]') as HTMLElement;
      if (modal) {
        // Modal ichidagi birinchi child container
        const content = modal.querySelector('[data-swipe-content]') as HTMLElement
          || modal.firstElementChild as HTMLElement;
        return content ? { target: content, isModal: true } : null;
      }

      // Sahifa — <main> element
      const main = document.querySelector('main') as HTMLElement;
      return main ? { target: main, isModal: false } : null;
    };

    const getOverlay = (): HTMLElement | null => document.getElementById(overlayId);

    // ─── TOUCH START ───
    const handleTouchStart = (e: TouchEvent) => {
      const s = stateRef.current;
      s.isValidSwipe = false;
      s.directionLocked = false;
      s.swiping = false;
      s.targetEl = null;
      s.isModal = false;

      const touch = e.touches[0];
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.currentX = s.startX;
      s.startTime = Date.now();

      if (disableOnInput) {
        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, select, [contenteditable], input[type="range"]')) return;
        if (target.closest('.no-swipe')) return;

        // Scrollable element da faqat chap chetdan
        const scrollable = target.closest('.overflow-x-auto, .overflow-x-scroll, .scrollbar-hide');
        if (scrollable) {
          const sl = scrollable as HTMLElement;
          // Agar scroll holati 0 dan katta bo'lsa (o'rtada), swipe qilmaslik
          if (sl.scrollLeft > 5) return;
        }
      }

      if (fullScreenSwipe) {
        s.isValidSwipe = true;
      } else {
        s.isValidSwipe = s.startX <= edgeThreshold;
      }
    };

    // ─── TOUCH MOVE ───
    const handleTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s.isValidSwipe) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - s.startX;
      const deltaY = touch.clientY - s.startY;

      // Yo'nalishni aniqlash (bir marta)
      if (!s.directionLocked && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        s.directionLocked = true;
        // Vertikal → swipe emas
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          s.isValidSwipe = false;
          return;
        }
        // Chapga surish → swipe emas (faqat o'ngga)
        if (deltaX < 0) {
          s.isValidSwipe = false;
          return;
        }
        // Target topish
        const result = findSwipeTarget(e.target as HTMLElement);
        if (!result) { s.isValidSwipe = false; return; }
        s.targetEl = result.target;
        s.isModal = result.isModal;
        s.swiping = true;

        // GPU tayyor qilish
        s.targetEl.style.willChange = 'transform';
        s.targetEl.style.transition = 'none';
      }

      if (!s.swiping || !s.targetEl) return;

      s.currentX = touch.clientX;
      const dx = Math.max(0, s.currentX - s.startX);

      // Sahifani siljitish
      s.targetEl.style.transform = `translateX(${dx}px)`;

      // Overlay qorong'ulik
      const overlay = getOverlay();
      if (overlay) {
        const progress = Math.min(dx / screenW(), 1);
        overlay.style.opacity = String(progress * 0.5);
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'block';
      }

      // Browser default (scroll, pull-to-refresh) ni bloklash
      if (dx > 10) {
        e.preventDefault();
      }
    };

    // ─── TOUCH END ───
    const handleTouchEnd = () => {
      const s = stateRef.current;
      if (!s.swiping || !s.targetEl) {
        resetVisuals();
        return;
      }

      const dx = Math.max(0, s.currentX - s.startX);
      const duration = Date.now() - s.startTime;
      const velocity = dx / duration; // px/ms
      const sw = screenW();

      // Threshold: 30% ekran YOKI tez swipe (velocity > 0.5)
      const shouldComplete = dx > sw * 0.3 || (velocity > 0.5 && dx > 50);

      if (shouldComplete) {
        // Animate out
        const el = s.targetEl;
        el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)';
        el.style.transform = `translateX(${sw}px)`;

        const overlay = getOverlay();
        if (overlay) {
          overlay.style.transition = 'opacity 0.25s ease';
          overlay.style.opacity = '0';
        }

        setTimeout(() => {
          // Reset
          el.style.transition = '';
          el.style.transform = '';
          el.style.willChange = '';
          if (overlay) {
            overlay.style.transition = '';
            overlay.style.display = 'none';
          }

          // Modal yoki navigate
          if (s.isModal && hasOpenModal()) {
            closeTopModal();
          } else {
            navigate(-1);
          }
        }, 250);
      } else {
        // Cancel — qaytarish
        animateBack(s.targetEl);
      }

      s.swiping = false;
      s.targetEl = null;
    };

    const handleTouchCancel = () => {
      const s = stateRef.current;
      if (s.swiping && s.targetEl) {
        animateBack(s.targetEl);
      }
      s.swiping = false;
      s.targetEl = null;
    };

    // ─── HELPERS ───
    const animateBack = (el: HTMLElement) => {
      el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
      el.style.transform = 'translateX(0)';

      const overlay = getOverlay();
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
      }

      const cleanup = () => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.willChange = '';
        if (overlay) {
          overlay.style.transition = '';
          overlay.style.display = 'none';
        }
        el.removeEventListener('transitionend', cleanup);
      };
      el.addEventListener('transitionend', cleanup, { once: true });

      // Fallback agar transitionend fire bo'lmasa
      setTimeout(cleanup, 350);
    };

    const resetVisuals = () => {
      const overlay = getOverlay();
      if (overlay) {
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [navigate, threshold, edgeThreshold, disableOnInput, fullScreenSwipe, overlayId]);
};
