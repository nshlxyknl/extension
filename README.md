# My Chrome Extension

A modern Chrome extension built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- 🎨 **Popup UI**: Beautiful React-based popup with Tailwind CSS styling
- 📄 **Content Script**: Inject and interact with web pages
- ⚙️ **Background Service Worker**: Handle events, storage, and Chrome APIs
- 🔧 **Options Page**: Full-featured settings page for your extension
- 🎯 **TypeScript**: Full type safety with Chrome API types
- ⚡ **Vite**: Fast development and optimized builds
- 🎨 **Tailwind CSS**: Modern utility-first styling

## Project Structure

```
my-extension/
├── src/
│   ├── popup/              # Popup UI (React)
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   ├── popup.html
│   │   └── popup.css
│   │
│   ├── content/            # Content script
│   │   └── content.ts
│   │
│   ├── background/         # Background service worker
│   │   └── service-worker.ts
│   │
│   └── options/            # Options page
│       ├── Options.tsx
│       ├── index.tsx
│       ├── options.html
│       └── options.css
│
├── public/
│   ├── manifest.json       # Extension manifest
│   └── icon.svg           # Extension icon (needs PNG conversion)
│
└── dist/                   # Build output (generated)
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create icon files (or use any PNG images):
You need to create three icon sizes in the `public/` folder:
- `icon16.png` (16x16px)
- `icon48.png` (48x48px)
- `icon128.png` (128x128px)

You can convert the included `icon.svg` to PNG using any image editor or online tool.

## Development

Build the extension:
```bash
npm run build
```

This will create a `dist/` folder with all the necessary files.

## Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project

## Features Included

### Popup
- Display active tab information
- Counter with Chrome storage sync
- Send messages to content scripts
- Beautiful gradient UI with Tailwind CSS

### Content Script
- Runs on all web pages
- Receives messages from popup
- Shows animated notifications on pages
- Observes DOM changes

### Background Service Worker
- Handles extension installation
- Creates context menus
- Manages Chrome alarms
- Listens to tab events
- Sends notifications

### Options Page
- Full settings page
- Theme selection (light/dark/auto)
- Enable/disable notifications
- Auto-run toggle
- Persistent storage with Chrome sync

## Chrome APIs Used

- `chrome.storage` - Sync data across devices
- `chrome.tabs` - Interact with browser tabs
- `chrome.runtime` - Message passing
- `chrome.notifications` - Show system notifications
- `chrome.contextMenus` - Add context menu items
- `chrome.alarms` - Schedule periodic tasks
- `chrome.scripting` - Inject scripts into pages

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Chrome Extension APIs** - Browser integration

## Build for Production

```bash
npm run build
```

The production-ready extension will be in the `dist/` folder.

## Development Tips

1. After making changes, run `npm run build`
2. Click the refresh icon on your extension in `chrome://extensions/`
3. For content script changes, you may need to reload the web page
4. Check the Chrome DevTools for each context:
   - Popup: Right-click popup → Inspect
   - Background: Click "Service Worker" link in extension details
   - Content Script: Regular page DevTools console
   - Options: Right-click options page → Inspect

## Common Tasks

### Modify Popup UI
Edit files in `src/popup/App.tsx`

### Change Content Script Behavior
Edit `src/content/content.ts`

### Update Background Logic
Edit `src/background/service-worker.ts`

### Customize Settings
Edit `src/options/Options.tsx`

### Update Permissions
Edit `public/manifest.json` and rebuild

## Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

## License

MIT
