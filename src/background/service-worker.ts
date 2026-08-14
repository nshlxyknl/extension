// Background service worker - handles events and APIs
console.log('Background service worker loaded!');

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);

  if (details.reason === 'install') {
    // Initialize storage
    chrome.storage.sync.set({ count: 0 });
    
    // Create a context menu
    chrome.contextMenus.create({
      id: 'myExtensionMenu',
      title: 'My Extension Action',
      contexts: ['page', 'selection'],
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log('Background received message:', request);

  if (request.action === 'contentScriptLoaded') {
    console.log('Content script loaded on:', request.url);
    sendResponse({ status: 'acknowledged' });
  }

  return true;
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info);

  if (info.menuItemId === 'myExtensionMenu') {
    // Send a notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'My Extension',
      message: 'Context menu item clicked!',
      priority: 2,
    });

    // Send message to content script if tab is available
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'greet',
        message: 'Hello from context menu!',
      });
    }
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    console.log('Tab loaded:', tab.url);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('Tab activated:', activeInfo.tabId);
});

// Example: Set up an alarm
chrome.alarms.create('periodicCheck', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'periodicCheck') {
    console.log('Periodic check triggered');
    // Perform periodic tasks here
  }
});

export {};
