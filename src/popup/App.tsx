import { useState, useEffect } from 'react';

interface BlockStats {
  totalBlocked: number;
  sessionBlocked: number;
  enabled: boolean;
}

export default function App() {
  const [stats, setStats] = useState<BlockStats>({
    totalBlocked: 0,
    sessionBlocked: 0,
    enabled: true,
  });
  const [activeTab, setActiveTab] = useState<string>('');
  const [tabUrl, setTabUrl] = useState<string>('');
  const [currentHost, setCurrentHost] = useState<string>('');
  const [allowlistedSites, setAllowlistedSites] = useState<string[]>([]);

  useEffect(() => {
    // Load stats from storage
    chrome.storage.local.get(['totalBlocked', 'sessionBlocked', 'enabled', 'allowlistedSites'], (result) => {
      setStats({
        totalBlocked: (result.totalBlocked as number) || 0,
        sessionBlocked: (result.sessionBlocked as number) || 0,
        enabled: result.enabled !== false,
      });
      setAllowlistedSites((result.allowlistedSites as string[]) || []);
    });

    // Get active tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab(tabs[0].title || '');
        setTabUrl(tabs[0].url || '');
        try {
          setCurrentHost(getSiteKey(new URL(tabs[0].url || '').hostname));
        } catch {
          setCurrentHost('');
        }
      }
    });

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      const newStats = { ...stats };
      if (changes.totalBlocked) newStats.totalBlocked = changes.totalBlocked.newValue as number;
      if (changes.sessionBlocked) newStats.sessionBlocked = changes.sessionBlocked.newValue as number;
      if (changes.enabled !== undefined) newStats.enabled = changes.enabled.newValue as boolean;
      setStats(newStats);
      if (changes.allowlistedSites) {
        setAllowlistedSites((changes.allowlistedSites.newValue as string[]) || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const getSiteKey = (hostname: string) => {
    const parts = hostname.toLowerCase().replace(/\.$/, '').split('.');
    return parts.length > 2 && parts[0] === 'www' ? parts.slice(1).join('.') : parts.join('.');
  };

  const isCurrentSitePaused = currentHost !== '' && allowlistedSites.includes(currentHost);

  const toggleSitePause = () => {
    if (!currentHost) return;
    const exists = allowlistedSites.includes(currentHost);
    const next = exists
      ? allowlistedSites.filter((s) => s !== currentHost)
      : [...allowlistedSites, currentHost];
    setAllowlistedSites(next);
    chrome.storage.local.set({ allowlistedSites: next });
  };

  const toggleAdBlocker = () => {
    const newEnabled = !stats.enabled;
    chrome.storage.local.set({ enabled: newEnabled });
    setStats({ ...stats, enabled: newEnabled });
    
    // Send message to background to update blocking
    chrome.runtime.sendMessage({ action: 'toggleBlocking', enabled: newEnabled });
  };

  const resetStats = () => {
    chrome.storage.local.set({ totalBlocked: 0, sessionBlocked: 0 });
    setStats({ ...stats, totalBlocked: 0, sessionBlocked: 0 });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const isProtocolSupported = tabUrl.startsWith('http://') || tabUrl.startsWith('https://');

  return (
    <div className="w-96 min-h-[500px] bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">NIS</h1>
            <p className="text-sm text-red-100">Ad Blocker</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
              stats.enabled ? 'bg-green-500' : 'bg-gray-500'
            }`}>
              {stats.enabled ? '🛡️ Protected' : '⚠️ Disabled'}
            </div>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-lg p-3">
          <span className="font-medium">Ad Blocking</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={stats.enabled}
              onChange={toggleAdBlocker}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-400 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 space-y-4">
        {/* Current Site */}
        {isProtocolSupported && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-gray-600">
                Current Site
              </h2>
              {currentHost && (
                <button
                  onClick={toggleSitePause}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    isCurrentSitePaused
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isCurrentSitePaused ? '▶ Resume' : '⏸ Pause'}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-700 truncate mb-1">
              {activeTab || 'No active tab'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {tabUrl}
            </p>
            {isCurrentSitePaused && (
              <p className="text-xs text-green-700 mt-2 bg-green-50 rounded p-2">
                Blocking is paused on {currentHost} — content won't be hidden here
              </p>
            )}
          </div>
        )}

        {!isProtocolSupported && tabUrl && (
          <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Ad blocking is not available on this page
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Chrome restricts extensions on internal pages
            </p>
          </div>
        )}

        {/* Blocked Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg shadow-md p-4 text-white">
            <div className="text-3xl font-bold mb-1">
              {stats.sessionBlocked.toLocaleString()}
            </div>
            <div className="text-xs opacity-90">Blocked This Session</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-md p-4 text-white">
            <div className="text-3xl font-bold mb-1">
              {stats.totalBlocked.toLocaleString()}
            </div>
            <div className="text-xs opacity-90">Total Blocked</div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-green-500 mr-2">✓</span> 
            Active Protection
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="text-orange-500 mr-2">🚫</span>
              <span>Blocks ads and pop-ups</span>
            </div>
            <div className="flex items-start">
              <span className="text-blue-500 mr-2">🔒</span>
              <span>Prevents tracking</span>
            </div>
            <div className="flex items-start">
              <span className="text-green-500 mr-2">⚡</span>
              <span>Speeds up page loading</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={openOptions}
            className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
          >
            ⚙️ Settings
          </button>
          <button
            onClick={resetStats}
            className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            🔄 Reset Stats
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-2">
          <p>NIS Ad Blocker v1.0.0</p>
          <p className="mt-1">Protecting your browsing experience</p>
        </div>
      </div>
    </div>
  );
}
