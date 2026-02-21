import { useRef, useState, useCallback } from 'react';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    // Get media stream first
    let mediaStream: MediaStream | null = null;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } catch {
      // Fallback to any camera
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });
    }

    if (!mediaStream) {
      throw new Error('Kamera olinmadi');
    }

    // Wait for video ref to be available (DOM render cycle)
    const waitForRef = (): Promise<HTMLVideoElement> => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          if (videoRef.current) {
            resolve(videoRef.current);
          } else if (attempts++ > 50) {
            reject(new Error('Video element topilmadi'));
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    };

    const video = await waitForRef();
    video.srcObject = mediaStream;
    streamRef.current = mediaStream;

    try {
      await video.play();
    } catch {
      // Autoplay may fail on some browsers, that's ok
    }

    // Wait for video dimensions to be available
    await new Promise<void>((resolve) => {
      if (video.videoWidth > 0) {
        resolve();
        return;
      }
      const onLoaded = () => {
        video.removeEventListener('loadeddata', onLoaded);
        resolve();
      };
      video.addEventListener('loadeddata', onLoaded);
      setTimeout(resolve, 3000);
    });

    setIsCameraActive(true);
  }, []);

  const capturePhoto = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;

    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        } else {
          resolve(null);
        }
      }, 'image/jpeg', 0.85);
    });
  }, []);

  return { videoRef, canvasRef, isCameraActive, startCamera, stopCamera, capturePhoto };
};
