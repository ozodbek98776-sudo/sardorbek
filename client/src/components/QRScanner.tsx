import { useState, useEffect, useRef } from 'react';
import { X, Camera, Scan, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/api';

interface QRScannerProps {
  onScan: (product: any) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Input'ga avtomatik focus
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleScan = async (code: string) => {
    if (!code || code.trim() === '') {
      setError('Kod kiriting');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      console.log('🔍 QR Scanner: Mahsulot qidirilmoqda...', code);

      const res = await api.get(`/products/scan-qr/${code.trim()}`);

      if (res.data.success && res.data.product) {
        console.log('✅ QR Scanner: Mahsulot topildi', res.data.product);
        setSuccess(`${res.data.product.name} topildi!`);
        
        // Mahsulotni kassaga qo'shish
        setTimeout(() => {
          onScan(res.data.product);
          setManualCode('');
          setSuccess('');
          
          // Input'ga qayta focus
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } else {
        setError('Mahsulot topilmadi');
      }
    } catch (err: any) {
      console.error('❌ QR Scanner xatosi:', err);
      setError(err.response?.data?.message || 'Mahsulot topilmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleScan(manualCode);
    }
  };

  const handleManualScan = () => {
    handleScan(manualCode);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Scan className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">QR Scanner</h3>
              <p className="text-sm text-slate-600">Mahsulot kodini kiriting</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scanner Input */}
        <div className="space-y-4">
          {/* Manual Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mahsulot Kodi
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Kodni kiriting yoki skanerlang..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={loading}
                autoFocus
              />
              <button
                onClick={handleManualScan}
                disabled={loading || !manualCode}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Qidirilmoqda...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5" />
                    Qidirish
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Qanday ishlatish?</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Mahsulot kodini kiriting</li>
              <li>• Yoki QR kod skanerdan foydalaning</li>
              <li>• Enter tugmasini bosing</li>
              <li>• Mahsulot avtomatik kassaga qo'shiladi</li>
            </ul>
          </div>

          {/* Camera Scanner (Future) */}
          {scanning && (
            <div className="bg-slate-100 rounded-xl p-8 text-center">
              <Camera className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">Kamera skaneri tez orada...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
}
