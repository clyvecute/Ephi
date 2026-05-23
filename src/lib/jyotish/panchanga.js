/**
 * src/lib/jyotish/panchanga.js
 *
 * Panchanga — The Five Limbs of the Vedic Almanac.
 *
 * 1. Tithi     — Lunar day (Moon–Sun elongation / 12°), 1–30
 * 2. Vara      — Weekday lord (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)
 * 3. Nakshatra — Moon's Nakshatra at the given moment
 * 4. Yoga      — (Sun longitude + Moon longitude) / 13°20', 1–27
 * 5. Karana    — Half-Tithi (each Tithi has 2 Karanas), 1–11 types
 *
 * Also includes:
 *   - Hora (planetary hour)
 *   - Choghadiya (auspicious/inauspicious periods based on Vara and sunrise)
 *   - Sunrise/Sunset calculation stub (requires SWE swe_rise_trans — see note)
 *
 * Dependencies: src/lib/swe.js, src/lib/vedic.js
 */

import { getNakshatra, NAKSHATRAS } from '../vedic.js';

// ─── Tithi ────────────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  'Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami',
  'Shashti','Saptami','Ashtami','Navami','Dashami',
  'Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima/Amavasya'
];

const TITHI_LORDS = [
  'agni','brahma','gauri','ganesha','naga',
  'kartikeya','indra','shiva','durga','yama',
  'vishnu','vishnu','kama','shiva','moon/sun'
];

/**
 * Calculate the current Tithi.
 * @param {number} sunSiderealLon  - Sun sidereal longitude
 * @param {number} moonSiderealLon - Moon sidereal longitude
 */
export function getTithi(sunSiderealLon, moonSiderealLon) {
  const elongation = ((moonSiderealLon - sunSiderealLon) + 360) % 360;
  const tithiIndex = Math.floor(elongation / 12); // 0–29
  const tithiNum   = tithiIndex + 1;              // 1–30

  const isPurnima  = tithiNum === 15;
  const isAmavasya = tithiNum === 30;
  const paksha     = tithiNum <= 15 ? 'Shukla' : 'Krishna'; // Waxing / Waning

  const displayNum = tithiNum > 15 ? tithiNum - 15 : tithiNum;
  const name       = isPurnima  ? 'Purnima' :
                     isAmavasya ? 'Amavasya' :
                     TITHI_NAMES[(tithiIndex % 15)];

  const fractionElapsed = (elongation % 12) / 12;

  return {
    number:          tithiNum,
    displayNumber:   displayNum,
    name,
    paksha,
    lord:            TITHI_LORDS[tithiIndex % 15],
    isAuspicious:    ![4,8,14].includes(displayNum), // Chaturthi, Ashtami, Chaturdashi generally inauspicious
    isPurnima,
    isAmavasya,
    fractionElapsed: parseFloat(fractionElapsed.toFixed(4))
  };
}

// ─── Vara (Weekday lord) ──────────────────────────────────────────────────────

const VARA_LORDS = ['sun','moon','mars','mercury','jupiter','venus','saturn'];
const VARA_NAMES = ['Ravivara','Somavara','Mangalavara','Budhavara','Guruvara','Shukravara','Shanivara'];
const VARA_AUSPICIOUS = {
  general:   [1,3,4,5], // Sun, Wed, Thu, Fri
  travel:    [2,4,5],   // Mon, Wed, Fri (avoid Tue, Sat, Sun for travel)
  marriage:  [3,4,5],   // Wed, Thu, Fri
  business:  [3,4],     // Wed, Thu
};

/**
 * Get Vara from a JS Date.
 * @param {Date} date
 */
export function getVara(date) {
  // getDay() returns 0=Sun, 1=Mon, ... 6=Sat
  const dayIdx = date.getDay(); // 0=Sun=Ravivara
  return {
    index:       dayIdx,
    name:        VARA_NAMES[dayIdx],
    lord:        VARA_LORDS[dayIdx],
    isAuspicious: VARA_AUSPICIOUS.general.includes(dayIdx)
  };
}

