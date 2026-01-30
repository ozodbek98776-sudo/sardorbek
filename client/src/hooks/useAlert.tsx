import { useState, useCallback } from 'react';
import AlertModal from '../components/AlertModal';

type AlertType = 'info' | 'success' | 'warning' | 'danger';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  type: AlertType;
  showCancel: boolean;
  confirmText: string;
  autoClose: boolean; // Avtomatik yopilish
  onConfirm?: () => void;
  onClose?: () => void;
}

export function useAlert() {
  const [state, setState] = useState<AlertState>({
    isOpen: false, title: '', message: '', type: 'info',
    showCancel: false, confirmText: 'OK', autoClose: false, onClose: undefined
  });

  const showAlert = useCallback((
    message: string,
    title = 'Xabar',
    type: AlertType = 'info'
  ) => {
    return new Promise<void>((resolve) => {
      // Success va info alertlarni ko'rsatmaslik - faqat resolve qilish
      if (type === 'success' || type === 'info') {
        resolve();
        return;
      }
      
      // Faqat warning va danger alertlarni ko'rsatish
      setState({
        isOpen: true, title, message, type,
        showCancel: false, confirmText: 'OK',
        autoClose: false,
        onConfirm: () => { setState(s => ({ ...s, isOpen: false })); resolve(); }
      });
    });
  }, []);

  const showConfirm = useCallback((
    message: string,
    title = 'Tasdiqlash',
    type: AlertType = 'warning'
  ) => {
    return new Promise<boolean>((resolve) => {
      const handleConfirm = () => {
        setState(s => ({ ...s, isOpen: false }));
        resolve(true);
      };
      
      const handleClose = () => {
        setState(s => ({ ...s, isOpen: false }));
        resolve(false);
      };
      
      setState({
        isOpen: true,
        title,
        message,
        type,
        showCancel: true,
        confirmText: 'Ha',
        autoClose: false, // Confirm uchun avtomatik yopilish yo'q
        onConfirm: handleConfirm,
        onClose: handleClose
      });
    });
  }, []);

  const closeAlert = useCallback(() => {
    if (state.onClose) {
      state.onClose();
    } else {
      setState(s => ({ ...s, isOpen: false }));
    }
  }, [state.onClose]);

  const AlertComponent = (
    <AlertModal
      isOpen={state.isOpen}
      onClose={state.onClose || closeAlert}
      onConfirm={state.onConfirm}
      title={state.title}
      message={state.message}
      type={state.type}
      showCancel={state.showCancel}
      confirmText={state.confirmText}
      autoClose={state.autoClose}
    />
  );

  return { showAlert, showConfirm, AlertComponent };
}
