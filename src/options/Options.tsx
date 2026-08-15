import { useState, useEffect } from 'react';

interface Settings {
  enabled: boolean;
  blockTracking: boolean;
  blockSocial: boolean;
  hideAdPlaceholders: boolean;
  showStats: boolean;
}

export default function Options() {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    blockTracking: true,
    blockSocial: true,
    hideAdPlaceholders: true,
    showStats: true,
  });
  const [stats, setStats] = useState({ totalBlocked: 0, installDate: 0 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load settings from storage
    chrome.storage.local.get(['settings', 'totalBlocked', 'installDate', 'enabled'], (result) => {
      if (result.settings) {
        setSettings(result.settings as typeof settings);
      } else if (result.enabled !== undefined) {
        setSettings({ ...settings, enabled: result.enabled as boolean });
      }
      
      setStats({
        totalBlocked: (result.totalBlocked as number) || 0,
        installDate: (result.installDate as number) || Date.now(),
      });
    });
  }, []);

  const handleSave = () => {
    chrome.storage.local.set({ settings, enabled: settings.enabled }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      // Notify background of settings change
      chrome.runtime.sendMessage({ 
        action: 'settingsUpdated', 
        settings 
      });
    });
  };

  const handleReset = () => {
    const defaultSettings: Settings = {
      enabled: true,
      blockTracking: true,
      blockSocial: true,
      hideAdPlaceholders: true,
      showStats: true,
    };
    setSettings(defaultSettings);
    chrome.storage.local.set({ settings: defaultSettings, enabled: true });
  };

  const handleResetStats = () => {
    if (confirm('Are you sure you want to reset all statistics?')) {
      chrome.storage.local.set({ totalBlocked: 0, sessionBlocked: 0 });
      setStats({ ...stats, totalBlocked: 0 });
    }
  };

  const daysSinceInstall = Math.floor(
    (Date.now() - stats.installDate) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg p-8 text-white mb-6">
          <h1 className="text-4xl font-bold mb-2">NIS Ad Blocker</h1>
          <p className="text-red-100">
            Configure your ad blocking preferences
          </p>
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            📊 Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-4 text-white">
              <div className="text-3xl font-bold mb-1">
                {stats.totalBlocked.toLocaleString()}
              </div>
              <div className="text-sm opacity-90">Total Ads Blocked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-4 text-white">
              <div className="text-3xl font-bold mb-1">
                {daysSinceInstall}
              </div>
              <div className="text-sm opacity-90">Days Protected</div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-4 text-white">
              <div className="text-3xl font-bold mb-1">
                {stats.totalBlocked > 0 
                  ? Math.round(stats.totalBlocked / Math.max(daysSinceInstall, 1))
                  : 0}
              </div>
              <div className="text-sm opacity-90">Avg. Blocked/Day</div>
            </div>
          </div>
          <button
            onClick={handleResetStats}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            Reset Statistics
          </button>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            ⚙️ Settings
          </h2>

          <div className="space-y-6">
            {/* Main Toggle */}
            <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">
                  🛡️ Enable Ad Blocking
                </h3>
                <p className="text-sm text-gray-600">
                  Turn ad blocking on or off globally
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings({ ...settings, enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            {/* Block Tracking */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-800">
                  🔒 Block Tracking & Analytics
                </h3>
                <p className="text-sm text-gray-600">
                  Prevent websites from tracking your activity
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.blockTracking}
                  onChange={(e) =>
                    setSettings({ ...settings, blockTracking: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {/* Block Social */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-800">
                  👥 Block Social Media Widgets
                </h3>
                <p className="text-sm text-gray-600">
                  Hide social media buttons and trackers
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.blockSocial}
                  onChange={(e) =>
                    setSettings({ ...settings, blockSocial: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {/* Hide Ad Placeholders */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-800">
                  🎨 Hide Ad Placeholders
                </h3>
                <p className="text-sm text-gray-600">
                  Remove empty spaces where ads were displayed
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hideAdPlaceholders}
                  onChange={(e) =>
                    setSettings({ ...settings, hideAdPlaceholders: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>

            {/* Show Stats */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-800">
                  📈 Show Statistics Badge
                </h3>
                <p className="text-sm text-gray-600">
                  Display blocked ads count on extension icon
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showStats}
                  onChange={(e) =>
                    setSettings({ ...settings, showStats: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-colors font-medium shadow-md"
            >
              {saved ? '✓ Saved!' : 'Save Settings'}
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Reset to Defaults
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h3 className="font-bold text-gray-800 mb-3">ℹ️ About NIS Ad Blocker</h3>
          <p className="text-sm text-gray-600 mb-2">
            NIS Ad Blocker protects your privacy and speeds up your browsing by blocking ads, trackers, and unwanted content.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Blocks display ads, video ads, and pop-ups</li>
            <li>Prevents tracking and analytics scripts</li>
            <li>Removes social media widgets and buttons</li>
            <li>Speeds up page loading times</li>
            <li>Reduces bandwidth usage</li>
          </ul>
          <p className="text-xs text-gray-500 mt-4">Version 1.0.0</p>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 mt-8">
          <p>NIS Ad Blocker - Protecting your browsing experience</p>
        </div>
      </div>
    </div>
  );
}
