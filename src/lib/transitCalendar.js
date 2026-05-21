// src/lib/transitCalendar.js
//
// High-precision Transit Calendar Generator
// Performs a coarse 6-hour scan over the target duration,
// and utilizes binary bisection to pin down exact minute activations.

import { getPlanetPositions } from './ephemeris.js';
import { getActiveAspects, ASPECTS } from './aspects.js';
import { getInterpretation } from './interpretations.js';

// Average daily motion in degrees to check relative direction
const DAILY_MOTION = {
  sun: 0.9856, moon: 13.176, mercury: 1.3833, venus: 1.20,
  mars: 0.524, jupiter: 0.0831, saturn: 0.0335, uranus: 0.0117,
  neptune: 0.006, pluto: 0.004, node: 0.053, nnode: 0.053, snode: 0.053
};

/**
 * Shortest signed distance between two angles (0-360).
 */
function signedDiff(a, b) {
  let diff = a - b;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

/**
 * Generates all transit aspect events for a natal chart over a given duration.
 * 
 * @param {Object} natalChart
 * @param {Object} options
 * @param {Date} [options.startDate] - Scan start (defaults to now)
 * @param {number} [options.durationDays] - Number of days to scan (default 30)
 * @param {string[]} [options.transitPlanets] - Transit planets to scan
 * @param {string[]} [options.natalPlanets] - Natal planets to scan against
 * @returns {Promise<Array>} Sorted transit events
 */
export async function calculateTransitCalendar(natalChart, options = {}) {
  if (!natalChart || !natalChart.positions) {
    throw new Error('Valid natal chart is required.');
  }

  const startDate = options.startDate || new Date();
  const durationDays = options.durationDays || 30;
  const isSidereal = !!natalChart.meta?.sidereal;

  const tPlanets = options.transitPlanets || ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const nPlanets = options.natalPlanets || Object.keys(natalChart.positions).map(p => p.toLowerCase());

  const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  // 1. Generate coarse 6-hour steps
  const steps = [];
  const stepSizeMs = 6 * 60 * 60 * 1000; // 6 hours
  for (let t = startDate.getTime(); t <= endDate.getTime(); t += stepSizeMs) {
    steps.push(new Date(t));
  }
  // Ensure we include the exact end date
  if (steps[steps.length - 1].getTime() < endDate.getTime()) {
    steps.push(endDate);
  }

  // 2. Fetch transit positions at all coarse steps
  const coarsePositions = [];
  for (const date of steps) {
    const pos = await getPlanetPositions(date, null, { sidereal: isSidereal });
    coarsePositions.push({ date, pos });
  }

  // Map natal positions to lowercase keys and clean longitudes
  const natalPos = {};
  for (const [k, v] of Object.entries(natalChart.positions)) {
    const lon = typeof v === 'object' ? v.longitude : v;
    if (lon != null) {
      natalPos[k.toLowerCase()] = lon;
    }
  }

  const events = [];

  // 3. Scan each interval for aspect crossings
  for (let i = 0; i < coarsePositions.length - 1; i++) {
    const stepA = coarsePositions[i];
    const stepB = coarsePositions[i + 1];
    const tA = stepA.date.getTime();
    const tB = stepB.date.getTime();

    for (const tp of tPlanets) {
      const transitValA = stepA.pos[tp];
      const transitValB = stepB.pos[tp];
      if (!transitValA || !transitValB) continue;

      const lonA = typeof transitValA === 'object' ? transitValA.longitude : transitValA;
      const lonB = typeof transitValB === 'object' ? transitValB.longitude : transitValB;
      if (lonA == null || lonB == null) continue;

      for (const np of nPlanets) {
        const nLon = natalPos[np];
        if (nLon == null) continue;

        // Skip same-planet checks in transits if needed (e.g. transit Sun to natal Sun is valid)
        // Check crossings for all major aspects
        for (const asp of ASPECTS) {
          // An aspect occurs at positive or negative target angles (except 0 and 180)
          const targetAngles = asp.angle === 0 || asp.angle === 180 
            ? [asp.angle] 
            : [asp.angle, -asp.angle];

          for (const targetAngle of targetAngles) {
            const relLonA = signedDiff(lonA, nLon);
            const relLonB = signedDiff(lonB, nLon);

            const diffA = signedDiff(relLonA - targetAngle, 0);
            const diffB = signedDiff(relLonB - targetAngle, 0);

            // Crossing check: difference from exact aspect changes sign
            if (diffA * diffB < 0) {
              // Exact aspect occurs in this 6-hour window! Run binary bisection (22 steps)
              let lowTime = tA;
              let highTime = tB;
              let lowVal = diffA;

              for (let iter = 0; iter < 22; iter++) {
                const midTime = (lowTime + highTime) / 2;
                const midPos = await getPlanetPositions(new Date(midTime), null, { sidereal: isSidereal });
                const midTransitVal = midPos[tp];
                const midTransitLon = typeof midTransitVal === 'object' ? midTransitVal.longitude : midTransitVal;
                
                const midRelLon = signedDiff(midTransitLon, nLon);
                const midVal = signedDiff(midRelLon - targetAngle, 0);

                if (lowVal * midVal < 0) {
                  highTime = midTime;
                } else {
                  lowTime = midTime;
                  lowVal = midVal;
                }
              }

              const exactTime = new Date((lowTime + highTime) / 2);
              const eventId = `${tp}_${np}_${asp.name}_${exactTime.getTime()}`;

              // Determine applying/separating state relative to calculation runtime (now)
              const now = new Date();
              const applying = exactTime > now;

              const interp = getInterpretation(tp, asp.name, np) || {};

              events.push({
                id: eventId,
                transitPlanet: tp,
                natalPlanet: np,
                aspectName: asp.name,
                symbol: asp.symbol,
                nature: asp.nature,
                exactTime,
                applying,
                keywords: interp.keywords || [],
                description: interp.core || null,
                targetAngle
              });
            }
          }
        }
      }
    }
  }

  // Sort events chronologically
  events.sort((a, b) => a.exactTime.getTime() - b.exactTime.getTime());
  return events;
}
