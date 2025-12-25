import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../services/tmdb';

interface OptimizedImageProps {
  src: string | null;
  alt: string;
  className?: string;
  size?: 'w500' | 'original';
  aspectRatio?: 'video' | 'poster' | 'square';
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Optimized image component with:
 * - Lazy loading via Intersection Observer
 * - Progressive loading with blur placeholder
 * - Error state fallback
 * - Aspect ratio preservation
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  size = 'w500',
  aspectRatio = 'video',
  loading = 'lazy',
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(loading === 'eager');
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (loading !== 'lazy' || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before visible
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [loading, isInView]);

  const imageUrl = src ? getImageUrl(src, size) : null;
  
  // Low quality placeholder (using smaller size)
  const placeholderUrl = src ? getImageUrl(src, 'w500') : null;

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const aspectRatioClass = {
    video: 'aspect-video',
    poster: 'aspect-[2/3]',
    square: 'aspect-square',
  }[aspectRatio];

  const fallbackBg = 'bg-gradient-to-br from-gray-800 to-gray-900';

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${aspectRatioClass} ${className}`}
    >
      {/* Placeholder / Error state */}
      <div
        className={`absolute inset-0 ${fallbackBg} transition-opacity duration-500 ${
          isLoaded && !hasError ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Shimmer effect while loading */}
        {!hasError && !isLoaded && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        )}
        
        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Actual Image */}
      {isInView && imageUrl && !hasError && (
        <img
          src={imageUrl}
          alt={alt}
          loading={loading}
          onLoad={handleLoad}
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
