/**
 * lib/ephemeris.js
 *
 * Calculates highly accurate geocentric ecliptic longitudes using astronomy-engine.
 */

import * as Astronomy from 'astronomy-engine';

// Normalise any angle to [0, 360)
function norm(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Calculates the Lahiri Ayanamsa for a given Date object.
 * @param {Date} date
 * @returns {number} Ayanamsa in degrees
 */
export function getAyanamsa(date) {
  const safeDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  const jd = Astronomy.MakeTime(safeDate).tt;
  const J2000 = 2451545.0;
  const t = (jd - J2000) / 36525;
  // Simple linear approximation of Lahiri Ayanamsa
  const LAHIRI_EPOCH = 23.85; 
  return norm(LAHIRI_EPOCH + (5023.0 / 3600.0) * t);
}

/**
 * Approximate Mean North Node longitude.
 */
function calculateMeanNode(date) {
  const J2000 = new Date('2000-01-01T12:00:00Z');
  const diffDays = (date - J2000) / (1000 * 60 * 60 * 24);
  // Mean node moves ~0.0529536 degrees per day (retrograde)
  return norm(125.044522 - 0.0529537648 * diffDays);
}

/**
 * Approximate Mean Lilith longitude.
 */
function calculateLilith(date) {
  const J2000 = new Date('2000-01-01T12:00:00Z');
  const diffDays = (date - J2000) / (1000 * 60 * 60 * 24);
  // Mean Lilith moves ~0.111403 degrees per day
  return norm(176.906 + 0.1114035 * diffDays);
}

/**
 * Returns ecliptic longitudes (0–360°) for all planets at the given date.
 */
export function getPlanetPositions(date = new Date(), ascLon = null, options = { sidereal: false, lat: 0, lon: 0 }) {
  // Ensure date is a valid Date object
  const safeDate = (date instanceof Date && !isNaN(date.getTime())) ? date : new Date();
  const time = Astronomy.MakeTime(safeDate);
  const ayanamsa = options.sidereal ? getAyanamsa(date) : 0;
  const observer = new Astronomy.Observer(options.lat || 0, options.lon || 0, 0);

  const getLon = (body) => {
    const vec = Astronomy.GeoVector(body, time, true);
    return norm(Astronomy.Ecliptic(vec).elon - ayanamsa);
  };

  const res = {
    sun:     getLon(Astronomy.Body.Sun),
    moon:    getLon(Astronomy.Body.Moon),
    mercury: getLon(Astronomy.Body.Mercury),
    venus:   getLon(Astronomy.Body.Venus),
    mars:    getLon(Astronomy.Body.Mars),
    jupiter: getLon(Astronomy.Body.Jupiter),
    saturn:  getLon(Astronomy.Body.Saturn),
    uranus:  getLon(Astronomy.Body.Uranus),
    neptune: getLon(Astronomy.Body.Neptune),
    pluto:   getLon(Astronomy.Body.Pluto),
    nnode:   norm(calculateMeanNode(date) - ayanamsa),
    snode:   norm(calculateMeanNode(date) + 180 - ayanamsa),
    lilith:  norm(calculateLilith(date) - ayanamsa),
  };

  // Calculate Part of Fortune if ASC is available
  if (ascLon != null) {
    const sun = res.sun;
    const moon = res.moon;
    
    // In astrology, if the Sun is between the Descendant and the Ascendant (diff > 180), it's above the horizon (Day chart).
    // If it's between the Ascendant and the Descendant (diff < 180), it's below the horizon (Night chart).
    const isDay = norm(sun - ascLon) > 180;
    
    // Traditional: Day = Asc + Moon - Sun, Night = Asc + Sun - Moon
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
