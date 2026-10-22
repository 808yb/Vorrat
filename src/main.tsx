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
