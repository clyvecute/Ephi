/**
 * Ephi Swiss Ephemeris WASM Wrapper
 * 
 * Provides professional-grade astronomical precision using the 
 * C-based Swiss Ephemeris compiled to WebAssembly.
 */

import { SwissEphemeris, Planet, Flag } from '@swisseph/browser';

let sweInstance = null;
let initPromise = null;

/**
 * Initialize the Swiss Ephemeris WASM module.
 */
export async function initSwe() {
  if (sweInstance) return sweInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const swe = new SwissEphemeris();
      await swe.init();
      sweInstance = swe;
      console.log('[SWE] Professional Ephemeris initialized.');
      return swe;
    } catch (err) {
      console.error('[SWE] Failed to initialize WASM:', err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Calculate high-precision planet positions.
 */
export async function getPrecisionPositions(date = new Date(), options = {}) {
  const swe = await initSwe();
  const jd = swe.dateToJulianDay(date);
  
  // SEFLG_SPEED = Calculate velocities
  // SEFLG_SWIEPH = Use Swiss Ephemeris files if available
  const flags = Flag.SPEED | Flag.SWIEPH;

  const planets = {
    sun:     Planet.Sun,
    moon:    Planet.Moon,
    mercury: Planet.Mercury,
    venus:   Planet.Venus,
    mars:    Planet.Mars,
    jupiter: Planet.Jupiter,
    saturn:  Planet.Saturn,
    uranus:  Planet.Uranus,
    neptune: Planet.Neptune,
    pluto:   Planet.Pluto,
    node:    Planet.MeanNode
  };

  const results = {};
  for (const [name, id] of Object.entries(planets)) {
    const pos = swe.calculatePosition(jd, id, flags);
    results[name] = {
      longitude: pos.longitude,
      latitude:  pos.latitude,
      distance:  pos.distance,
      speed:     pos.longitudeSpeed,
      isRetrograde: pos.longitudeSpeed < 0
    };
  }

  return results;
}

/**
 * Calculate houses and ascendant.
 */
export async function getPrecisionHouses(date, lat, lon, system = 'P') {
  const swe = await initSwe();
  const jd = swe.dateToJulianDay(date);
  
  // Systems: 'P' (Placidus), 'K' (Koch), 'O' (Porphyry), 'R' (Regiomontanus), etc.
  const houses = swe.calculateHouses(jd, lat, lon, system);
  
  return {
    ascendant: houses.ascendant,
    mc:        houses.mc,
    armc:      houses.armc,
    vertex:    houses.vertex,
    cusps:     houses.cusps // Array 1-12
  };
}
