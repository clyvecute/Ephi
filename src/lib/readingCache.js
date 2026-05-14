// src/lib/readingCache.js
//
// Manages AI reading history in IndexedDB (via Dexie).
// Keeps a high-performance local record of all generated insights.
//
import { db, saveReadingLocal, getReadingsLocal, clearReadingsLocal } from './db';

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours (for "freshness" checks)

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isExpired(reading) {
  if (!reading?.timestamp) return true;
  return Date.now() - new Date(reading.timestamp).getTime() > EXPIRY_MS;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Save a new reading to the database.
 */
export async function saveReading({ focus, text, aspects = [], aspectCount = 0 }) {
  const entry = {
    type: 'synthesis',
    focus,
    text,
    aspectCount,
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

  await saveReadingLocal(entry);
  return entry;
}

/**
 * Get all readings, newest first.
 */
export async function getRecentReadings({ focus, limit, includeExpired = false } = {}) {
  let readings = await getReadingsLocal(limit || 50);

  if (!includeExpired) {
    readings = readings.filter((r) => !isExpired(r));
  }

  if (focus) {
    readings = readings.filter((r) => r.focus === focus);
  }

  return readings;
}

/**
 * Get a single reading by ID.
 */
export async function getReading(id) {
  return await db.readings.get(id);
}

/**
 * Get the most recent reading.
 */
export async function getLatestReading(focus) {
  const readings = await getRecentReadings({ focus, limit: 1 });
  return readings[0] || null;
}

/**
 * Wipe the entire reading history.
 */
export async function clearAllReadings() {
  await clearReadingsLocal();
}

/**
 * Cache stats.
 */
export async function getCacheStats() {
  const all = await db.readings.toArray();
  const fresh = all.filter((r) => !isExpired(r));
  const oldest = fresh.length ? fresh[fresh.length - 1].timestamp : null;

  return {
    total: all.length,
    expired: all.length - fresh.length,
    fresh: fresh.length,
    oldestDate: oldest,
  };
}

export const CACHE_EXPIRY_HOURS = 24;
