# Installation Guide

## Prerequisites

- Node.js 18+ installed
- Chrome browser
- Basic command line knowledge

## Step-by-Step Installation

### 1. Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required packages (~189 packages).

### 2. Build the Extension

```bash
npm run build
```

You should see output like:
```
✓ Build complete!

Next steps:
1. Open Chrome and go to chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the "dist" folder
```

### 3. Load in Chrome

1. **Open Chrome Extensions page:**
   - Type `chrome://extensions/` in the address bar
   - Or: Menu → More Tools → Extensions

2. **Enable Developer Mode:**
   - Toggle the switch in the top-right corner

3. **Load the Extension:**
   - Click the **"Load unpacked"** button
   - Navigate to your project folder
   - Select the `dist` folder (NOT the project root)
   - Click "Select Folder"

4. **Verify Installation:**
   - You should see "My Extension" appear in the extensions list
   - The extension icon should appear in your toolbar
   - Status should show as "Enabled"

### 4. Test the Extension

**Test Popup:**
- Click the extension icon in the toolbar
- You should see a purple gradient popup
- Click "Increment" to test storage
- Click "Send Message to Content Script"

**Test Content Script:**
- Visit any website (e.g., google.com)
- Click "Send Message to Content Script" in the popup
- You should see an animated notification appear on the page

**Test Context Menu:**
- Right-click anywhere on a web page
- Look for "My Extension Action" in the menu
- Click it to trigger a notification

**Test Options Page:**
- Right-click the extension icon
- Select "Options"
- Or go to `chrome://extensions/` → click "Details" → "Extension options"
- Try changing settings

## Troubleshooting

### Extension Won't Load

**Problem:** "Manifest file is missing or unreadable"
- **Solution:** Make sure you selected the `dist` folder, not the project root

**Problem:** "Invalid manifest"
- **Solution:** Run `npm run build` again to regenerate the dist folder

### Changes Not Appearing

**Problem:** Code changes don't show up
- **Solution:** 
  1. Run `npm run build`
  2. Go to `chrome://extensions/`
  3. Click the refresh icon on your extension
  4. Reload any open web pages (for content script changes)

### Service Worker Errors

**Problem:** Service worker shows as "inactive"
- **This is normal:** Service workers go inactive after ~30 seconds
- Click "service worker" link to view console and reactivate

### Icons Not Showing

**Problem:** Extension shows default icon
- **Solution:** The placeholder icons are minimal. Replace them with proper PNG files:
  - `public/icon16.png` (16x16px)
  - `public/icon48.png` (48x48px)
  - `public/icon128.png` (128x128px)
- Rebuild after replacing icons

### Build Errors

**Problem:** TypeScript errors during build
- **Solution:** Run `npm install` again to ensure all dependencies are installed
- Check that Node.js version is 18+

**Problem:** "Cannot find module" errors
- **Solution:** Delete `node_modules` and `package-lock.json`, then run `npm install` again

## Uninstalling

To remove the extension:
1. Go to `chrome://extensions/`
2. Find "My Extension"
3. Click "Remove"

## Next Steps

Now that the extension is installed:

1. ✅ Explore all features
2. ✅ Read `QUICK_START.md` for detailed testing
3. ✅ Check `README.md` for customization guide
4. ✅ Review `PROJECT_SUMMARY.md` for architecture overview
5. ✅ Start customizing the code to your needs!

## Need Help?

- Check the [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- Use Chrome DevTools to inspect each component
- Review the source code comments for guidance

Happy developing! 🚀
