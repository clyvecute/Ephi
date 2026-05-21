/**
 * Ephi Swiss Ephemeris WASM Wrapper — Direct C Calls
 * 
 * The @swisseph/browser v1.1.1 TypeScript wrapper has a systemic compilation
 * bug: all enum references (CalendarType, CalculationFlag, HousePoint, etc.)
 * compiled to (void 0), making every high-level method crash.
 * 
 * This module bypasses the wrapper entirely and calls the underlying 
 * Emscripten C functions directly via module.ccall().
 */
import { SwissEphemeris } from '@swisseph/browser';

let wasmModule = null;
let initPromise = null;

// C function wrappers (set after init)
let _swe_julday = null;
let _swe_calc_ut = null;
let _swe_houses = null;
let _swe_version = null;

// Flags from Swiss Ephemeris C headers
const FLAG_MOSHIER  = 4;    // SEFLG_MOSEPH
const FLAG_SPEED    = 256;  // SEFLG_SPEED
const FLAG_SIDEREAL = 65536; // SEFLG_SIDEREAL

// Sidereal modes (SE_SIDM_* from swephexp.h)
const SE_SIDM_LAHIRI          = 1;   // Chitrapaksha — standard for most Jyotish
const SE_SIDM_RAMAN           = 3;   // B.V. Raman
const SE_SIDM_KRISHNAMURTI    = 5;   // KP system
const SE_SIDM_YUKTESHWAR      = 7;   // Sri Yukteshwar

// Expose current ayanamsa setting so VedicPage can display it
export let currentAyanamsa = SE_SIDM_LAHIRI;

export function setAyanamsa(mode) {
  currentAyanamsa = mode;
  // If WASM is already loaded, update it immediately
  if (wasmModule) {
    wasmModule.ccall('swe_set_sid_mode', null, ['number','number','number'], [mode, 0, 0]);
  }
}

// CalendarType: 1 = Gregorian
const GREGORIAN = 1;

// HousePoint indices in ascmc array
const HP_ASC    = 0;
const HP_MC     = 1;
const HP_ARMC   = 2;
const HP_VERTEX = 3;

/**
 * Initialize the Swiss Ephemeris WASM module directly.
 */