// ─── Yoga ────────────────────────────────────────────────────────────────────

const YOGA_NAMES = [
  'Vishkambha','Preeti','Ayushman','Saubhagya','Shobhana',
  'Atiganda','Sukarma','Dhriti','Shoola','Ganda',
  'Vriddhi','Dhruva','Vyaghata','Harshana','Vajra',
  'Siddhi','Vyatipata','Variyan','Parigha','Shiva',
  'Siddha','Sadhya','Shubha','Shukla','Brahma',
  'Indra','Vaidhriti'
];

const YOGA_QUALITY = {
  auspicious:   [1,3,4,5,11,12,14,17,19,20,21,22,23,24,25,26], // 1-indexed
  inauspicious: [0,6,8,9,15,16,18,26] // Vishkambha, Atiganda, Shoola, Ganda, Vajra, Vyatipata, Parigha, Vaidhriti
};

/**
 * Calculate Yoga from sidereal Sun and Moon longitudes.
 */
export function getYoga(sunSiderealLon, moonSiderealLon) {
  const combined  = (sunSiderealLon + moonSiderealLon) % 360;
  const yogaIndex = Math.floor(combined / (360/27)); // 0–26
  const yogaNum   = yogaIndex + 1;

  return {
    index:       yogaIndex,
    number:      yogaNum,
    name:        YOGA_NAMES[yogaIndex],
    isAuspicious:!YOGA_QUALITY.inauspicious.includes(yogaIndex),
    isMahayoga:  [4,11,20,24].includes(yogaIndex) // Shobhana, Vriddhi, Siddha, Brahma
  };
}

// ─── Karana ───────────────────────────────────────────────────────────────────

// 11 Karana types:
// Fixed (4): Shakuni, Chatushpada, Naga, Kimstughna — appear once per month at specific Tithis
// Movable (7): Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti — cycle through repeatedly

const MOVABLE_KARANAS = ['Bava','Balava','Kaulava','Taitila','Gara','Vanija','Vishti'];

const KARANA_QUALITY = {
  Bava:       'auspicious',
  Balava:     'auspicious',
  Kaulava:    'auspicious',
  Taitila:    'auspicious',
  Gara:       'auspicious',
  Vanija:     'auspicious',
  Vishti:     'inauspicious', // Bhadra — avoid new beginnings
  Shakuni:    'neutral',
  Chatushpada:'neutral',
  Naga:       'inauspicious',
  Kimstughna: 'auspicious'
};

/**
 * Calculate Karana from sidereal Sun and Moon longitudes.
 */
export function getKarana(sunSiderealLon, moonSiderealLon) {
  const elongation   = ((moonSiderealLon - sunSiderealLon) + 360) % 360;
  const karanaIndex  = Math.floor(elongation / 6); // 0–59 (60 Karanas per month)

  let name;
  if (karanaIndex === 0) {
    name = 'Kimstughna';
  } else if (karanaIndex >= 57) {
    const fixedNames = ['Shakuni','Chatushpada','Naga'];
    name = fixedNames[karanaIndex - 57];
  } else {
    name = MOVABLE_KARANAS[(karanaIndex - 1) % 7];
  }

  return {
    index:       karanaIndex,
    name,
    quality:     KARANA_QUALITY[name] || 'neutral',
    isVishti:    name === 'Vishti', // Bhadra — inauspicious for beginnings
    fractionElapsed: (elongation % 6) / 6
  };
}

// ─── Full Panchanga ───────────────────────────────────────────────────────────

/**
 * Compute all five Panchanga limbs for a moment.
 *
 * @param {number} sunSiderealLon  - Sidereal Sun longitude (from SWE with Lahiri)
 * @param {number} moonSiderealLon - Sidereal Moon longitude
 * @param {Date}   date            - The JS Date (for Vara)
 *
 * @returns {Panchanga}
 */
