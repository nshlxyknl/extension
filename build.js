import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, rmSync, renameSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean dist directory
if (existsSync('./dist')) {
  rmSync('./dist', { recursive: true, force: true });
}
mkdirSync('./dist', { recursive: true });

console.log('Building extension...\n');

// Build popup
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
      output: {
        entryFileNames: 'popup.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.css') return 'popup.css';
          if (assetInfo.name === 'popup.html') return 'popup.html';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});

// Build options
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        options: resolve(__dirname, 'src/options/options.html'),
      },
      output: {
        entryFileNames: 'options.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'options.css') return 'options.css';
          if (assetInfo.name === 'options.html') return 'options.html';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});

// Build background
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: 'background.js',
        format: 'iife',
      },
    },
  },
});

// Build content
await build({
  configFile: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
      },
      output: {
        entryFileNames: 'content.js',
        format: 'iife',
      },
    },
  },
});

// Copy manifest
copyFileSync('./public/manifest.json', './dist/manifest.json');

// Copy icons
const icons = ['icon16.png', 'icon48.png', 'icon128.png'];
icons.forEach(icon => {
  if (existsSync(`./public/${icon}`)) {
    copyFileSync(`./public/${icon}`, `./dist/${icon}`);
  }
});

// Move HTML files to root if they're in subdirectories
if (existsSync('./dist/src/popup/popup.html')) {
  renameSync('./dist/src/popup/popup.html', './dist/popup.html');
}
if (existsSync('./dist/src/options/options.html')) {
  renameSync('./dist/src/options/options.html', './dist/options.html');
}

// Clean up empty src directory
if (existsSync('./dist/src')) {
  rmSync('./dist/src', { recursive: true, force: true });
}

console.log('\n✓ Build complete!');
console.log('\nNext steps:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked"');
console.log('4. Select the "dist" folder\n');
