import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    // Load count from storage
    chrome.storage.sync.get(['count'], (result) => {
      if (typeof result.count === 'number') {
        setCount(result.count);
      }
    });

    // Get active tab info
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        setActiveTab(tabs[0].title || '');
      }
    });
  }, []);

  const handleIncrement = () => {
    const newCount = count + 1;
    setCount(newCount);
    chrome.storage.sync.set({ count: newCount });
  };

  const handleSendMessage = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'greet', message: 'Hello from popup!' });
    }
  };

  return (
    <div className="w-96 min-h-96 p-6 bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            My Extension
          </h1>
          <p className="text-sm text-gray-600">
            Built with Next.js & TypeScript
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Active Tab
          </h2>
          <p className="text-sm text-gray-600 truncate">
            {activeTab || 'No active tab'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            Counter
          </h2>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-purple-600">
              {count}
            </span>
            <button
              onClick={handleIncrement}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Increment
            </button>
          </div>
        </div>

        <button
          onClick={handleSendMessage}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Send Message to Content Script
        </button>

        <div className="text-center text-xs text-gray-500">
          Press the button to interact with the current page
        </div>
      </div>
    </div>
  );
}
