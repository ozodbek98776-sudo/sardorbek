import { useRef, useState, useCallback } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      console.log('🎥 Camera ishga tushmoqda...');
      
      // Birinchi orqa kamera bilan urinish, agar ishlamasa oldingi kamera ishlatish
      let mediaStream: MediaStream | null = null;
      
      try {
        console.log('🎥 Orqa kamera bilan urinish...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Orqa kamera
          audio: false
        });
        console.log('✅ Orqa kamera muvaffaqiyatli ishga tushdi');
      } catch (backCameraError) {
        console.warn('⚠️ Orqa kamera ishlamadi, oldingi kamera bilan urinish:', backCameraError);
        // Orqa kamera ishlamasa, oldingi kamera bilan urinish
        console.log('🎥 Oldingi kamera bilan urinish...');
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true, // Istalgan kamera
          audio: false
        });
        console.log('✅ Oldingi kamera muvaffaqiyatli ishga tushdi');
      }
      
      if (!mediaStream) {
        throw new Error('Kamera olinmadi');
      }
      
      console.log('🎥 Media stream olingan:', mediaStream.getTracks().length, 'track');
      
      if (videoRef.current) {
        console.log('🎥 Video ref ga stream o\'rnatilmoqda...');
        videoRef.current.srcObject = mediaStream;
        
        // Video play qilishni boshlash
        try {
          await videoRef.current.play();
          console.log('✅ Video play boshlandi');
        } catch (playError) {
          console.warn('⚠️ Video play xatosi:', playError);
        }
        
        // Video stream'i to'liq yuklanishini kutish
        await new Promise<void>((resolve) => {
          const onLoadedMetadata = () => {
            console.log('✅ Video metadata loaded');
            if (videoRef.current) {
              videoRef.current.removeEventListener('loadedmetadata', onLoadedMetadata);
            }
            resolve();
          };
          if (videoRef.current) {
            videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
          }
          
          // Timeout - agar 5 sekundda yuklanmasa, baribir davom etish
          setTimeout(() => {
            console.warn('⚠️ Video metadata timeout - baribir davom etish');
            resolve();
          }, 5000);
        });
        
        setStream(mediaStream);
        setIsCameraActive(true);
        console.log('✅ Camera faol');
      } else {
        throw new Error('Video ref mavjud emas');
      }
    } catch (error) {
      console.error('❌ Camera xatosi:', error);
      const errorMessage = error instanceof Error ? error.message : 'Noma\'lum xatolik';
      console.error('Xatolik tafsilotlari:', errorMessage);
      
      // Xatolik turini aniqlash
      if (errorMessage.includes('NotAllowedError') || errorMessage.includes('Permission denied')) {
        alert('Kamera ruxsati berilmagan. Brauzer sozlamalarida ruxsat bering.');
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('no camera')) {
        alert('Kamera topilmadi. Qurilmada kamera mavjud emasmi?');
      } else {
        alert('Kamera ishlatishda xatolik: ' + errorMessage);
      }
      
      setIsCameraActive(false);
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
