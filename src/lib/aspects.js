/**
 * lib/aspects.js
 *
 * Compares current transit positions to natal positions and returns
 * all active aspects with orb, applying/separating status, and strength.
 *
 * Usage:
 *   import { getActiveAspects } from './aspects.js';
 *   const aspects = getActiveAspects(currentPositions, natalPositions);
 *
 * Each returned aspect looks like:
 * {
 *   transitPlanet: 'mars',
 *   natalPlanet:   'moon',
 *   aspectName:    'square',
 *   symbol:        '□',
 *   angle:         90,
 *   orb:           1.24,        // degrees from exact
 *   applying:      true,        // true = getting closer, false = separating
 *   strength:      'exact',     // 'exact' | 'strong' | 'moderate' | 'wide'
 *   exactAt:       Date | null, // rough time of exactness (if applying)
 *   transitDeg:    352.80,
 *   natalDeg:      262.10,
 * }
 */
 
// ─── Aspect definitions ───────────────────────────────────────────────────────
 
export const ASPECTS = [
  { name: 'conjunction', symbol: '☌', angle: 0,   orb: 8, nature: 'neutral' },
  { name: 'sextile',     symbol: '⚹', angle: 60,  orb: 6, nature: 'soft'    },
  { name: 'square',      symbol: '□', angle: 90,  orb: 8, nature: 'hard'    },
  { name: 'trine',       symbol: '△', angle: 120, orb: 8, nature: 'soft'    },
  { name: 'quincunx',    symbol: '⚻', angle: 150, orb: 4, nature: 'hard'    },
  { name: 'opposition',  symbol: '☍', angle: 180, orb: 8, nature: 'hard'    },
];
 
// Tighter orbs for fast-moving Moon transits (reduces noise)
const MOON_ORB_FACTOR = 0.75;
 
// Planet daily motion in degrees (approximate average)
// Used to estimate when an applying aspect becomes exact
const DAILY_MOTION = {
  sun:     0.9856,
  moon:    13.176,
  mercury: 1.3833,
  venus:   1.2000,
  mars:    0.5240,
  jupiter: 0.0831,
  saturn:  0.0335,
  uranus:  0.0117,
  neptune: 0.0060,
  pluto:   0.0040,
};
 
// ─── Utility ──────────────────────────────────────────────────────────────────
 
/**
 * Shortest angular distance between two longitudes (0–360).
 * Returns a value in [0, 180].
 */
function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}
 
/**
 * Signed angular separation: transit relative to natal.
 * Positive = transit is ahead, negative = transit is behind.
 * Used to determine applying vs separating.
 */
