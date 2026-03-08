/**
 * Modal Swipe-to-Close tizimi
 *
 * Har bir modal ochilganda o'zining onClose callback ini register qiladi.
 * Swipe-back bo'lganda eng ustki (oxirgi ochilgan) modal yopiladi.
 *
 * Ishlatish:
 *   useSwipeToClose(onClose);
 */

import { useEffect, useRef } from 'react';

type CloseCallback = () => void;

// Global modal stack — eng ustki modal birinchi yopiladi
let modalStack: CloseCallback[] = [];

/** Eng ustki modal ni yopish. Agar modal bo'lsa true qaytaradi */
export function closeTopModal(): boolean {
  if (modalStack.length === 0) return false;
  const top = modalStack[modalStack.length - 1];
  top();
  return true;
}

/** Modal ochiqmi? */
export function hasOpenModal(): boolean {
  return modalStack.length > 0;
}

/** Modal register */
export function registerModal(cb: CloseCallback) {
  // Dublikatdan himoya (strict mode)
  if (modalStack.includes(cb)) return;
  modalStack.push(cb);
}

/** Modal unregister */
export function unregisterModal(cb: CloseCallback) {
  const idx = modalStack.indexOf(cb);
  if (idx !== -1) modalStack.splice(idx, 1);
}

export function useSwipeToClose(onClose: (() => void) | undefined) {
  const cbRef = useRef(onClose);
  cbRef.current = onClose;

  // Stable callback — identifikatsiya uchun ref sifatida saqlanadi
  const stableCbRef = useRef<CloseCallback | null>(null);

  useEffect(() => {
    if (!onClose) {
      // Modal yopildi — tozalash
      if (stableCbRef.current) {
        unregisterModal(stableCbRef.current);
        stableCbRef.current = null;
      }
      return;
    }

    const cb: CloseCallback = () => cbRef.current?.();
    stableCbRef.current = cb;
    registerModal(cb);

    return () => {
      unregisterModal(cb);
      stableCbRef.current = null;
    };
  }, [!!onClose]); // eslint-disable-line react-hooks/exhaustive-deps
}
