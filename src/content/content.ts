// NIS Ad Blocker - Content Script
console.log('NIS Ad Blocker content script loaded on:', window.location.href);

// ---- Selectors ----
// High-confidence selectors: specific patterns unlikely to match legit content
const STRONG_AD_SELECTORS = [
  '[class*="advertisement"]',
  '[id*="advertisement"]',
  '[class*="ad-container"]',
  '[id*="ad-container"]',
  '[class*="ad-slot"]',
  '[class*="ad-banner"]',
  '[class*="adsbygoogle"]',
  'ins.adsbygoogle',
  '.google-ad',
  '.adsense',
  '.banner-ad',
  '[data-ad-slot]',
  '[data-ad-client]',
  '[data-google-query-id]',
  '[data-testid*="placementTracking"]',
  '.video-ads',
  '.preroll-ad',
  '.popup-ad',
  '.overlay-ad',
  '.modal-ad',
  '.sidebar-ad',
  '.footer-ad',
  '[class*="native-ad"]',
  '.native-ad',
  'img[width="1"][height="1"]',
];

// Low-confidence selectors: generic names that can appear on legit content
const WEAK_AD_SELECTORS = [
  '.ad',
  '.ads',
  '.advert',
  '.sponsored',
  '[data-ad]',
  '[class*="promoted"]',
];

const AD_SELECTORS = [...STRONG_AD_SELECTORS, ...WEAK_AD_SELECTORS];

// Site-specific selectors for well-known ad layouts that generic rules miss
const SITE_RULES: Record<string, string[]> = {
  'bbc.com': ['.dotcom-ad'],
  'bbc.co.uk': ['.dotcom-ad'],
  'reddit.com': ['[data-testid="search-ad"]', 'shreddit-ad'],
  'spotify.com': ['[data-testid="advertisement"]'],
  'open.spotify.com': ['[data-testid="advertisement"]'],
  'youtube.com': [
    'ytd-ad-slot-renderer',
    'ytd-display-ad-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-banner-promo-renderer',
    '.ytp-ad-module',
    'ytd-player-legacy-desktop-watch-ads-renderer',
    'ytd-statement-banner-renderer[ad]',
    'ytd-promoted-sparkles-web-renderer',
    'ytd-companion-slot-renderer',
  ],
  'm.youtube.com': [
    'ytm-promoted-video-renderer',
    'ytm-companion-ad-renderer',
    '.companion-ad-container',
  ],
};

// Look up site rules by hostname, walking up subdomains so e.g.
// music.youtube.com resolves to the youtube.com rules
function findSiteRules(hostname: string): string[] {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  const parts = h.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts.slice(i).join('.');
    if (SITE_RULES[key]) return SITE_RULES[key];
  }
  return [];
}

// Sites where blocking is paused entirely (AI chat/search apps are prone
// to false positives)
const DEFAULT_ALLOWLISTED_SITES = [
  'chatgpt.com',
  'openai.com',
  'claude.ai',
  'gemini.google.com',
];

// Small labels that often sit next to ads and reserve space
const AD_LABEL_RE = /^(advertisements?|adverts?|ads?|ads? by .{1,30}|sponsored|sponsored (link|links|content|post|products?)|promoted|promoted (link|links|content|post)|brought to you by .{1,30}|publicit(e|é)|annonce|anzeige|reklame)$/i;

// Iframe detection (word-boundary so "badge"/"head" are not matched)
const AD_IFRAME_SRC_RE = /(doubleclick|googlesyndication|googletagmanager|\/ads\/|advertising|ads\.|adnxs|criteo|taboola|outbrain)/i;
const AD_IFRAME_ATTR_RE = /\b(ad|ads|advert|advertisement|advertorial)\b/i;

// Statistics
let removedAdsCount = 0;

// State
let isEnabled = true;
let sitePaused = false;
let hideAdPlaceholders = true;
let siteAllowlist: string[] = DEFAULT_ALLOWLISTED_SITES;
let styleEl: HTMLStyleElement | null = null;
let observer: MutationObserver | null = null;
let activeSelectors: string[] = AD_SELECTORS;
// Generic id/class-pattern CSS is unsafe on strict sites (can match legit UI)
let useGenericContainerCss = true;
// Iframe scanning is skipped on strict sites; network rules cover ads there
let skipAdIframes = false;

