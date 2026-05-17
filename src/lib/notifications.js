// src/lib/notifications.js
//
// Browser push notification engine for transit alerts.
// Uses Web Notifications API + a lightweight polling loop (no server needed).
// Checks active aspects every 10 minutes, fires when a transit enters exact orb.
//
// Usage:
//   import {
//     requestPermission, scheduleAspectChecks, cancelChecks,
//     getPreferences, savePreferences, getAlertLog
//   } from '@/lib/notifications';

import { getPlanetPositions } from './ephemeris.js';
import { getActiveAspects   } from './aspects.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECK_INTERVAL_MS  = 10 * 60 * 1000; // 10 minutes
const PREFS_KEY          = 'astro_alert_prefs';
const LOG_KEY            = 'astro_alert_log';
const FIRED_KEY          = 'astro_alert_fired';  // tracks which alerts already fired
const MAX_LOG_ENTRIES    = 50;
const EXACT_ORB_DEFAULT  = 1.5; // degrees — alert threshold

// ─── Default preferences ──────────────────────────────────────────────────────

export const DEFAULT_PREFS = {
  enabled: false,

  // Which transiting planets to watch
  transitPlanets: ['moon', 'sun', 'mercury', 'venus', 'mars'],

  // Which natal planets to watch for aspects hitting them
  natalPlanets: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'],

  // Which aspect types to alert on
  aspectNames: ['conjunction', 'opposition', 'square', 'trine', 'sextile'],

  // Only alert when orb is tighter than this
  orbThreshold: EXACT_ORB_DEFAULT,

  // Only alert for applying aspects (not separating)
  applyingOnly: true,

  // Minimum strength to alert ('exact' | 'strong' | 'moderate')
  minStrength: 'strong',

  // Quiet hours — no alerts between these times (24h format)
  quietHoursEnabled: false,
  quietStart: '23:00',
  quietEnd:   '07:00',
};

import { store } from './store.js';

// ─── Storage helpers ──────────────────────────────────────────────────────────

