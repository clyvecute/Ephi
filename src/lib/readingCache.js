// src/lib/readingCache.js
//
// Manages AI reading history in localStorage.
// Keeps the last 20 readings, auto-expires entries older than 24 hours.
//
// Usage:
//   import { saveReading, getRecentReadings, clearExpired } from '@/lib/readingCache';

const STORAGE_KEY   = 'astro_readings';
const MAX_READINGS  = 20;
const EXPIRY_MS     = 24 * 60 * 60 * 1000; // 24 hours

// ─── Internal helpers ─────────────────────────────────────────────────────────

function readFromStorage() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeToStorage(readings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
  } catch (err) {
    // localStorage full — remove oldest and retry once
    try {
      const trimmed = readings.slice(0, Math.floor(MAX_READINGS / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {}
  }
}

function isExpired(reading) {
  if (!reading?.timestamp) return true;
  return Date.now() - new Date(reading.timestamp).getTime() > EXPIRY_MS;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a new reading to the cache.
 *
 * @param {Object} params
 * @param {string} params.focus       — 'general' | 'love' | 'career' | 'health' | 'spiritual' | 'mind'
 * @param {string} params.text        — the full reading text from Gemini
 * @param {Array}  params.aspects     — active aspects at time of reading
 * @param {number} params.aspectCount — number of active transits
 * @returns {Object} the saved reading entry
 */
export function saveReading({ focus, text, aspects = [], aspectCount = 0 }) {
  const entry = {
    id:          `reading_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    focus,
    text,
    aspectCount,
    // Save a lightweight snapshot of the top aspects (not the full array)
    aspectSnapshot: (aspects || [])
      .filter((a) => ['exact', 'strong'].includes(a.strength))
      .slice(0, 5)
      .map((a) => ({
        transitPlanet: a.transitPlanet,
        aspectName:    a.aspectName,
        natalPlanet:   a.natalPlanet,
        orb:           a.orb,
        symbol:        a.symbol,
      })),
    timestamp: new Date().toISOString(),
  };

  const existing = readFromStorage();

  // Prepend new entry, cap at MAX_READINGS
  const updated = [entry, ...existing].slice(0, MAX_READINGS);
  writeToStorage(updated);

  return entry;
}

/**
 * Get all non-expired readings, newest first.
 *
 * @param {Object} options
 * @param {string} [options.focus]       — filter by focus area
 * @param {number} [options.limit]       — max number to return (default: all)
 * @param {boolean} [options.includeExpired] — include old readings (default: false)
 * @returns {Array}
 */
export function getRecentReadings({ focus, limit, includeExpired = false } = {}) {
  let readings = readFromStorage();

  if (!includeExpired) {
    readings = readings.filter((r) => !isExpired(r));
  }

  if (focus) {
    readings = readings.filter((r) => r.focus === focus);
  }

  if (limit) {
    readings = readings.slice(0, limit);
  }

  return readings;
}

/**
 * Get a single reading by ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getReading(id) {
  const readings = readFromStorage();
  return readings.find((r) => r.id === id) || null;
}

/**
 * Get the most recent reading, optionally filtered by focus.
 *
 * @param {string} [focus]
 * @returns {Object|null}
 */
export function getLatestReading(focus) {
  const readings = getRecentReadings({ focus, limit: 1 });
  return readings[0] || null;
}

/**
 * Remove all readings older than EXPIRY_MS (24h).
 * Safe to call on every app load — fast if nothing to clear.
 *
 * @returns {number} number of entries removed
 */
export function clearExpired() {
  const all     = readFromStorage();
  const fresh   = all.filter((r) => !isExpired(r));
  const removed = all.length - fresh.length;
  if (removed > 0) writeToStorage(fresh);
  return removed;
}

/**
 * Delete a specific reading by ID.
 *
 * @param {string} id
 * @returns {boolean} true if found and deleted
 */
export function deleteReading(id) {
  const all     = readFromStorage();
  const updated = all.filter((r) => r.id !== id);
  if (updated.length === all.length) return false;
  writeToStorage(updated);
  return true;
}

/**
 * Wipe the entire reading history.
 */
export function clearAllReadings() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Cache stats — useful for a settings/debug panel.
 *
 * @returns {{ total: number, expired: number, fresh: number, oldestDate: string|null }}
 */
export function getCacheStats() {
  const all     = readFromStorage();
  const expired = all.filter(isExpired);
  const fresh   = all.filter((r) => !isExpired(r));
  const oldest  = fresh.length
    ? fresh[fresh.length - 1].timestamp
    : null;

  return {
    total:      all.length,
    expired:    expired.length,
    fresh:      fresh.length,
    oldestDate: oldest,
  };
}

/**
 * Check if a fresh reading already exists for a focus area.
 * Use this to warn the user before burning an API call.
 *
 * @param {string} focus
 * @returns {Object|null} the existing reading, or null if none
 */
export function getFreshReadingForFocus(focus) {
  return getLatestReading(focus) || null;
}

// ─── Constants (exported for UI use) ─────────────────────────────────────────

export const CACHE_EXPIRY_HOURS = EXPIRY_MS / (1000 * 60 * 60);
export const CACHE_MAX_READINGS = MAX_READINGS;
