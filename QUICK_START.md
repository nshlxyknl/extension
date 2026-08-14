# Quick Start Guide

## Load the Extension in Chrome

1. **Build the extension:**
   ```bash
   npm install
   npm run build
   ```

2. **Load in Chrome:**
   - Open Chrome browser
   - Navigate to `chrome://extensions/`
   - Toggle **"Developer mode"** ON (top-right corner)
   - Click **"Load unpacked"**
   - Select the `dist` folder from this project

3. **Your extension is now installed!**
   - Click the extension icon in the toolbar
   - Try the popup features
   - Right-click on any webpage to see the context menu
   - Visit the options page: Right-click extension icon → "Options"

## Testing the Features

### Popup
- Click the extension icon to open the popup
- **Counter**: Click "Increment" to test Chrome storage
- **Send Message**: Click to send a message to the current page

### Content Script
- Visit any webpage
- Click "Send Message to Content Script" in the popup
- You'll see an animated notification on the page

### Background Service Worker
- Open DevTools for the service worker:
  - Go to `chrome://extensions/`
  - Find your extension
  - Click "service worker" link
  - Check console logs for background activity

### Context Menu
- Right-click anywhere on a webpage
- Click "My Extension Action"
- Check for notification and page interaction

### Options Page
- Right-click the extension icon → "Options"
- Or go to `chrome://extensions/` and click "Details" → "Extension options"
- Configure settings (saved to Chrome sync storage)

## Making Changes

After editing code:

1. **Rebuild:**
   ```bash
   npm run build
   ```

2. **Reload extension:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension card

3. **For content script changes:**
   - Reload the web page where the script runs

## Debugging

- **Popup**: Right-click popup → "Inspect"
- **Background**: Click "service worker" in extension details
- **Content Script**: Use regular page DevTools (F12)
- **Options Page**: Right-click → "Inspect"

## File Structure

```
dist/
├── manifest.json       # Extension configuration
├── popup.html         # Popup UI
├── popup.js           # Popup logic
├── popup.css          # Popup styles
├── options.html       # Options page UI
├── options.js         # Options logic
├── options.css        # Options styles
├── background.js      # Service worker
├── content.js         # Content script
└── icon*.png         # Extension icons
```

## Common Issues

**Extension won't load:**
- Make sure you selected the `dist` folder, not the project root
- Check for errors in manifest.json

**Changes not appearing:**
- Did you rebuild? (`npm run build`)
- Did you refresh the extension?
- For content scripts, reload the webpage

**Service worker inactive:**
- Click the "service worker" link to wake it up
- Service workers go inactive after ~30 seconds of inactivity (this is normal)

## Next Steps

- Customize the UI in `src/popup/App.tsx`
- Add page interaction logic in `src/content/content.ts`
- Handle events in `src/background/service-worker.ts`
- Update permissions in `public/manifest.json` as needed
- Replace placeholder icons with your own designs

Enjoy building your Chrome extension! 🚀
