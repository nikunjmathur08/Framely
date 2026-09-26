import React, { useState } from 'react';

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
  iframeClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  sandbox?: string;
}

/**
 * Optimized iframe wrapper for video player embeds.
 * - Overlay technique: intercepts the first click (which would trigger a popup ad)
 *   and briefly lifts for 1.5s so the next click reaches the actual player.
 * - referrerPolicy="no-referrer" suppresses referrer-based ad redirects.
 * - No sandbox attribute — live TV providers block sandboxed iframes.
 */
const ProtectedIframe: React.FC<ProtectedIframeProps> = React.memo(({ 
  src, 
  title = 'Video Player',
  className = '',
  iframeClassName = 'w-full h-full border-0',
  referrerPolicy = 'no-referrer',
  sandbox,
}) => {
  const [overlayActive, setOverlayActive] = useState(true);

  const handleOverlayClick = () => {
    setOverlayActive(false);
    // Tight 700ms window: just enough time for the very next click to pass through 
    // to the real play button, but drops the shield back fast enough to catch 
    // subsequent invisible ad layers (which often stack 2-3 deep).
    setTimeout(() => setOverlayActive(true), 700);
  };

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 0, position: 'relative' }}>
      <iframe
        src={src}
        className={iframeClassName}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        allowFullScreen
        webkitAllowFullScreen
        mozAllowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        referrerPolicy={referrerPolicy}
        sandbox={sandbox}
        title={title}
      />
      {/* Transparent overlay — intercepts first click to suppress popup ads */}
      {overlayActive && (
        <div
          onClick={handleOverlayClick}
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            zIndex: 10,
            cursor: 'pointer',
            background: 'transparent',
          }}
          title="Click to play"
        />
      )}
    </div>
  );
});

ProtectedIframe.displayName = 'ProtectedIframe';

export default ProtectedIframe;
