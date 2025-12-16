import React, { useRef, useEffect, useState } from 'react';
import { Shield, X } from 'lucide-react';

interface ProtectedIframeProps {
  src: string;
  title?: string;
  className?: string;
}

/**
 * Maximum new-tab/pop-up blocker for video player iframes
 */
const ProtectedIframe: React.FC<ProtectedIframeProps> = ({ 
  src, 
  title = 'Video Player',
  className = 'w-full h-full border-0'
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [blockedAds, setBlockedAds] = useState(0);
  const [showBlockMessage, setShowBlockMessage] = useState(false);

  const showBlockedNotification = () => {
    setBlockedAds(prev => prev + 1);
    setShowBlockMessage(true);
    setTimeout(() => setShowBlockMessage(false), 2000);
  };

  useEffect(() => {
    // ========== LIGHTWEIGHT PROTECTION: Ad/Popup Blocking Only ==========
    // Reduced aggression to avoid triggering Vidking's defensive mechanisms
    
    const originalWindowOpen = window.open;

    // Block window.open (pop-ups)
    window.open = function(...args) {
      console.log('🚫 Blocked window.open:', args);
      showBlockedNotification();
      return null;
    };

    // Block new-tab links on click
    const blockNewTabLinks = (e: Event) => {
      const target = e.target as HTMLElement;
      let element: HTMLElement | null = target;
      
      while (element) {
        if (element.tagName === 'A') {
          const link = element as HTMLAnchorElement;
          
          if (link.target === '_blank' || link.target === '_new') {
            e.preventDefault();
            e.stopPropagation();
            console.log('🚫 Blocked new tab link');
            showBlockedNotification();
            return false;
          }
        }
        element = element.parentElement;
      }
    };

    document.addEventListener('click', blockNewTabLinks, true);

    // Disable common ad scripts
    (window as any).popMagic = undefined;
    (window as any).PopAds = undefined;
    (window as any).popns = undefined;

    console.log('✅ Lightweight ad blocking active');

    // Cleanup
    return () => {
      window.open = originalWindowOpen;
      document.removeEventListener('click', blockNewTabLinks, true);
    };
  }, []);

  // Try to inject blocker into iframe
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      try {
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          const script = iframe.contentDocument?.createElement('script');
          if (script) {
            script.textContent = `
              (function() {
                // ===== ANTI-DEBUGGER-DETECTION PROTECTION =====
                // Block debugger detection attempts
                const originalEval = window.eval;
                window.eval = function(code) {
                  // Block eval("debugger") attempts
                  if (typeof code === 'string' && code.includes('debugger')) {
                    console.log('🚫 Blocked debugger detection via eval');
                    return; // Return nothing instead of executing
                  }
                  return originalEval.call(this, code);
                };

                // Override Date.now to prevent timing-based debugger detection
                const originalDateNow = Date.now;
                let fakeTimestamp = originalDateNow();
                Date.now = function() {
                  // Always return consistent timestamps to fool timing checks
                  fakeTimestamp += Math.random() * 10 + 1; // Small increments
                  return Math.floor(fakeTimestamp);
                };

                // Block dState event dispatching
                const originalDispatchEvent = window.dispatchEvent;
                window.dispatchEvent = function(event) {
                  if (event.type === 'dState' || event.type === 'debuggerDetected') {
                    console.log('🚫 Blocked debugger detection event:', event.type);
                    return true; // Pretend it succeeded but don't actually dispatch
                  }
                  return originalDispatchEvent.call(this, event);
                };

                // Block CustomEvent creation for debugger detection
                const OriginalCustomEvent = window.CustomEvent;
                window.CustomEvent = function(type, options) {
                  if (type === 'dState' || type === 'debuggerDetected') {
                    console.log('🚫 Blocked CustomEvent creation:', type);
                    // Return a dummy event that won't break code
                    return new OriginalCustomEvent('blockedEvent', options);
                  }
                  return new OriginalCustomEvent(type, options);
                };

                // ===== ORIGINAL POP-UP BLOCKER =====
                // Override window.open inside iframe
                window.open = function() { 
                  console.log('🚫 Blocked iframe window.open'); 
                  return null; 
                };
                
                // Block all target="_blank" links
                document.addEventListener('click', function(e) {
                  let target = e.target;
                  while (target) {
                    if (target.tagName === 'A' && target.getAttribute('target') === '_blank') {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🚫 Blocked _blank link in iframe');
                      return false;
                    }
                    target = target.parentElement;
                  }
                }, true);

                console.log('✅ Anti-debugger-detection protection active');
              })();
            `;
            iframe.contentDocument?.head?.appendChild(script);
            console.log('✅ Injected enhanced protection into iframe');
          }
        }
      } catch (e) {
        // Cross-origin - outer protections still work
        console.log('ℹ️ Cross-origin iframe, using outer protections');
      }
    };

    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Iframe */}
      <iframe
        ref={iframeRef}
        key={src} // Stable key based on src - only remount if src legitimately changes
        src={src}
        className={className}
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        title={title}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
      />

      {/* Ad Block Counter */}
      {blockedAds > 0 && (
        <div className="absolute top-4 right-4 z-10 bg-green-600/90 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 shadow-lg pointer-events-none">
          <Shield className="w-3 h-3" />
          {blockedAds}
        </div>
      )}

      {/* Block Message Flash */}
      {showBlockMessage && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="bg-red-600/90 text-white px-6 py-3 rounded-lg text-lg font-bold flex items-center gap-3 shadow-2xl animate-pulse">
            <X className="w-6 h-6" />
            New Tab Blocked!
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtectedIframe;
