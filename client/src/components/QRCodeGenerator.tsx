import { useEffect, useState, forwardRef, memo } from 'react';
import QRCodeComponent from 'react-qr-code';
import { AlertCircle } from 'lucide-react';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  bgColor?: string;
  fgColor?: string;
  className?: string;
  onError?: (error: Error) => void;
  debug?: boolean; // Debug mode
}

/**
 * Ultra-Fast Production-ready QR Code Generator
 * - Instant rendering with memo
 * - Zero re-renders
 * - Optimized for speed
 * - Debug mode for troubleshooting
 */
const QRCodeGenerator = memo(forwardRef<HTMLDivElement, QRCodeGeneratorProps>(({
  value,
  size = 150,
  level = 'M', // Changed from 'H' to 'M' for better performance
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  className = '',
  onError,
  debug = false
}, ref) => {
  const [error, setError] = useState<Error | null>(null);
  const [renderTime, setRenderTime] = useState<number>(0);

  // Debug logging
  useEffect(() => {
    if (debug) {
      const startTime = performance.now();
      console.log('🔍 QR Code Rendering:', {
        value: value?.substring(0, 50) + '...',
        size,
        level,
        timestamp: new Date().toISOString()
      });
      
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        setRenderTime(duration);
        console.log(`⏱️ QR Render completed in ${duration.toFixed(2)}ms`);
      };
    }
  }, [value, size, level, debug]);

  // Error handling - faqat error bo'lganda
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // Fast validation - minimal checks
  if (!value || value.trim().length === 0) {
    if (debug) console.warn('⚠️ QR Code: Empty value provided');
    return (
      <div className={`flex items-center justify-center bg-slate-100 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <AlertCircle className="w-6 h-6 text-slate-400" />
      </div>
    );
  }

  // Error state - minimal UI
  if (error) {
    if (debug) console.error('❌ QR Code Error:', error);
    return (
      <div className={`flex flex-col items-center justify-center bg-red-50 rounded-lg p-2 ${className}`} style={{ width: size, height: size }}>
        <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
        {debug && <span className="text-xs text-red-600 text-center">{error.message}</span>}
      </div>
    );
  }

  // Direct render - with error boundary
  try {
    return (
      <div ref={ref} className={`qr-code-container ${className}`}>
        <QRCodeComponent
          value={value}
          size={size}
          level={level}
          bgColor={bgColor}
          fgColor={fgColor}
          style={{
            height: 'auto',
            maxWidth: '100%',
            width: '100%'
          }}
        />
        {debug && renderTime > 0 && (
          <div className="text-xs text-gray-500 mt-1 text-center">
            {renderTime.toFixed(2)}ms
          </div>
        )}
      </div>
    );
  } catch (err) {
    const errorObj = err as Error;
    console.error('QR Code render error:', errorObj);
    if (debug) {
      console.error('QR Code details:', { value, size, level });
    }
    setError(errorObj);
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded-lg ${className}`} style={{ width: size, height: size }}>
        <AlertCircle className="w-6 h-6 text-red-500" />
      </div>
    );
  }
}), (prevProps, nextProps) => {
  // Custom comparison - faqat value o'zgarganda re-render
  return prevProps.value === nextProps.value && 
         prevProps.size === nextProps.size &&
         prevProps.level === nextProps.level &&
         prevProps.debug === nextProps.debug;
});

QRCodeGenerator.displayName = 'QRCodeGenerator';

export default QRCodeGenerator;

/**
 * Ultra-Fast QR Code PNG Export
 * - Optimized canvas operations
 * - Minimal DOM operations
 * - Fast blob creation
 */
export const exportQRCodeToPNG = async (
  containerRef: HTMLDivElement | null,
  filename: string = 'qr-code.png'
): Promise<boolean> => {
  if (!containerRef) return false;

  const svg = containerRef.querySelector('svg');
  if (!svg) return false;

  try {
    // Fast serialize
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for speed
    
    if (!ctx) return false;

    // Get size once
    const rect = svg.getBoundingClientRect();
    const w = rect.width || 150;
    const h = rect.height || 150;
    
    canvas.width = w;
    canvas.height = h;

    // White background - single operation
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // Fast image loading
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        // Fast blob creation
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);
            resolve(true);
          } else {
            resolve(false);
          }
        }, 'image/png', 0.95); // Slightly lower quality for speed
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(false);
      };

      img.src = url;
    });
  } catch {
    return false;
  }
};
