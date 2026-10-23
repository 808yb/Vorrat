// Zombie Service Worker Cleanup for Dev / Localhost
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '::1'
  ) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) reg.unregister();
    });
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) caches.delete(key);
      });
    }
  }
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { migrateLegacyStorageKeys } from './constants/storage';

// Lossless migration of legacy keys on app startup
migrateLegacyStorageKeys();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
