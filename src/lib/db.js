import Dexie from 'dexie';

/**
 * Ephi Local Database (IndexedDB via Dexie)
 * 
 * We use a local-first approach to store heavy astrological data.
 * This keeps the app snappy and reduces Firestore read/write costs.
 */

export const db = new Dexie('EphiDatabase');

// Define Schema
db.version(1).stores({
  readings: '++id, type, focus, timestamp, userId', // AI Readings history
  charts: '++id, name, type, date, userId',         // Saved Natal/Event charts
  settings: 'key, value',                            // Local app settings
  syncQueue: '++id, collection, action, payload'     // Offline operations pending sync
});

/**
 * DB Utilities
 */

export async function saveReadingLocal(reading) {
  return await db.readings.add({
    ...reading,
    timestamp: reading.timestamp || new Date().toISOString()
  });
}

export async function getReadingsLocal(limit = 50) {
  return await db.readings
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray();
}

export async function clearReadingsLocal() {
  return await db.readings.clear();
}