export function getPanchanga(sunSiderealLon, moonSiderealLon, date) {
  const tithi    = getTithi(sunSiderealLon, moonSiderealLon);
  const vara     = getVara(date);
  const nakshatra = getNakshatra(moonSiderealLon);
  const yoga     = getYoga(sunSiderealLon, moonSiderealLon);
  const karana   = getKarana(sunSiderealLon, moonSiderealLon);

  // Overall auspiciousness: count favorable limbs
  const favorableCount = [
    tithi.isAuspicious,
    vara.isAuspicious,
    !['Ashlesha','Jyeshtha','Mula','Ardra','Shatabhisha'].includes(nakshatra.name),
    yoga.isAuspicious,
    karana.quality === 'auspicious'
  ].filter(Boolean).length;

  return {
    tithi,
    vara,
    nakshatra,
    yoga,
    karana,
    favorableCount,
    totalLimbs:    5,
    overallQuality: favorableCount >= 4 ? 'excellent' :
                    favorableCount >= 3 ? 'good' :
                    favorableCount >= 2 ? 'moderate' : 'inauspicious'
  };
}

// ─── Hora (Planetary Hour) ────────────────────────────────────────────────────

/**
 * Hora sequence from sunrise, based on the Chaldean order:
 * Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → (repeat)
 */
const HORA_SEQUENCE  = ['saturn','jupiter','mars','sun','venus','mercury','moon'];
// Each day starts with the planet that rules that day (by Vara):
const VARA_FIRST_HORA = ['sun','moon','mars','mercury','jupiter','venus','saturn'];

/**
 * Get the current Hora (planetary hour).
 *
 * @param {Date}   date          - Current date/time
 * @param {number} sunriseMins   - Minutes since midnight for sunrise
 * @param {number} sunsetMins    - Minutes since midnight for sunset
 */
export function getHora(date, sunriseMins, sunsetMins) {
  const dayOfWeek = date.getDay();
  const currentMins = date.getHours() * 60 + date.getMinutes();

  const dayLen  = sunsetMins - sunriseMins;
  const nightLen = (24 * 60) - dayLen;
  const dayHoraLen   = dayLen   / 12;
  const nightHoraLen = nightLen / 12;

  let horaNumber;
  let isDay;

  if (currentMins >= sunriseMins && currentMins < sunsetMins) {
    isDay = true;
    horaNumber = Math.floor((currentMins - sunriseMins) / dayHoraLen);
  } else {
    isDay = false;
    const nightStart = sunsetMins;
    const nightMins  = currentMins >= nightStart
      ? currentMins - nightStart
      : currentMins + (24*60 - nightStart);
    horaNumber = 12 + Math.floor(nightMins / nightHoraLen);
  }

  const startPlanet  = HORA_SEQUENCE.indexOf(VARA_FIRST_HORA[dayOfWeek]);
  const currentPlanet = HORA_SEQUENCE[(startPlanet + horaNumber) % 7];

  const HORA_QUALITY = {
    sun: 'authority,vitality', jupiter: 'wisdom,expansion', venus: 'love,wealth',
    moon: 'emotions,travel', saturn: 'discipline,delays', mercury: 'communication,trade',
    mars: 'action,conflict'
  };

  return {
    planet:      currentPlanet,
    number:      horaNumber + 1,
    isDay,
    quality:     HORA_QUALITY[currentPlanet],
    isAuspicious:['sun','jupiter','venus'].includes(currentPlanet)
  };
}

// ─── Choghadiya ───────────────────────────────────────────────────────────────

/**
 * Choghadiya — Eight ~90-minute periods from sunrise to sunset.
 * Based on Vara lord and period index.
 *
 * Each row: [Vara lord (0=Sun..6=Sat)] → 8 choghadiyas (day) + 8 (night)
 */
