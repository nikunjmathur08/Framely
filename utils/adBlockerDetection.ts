/**
 * Utility functions to detect browser capabilities and ad blockers
 */

/**
 * Detects if the browser is Brave (which has built-in ad blocking)
 */
export const isBraveBrowser = async (): Promise<boolean> => {
  try {
    // Brave browser exposes a specific API
    if ((navigator as any).brave && (navigator as any).brave.isBrave) {
      return await (navigator as any).brave.isBrave();
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Attempts to detect if an ad blocker is installed
 * Uses the "bait element" technique - creates an element with ad-like characteristics
 * and checks if it gets blocked/hidden by ad blocking extensions
 */
export const detectAdBlocker = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create a bait element that ad blockers typically target
    const bait = document.createElement('div');
    bait.setAttribute('class', 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links');
    bait.setAttribute('style', 'width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;');
    
    try {
      document.body.appendChild(bait);
      
      // Give ad blockers time to act
      setTimeout(() => {
        const detected = 
          bait.offsetHeight === 0 || 
          bait.offsetWidth === 0 || 
          window.getComputedStyle(bait).display === 'none' ||
          window.getComputedStyle(bait).visibility === 'hidden';
        
        // Clean up
        document.body.removeChild(bait);
        resolve(detected);
      }, 100);
    } catch {
      resolve(false);
    }
  });
};

/**
 * Determines if the ad blocker modal should be shown
 * Returns true if:
 * - User hasn't opted to hide it permanently
 * - Not using Brave browser
 * - No ad blocker detected
 */
export const shouldShowAdBlockerModal = async (hidePreference: boolean): Promise<boolean> => {
  // If user has opted out, don't show
  if (hidePreference) {
    return false;
  }

  // Check if using Brave
  const isBrave = await isBraveBrowser();
  if (isBrave) {
    return false;
  }

  // Check if ad blocker is installed
  const hasAdBlocker = await detectAdBlocker();
  if (hasAdBlocker) {
    return false;
  }

  // Show modal if no protection detected
  return true;
};
