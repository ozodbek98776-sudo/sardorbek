import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'danger';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export default function AlertModal({
  isOpen, onClose, onConfirm, title, message,
  type = 'info', confirmText = 'OK', cancelText = 'Bekor qilish', showCancel = false
}: AlertModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      confirmRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') { e.preventDefault(); onConfirm ? onConfirm() : onClose(); }
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen) return null;

  const icons = {
    info: <Info className="w-10 h-10 text-blue-600" />,
    success: <CheckCircle className="w-10 h-10 text-emerald-600" />,
    warning: <AlertTriangle className="w-10 h-10 text-amber-600" />,
    danger: <AlertTriangle className="w-10 h-10 text-red-600" />
  };

  const colors = {
    info: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
    success: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200',
    warning: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
    danger: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
  };

  const btnColors = {
    info: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30',
    success: 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg shadow-emerald-500/30',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30',
    danger: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg shadow-red-500/30'
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" onClick={onClose} />
      <div className="bg-white rounded-t-2xl sm:rounded-3xl w-full sm:w-auto max-w-3xl p-8 sm:p-10 shadow-2xl relative z-10 border border-slate-200/50 animate-scale-in">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className={`w-20 h-20 ${colors[type]} rounded-2xl flex items-center justify-center mb-6 border shadow-sm`}>
            {icons[type]}
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3">{title}</h3>
          <p className="text-base text-slate-600 leading-relaxed">{message}</p>
        </div>
        
        <div className="flex flex-col-reverse sm:flex-row gap-4">
          {showCancel && (
            <button 
              onClick={onClose} 
              className="flex-1 px-5 sm:px-6 py-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all duration-200"
            >
              {cancelText}
            </button>
          )}
          <button 
            ref={confirmRef} 
            onClick={onConfirm || onClose} 
            className={`flex-1 px-5 sm:px-6 py-4 font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${btnColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
