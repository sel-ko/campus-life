import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { initAnalytics } from './online/analytics';
import { startTracking } from './online/tracking';

startTracking();
// Analytics loads once the page is idle, so it never delays the first screen.
const whenIdle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 2000));
whenIdle(() => void initAnalytics());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