export function getPreferences() {
  try {
    const saved = store.get(PREFS_KEY);
    return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePreferences(prefs) {
  try {
    store.setJSON(PREFS_KEY, { ...DEFAULT_PREFS, ...prefs });
  } catch {}
}

export function getAlertLog() {
  try {
    return store.getJSON(LOG_KEY, []);
  } catch {
    return [];
  }
}

function appendToLog(entry) {
  try {
    const log     = getAlertLog();
    const updated = [entry, ...log].slice(0, MAX_LOG_ENTRIES);
    store.setJSON(LOG_KEY, updated);
  } catch {}
}

export function clearAlertLog() {
  store.remove(LOG_KEY);
}

// Track which aspect keys have already fired so we don't repeat
function getFiredKeys() {
  try {
    return store.getJSON(FIRED_KEY, []);
  } catch {
    return [];
  }
}

function addFiredKey(key) {
  try {
    const keys    = getFiredKeys();
    const updated = [...new Set([...keys, key])].slice(-200);
    store.setJSON(FIRED_KEY, updated);
  } catch {}
}

function removeFiredKey(key) {
  try {
    const keys    = getFiredKeys();
    const updated = keys.filter((k) => k !== key);
    store.setJSON(FIRED_KEY, updated);
  } catch {}
}

// Unique key for an aspect — used to track if we've already notified
function aspectKey(asp) {
  return `${asp.transitPlanet}_${asp.aspectName}_${asp.natalPlanet}`;
}

// ─── Quiet hours check ────────────────────────────────────────────────────────

function isQuietHours(prefs) {
  if (!prefs.quietHoursEnabled) return false;

  const now   = new Date();
  const hhmm  = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = prefs.quietStart.split(':').map(Number);
  const [endH,   endM  ] = prefs.quietEnd.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin   = endH   * 60 + endM;

  // Handle overnight quiet period (e.g. 23:00 → 07:00)
  if (startMin > endMin) {
    return hhmm >= startMin || hhmm < endMin;
  }
  return hhmm >= startMin && hhmm < endMin;
}

// ─── Notification permission ──────────────────────────────────────────────────

/**
 * Request browser notification permission.
 * @returns {Promise<'granted'|'denied'|'default'>}
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    throw new Error('This browser does not support notifications.');
  }
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
}

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ─── Register service worker ──────────────────────────────────────────────────

let swRegistration = null;

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js');
    return swRegistration;
  } catch (err) {
    console.warn('[Notifications] Service worker registration failed:', err);
    return null;
  }
}

// ─── Fire a notification ──────────────────────────────────────────────────────

const PLANET_LABEL = {
  sun: 'Sun ☉', moon: 'Moon ☽', mercury: 'Mercury ☿', venus: 'Venus ♀',
  mars: 'Mars ♂', jupiter: 'Jupiter ♃', saturn: 'Saturn ♄',
  uranus: 'Uranus ♅', neptune: 'Neptune ♆', pluto: 'Pluto ♇',
};

const ASPECT_LABEL = {
  conjunction: 'conjunct',
  sextile:     'sextile',
  square:      'square',
  trine:       'trine',
  opposition:  'opposite',
};

const NATURE_EMOJI = {
  hard:    '⚡',
  soft:    '✨',
  neutral: '🌀',
};

function buildNotificationContent(asp) {
  const tLabel = PLANET_LABEL[asp.transitPlanet] || asp.transitPlanet;
  const nLabel = PLANET_LABEL[asp.natalPlanet]   || asp.natalPlanet;
  const aLabel = ASPECT_LABEL[asp.aspectName]    || asp.aspectName;
  const emoji  = NATURE_EMOJI[asp.nature]        || '✦';

  const title = `${emoji} Transit ${tLabel} ${aLabel} natal ${nLabel}`;

  const orbStr    = asp.orb.toFixed(2);
  const statusStr = asp.applying ? 'Applying' : 'Separating';
  const timeStr   = asp.exactAtLabel ? ` · ${asp.exactAtLabel}` : '';

  const body = `${orbStr}° orb · ${statusStr}${timeStr}\n${
    asp.interpretation?.core?.split('.')[0] || ''
  }.`;

  return { title, body };
}

async function fireNotification(asp) {
  const { title, body } = buildNotificationContent(asp);

  const options = {
    body,
    icon:   '/favicon.ico',
    badge:  '/favicon.ico',
    tag:    aspectKey(asp),        // replaces previous notification with same key
    renotify: false,
    data: { aspect: asp, url: '/' },
    actions: [
      { action: 'view',    title: 'View Transits' },
      { action: 'reading', title: 'Get Reading'   },
    ],
  };

  // Use service worker if available (supports actions + background)
  if (swRegistration?.showNotification) {
    await swRegistration.showNotification(title, options);
  } else if (Notification.permission === 'granted') {
    // Fallback to basic Notification API
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); n.close(); };
  }

  // Log it
  appendToLog({
    id:        `alert_${Date.now()}`,
    ...asp,
    title,
    body,
    firedAt:   new Date().toISOString(),
  });
}

// ─── Aspect check logic ───────────────────────────────────────────────────────

let natalPositions = null; // set via setNatalPositions()

/**
 * Tell the notification engine what the user's natal positions are.
 * Call this after loading natal from localStorage.
 */
export function setNatalPositions(natal) {
  if (!natal?.planets) return;
  natalPositions = {};
  for (const [planet, info] of Object.entries(natal.planets)) {
    natalPositions[planet] = info.longitude;
  }
}

async function runAspectCheck() {
  if (!natalPositions) return;

  const prefs = getPreferences();
  if (!prefs.enabled) return;
  if (Notification.permission !== 'granted') return;
  if (isQuietHours(prefs)) return;

  try {
    const currentPositions = getPlanetPositions(new Date());
    const aspects = getActiveAspects(currentPositions, natalPositions, {
      transitPlanets: prefs.transitPlanets,
      natalPlanets:   prefs.natalPlanets,
      aspectNames:    prefs.aspectNames,
    });

    const STRENGTH_RANK = { exact: 3, strong: 2, moderate: 1, wide: 0 };
    const minRank = STRENGTH_RANK[prefs.minStrength] ?? 1;
    const firedKeys = getFiredKeys();

    for (const asp of aspects) {
      const key = aspectKey(asp);

      // Apply filters
      if (asp.orb > prefs.orbThreshold)              continue;
      if (prefs.applyingOnly && !asp.applying)        continue;
      if ((STRENGTH_RANK[asp.strength] ?? 0) < minRank) continue;

      // Don't re-fire if already notified for this aspect
      if (firedKeys.includes(key)) continue;

      await fireNotification(asp);
      addFiredKey(key);
    }

    // Clean up fired keys for aspects that are no longer active
    // (orb has widened past threshold — they've separated)
    const activeKeys = aspects
      .filter((a) => a.orb <= prefs.orbThreshold)
      .map(aspectKey);

    for (const key of firedKeys) {
      if (!activeKeys.includes(key)) {
        removeFiredKey(key);
      }
    }

  } catch (err) {
    console.warn('[Notifications] Aspect check failed:', err);
  }
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

let checkInterval = null;

/**
 * Start the background aspect check loop.
 * Call this after loading natal chart + getting notification permission.
 *
 * @param {Object} natal — natal data from localStorage (astro_natal)
 */
export function scheduleAspectChecks(natal) {
  setNatalPositions(natal);

  // Cancel any existing interval
  cancelChecks();

  // Run immediately, then every CHECK_INTERVAL_MS
  runAspectCheck();
  checkInterval = setInterval(runAspectCheck, CHECK_INTERVAL_MS);

  console.log('[Notifications] Aspect checks scheduled every 10 minutes.');
}

/**
 * Stop the background check loop.
 */
export function cancelChecks() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

/**
 * Manually trigger a check right now (e.g. when user opens the alerts page).
 */
export function checkNow() {
  return runAspectCheck();
}

/**
 * Is the check loop currently running?
 */
export function isScheduled() {
  return checkInterval !== null;
}

// ─── Browser support check ────────────────────────────────────────────────────

export function isSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function getSupportDetails() {
  return {
    notifications:  'Notification' in window,
    serviceWorker:  'serviceWorker' in navigator,
    permission:     getPermissionStatus(),
    scheduled:      isScheduled(),
  };
}