function isSiteAllowlisted(hostname: string, list: string[]): boolean {
  const h = hostname.toLowerCase();
  return list.some((site) => site === h || h.endsWith('.' + site));
}

chrome.storage.local.get(['enabled', 'settings', 'allowlistedSites'], (result) => {
  isEnabled = result.enabled !== false;
  const settings = result.settings as { hideAdPlaceholders?: boolean } | undefined;
  hideAdPlaceholders = settings?.hideAdPlaceholders !== false;
  siteAllowlist = (result.allowlistedSites as string[]) || DEFAULT_ALLOWLISTED_SITES;
  applySitePolicy();
});

// Listen for enable/disable and site allowlist changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) {
    isEnabled = changes.enabled.newValue as boolean;
    if (isEnabled && !sitePaused) {
      initAdBlocker();
    } else if (!isEnabled) {
      restoreElements();
    }
  }

  if (changes.settings) {
    const settings = changes.settings.newValue as { hideAdPlaceholders?: boolean };
    hideAdPlaceholders = settings?.hideAdPlaceholders !== false;
  }

  if (changes.allowlistedSites) {
    siteAllowlist = (changes.allowlistedSites.newValue as string[]) || [];
    applySitePolicy();
  }
});

// Apply the current site allowlist policy
function applySitePolicy() {
  const paused = isSiteAllowlisted(location.hostname, siteAllowlist);
  if (paused && !sitePaused) {
    sitePaused = true;
    restoreElements();
    console.log('NIS: Blocking paused on this site');
  } else if (!paused) {
    sitePaused = false;
    if (isEnabled) {
      initAdBlocker();
    }
  }
}

// Sites where only site-specific selectors should be used (generic selectors
// are too aggressive and break site UI, e.g. YouTube's search dropdown)
const STRICT_SITE_RULES = ['youtube.com'];

function matchesSite(hostname: string, site: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  return h === site || h.endsWith('.' + site);
}

// Returns the strict-site key matching this hostname (subdomains included,
// so m.youtube.com / music.youtube.com are treated like youtube.com)
function getStrictSite(hostname: string): string | null {
  for (const site of STRICT_SITE_RULES) {
    if (matchesSite(hostname, site)) return site;
  }
  return null;
}

// Critical page chrome that must NEVER be hidden, collapsed, or shrunk by
// this extension. Blocking an ad *inside* these containers is still allowed.
const PROTECTED_UI_SELECTORS = [
  // YouTube header: search bar + notification bell live here
  'ytd-masthead',
  '#masthead-container',
  'yt-searchbox',
  'ytd-searchbox',
  '#masthead-search',
  'ytd-notification-topbar-button-renderer',
  'ytd-topbar-menu-button-renderer',
  // YouTube popups: search suggestions, notification panel, menus
  'ytd-popup-container',
  'tp-yt-iron-overlay-backdrop',
  'tp-yt-paper-dialog',
  // YouTube navigation sidebar + main layout shells
  'ytd-guide-renderer',
  'tp-yt-app-drawer',
  'ytd-mini-guide-renderer',
  // Video player shell (ads inside it are hidden individually)
  '#movie_player',
  '#full-bleed-container',
  '#player',
].join(', ');

function isProtectedUi(element: Element): boolean {
  try {
    return element.matches(PROTECTED_UI_SELECTORS);
  } catch {
    return false;
  }
}

function initAdBlocker() {
  if (!isEnabled || sitePaused) return;

  const strictSite = getStrictSite(location.hostname);
  const siteSpecific = findSiteRules(location.hostname);
  // On sites like YouTube, skip generic selectors entirely to avoid breaking UI
  activeSelectors = strictSite ? siteSpecific : [...AD_SELECTORS, ...siteSpecific];
  useGenericContainerCss = !strictSite;
  skipAdIframes = !!strictSite;

  injectStyles();
  removeAds();
  observeDOM();

  console.log(`NIS: Removed ${removedAdsCount} ad elements`);
}