export async function initSwe() {
  if (wasmModule) return wasmModule;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Use the standard wrapper class to load the module
      // This avoids Vite 500 errors caused by package.json exports limits
      const swe = new SwissEphemeris();
      await swe.init('/swisseph.wasm');
      
      // Extract the raw Emscripten module to bypass broken wrapper methods
      const mod = swe.module;

      // Wrap the C functions we need
      _swe_julday = mod.cwrap('swe_julday_wrap', 'number', 
        ['number', 'number', 'number', 'number', 'number']);
      
      _swe_version = mod.cwrap('swe_version_wrap', 'string', []);

      wasmModule = mod;

      // Set Lahiri ayanamsa explicitly
      mod.ccall('swe_set_sid_mode', null, ['number','number','number'],
        [SE_SIDM_LAHIRI, 0, 0]);

      console.log('[SWE] Professional Ephemeris initialized:', _swe_version());
      console.log('[SWE] Ayanamsa: Lahiri (Chitrapaksha)');
      return mod;
    } catch (err) {
      console.error('[SWE] Failed to initialize WASM:', err);
      initPromise = null; // Allow retry
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Compute Julian Day from a JS Date (UTC).
 */
function dateToJD(mod, date) {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDate();
  const hours = date.getUTCHours()
    + date.getUTCMinutes() / 60
    + date.getUTCSeconds() / 3600
    + date.getUTCMilliseconds() / 3600000;
  return _swe_julday(year, month, day, hours, GREGORIAN);
}

/**
 * Call swe_calc_ut directly for a single planet.
 * Returns { longitude, latitude, distance, longitudeSpeed, latitudeSpeed, distanceSpeed }
 */
function calcPlanet(mod, jd, body, flags) {
  const xxPtr  = mod._malloc(6 * 8);  // 6 doubles
  const errPtr = mod._malloc(256);

  const retflag = mod.ccall(
    'swe_calc_ut_wrap', 'number',
    ['number', 'number', 'number', 'number', 'number'],
    [jd, body, flags, xxPtr, errPtr]
  );

  if (retflag < 0) {
    const errMsg = mod.UTF8ToString(errPtr);
    mod._free(xxPtr);
    mod._free(errPtr);
    throw new Error(`SWE calc error for body ${body}: ${errMsg}`);
  }

  const xx = [];
  for (let i = 0; i < 6; i++) {
    xx[i] = mod.getValue(xxPtr + i * 8, 'double');
  }

  mod._free(xxPtr);
  mod._free(errPtr);

  return {
    longitude:     xx[0],
    latitude:      xx[1],
    distance:      xx[2],
    longitudeSpeed: xx[3],
    latitudeSpeed:  xx[4],
    distanceSpeed:  xx[5]
  };
}

/**
 * Calculate high-precision planet positions.
 */
export async function getPrecisionPositions(date = new Date(), options = {}) {
  const mod = await initSwe();

  const jd = dateToJD(mod, date);
  
  let flags = FLAG_MOSHIER | FLAG_SPEED;
  if (options.sidereal) flags |= FLAG_SIDEREAL;

  const bodies = {
    sun:     0,
    moon:    1,
    mercury: 2,
    venus:   3,
    mars:    4,
    jupiter: 5,
    saturn:  6,
    uranus:  7,
    neptune: 8,
    pluto:   9,
    node:    10  // Mean Node
  };

  const results = {};
  for (const [name, id] of Object.entries(bodies)) {
    const pos = calcPlanet(mod, jd, id, flags);
    results[name] = {
      longitude:    pos.longitude,
      latitude:     pos.latitude,
      distance:     pos.distance,
      speed:        pos.longitudeSpeed,
      isRetrograde: pos.longitudeSpeed < 0
    };
  }

  return results;
}

/**
 * Calculate houses and ascendant via swe_houses_wrap.
 */
export async function getPrecisionHouses(date, lat, lon, system = 'P', options = {}) {
  const mod = await initSwe();

  const jd = dateToJD(mod, date);

  const cuspsPtr = mod._malloc(13 * 8);  // 13 doubles (index 0 unused, 1-12)
  const ascmcPtr = mod._malloc(10 * 8);  // 10 doubles
  const hsysCode = system.charCodeAt(0);

  mod.ccall(
    'swe_houses_wrap', 'number',
    ['number', 'number', 'number', 'number', 'number', 'number'],
    [jd, lat, lon, hsysCode, cuspsPtr, ascmcPtr]
  );

  // Read cusps 1-12 (index 0 is unused in Swiss Ephemeris)
  const cusps = [];
  for (let i = 1; i <= 12; i++) {
    cusps.push(mod.getValue(cuspsPtr + i * 8, 'double'));
  }

  // Read angles
  const ascmc = [];
  for (let i = 0; i < 10; i++) {
    ascmc[i] = mod.getValue(ascmcPtr + i * 8, 'double');
  }

  mod._free(cuspsPtr);
  mod._free(ascmcPtr);

  return {
    ascendant: ascmc[HP_ASC],
    mc:        ascmc[HP_MC],
    armc:      ascmc[HP_ARMC],
    vertex:    ascmc[HP_VERTEX],
    cusps      // Array of 12 house cusps
  };
}

/**
 * Calculate sunrise and sunset for a date and location.
 * Returns { sunrise: Date, sunset: Date, sunriseMins: number, sunsetMins: number } in UTC.
 *
 * @param {Date}   date  - The date (time ignored; uses noon as seed)
 * @param {number} lat   - Latitude
 * @param {number} lon   - Longitude
 */
export async function getSunriseSunset(date, lat, lon) {
  const mod = await initSwe();

  // Seed JD at noon UTC on the requested date
  const noon = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0
  ));
  const jdNoon = dateToJD(mod, noon);

  const tret  = mod._malloc(2 * 8); // double[2]: [rise, set]
  const errPtr = mod._malloc(256);

  // SE_CALC_RISE = 1, SE_CALC_SET = 2
  // body = 0 (Sun), atpress = 1013.25, attemp = 15 (standard atmosphere)
  const riseFlag = mod.ccall(
    'swe_rise_trans_wrap', 'number',
    ['number','number','number','number','number','number','number','number'],
    [jdNoon, 0, 1, lat, lon, 1013.25, 15.0, tret]
  );

  const jdRise = mod.getValue(tret, 'double');
  const jdSet  = mod.getValue(tret + 8, 'double');

  mod._free(tret);
  mod._free(errPtr);

  // Convert JD back to JS Date
  const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);

  return {
    sunrise: jdToDate(jdRise),
    sunset:  jdToDate(jdSet),
    sunriseMins: jdToDate(jdRise).getUTCHours() * 60 + jdToDate(jdRise).getUTCMinutes(),
    sunsetMins:  jdToDate(jdSet).getUTCHours()  * 60 + jdToDate(jdSet).getUTCMinutes(),
  };
}

