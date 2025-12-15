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
    // ========== LAYER 1: Override ALL window opening methods ==========
    const originalWindowOpen = window.open;
    const originalCreateElement = document.createElement.bind(document);

    // Block window.open
    window.open = function(...args) {
      console.log('🚫 Blocked window.open:', args);
      showBlockedNotification();
      return null;
    };

    // Block direct assignment methods
    const blockAssignment = () => {
      showBlockedNotification();
      return false;
    };

    // Override createElement to catch dynamic ad links
    (document as any).createElement = function(tagName: string, ...args: any[]) {
      const element = originalCreateElement.call(document, tagName, ...args);
      
      if (tagName.toLowerCase() === 'a') {
        // Monitor and block target="_blank" on links
        const observer = new MutationObserver(() => {
          if (element.getAttribute('target') === '_blank' || 
              element.getAttribute('rel')?.includes('noopener')) {
            element.removeAttribute('target');
            element.removeAttribute('rel');
            console.log('🚫 Neutralized dynamic popup link');
          }
        });
        observer.observe(element, { attributes: true, attributeFilter: ['target', 'rel'] });
      }
      
      return element;
    };

    // ========== LAYER 2: Intercept ALL click events globally ==========
    const blockNewTabLinks = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Check all parent elements for links
      let element: HTMLElement | null = target;
      while (element) {
        if (element.tagName === 'A') {
          const link = element as HTMLAnchorElement;
          
          // Block any target="_blank" or similar
          if (link.target === '_blank' || 
              link.target === '_new' ||
              link.rel?.includes('noopener') ||
              link.rel?.includes('noreferrer')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('🚫 Blocked new tab link click');
            showBlockedNotification();
            return false;
          }

          // Block external links from iframe container
          if (containerRef.current?.contains(element)) {
            const currentDomain = window.location.hostname;
            try {
              const linkDomain = new URL(link.href).hostname;
              if (linkDomain !== currentDomain && link.href.startsWith('http')) {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('🚫 Blocked external link from iframe');
                showBlockedNotification();
                return false;
              }
            } catch (err) {
              // Invalid URL, block it
              e.preventDefault();
              e.stopPropagation();
              console.log('🚫 Blocked invalid link');
              showBlockedNotification();
              return false;
            }
          }
        }
        element = element.parentElement;
      }

      // Block very rapid clicks (programmatic/ad behavior)
      const now = Date.now();
      const timeSinceLastClick = now - (window as any).__lastClickTime || 1000;
      (window as any).__lastClickTime = now;
      
      if (timeSinceLastClick < 200) {
        (window as any).__rapidClickCount = ((window as any).__rapidClickCount || 0) + 1;
        if ((window as any).__rapidClickCount >= 2) {
          e.preventDefault();
          e.stopImmediatePropagation();
          console.log('🚫 Blocked rapid click burst');
          showBlockedNotification();
          (window as any).__rapidClickCount = 0;
          return false;
        }
      } else {
        (window as any).__rapidClickCount = 0;
      }
    };

    // Use capture phase to intercept before iframe
    document.addEventListener('click', blockNewTabLinks, true);
    document.addEventListener('auxclick', blockNewTabLinks, true); // Middle click
    document.addEventListener('mousedown', blockNewTabLinks, true);

    // ========== LAYER 3: Monitor for dynamically created elements ==========
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            const element = node as HTMLElement;
            
            // Remove target from any added links
            if (element.tagName === 'A') {
              const link = element as HTMLAnchorElement;
              if (link.target === '_blank' || link.target === '_new') {
                link.removeAttribute('target');
                console.log('🚫 Removed target from dynamically added link');
              }
            }
            
            // Check children too
            const links = element.querySelectorAll('a[target="_blank"], a[target="_new"]');
            links.forEach(link => {
              link.removeAttribute('target');
              console.log('🚫 Removed target from nested link');
            });
          }
        });
      });
    });

    // Observe the container
    if (containerRef.current) {
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['target', 'rel']
      });
    }

    // ========== LAYER 4: Block visibility change pop-unders ==========
    const blockVisibilityPopunders = () => {
      if (document.hidden) {
        // Tab lost focus - potential pop-under attack
        console.log('⚠️ Tab hidden - watching for pop-under');
      }
    };
    document.addEventListener('visibilitychange', blockVisibilityPopunders);

    // ========== LAYER 5: Disable common ad scripts ==========
    (window as any).popMagic = undefined;
    (window as any).PopAds = undefined;
    (window as any).popns = undefined;
    (window as any).popunder = undefined;
    (window as any).adBlockDetected = false;

    // Cleanup
    return () => {
      window.open = originalWindowOpen;
      document.createElement = originalCreateElement;
      document.removeEventListener('click', blockNewTabLinks, true);
      document.removeEventListener('auxclick', blockNewTabLinks, true);
      document.removeEventListener('mousedown', blockNewTabLinks, true);
      document.removeEventListener('visibilitychange', blockVisibilityPopunders);
      observer.disconnect();
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
              })();
            `;
            iframe.contentDocument?.head?.appendChild(script);
            console.log('✅ Injected pop-up blocker into iframe');
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
