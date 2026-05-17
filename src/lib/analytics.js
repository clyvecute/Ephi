import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Simple Analytics Utility for Ephi
 * Logs events to Firestore for administrative oversight.
 */

export const logEvent = async (eventName, params = {}) => {
  try {
    // Only log in production to save on Firebase usage during dev
    if (import.meta.env.MODE !== 'production') {
      console.log(`[Analytics] ${eventName}:`, params);
      return;
    }

    await addDoc(collection(db, 'analytics'), {
      event: eventName,
      ...params,
      timestamp: serverTimestamp(),
      url: window.location.pathname,
      screen: window.screen.width + 'x' + window.screen.height
    });
  } catch (err) {
    console.error('Analytics log failed:', err);
  }
};

let lastPage = null;

export const logPageView = (path) => {
  if (path === lastPage) return;
  lastPage = path;
  logEvent('page_view', { path });
};
