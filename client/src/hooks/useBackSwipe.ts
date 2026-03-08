import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { closeTopModal, hasOpenModal } from './useSwipeToClose';

interface SwipeConfig {
  disableOnInput?: boolean;
  overlayId?: string;
  navItems?: { path: string }[];
  basePath?: string;
}

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  isValidSwipe: boolean;
  startTime: number;
  targetEl: HTMLElement | null;
  isModal: boolean;
  directionLocked: boolean;
  swiping: boolean;
  direction: 'left' | 'right' | '';
  resolvedRoute: string | null;
  shouldCloseModal: boolean;
}

/**
 * Professional iOS-style swipe navigation.
 * Chapdan o'ngga: orqaga / modal yopish
 * O'ngdan chapga: navbardagi keyingi bo'limga
 */
export const useBackSwipe = (config: SwipeConfig = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    disableOnInput = true,
    overlayId = 'swipe-overlay',
    navItems,
    basePath = ''
  } = config;

  const stateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    isValidSwipe: false,
    startTime: 0,
    targetEl: null,
    isModal: false,
    directionLocked: false,
    swiping: false,
    direction: '',
    resolvedRoute: null,
    shouldCloseModal: false
  });

  useEffect(() => {
    const isMobile = window.innerWidth <= 1024 || 'ontouchstart' in window;
    if (!isMobile) return;

    const screenW = () => window.innerWidth;
    const getOverlay = (): HTMLElement | null => document.getElementById(overlayId);

    // ─── HELPERS (event handler lardan oldin) ───

    const resetVisuals = () => {
      const overlay = getOverlay();
      if (overlay) {
        overlay.style.display = 'none';
        overlay.style.opacity = '0';
      }
    };

    const animateBack = (el: HTMLElement) => {
      let done = false;

      el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
      el.style.transform = 'translateX(0)';

      const overlay = getOverlay();
      if (overlay) {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
      }

      const cleanup = () => {
        if (done) return;
        done = true;
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
      setTimeout(cleanup, 350);
    };

    const findSwipeTarget = (el: HTMLElement): { target: HTMLElement; isModal: boolean } | null => {
      const modal = el.closest('[data-modal="true"]') as HTMLElement;
      if (modal) {
        const content = modal.querySelector('[data-swipe-content]') as HTMLElement
          || modal.firstElementChild as HTMLElement;
        return content ? { target: content, isModal: true } : null;
      }
      const main = document.querySelector('main') as HTMLElement;
      return main ? { target: main, isModal: false } : null;
    };

    const getAdjacentRoute = (dir: 'next' | 'prev'): string | null => {
      if (!navItems || navItems.length === 0) return null;
      const currentPath = location.pathname;
      const paths = navItems.map(item => item.path ? `${basePath}${item.path}` : basePath);
      const idx = paths.findIndex(p => currentPath === p || (p !== basePath && currentPath.startsWith(p + '/')));
      if (idx === -1) return null;
      const target = dir === 'next' ? idx + 1 : idx - 1;
      if (target < 0 || target >= paths.length) return null;
      return paths[target];
    };

    // ─── TOUCH START ───
    const handleTouchStart = (e: TouchEvent) => {
      const s = stateRef.current;
      s.isValidSwipe = false;
      s.directionLocked = false;
      s.swiping = false;
      s.targetEl = null;
      s.isModal = false;
      s.direction = '';
      s.resolvedRoute = null;
      s.shouldCloseModal = false;

      const touch = e.touches[0];
      s.startX = touch.clientX;
      s.startY = touch.clientY;
      s.currentX = s.startX;
      s.startTime = Date.now();

      if (disableOnInput) {
        const target = e.target as HTMLElement;
        if (target.closest('input, textarea, select, [contenteditable], input[type="range"]')) return;
        if (target.closest('.no-swipe')) return;

        const scrollable = target.closest('.overflow-x-auto, .overflow-x-scroll, .scrollbar-hide');
        if (scrollable) {
          const sl = scrollable as HTMLElement;
          if (sl.scrollLeft > 5) return;
        }
      }

      s.isValidSwipe = true;
    };

    // ─── TOUCH MOVE ───
    const handleTouchMove = (e: TouchEvent) => {
      const s = stateRef.current;
      if (!s.isValidSwipe) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - s.startX;
      const deltaY = touch.clientY - s.startY;

      // Yo'nalish aniqlash (bir marta)
      if (!s.directionLocked && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        s.directionLocked = true;

        // Vertikal → swipe emas
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          s.isValidSwipe = false;
          return;
        }

        // Gorizontal — iOS Safari ga scroll ni bekor qilish
        e.preventDefault();

        if (deltaX > 0) {
          // Chapdan o'ngga → orqaga / modal yopish
          s.direction = 'right';
          s.shouldCloseModal = hasOpenModal();

          // Orqaga boradigan joy bormi tekshirish
          if (!s.shouldCloseModal && window.history.length <= 1) {
            s.isValidSwipe = false;
            return;
          }

          const result = findSwipeTarget(e.target as HTMLElement);
          if (!result) { s.isValidSwipe = false; return; }
          s.targetEl = result.target;
          s.isModal = result.isModal;
          s.swiping = true;
          s.targetEl.style.willChange = 'transform';
          s.targetEl.style.transition = 'none';
        } else {
          // O'ngdan chapga → keyingi bo'lim
          s.direction = 'left';
          if (hasOpenModal()) { s.isValidSwipe = false; return; }
          const nextRoute = getAdjacentRoute('next');
          if (!nextRoute) { s.isValidSwipe = false; return; }
          s.resolvedRoute = nextRoute;

          const result = findSwipeTarget(e.target as HTMLElement);
          if (!result || result.isModal) { s.isValidSwipe = false; return; }
          s.targetEl = result.target;
          s.isModal = false;
          s.swiping = true;
          s.targetEl.style.willChange = 'transform';
          s.targetEl.style.transition = 'none';
        }
      }

      if (!s.swiping || !s.targetEl) return;

      s.currentX = touch.clientX;

      if (s.direction === 'right') {
        const dx = Math.max(0, s.currentX - s.startX);
        s.targetEl.style.transform = `translateX(${dx}px)`;
        const overlay = getOverlay();
        if (overlay) {
          const progress = Math.min(dx / screenW(), 1);
          overlay.style.opacity = String(progress * 0.5);
          overlay.style.pointerEvents = 'none';
          overlay.style.display = 'block';
        }
        if (dx > 10) e.preventDefault();
      } else if (s.direction === 'left') {
        const dx = Math.min(0, s.currentX - s.startX);
        s.targetEl.style.transform = `translateX(${dx}px)`;
        if (Math.abs(dx) > 10) e.preventDefault();
      }
    };

    // ─── TOUCH END ───
    const handleTouchEnd = () => {
      const s = stateRef.current;
      if (!s.swiping || !s.targetEl) {
        resetVisuals();
        return;
      }

      const dx = s.currentX - s.startX;
      const duration = Date.now() - s.startTime;
      const velocity = Math.abs(dx) / duration;
      const sw = screenW();

      // Qarorlar HOZIR olinadi (setTimeout ichida emas)
      const closeModal = s.shouldCloseModal;
      const nextRoute = s.resolvedRoute;

      if (s.direction === 'right') {
        const absDx = Math.max(0, dx);
        const shouldComplete = absDx > sw * 0.15 || (velocity > 0.3 && absDx > 30);

        if (shouldComplete) {
          const el = s.targetEl;
          el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)';
          el.style.transform = `translateX(${sw}px)`;
          const overlay = getOverlay();
          if (overlay) {
            overlay.style.transition = 'opacity 0.25s ease';
            overlay.style.opacity = '0';
          }
          setTimeout(() => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.willChange = '';
            if (overlay) { overlay.style.transition = ''; overlay.style.display = 'none'; }
            if (closeModal) {
              closeTopModal();
            } else {
              navigate(-1);
            }
          }, 250);
        } else {
          animateBack(s.targetEl);
        }
      } else if (s.direction === 'left') {
        const absDx = Math.abs(Math.min(0, dx));
        const shouldComplete = absDx > sw * 0.15 || (velocity > 0.3 && absDx > 30);

        if (shouldComplete && nextRoute) {
          const el = s.targetEl;
          el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)';
          el.style.transform = `translateX(${-sw}px)`;
          setTimeout(() => {
            el.style.transition = '';
            el.style.transform = '';
            el.style.willChange = '';
            navigate(nextRoute);
          }, 250);
        } else {
          animateBack(s.targetEl);
        }
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
  }, [navigate, location.pathname, disableOnInput, overlayId, navItems, basePath]);
};
