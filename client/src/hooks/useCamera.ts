import { useRef, useState, useCallback } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Orqa kamera
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Video stream'i to'liq yuklanishini kutish
        await new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
            resolve();
          };
          videoRef.current?.addEventListener('loadedmetadata', onLoadedMetadata);
          
          // Timeout - agar 5 sekundda yuklanmasa, baribir davom etish
          setTimeout(resolve, 5000);
        });
        
        setStream(mediaStream);
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera xatosi:', error);
      alert('Kamera ishlatishda xatolik. Ruxsatni tekshiring.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [stream]);

  const capturePhoto = useCallback(async (): Promise<File | null> => {
    if (!videoRef.current || !canvasRef.current) return null;

    const context = canvasRef.current.getContext('2d');
    if (!context) return null;

    // Video o'lchamini canvas ga o'rnatish
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Video frameni canvas ga chizish
    context.drawImage(videoRef.current, 0, 0);

    // Canvas ni blob ga aylantirish
    return new Promise((resolve) => {
      canvasRef.current?.toBlob((blob) => {
        if (blob) {
          const file = new File(
            [blob],
            `camera-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );
          resolve(file);
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  return {
    videoRef,
    canvasRef,
    isCameraActive,
    startCamera,
    stopCamera,
    capturePhoto
  };
};
