// NIS Ad Blocker - Content Script
console.log('NIS Ad Blocker content script loaded on:', window.location.href);

// Common ad selectors (CSS-based blocking)
const AD_SELECTORS = [
  // Generic ad classes and IDs
  '[class*="advertisement"]',
  '[id*="advertisement"]',
  '[class*="ad-container"]',
  '[id*="ad-container"]',
  '[class*="adsbygoogle"]',
  '.ad',
  '.ads',
  '.advert',
  '.banner-ad',
  '.sponsored',
  '[data-ad-slot]',
  '[data-google-query-id]',
  
  // Common ad networks
  'ins.adsbygoogle',
  '.google-ad',
  '.adsense',
  
  // Social media ads
  '[data-testid*="placementTracking"]',
  '[data-ad]',
  
  // Video ads
  '.video-ads',
  '.preroll-ad',
  
  // Pop-ups and overlays
  '.popup-ad',
  '.overlay-ad',
  '.modal-ad',
  
  // Sidebar and footer ads
  '.sidebar-ad',
  '.footer-ad',
  
  // Native ads
  '[class*="native-ad"]',
  '[class*="promoted"]',
  
  // Tracking pixels
  'img[width="1"][height="1"]',
  'img[style*="display:none"]',
];

// Statistics
let removedAdsCount = 0;

// Check if ad blocker is enabled
let isEnabled = true;

chrome.storage.local.get(['enabled'], (result) => {
  isEnabled = result.enabled !== false;
  if (isEnabled) {
    initAdBlocker();
  }
});

// Listen for enable/disable messages
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue as boolean;
    if (isEnabled) {
      initAdBlocker();
    } else {
      console.log('NIS: Ad blocking disabled');
    }
  }
});

function initAdBlocker() {
  // Remove existing ads
  removeAds();

  // Watch for new ads being added
  observeDOM();

  // Hide ad elements with CSS
  injectStyles();

  console.log(`NIS: Removed ${removedAdsCount} ad elements`);
}

// Remove ad elements from the page
function removeAds() {
  if (!isEnabled) return;

  AD_SELECTORS.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element && element.parentNode) {
          // Hide instead of remove to avoid breaking page layout
          (element as HTMLElement).style.display = 'none';
          (element as HTMLElement).style.visibility = 'hidden';
          (element as HTMLElement).setAttribute('data-nis-blocked', 'true');
          removedAdsCount++;
        }
      });
    } catch (error) {
      // Selector might be invalid for some pages
      console.warn('NIS: Invalid selector', selector);
    }
  });

  // Also remove iframes that are likely ads
  removeAdIframes();
}

// Remove ad iframes
function removeAdIframes() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.src.toLowerCase();
    const id = iframe.id.toLowerCase();
    const className = iframe.className.toLowerCase();

    if (
      src.includes('doubleclick') ||
      src.includes('googlesyndication') ||
      src.includes('/ads/') ||
      src.includes('advertising') ||
      id.includes('ad') ||
      className.includes('ad')
    ) {
      (iframe as HTMLElement).style.display = 'none';
      removedAdsCount++;
    }
  });
}

// Observe DOM changes and remove new ads
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    if (!isEnabled) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;

          // Check if the added element matches ad selectors
          AD_SELECTORS.forEach((selector) => {
            try {
              if (element.matches && element.matches(selector)) {
                element.style.display = 'none';
                element.style.visibility = 'hidden';
                element.setAttribute('data-nis-blocked', 'true');
                removedAdsCount++;
              }

              // Also check children
              const children = element.querySelectorAll(selector);
              children.forEach((child) => {
                (child as HTMLElement).style.display = 'none';
                (child as HTMLElement).style.visibility = 'hidden';
                (child as HTMLElement).setAttribute('data-nis-blocked', 'true');
                removedAdsCount++;
              });
            } catch (error) {
              // Ignore invalid selectors
            }
          });
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Inject CSS to hide ad elements
function injectStyles() {
  const style = document.createElement('style');
  style.id = 'nis-ad-blocker-styles';
  style.textContent = `
    /* NIS Ad Blocker - Hide common ad elements */
    ${AD_SELECTORS.join(', ')} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      position: absolute !important;
      left: -9999px !important;
    }

    /* Hide ad containers */
    div[id*="google_ads"],
    div[class*="google_ads"],
    div[id*="ad-"],
    div[class*="ad-wrapper"],
    aside[class*="ad"] {
      display: none !important;
    }

    /* Remove ad spacing */
    [data-nis-blocked="true"] {
      margin: 0 !important;
      padding: 0 !important;
      height: 0 !important;
      min-height: 0 !important;
    }
  `;

  // Wait for head to be available
  if (document.head) {
    document.head.appendChild(style);
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      document.head.appendChild(style);
    });
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'getPageStats') {
    sendResponse({
      removedAds: removedAdsCount,
      url: window.location.href,
    });
  }

  return true;
});

// Report removed ads to background
function reportStats() {
  if (removedAdsCount > 0) {
    chrome.runtime.sendMessage({
      action: 'adElementsRemoved',
      count: removedAdsCount,
      url: window.location.href,
    });
  }
}

// Report stats after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(reportStats, 2000);
  });
} else {
  setTimeout(reportStats, 2000);
}

// Prevent some anti-adblock scripts
Object.defineProperty(window, 'adblock', {
  get: () => false,
  set: () => {},
});

Object.defineProperty(window, 'adBlockEnabled', {
  get: () => false,
  set: () => {},
});

console.log('NIS: Protection active ✓');

export {};
