import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initAnalytics } from './online/analytics';
import { startTracking } from './online/tracking';
import { useGameStore } from './store/gameStore';

startTracking();
// Development only: inspect the game from the browser console with __store.getState()
if (import.meta.env.DEV) (window as unknown as { __store: unknown }).__store = useGameStore;
// Analytics loads once the page is idle, so it never delays the first screen.
const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
whenIdle(() => void initAnalytics());

// Offline support for the installed app. Only in real builds: in development
// it would cache files you are still editing.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
