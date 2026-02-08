import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Package2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  fallback,
  placeholder,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Start loading 50px before the image comes into view
      }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsError(true);
    onError?.();
  }, [onError]);

  const defaultPlaceholder = (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <div className="animate-pulse bg-gray-200 w-full h-full rounded"></div>
    </div>
  );

  const defaultFallback = (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <Package2 className="w-8 h-8 text-gray-400" />
    </div>
  );

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {!isInView && (placeholder || defaultPlaceholder)}
      
      {isInView && !isError && (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
          />
        </>
      )}
      
      {isError && (fallback || defaultFallback)}
    </div>
  );
}

// Optimized version for product images
interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProductImage({ src, alt, className = '', size = 'md' }: ProductImageProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48'
  };

  if (!src) {
    return (
      <div className={`${sizeClasses[size]} bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <Package2 className="w-1/3 h-1/3 text-gray-400" />
      </div>
    );
  }

  return (
    <LazyImage
      src={src}
      alt={alt}
      className={`${sizeClasses[size]} rounded-lg ${className}`}
      placeholder={
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="animate-pulse bg-gray-200 w-full h-full rounded-lg"></div>
        </div>
      }
      fallback={
        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
          <Package2 className="w-1/3 h-1/3 text-gray-400" />
        </div>
      }
    />
  );
}

// WebP support detection and fallback
export function OptimizedImage({ src, alt, className = '', ...props }: LazyImageProps) {
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Check WebP support
    const webp = new Image();
    webp.onload = webp.onerror = () => {
      setWebpSupported(webp.height === 2);
    };
    webp.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }, []);

  if (webpSupported === null) {
    return <LazyImage src={src} alt={alt} className={className} {...props} />;
  }

  // Try to use WebP version if supported
  const optimizedSrc = webpSupported && src.includes('.jpg') || src.includes('.png') 
    ? src.replace(/\.(jpg|jpeg|png)$/i, '.webp')
    : src;

  return (
    <LazyImage
      src={optimizedSrc}
      alt={alt}
      className={className}
      onError={() => {
        // Fallback to original format if WebP fails
        if (optimizedSrc !== src) {
          return <LazyImage src={src} alt={alt} className={className} {...props} />;
        }
        props.onError?.();
      }}
      {...props}
    />
  );
}