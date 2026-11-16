import React, { useState, useEffect } from 'react';

// Module declaration removed

interface ProtectedIframeProps {
  src: string;
  title?: string;
  iframeRef?: React.Ref<HTMLIFrameElement>;
  className?: string;
  iframeClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  sandbox?: string;
}

/**
 * Optimized iframe wrapper for video player embeds.
 * - Overlay technique: intercepts the first click (which would trigger a popup ad)
 *   then permanently lifts so the user can freely interact with the actual player
 *   controls (play, pause, seek, fullscreen, etc.).
 * - The overlay resets when the content source changes (new video = new ad layers).
 * - referrerPolicy="no-referrer" suppresses referrer-based ad redirects.
 * - No sandbox attribute — live TV providers block sandboxed iframes.
 */
const ProtectedIframe: React.FC<ProtectedIframeProps> = React.memo(({ 
  src, 
  title = 'Video Player',
  iframeRef,
  className = '',
  iframeClassName = 'w-full h-full border-0',
  referrerPolicy,
  sandbox,
}) => {
  const [overlayActive, setOverlayActive] = useState(true);

  // Reset overlay protection when content source changes (new video/content)
  useEffect(() => {
    setOverlayActive(true);
  }, [src]);

  const handleOverlayClick = () => {
    // Permanently disable the overlay after absorbing the first click.
    // The first click blocks the initial popup ad that most embedded
    // players trigger on first user interaction. After that, the overlay
    // stays off so the user can freely use all player controls —
    // play, pause, seek, volume, and crucially, fullscreen.
    setOverlayActive(false);
  };

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 0, position: 'relative' }}>
      <iframe
        ref={iframeRef}
        src={src}
        className={iframeClassName}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
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