function signedDiff(transit, natal) {
  let diff = transit - natal;
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
 
function orbStrength(orb, maxOrb) {
  const ratio = orb / maxOrb;
  if (ratio <= 0.15) return 'exact';
  if (ratio <= 0.40) return 'strong';
  if (ratio <= 0.70) return 'moderate';
  return 'wide';
}
 
/**
 * Estimate date when applying aspect becomes exact.
 * Very rough — assumes current speed continues linearly.
 */
function estimateExactDate(orb, transitPlanet, natalPlanet) {
  const speed = DAILY_MOTION[transitPlanet] - (DAILY_MOTION[natalPlanet] || 0);
  if (Math.abs(speed) < 0.001) return null; // essentially stationary
  const daysToExact = orb / Math.abs(speed);
  if (daysToExact > 365) return null; // too far away to be useful
  const d = new Date();
  d.setTime(d.getTime() + daysToExact * 24 * 60 * 60 * 1000);
  return d;
}
 
// ─── Main export ──────────────────────────────────────────────────────────────
 
/**
 * Find all active transit-to-natal aspects.
 *
 * @param {Object} currentPositions  — from getPlanetPositions(new Date())
 * @param {Object} natalPositions    — from getPlanetPositions(birthDate)
 * @param {Object} options
 * @param {string[]} options.transitPlanets — which transiting planets to check
 * @param {string[]} options.natalPlanets   — which natal planets to check against
 * @param {string[]} options.aspectNames    — which aspects to include
 * @returns {Array} sorted by orb (tightest first)
 */
export function getActiveAspects(
  currentPositions,
  natalPositions,
  options = {}
) {
  // Graceful fallback for sky-only transit-to-transit checks
  const isSkyCheck = !natalPositions || currentPositions === natalPositions;
  const nPositions = isSkyCheck ? currentPositions : natalPositions;

  const {
    transitPlanets = Object.keys(currentPositions),
    natalPlanets   = Object.keys(nPositions),
    aspectNames    = ASPECTS.map((a) => a.name),
  } = options;
 
  const activeAspects = [];
  const activeAspectDefs = ASPECTS.filter((a) => aspectNames.includes(a.name));
 
  for (let i = 0; i < transitPlanets.length; i++) {
    const tPlanet = transitPlanets[i];
    const tVal = currentPositions[tPlanet];
    if (tVal == null) continue;
    
    // Support both simple longitude (number) and precision object ({longitude, ...})
    const tLon = typeof tVal === 'object' ? tVal.longitude : tVal;
    if (tLon == null) continue;
 
    for (let j = 0; j < natalPlanets.length; j++) {
      const nPlanet = natalPlanets[j];
      const nVal = nPositions[nPlanet];
      if (nVal == null) continue;

      const nLon = typeof nVal === 'object' ? nVal.longitude : nVal;
      if (nLon == null) continue;

      // Avoid duplicate transit-to-transit aspects
      if (isSkyCheck && i >= j) continue;
 
      const dist = angularDistance(tLon, nLon);
 
      for (const aspect of activeAspectDefs) {
        // Use tighter orbs when Moon is the transiting planet
        const maxOrb =
          tPlanet === 'moon'
            ? aspect.orb * MOON_ORB_FACTOR
            : aspect.orb;
 
        const orb = Math.abs(dist - aspect.angle);
        if (orb > maxOrb) continue;
 
        // Applying = transit is moving TOWARD the exact aspect angle
        // We check by seeing if the signed diff is closing
        const sd = signedDiff(tLon, nLon);
        let applying;
 
        if (aspect.angle === 0) {
          // Conjunction: applying if transit is approaching natal from behind
          applying = sd < 0;
        } else if (aspect.angle === 180) {
          // Opposition: applying if the gap is still closing toward 180
          applying = Math.abs(sd) < 180 && sd > 0
            ? dist < aspect.angle
            : dist < aspect.angle;
          applying = orb > 0 && DAILY_MOTION[tPlanet] > (DAILY_MOTION[nPlanet] || 0)
            ? sd < aspect.angle
            : true;
          // Simplified: just use whether orb is currently decreasing
          applying = (sd > 0 && sd < 180) ? (dist < aspect.angle ? false : true) : (dist < aspect.angle ? true : false);
        } else {
          applying = dist < aspect.angle
            ? sd > 0
            : sd < 0;
        }
 
        // Simpler, more reliable applying check:
        // Calc position 1 hour ago, see if orb was larger
        const oneHourAgo = new Date(Date.now() - 3600 * 1000);
        const tLonHourAgo = tLon - DAILY_MOTION[tPlanet] / 24;
        const distHourAgo = angularDistance(tLonHourAgo, nLon);
        const orbHourAgo  = Math.abs(distHourAgo - aspect.angle);
        applying = orbHourAgo > orb; // orb was bigger before = now applying
 
        activeAspects.push({
          transitPlanet: tPlanet,
          natalPlanet:   nPlanet,
          aspectName:    aspect.name,
          symbol:        aspect.symbol,
          angle:         aspect.angle,
          nature:        aspect.nature,
          orb:           parseFloat(orb.toFixed(2)),
          applying,
          strength:      orbStrength(orb, maxOrb),
          exactAt:       applying ? estimateExactDate(orb, tPlanet, nPlanet) : null,
          transitDeg:    parseFloat(tLon.toFixed(2)),
          natalDeg:      parseFloat(nLon.toFixed(2)),
        });
      }
    }
  }
 
  // Sort: tightest orb first, then by transit planet speed (fast first)
  const speedOrder = ['moon','mercury','venus','sun','mars','jupiter','saturn','uranus','neptune','pluto'];
  activeAspects.sort((a, b) => {
    if (a.orb !== b.orb) return a.orb - b.orb;
    return speedOrder.indexOf(a.transitPlanet) - speedOrder.indexOf(b.transitPlanet);
  });
 
  return activeAspects;
}
 
// ─── Helpers for the UI ───────────────────────────────────────────────────────
 
/**
 * Groups aspects by nature: hard, soft, neutral.
 * Useful for colour-coding the dashboard.
 */
export function groupByNature(aspects) {
  return {
    hard:    aspects.filter((a) => a.nature === 'hard'),
    soft:    aspects.filter((a) => a.nature === 'soft'),
    neutral: aspects.filter((a) => a.nature === 'neutral'),
  };
}
 
/**
 * Filters to only the most notable aspects (exact + strong).
 * Good for a "headlines" summary at the top of the dashboard.
 */
export function getHeadlineAspects(aspects) {
  return aspects.filter((a) => ['exact', 'strong'].includes(a.strength));
}
 
/**
 * Returns a short human-readable label for an aspect.
 * e.g. "Transit Mars □ Natal Moon"
 */
export function aspectLabel(aspect, planetMeta = {}) {
  const tLabel = planetMeta[aspect.transitPlanet]?.label || aspect.transitPlanet;
  const nLabel = planetMeta[aspect.natalPlanet]?.label   || aspect.natalPlanet;
  return `Transit ${tLabel} ${aspect.symbol} Natal ${nLabel}`;
}
 
/**
 * Format exact-time estimate as a readable string.
 * e.g. "exact in ~3h" or "exact tomorrow"
 */
export function formatExactAt(date) {
  if (!date) return null;
  const diffMs = date - Date.now();
  const diffH  = diffMs / (1000 * 60 * 60);
 
  if (diffH < 1)   return 'exact in <1h';
  if (diffH < 24)  return `exact in ~${Math.round(diffH)}h`;
  if (diffH < 48)  return 'exact tomorrow';
  const days = Math.round(diffH / 24);
  return `exact in ~${days} days`;
}
