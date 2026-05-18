// src/main.jsx
// Entry point — wraps the entire app in BrowserRouter

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { registerServiceWorker } from './lib/notifications.js';
import './index.css';

registerServiceWorker();

// StrictMode is disabled in dev to prevent Firestore onSnapshot streams
// from being torn down and restarted twice (Strict Mode mounts → unmounts →
// remounts every component), which causes false permission-denied errors
// when the Firestore watch stream restarts without a fresh auth credential.
// StrictMode is still active in production builds for safety.
const AppTree = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

createRoot(document.getElementById('root')).render(
  import.meta.env.PROD ? <StrictMode>{AppTree}</StrictMode> : AppTree
);
