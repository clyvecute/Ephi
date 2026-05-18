 /**
 * src/lib/store.js
 *
 * UID-scoped localStorage wrapper.
 * Drop-in replacement for raw localStorage calls.
 * All keys are automatically prefixed with the current user's UID
 * so switching accounts never leaks data.
 *
 * Usage:
 *   import { store } from './store';
 *   store.set('astro_natal', chart);      // saves as "uid_abc123__astro_natal"
 *   store.get('astro_natal');             // reads the right user's key
 *   store.remove('astro_natal');
 *   store.clear();                        // clears ALL keys for current user only
 */

let _uid = null;

// Try to grab uid from active session if possible, but rely on setUser
try {
  const localAuth = localStorage.getItem('firebase:authUser:' + import.meta.env.VITE_FIREBASE_PROJECT_ID + ':[DEFAULT]');
  if (localAuth) {
    const authData = JSON.parse(localAuth);
    if (authData && authData.uid) {
      _uid = authData.uid;
    }
  }
} catch {}

export const store = {
  /** Call this right after Firebase auth resolves with the current user */
  setUser(uid) {
    _uid = uid || null;
  },

  _key(key) {
    if (!_uid) {
      // No user — use a guest prefix so guest data never bleeds into user data
      return `guest__${key}`;
    }
    return `uid_${_uid}__${key}`;
  },

  get(key) {
    try {
      return localStorage.getItem(this._key(key));
    } catch { return null; }
  },

  getJSON(key, fallback = null) {
    try {
      const raw = this.get(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      localStorage.setItem(this._key(key), value);
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('[store] localStorage full or unavailable:', e);
    }
  },

  setJSON(key, value) {
    this.set(key, JSON.stringify(value));
  },

  remove(key) {
    try {
      localStorage.removeItem(this._key(key));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  },

  /** Remove ALL keys belonging to the current user */
  clear() {
    if (!_uid) return;
    const prefix = `uid_${_uid}__`;
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(prefix)) toDelete.push(k);
    }
    toDelete.forEach(k => localStorage.removeItem(k));
    window.dispatchEvent(new Event('storage'));
  },

  /** Remove ALL legacy unscoped ephi/astro keys (migration helper) */
  clearLegacy() {
    const legacyKeys = [
      'astro_natal', 'astro_aspects', 'astro_partners',
      'astro_horary_history', 'astro_birth_form',
      'ephi_library', 'ephi_persona', 'ephi_settings',
      'ephi_oracle_provider', 'ephi_notification_prefs',
      'ephi_notification_log', 'ephi_notification_fired',
    ];
    legacyKeys.forEach(k => localStorage.removeItem(k));
  },
};
