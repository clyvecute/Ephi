/**
 * lib/natal.js — Step 5
 * Natal chart parser, validator, and localStorage persistence.
 * Testable: node lib/natal.js
 */

import { getPlanetPositions, getZodiacInfo } from './ephemeris.js';
import { zodiacSign, SIGNS } from './astronomy.js';

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
  if (!data.time || !/^\d{2}:\d{2}$/.test(data.time)) errors.push('Time must be HH:MM.');
  if (data.lat == null || isNaN(data.lat) || data.lat < -90 || data.lat > 90) errors.push('Invalid latitude.');
  if (data.lon == null || isNaN(data.lon) || data.lon < -180 || data.lon > 180) errors.push('Invalid longitude.');
  if (data.utcOffset == null || isNaN(data.utcOffset)) errors.push('UTC timezone offset is required.');
  return errors;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function birthDataToDate(data) {
  if (!data.date || !data.time) return new Date();

  const [year, month, day] = data.date.split('-').map(Number);
  const [hour, minute] = data.time.split(':').map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
    return new Date();
  }

  // Use the explicit UTC offset provided by the user
  const offset = parseFloat(data.utcOffset);
  const safeOffset = isNaN(offset) ? 0 : offset;
  
  const totalMinutes = hour * 60 + minute - Math.round(safeOffset * 60);
  const d = new Date(Date.UTC(year, month - 1, day, 0, totalMinutes));
  
  return isNaN(d.getTime()) ? new Date() : d;
}

// ─── Chart generation ─────────────────────────────────────────────────────────

/**
 * Generate a natal chart from birth data.
 * @param {BirthData} data
 * @param {Object} options - { sidereal: boolean }
 * @returns {Object} natal chart with planet positions + metadata
 */
export function generateNatalChart(data, options = {}) {
  const errors = validateBirthData(data);
  if (errors.length) throw new Error(errors.join(' '));

  const birthDate = birthDataToDate(data);
  // Ascendant (approximate — full accuracy needs sidereal time + lat)
  const asc = approximateAscendant(birthDate, data.lat, data.lon, options);
  const positions = getPlanetPositions(birthDate, asc.asc.longitude, { 
    ...options, 
    lat: data.lat, 
    lon: data.lon 
  });

  return {
    meta: {
      name: data.name,
      date: data.date,
      time: data.time,
      utcOffset: data.utcOffset,
      city: data.city || '',
      lat: data.lat,
      lon: data.lon,
      sidereal: !!options.sidereal,
      generated: new Date().toISOString(),
    },
    positions,
    ascendant: asc.asc,
    mc: asc.mc,
    ic: asc.ic,
    dc: asc.dc,
    sunSign: getZodiacInfo(positions.sun).sign,
    moonSign: getZodiacInfo(positions.moon).sign,
    risingSign: asc.asc.sign,
  };
}

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

// ─── Ascendant (simplified) ───────────────────────────────────────────────────

import { julianCenturies, dateToJD, gmst, toRad, toDeg, norm360, meanObliquity, zodiacSign as zs } from './astronomy.js';
import { getAyanamsa } from './ephemeris.js';

export function approximateAscendant(date, lat, lon, options = {}) {
  const jd  = dateToJD(date);
  const T   = julianCenturies(jd);
  const LST = norm360(gmst(jd) + lon);
  const eps = meanObliquity(T);

  const ayanamsa = options.sidereal ? getAyanamsa(date) : 0;

  const lstRad = toRad(LST);
  const latRad = toRad(lat);
  const epsRad = toRad(eps);

  const y = Math.cos(lstRad);
  const x = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  const ascLon = norm360(toDeg(Math.atan2(y, x)));

  // MC calculation
  const mcLon = norm360(toDeg(Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad))) - ayanamsa);
  const ascLonFinal = norm360(ascLon - ayanamsa);

  const icLon = norm360(mcLon + 180);
  const dcLon = norm360(ascLonFinal + 180);

  return {
    asc: { longitude: ascLonFinal, ...zs(ascLonFinal) },
    mc:  { longitude: mcLon,  ...zs(mcLon)  },
    ic:  { longitude: icLon,  ...zs(icLon)  },
    dc:  { longitude: dcLon,  ...zs(dcLon)  },
  };
}

// ─── Persistence (browser) ────────────────────────────────────────────────────

export function saveNatalChart(chart) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chart));
    return true;
  } catch (e) {
    console.error('Failed to save natal chart:', e);
    return false;
  }
}

export function loadNatalChart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('Failed to load natal chart:', e);
    return null;
  }
}

export function clearNatalChart() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasNatalChart() {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
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
    const chart = generateNatalChart(testData);
    console.log(`\nNatal chart for ${chart.meta.name}`);
    console.log(`Sun: ${chart.positions.Sun.zodiac.label}`);
    console.log(`Moon: ${chart.positions.Moon.zodiac.label}`);
    console.log(`Rising: ${chart.risingSign}`);
    console.log(`Ascendant: ${chart.ascendant.label}`);
    console.log('\nAll positions:');
    for (const [name, p] of Object.entries(chart.positions)) {
      const rx = p.retrograde ? ' Rx' : '';
      console.log(`  ${p.symbol} ${name.padEnd(10)}${rx}  ${p.zodiac.label}`);
    }
  }
}
