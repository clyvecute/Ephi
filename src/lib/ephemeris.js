/**
 * lib/ephemeris.js
 *
 * Calculates highly accurate geocentric ecliptic longitudes using astronomy-engine.
 */

import { getPrecisionPositions, initSwe } from './swe.js';

// Normalise any angle to [0, 360)
function norm(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Returns professional-grade ecliptic longitudes (0–360°) using Swiss Ephemeris.
 */
export async function getPlanetPositions(date = new Date(), ascLon = null, options = { sidereal: false, lat: 0, lon: 0 }) {
  const safeDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  
  // 1. Get high-precision data from SWE
  const raw = await getPrecisionPositions(safeDate, options);
  
  // 2. Format to Ephi standard
  const res = {};
  for (const [key, val] of Object.entries(raw)) {
    res[key] = val.longitude; // Keep simple numeric for core compatibility
  }

  // 3. Special handling for nodes (standardizing names)
  if (raw.node) {
    res.nnode = raw.node.longitude;
    res.snode = norm(raw.node.longitude + 180);
  }

  // 4. Calculate Part of Fortune if ASC is available
  if (ascLon != null) {
    const sun = res.sun;
    const moon = res.moon;
    const isDay = norm(sun - ascLon) > 180;
    if (isDay) {
      res.fortune = norm(ascLon + moon - sun);
    } else {
      res.fortune = norm(ascLon + sun - moon);
    }
  }

  return res;
}

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_SYMBOLS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];

/**
 * Converts a raw longitude (0–360°) to human-readable zodiac info.
 *
 * @param {number} longitude
 * @returns {{ sign: string, symbol: string, degree: number, displayStr: string }}
 */
export function getZodiacInfo(longitude) {
  const lon    = norm(longitude);
  const index  = Math.floor(lon / 30);
  const degree = lon % 30;

  return {
    sign:       SIGNS[index],
    symbol:     SIGN_SYMBOLS[index],
    icon:       SIGNS[index].toLowerCase(),
    degree:     parseFloat(degree.toFixed(2)),
    displayStr: `${degree.toFixed(1)}° ${SIGNS[index]}`,
  };
}

export const PLANET_META = {
  sun:     { label: 'Sun',     symbol: '☉', icon: 'sun',     color: '#F5A623', speed: 'slow'  },
  moon:    { label: 'Moon',    symbol: '☽', icon: 'moon',    color: '#C0C0C0', speed: 'fast'  },
  mercury: { label: 'Mercury', symbol: '☿', icon: 'mercury', color: '#8B7FBB', speed: 'fast'  },
  venus:   { label: 'Venus',   symbol: '♀', icon: 'venus',   color: '#E87D9B', speed: 'fast'  },
  mars:    { label: 'Mars',    symbol: '♂', icon: 'mars',    color: '#E05A3A', speed: 'medium'},
  jupiter: { label: 'Jupiter', symbol: '♃', icon: 'jupiter', color: '#D4942A', speed: 'slow'  },
  saturn:  { label: 'Saturn',  symbol: '♄', icon: 'saturn',  color: '#6B7F6B', speed: 'slow'  },
  uranus:  { label: 'Uranus',  symbol: '♅', icon: 'uranus',  color: '#5CB8C4', speed: 'slow'  },
  neptune: { label: 'Neptune', symbol: '♆', icon: 'neptune', color: '#5B7FD4', speed: 'slow'  },
  pluto:   { label: 'Pluto',   symbol: '♇', icon: 'pluto',   color: '#A05CA0', speed: 'slow'  },
  chiron:  { label: 'Chiron',  symbol: '⚷', icon: 'chiron',  color: '#90EE90', speed: 'slow'  },
  nnode:   { label: 'N. Node', symbol: '☊', icon: 'nn',      color: '#FFF',    speed: 'slow'  },
  snode:   { label: 'S. Node', symbol: '☋', icon: 'sn',      color: '#FFF',    speed: 'slow'  },
  lilith:  { label: 'Lilith',  symbol: '⚸', icon: 'lilith',  color: '#FF4500', speed: 'slow'  },
  fortune: { label: 'Fortune', symbol: '⊗', icon: 'fortune', color: '#FFD700', speed: 'slow'  },
};


export const ALL_PLANETS = Object.keys(PLANET_META);
