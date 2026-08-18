import React from 'react';

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
    <div className="relative w-full h-full" style={{ minHeight: 0 }}>
      <iframe
        src={src}
        className={className}
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        title={title}
      />
    </div>
  );
});

ProtectedIframe.displayName = 'ProtectedIframe';

export default ProtectedIframe;
