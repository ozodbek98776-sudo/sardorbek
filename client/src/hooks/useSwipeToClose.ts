/**
 * Modal Swipe-to-Close tizimi
 *
 * Har bir modal ochilganda o'zining onClose callback ini register qiladi.
 * Swipe-back bo'lganda eng ustki (oxirgi ochilgan) modal yopiladi.
 *
 * Ishlatish:
 *   useSwipeToClose(onClose);
 */

type CloseCallback = () => void;

// Global modal stack — eng ustki modal birinchi yopiladi
const modalStack: CloseCallback[] = [];

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

/** Modal register/unregister */
export function registerModal(cb: CloseCallback) {
  modalStack.push(cb);
}

export function unregisterModal(cb: CloseCallback) {
  const idx = modalStack.indexOf(cb);
  if (idx !== -1) modalStack.splice(idx, 1);
}

import { useEffect, useRef } from 'react';

export function useSwipeToClose(onClose: (() => void) | undefined) {
  const cbRef = useRef(onClose);
  cbRef.current = onClose;

  useEffect(() => {
    if (!onClose) return;

    const cb = () => cbRef.current?.();
    registerModal(cb);
    return () => unregisterModal(cb);
  }, [!!onClose]);
}