const CHOGHADIYA_SEQUENCE = {
  //          Day:                               Night:
  0: ['Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg',   'Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh'],
  1: ['Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit',   'Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char'],
  2: ['Kaal','Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal',    'Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh'],
  3: ['Shubh','Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh',   'Amrit','Char','Rog','Kaal','Labh','Udveg','Shubh','Amrit'],
  4: ['Rog','Udveg','Char','Labh','Amrit','Kaal','Shubh','Rog',     'Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog','Kaal'],
  5: ['Char','Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char',    'Udveg','Shubh','Amrit','Char','Rog','Kaal','Labh','Udveg'],
  6: ['Labh','Amrit','Kaal','Shubh','Rog','Udveg','Char','Labh',    'Rog','Kaal','Labh','Udveg','Shubh','Amrit','Char','Rog'],
};

const CHOGHADIYA_QUALITY = {
  Amrit: 'excellent',  // Nectar — best for all work
  Labh:  'excellent',  // Profit — excellent for business
  Shubh: 'good',       // Auspicious — good for all beginnings
  Char:  'good',       // Moving — good for travel
  Udveg: 'inauspicious',// Anxiety — avoid beginnings
  Kaal:  'inauspicious',// Time — avoid unless for Saturn work
  Rog:   'inauspicious' // Disease — avoid all new work
};

/**
 * Get current Choghadiya.
 *
 * @param {Date}   date        - Current date/time
 * @param {number} sunriseMins - Sunrise in minutes from midnight
 * @param {number} sunsetMins  - Sunset in minutes from midnight
 */
export function getChoghadiya(date, sunriseMins, sunsetMins) {
  const dayOfWeek  = date.getDay();
  const sequence   = CHOGHADIYA_SEQUENCE[dayOfWeek];
  const currentMins = date.getHours() * 60 + date.getMinutes();

  const dayLen       = sunsetMins - sunriseMins;
  const nightLen     = 24*60 - dayLen;
  const dayPeriodLen = dayLen / 8;
  const nightPeriodLen = nightLen / 8;

  let periodIdx;
  let isDay;

  if (currentMins >= sunriseMins && currentMins < sunsetMins) {
    isDay     = true;
    periodIdx = Math.floor((currentMins - sunriseMins) / dayPeriodLen);
  } else {
    isDay = false;
    const nightStart = sunsetMins;
    const nightMins  = currentMins >= nightStart
      ? currentMins - nightStart
      : currentMins + 24*60 - nightStart;
    periodIdx = 8 + Math.floor(nightMins / nightPeriodLen);
  }

  const name    = sequence[Math.min(periodIdx, 15)];
  const quality = CHOGHADIYA_QUALITY[name];

  return {
    name,
    quality,
    isAuspicious: ['excellent','good'].includes(quality),
    periodIndex:  periodIdx,
    isDay
  };
}

/**
 * Approximate sunrise/sunset in minutes from midnight (UTC-local).
 * Accurate to ±10 minutes. Use only as fallback when SWE rise_trans unavailable.
 */
export function approximateSunriseSunset(date, latDeg) {
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const p   = Math.asin(0.39795 * Math.cos(0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.00860 * (doy - 186)))));
  const D   = 24 - (24 / Math.PI) * Math.acos(
    (Math.sin(0.8333 * Math.PI / 180) + Math.sin(latDeg * Math.PI / 180) * Math.sin(p)) /
    (Math.cos(latDeg * Math.PI / 180) * Math.cos(p))
  );
  const halfDay   = D / 2;
  const sunriseMins = Math.round((12 - halfDay) * 60);
  const sunsetMins  = Math.round((12 + halfDay) * 60);
  return { sunriseMins, sunsetMins };
}

export function getKalaStatus(date, sunriseMins, sunsetMins) {
  return { name: 'Neutral', quality: 'neutral' };
}