// Remove ad elements from the page
function removeAds() {
  if (!isEnabled || sitePaused) return;

  activeSelectors.forEach((selector) => {
    try {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element && element.parentNode) {
          blockElement(element as HTMLElement);
        }
      });
    } catch (error) {
      // Selector might be invalid for some pages
      console.warn('NIS: Invalid selector', selector);
    }
  });

  // Also remove iframes that are likely ads (skipped on strict sites)
  if (!skipAdIframes) {
    removeAdIframes();
  }
}

// Mark an element as blocked and collapse the space it took
function blockElement(element: HTMLElement) {
  if (element.getAttribute('data-nis-blocked') === 'true') return;
  // Never touch critical page chrome (search bar, notification bell, player...)
  if (isProtectedUi(element)) return;
  // Capture height before hiding so we know how much space the ad occupied
  const blockedHeight = element.getBoundingClientRect().height;
  markBlocked(element);
  if (hideAdPlaceholders) {
    collapseEmptyContainers(element, blockedHeight);
  }
}

function markBlocked(element: HTMLElement) {
  element.style.display = 'none';
  element.style.visibility = 'hidden';
  element.setAttribute('data-nis-blocked', 'true');
  removedAdsCount++;
}

// Remove ad iframes
function removeAdIframes() {
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach((iframe) => {
    const src = iframe.src.toLowerCase();
    const id = iframe.id.toLowerCase();
    const className = iframe.className.toLowerCase();

    if (
      AD_IFRAME_SRC_RE.test(src) ||
      AD_IFRAME_ATTR_RE.test(id) ||
      AD_IFRAME_ATTR_RE.test(className)
    ) {
      blockElement(iframe as HTMLElement);
    }
  });
}

// Collapse empty wrapper containers that only contained the blocked ad,
// and shrink wrappers that still reserve space for the ad, so no blank
// space is left in the layout
function collapseEmptyContainers(element: HTMLElement, blockedHeight: number) {
  const maxLevels = getStrictSite(location.hostname) ? 3 : 8;
  const CONTAINER_TAGS = new Set([
    'DIV', 'SECTION', 'ASIDE', 'HEADER', 'FOOTER',
    'ARTICLE', 'NAV', 'FORM', 'UL', 'OL', 'LI', 'MAIN', 'FIGURE', 'SPAN',
  ]);

  let current = element.parentElement;
  let level = 0;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement &&
    level < maxLevels
  ) {
    // Never collapse or shrink critical page chrome (header, search bar,
    // notification panel, player shell...)
    if (isProtectedUi(current)) break;

    const tag = current.tagName;
    if (!CONTAINER_TAGS.has(tag)) break;

    let hasVisible = false;

    for (const child of Array.from(current.children)) {
      const h = child as HTMLElement;
      if (isBlockedOrCollapsed(h)) continue;
      if (isHidden(h)) continue;

      // Hide small ad labels (e.g. "Advertisement", "Sponsored") that
      // would otherwise keep the wrapper from collapsing
      if (isAdLabel(h)) {
        markBlocked(h);
        continue;
      }

      hasVisible = true;
    }

    // Direct text content also counts as visible content
    if (!hasVisible) {
      for (const node of Array.from(current.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent && node.textContent.trim().length > 0) {
          hasVisible = true;
          break;
        }
      }
    }

    if (!hasVisible) {
      // Wrapper only held the blocked ad -> remove it entirely
      collapseElement(current);
      current = current.parentElement;
      level++;
      continue;
    }

    // Wrapper has some content, but it may still reserve height for the ad
    // (fixed height / min-height). If the ad made up most of its height,
    // free that space so the wrapper hugs its real content.
    const rect = current.getBoundingClientRect();
    if (blockedHeight > 0 && rect.height >= 50 && blockedHeight / rect.height > 0.3) {
      shrinkElement(current);
      current = current.parentElement;
      level++;
      continue;
    }

    break;
  }
}

function collapseElement(element: HTMLElement) {
  element.style.display = 'none';
  element.setAttribute('data-nis-collapsed', 'true');
  removedAdsCount++;
}

