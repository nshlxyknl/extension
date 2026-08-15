// NIS Ad Blocker - Background Service Worker
console.log('NIS Ad Blocker service worker loaded!');

// Initialize storage on installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize stats
    chrome.storage.local.set({
      totalBlocked: 0,
      sessionBlocked: 0,
      enabled: true,
      installDate: Date.now(),
    });

    console.log('✓ NIS Ad Blocker initialized');
  }

  if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// Track blocked requests
// Note: sessionBlocked is tracked in storage, not in memory

// Listen for web navigation to track pages
chrome.webNavigation.onCompleted.addListener((details) => {
  if (details.frameId === 0) { // Main frame only
    console.log('Page loaded:', details.url);
  }
});

// Listen for declarativeNetRequest rule matches
if (chrome.declarativeNetRequest) {
  chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
    console.log('Rule matched:', info);
    incrementBlockCount();
  });
}

// Alternative: Monitor requests (for logging only, not blocking)
// Note: webRequest API is deprecated in Manifest V3
/* chrome.webRequest?.onBeforeRequest.addListener(
  (details) => {
    // This listener helps us understand what's being blocked
    console.log('Request:', details.url);
  },
  { urls: ['<all_urls>'] }
); */

// Increment block counter
function incrementBlockCount() {
  chrome.storage.local.get(['totalBlocked', 'sessionBlocked'], (result) => {
    const totalBlocked = ((result.totalBlocked as number) || 0) + 1;
    const sessionBlocked = ((result.sessionBlocked as number) || 0) + 1;

    chrome.storage.local.set({
      totalBlocked,
      sessionBlocked,
    });

    // Update badge
    updateBadge(sessionBlocked);
  });
}

// Update extension badge with block count
function updateBadge(count: number) {
  const text = count > 999 ? '999+' : count.toString();
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#f97316' }); // Orange
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'toggleBlocking') {
    handleToggleBlocking(request.enabled);
    sendResponse({ status: 'success' });
  }

  if (request.action === 'getStats') {
    chrome.storage.local.get(['totalBlocked', 'sessionBlocked', 'enabled'], (result) => {
      sendResponse(result);
    });
    return true; // Keep channel open for async response
  }

  return true;
});

// Handle enabling/disabling ad blocker
async function handleToggleBlocking(enabled: boolean) {
  console.log('Toggling ad blocking:', enabled);

  if (enabled) {
    // Enable all rules
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ['ruleset_1'],
    });
    console.log('✓ Ad blocking enabled');
  } else {
    // Disable all rules
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ['ruleset_1'],
    });
    console.log('⚠️ Ad blocking disabled');
  }

  // Update badge
  chrome.storage.local.get(['sessionBlocked'], (result) => {
    if (enabled) {
      updateBadge((result.sessionBlocked as number) || 0);
    } else {
      chrome.action.setBadgeText({ text: 'OFF' });
      chrome.action.setBadgeBackgroundColor({ color: '#6b7280' }); // Gray
    }
  });
}

// Reset session stats when browser starts
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.set({ sessionBlocked: 0 });
  updateBadge(0);
  console.log('Session stats reset');
});

// Initialize badge on load
chrome.storage.local.get(['sessionBlocked', 'enabled'], (result) => {
  if (result.enabled !== false) {
    updateBadge((result.sessionBlocked as number) || 0);
  } else {
    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
  }
});

// Periodic stats update (every 5 minutes)
chrome.alarms.create('updateStats', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateStats') {
    chrome.storage.local.get(['totalBlocked'], (result) => {
      console.log('Total ads blocked:', result.totalBlocked || 0);
    });
  }
});

export {};
