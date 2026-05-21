/**
 * lib/natal.js — Step 5
 * Natal chart parser, validator, and localStorage persistence.
 * Testable: node lib/natal.js
 */

import { getZodiacInfo } from './ephemeris.js';
import { SIGNS } from './astronomy.js';

// ─── Storage key ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'astro_natal';

// ─── Natal chart schema ───────────────────────────────────────────────────────

/**
 * @typedef {Object} BirthData
 * @property {string} name      — Person's name
 * @property {string} date      — ISO date string YYYY-MM-DD
 * @property {string} time      — HH:MM (24h)
 * @property {number} lat       — Latitude (degrees)
 * @property {number} lon       — Longitude (degrees)
 * @property {string} city      — City name (display only)
 * @property {string} timezone  — IANA timezone string e.g. 'Asia/Manila'
 */

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateBirthData(data) {
  const errors = [];
  if (!data.name?.trim()) errors.push('Name is required.');
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.push('Date must be YYYY-MM-DD.');
  
  // Normalize and validate birth time (accepts both 12-hour AM/PM and 24-hour formats)
  let timeStr = (data.time || '').trim().toUpperCase();
  const amPmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  const militaryMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2];
    const period = amPmMatch[3].toUpperCase();
    
    if (hours < 1 || hours > 12 || parseInt(minutes, 10) >= 60) {
      errors.push('Time must be a valid 12-hour format.');
    } else {
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      data.time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  } else if (militaryMatch) {
    const hours = parseInt(militaryMatch[1], 10);
    const minutes = militaryMatch[2];
    
    if (hours < 0 || hours >= 24 || parseInt(minutes, 10) >= 60) {
      errors.push('Time must be a valid 24-hour format.');
    } else {
      data.time = `${hours.toString().padStart(2, '0')}:${minutes}`;
    }
  } else {
    errors.push('Time must be a valid 12-hour (AM/PM) or 24-hour format.');
  }

  if (data.lat == null || isNaN(data.lat) || data.lat < -90 || data.lat > 90) errors.push('Invalid latitude.');
  if (data.lon == null || isNaN(data.lon) || data.lon < -180 || data.lon > 180) errors.push('Invalid longitude.');

  // Inject utcOffset dynamically using Luxon if missing
  if (data.date && data.time && data.timezone && data.utcOffset == null) {
    try {
      const zone = data.timezone || 'UTC';
      const dt = DateTime.fromISO(`${data.date}T${data.time}`, { zone });
      if (dt.isValid) {
        data.utcOffset = dt.offset / 60;
      }
    } catch {}
  }

  if (data.utcOffset == null || isNaN(data.utcOffset)) errors.push('UTC timezone offset is required.');
  return errors;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

import { DateTime } from 'luxon';

export function birthDataToDate(data) {
  if (!data.date || !data.time) return new Date();
  
  // Use Luxon to parse the date/time in the context of the user's IANA timezone string
  const zone = data.timezone || 'UTC';
  const dt = DateTime.fromISO(`${data.date}T${data.time}`, { zone });
  
  if (!dt.isValid) return new Date();
  return dt.toJSDate();
}

// ─── Chart generation ─────────────────────────────────────────────────────────

// generateNatalChart removed — use generatePrecisionNatalChart for all calculations.

/**
 * HIGH PRECISION VERSION (WASM-based)
 */
import { getPrecisionPositions, getPrecisionHouses } from './swe.js';

export async function generatePrecisionNatalChart(data, options = {}) {
  const errors = validateBirthData(data);
  if (errors.length) throw new Error(errors.join(' '));

  const birthDate = birthDataToDate(data);
  
  // 1. Get high-precision planet positions
  const rawPositions = await getPrecisionPositions(birthDate, options);
  
  // 2. Get high-precision house cusps (Placidus by default)
  const houses = await getPrecisionHouses(birthDate, data.lat, data.lon, options.houseSystem || 'P');

  // 3. Format positions to match Ephi standard
  const positions = {};
  for (const [key, val] of Object.entries(rawPositions)) {
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    positions[name] = {
      ...val,
      ...getZodiacInfo(val.longitude),
      retrograde: val.isRetrograde
    };
  }

  const ascFinal = { longitude: houses.ascendant, ...getZodiacInfo(houses.ascendant) };

  return {
    meta: {
      ...data,
      sidereal: !!options.sidereal,
      precision: 'professional (swe)',
      generated: new Date().toISOString(),
    },
    positions,
    ascendant: ascFinal,
    mc: { longitude: houses.mc, ...getZodiacInfo(houses.mc) },
    cusps: houses.cusps.map(c => ({ longitude: c, ...getZodiacInfo(c) })),
    sunSign: getZodiacInfo(rawPositions.sun.longitude).sign,
    moonSign: getZodiacInfo(rawPositions.moon.longitude).sign,
    risingSign: ascFinal.sign,
  };
}

// approximateAscendant removed — use getPrecisionHouses for professional accuracy.

import { store } from './store.js';

export function saveNatalChart(chart) {
  try {
    store.setJSON(STORAGE_KEY, chart);
    return true;
  } catch (e) {
    console.error('Failed to save natal chart:', e);
    return false;
  }
}

export function loadNatalChart() {
  try {
    return store.getJSON(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to load natal chart:', e);
    return null;
  }
}

export function clearNatalChart() {
  store.remove(STORAGE_KEY);
}

export function hasNatalChart() {
  try {
    return !!store.get(STORAGE_KEY);
  } catch {
    return false;
  }
}

// ─── Self-test (Node) ─────────────────────────────────────────────────────────

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('natal.js')) {
  const testData = {
    name: 'Test Person',
    date: '1990-06-15',
    time: '14:30',
    lat: 14.5995,
    lon: 120.9842,
    city: 'Manila',
  };

  console.log('=== natal.js self-test ===');
  console.log('Birth data:', testData);

  const errors = validateBirthData(testData);
  if (errors.length) {
    console.error('Validation errors:', errors);
  } else {
    // Self-test now requires precision module
    console.log('\n(Precision self-test skipped in Node environment without WASM support)');
  }
}