function shrinkElement(element: HTMLElement) {
  element.style.height = 'auto';
  element.style.minHeight = '0';
  element.style.maxHeight = 'none';
  element.setAttribute('data-nis-shrunk', 'true');
}

function isBlockedOrCollapsed(element: HTMLElement): boolean {
  return (
    element.getAttribute('data-nis-blocked') === 'true' ||
    element.getAttribute('data-nis-collapsed') === 'true'
  );
}

function isHidden(element: HTMLElement): boolean {
  if (element.style.display === 'none') return true;
  const style = getComputedStyle(element);
  return style.display === 'none' || style.visibility === 'hidden';
}

function isAdLabel(element: HTMLElement): boolean {
  if (element.offsetHeight > 100) return false;
  const text = element.textContent ? element.textContent.trim() : '';
  if (!text || text.length > 40) return false;
  return AD_LABEL_RE.test(text);
}

// Observe DOM changes and remove new ads
function observeDOM() {
  if (observer) return;

  observer = new MutationObserver((mutations) => {
    if (!isEnabled || sitePaused) return;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const element = node as HTMLElement;

        activeSelectors.forEach((selector) => {
          try {
            if (element.matches && element.matches(selector)) {
              blockElement(element);
            }

            // Also check children
            const children = element.querySelectorAll(selector);
            children.forEach((child) => {
              blockElement(child as HTMLElement);
            });
          } catch (error) {
            // Ignore invalid selectors
          }
        });
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Inject CSS to hide ad elements and collapse their space
function injectStyles() {
  if (styleEl) return;

  // Generic id/class-pattern rules are only safe on non-strict sites; on
  // sites like YouTube they can match legit UI (search bar, notifications)
  const genericContainerCss = useGenericContainerCss
    ? `
    /* Hide ad containers (word-delimited so ids like "head-" are untouched) */
    div[id*="google_ads"],
    div[class*="google_ads"],
    div[id^="ad-"],
    div[id*="-ad-"],
    div[id$="-ad"],
    div[id^="ads-"],
    div[class*="ad-wrapper"],
    aside[class^="ad"],
    aside[class*="-ad"] {
      display: none !important;
    }
  `
    : '';

  const style = document.createElement('style');
  style.id = 'nis-ad-blocker-styles';
  style.textContent = `
    /* NIS Ad Blocker - Hide common ad elements */
    ${activeSelectors.join(', ')} {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
    }
${genericContainerCss}
    /* Collapse blocked ads and emptied wrappers completely so no
       blank space is left behind */
    [data-nis-blocked="true"],
    [data-nis-collapsed="true"] {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      max-height: 0 !important;
      min-height: 0 !important;
      width: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      overflow: hidden !important;
      position: static !important;
    }

    /* Wrappers that reserved height for an ad shrink to their real content */
    [data-nis-shrunk="true"] {
      height: auto !important;
      max-height: none !important;
      min-height: 0 !important;
    }
  `;

  (document.head || document.documentElement).appendChild(style);
  styleEl = style;
}

// Un-hide everything and remove injected styles
function restoreElements() {
  document.querySelectorAll('[data-nis-blocked="true"]').forEach((el) => {
    const h = el as HTMLElement;
    h.style.display = '';
    h.style.visibility = '';
    h.removeAttribute('data-nis-blocked');
  });

  document.querySelectorAll('[data-nis-collapsed="true"]').forEach((el) => {
    const h = el as HTMLElement;
    h.style.display = '';
    h.removeAttribute('data-nis-collapsed');
  });

  document.querySelectorAll('[data-nis-shrunk="true"]').forEach((el) => {
    const h = el as HTMLElement;
    h.style.height = '';
    h.style.minHeight = '';
    h.style.maxHeight = '';
    h.removeAttribute('data-nis-shrunk');
  });

  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }

  removedAdsCount = 0;
}

// Final cleanup once everything has loaded (catches lazy-loaded ads)
window.addEventListener('load', () => {
  if (isEnabled && !sitePaused) {
    removeAds();
    console.log(`NIS: Final cleanup - ${removedAdsCount} ad elements removed`);
  }
});

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
