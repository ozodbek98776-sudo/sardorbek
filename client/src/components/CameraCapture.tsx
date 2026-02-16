import { useEffect, useState } from 'react';
import { X, Camera } from 'lucide-react';
import { useCamera } from '../hooks/useCamera';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const { videoRef, canvasRef, isCameraActive, startCamera, stopCamera, capturePhoto } = useCamera();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera().catch(err => {
      console.error('Camera start error:', err);
      setError('Kamera ishlatishda xatolik. Ruxsatni tekshiring.');
    });
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    console.log('📸 Capturing photo...');
    const file = await capturePhoto();
    console.log('📸 Captured file:', file);
    if (file) {
      console.log('✅ File captured successfully:', file.name);
      onCapture(file);
      stopCamera();
      onClose();
    } else {
      console.error('❌ Failed to capture photo');
      alert('Rasm olishda xatolik');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Rasm olish</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Preview */}
        <div className="relative bg-black aspect-video overflow-hidden">
          {error ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          ) : isCameraActive ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Kamera yuklanmoqda...</p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            onClick={handleCapture}
            disabled={!isCameraActive}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" />
            Rasm olish
          </button>
        </div>
      </div>
    </div>
  );
}
