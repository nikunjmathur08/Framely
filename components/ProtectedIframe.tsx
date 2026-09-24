import React from 'react';

declare module 'react' {
  interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
    webkitAllowFullScreen?: boolean | string;
    mozAllowFullScreen?: boolean | string;
  }
}

interface ProtectedIframeProps {
  src: string;
  title?: string;
  className?: string;
}

/**
 * Optimized iframe wrapper for video player embeds
 * - No key prop to prevent remounting on URL changes
 * - Memoized to prevent unnecessary re-renders
 * - Allows smooth playback across episode/season changes
 */
const ProtectedIframe: React.FC<ProtectedIframeProps> = React.memo(({ 
  src, 
  title = 'Video Player',
  className = 'w-full h-full border-0'
}) => {
  return (
    <div className="relative w-full h-full" style={{ minHeight: 0, position: 'relative' }}>
      <iframe
        src={src}
        className={className}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        allowFullScreen
        webkitAllowFullScreen
        mozAllowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        title={title}
      />
    </div>
  );
});

ProtectedIframe.displayName = 'ProtectedIframe';

export default ProtectedIframe;
