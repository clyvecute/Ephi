/**
 * lib/vedic.js
 * Core mathematical engine for Vedic Astrology (Jyotish).
 */

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

// Vimshottari Dasha Lords & their period lengths in years
const DASHA_LORDS = [
  { planet: 'ketu', years: 7 },
  { planet: 'venus', years: 20 },
  { planet: 'sun', years: 6 },
  { planet: 'moon', years: 10 },
  { planet: 'mars', years: 7 },
  { planet: 'rahu', years: 18 },    // North Node
  { planet: 'jupiter', years: 16 },
  { planet: 'saturn', years: 19 },
  { planet: 'mercury', years: 17 }
];

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

/**
 * Calculates the Nakshatra, its lord, and its Pada (1-4) for a given sidereal longitude.
 */
export function getNakshatra(longitude) {
  // Normalize longitude just in case
  const lon = ((longitude % 360) + 360) % 360;
  
  const NAKSHATRA_SPAN = 360 / 27; // 13.3333333 degrees
  const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3.3333333 degrees

  const nakIndex = Math.floor(lon / NAKSHATRA_SPAN);
  const nakName = NAKSHATRAS[nakIndex];
  
  const lordIndex = nakIndex % 9;
  const lord = DASHA_LORDS[lordIndex].planet;

  // Exact degree within the Nakshatra
  const degreeInNakshatra = lon % NAKSHATRA_SPAN;
  const pada = Math.floor(degreeInNakshatra / PADA_SPAN) + 1;

  // Fraction passed for Dasha calculations
  const fractionPassed = degreeInNakshatra / NAKSHATRA_SPAN;
  const fractionRemaining = 1 - fractionPassed;

  return {
    index: nakIndex,
    name: nakName,
    ruler: lord,
    pada: pada,
    fractionPassed,
    fractionRemaining
  };
}

/**
 * Calculates the D-9 Navamsa sign index (0-11) for a given longitude.
 * D-9 is the 9th harmonic chart.
 */
export function getNavamsaSign(longitude) {
  const lon = ((longitude % 360) + 360) % 360;
  const PADA_SPAN = 360 / 108; // 3.3333333 degrees per Navamsa
  
  // The universal mathematical formula for Navamsa sign is simply mapping the 108 padas to the 12 signs continuously.
  const padaAbsolute = Math.floor(lon / PADA_SPAN);
  const navamsaSignIndex = padaAbsolute % 12;
  
  return {
    signIndex: navamsaSignIndex,
    sign: SIGNS[navamsaSignIndex]
  };
}

/**
 * Calculates the current Vimshottari Mahadasha and Antardasha (Sub-period) for a given date.
 * @param {number} moonLongitude - Sidereal longitude of the Moon at birth
 * @param {Date} birthDate - Date of birth
 * @param {Date} targetDate - The date to calculate the Dasha for (defaults to now)
 */
export function getVimshottariDasha(moonLongitude, birthDate, targetDate = new Date()) {
  const nak = getNakshatra(moonLongitude);
  const startLordIndex = nak.index % 9;
  const startLord = DASHA_LORDS[startLordIndex];
  
  // Balance of Dasha at birth in years
  const balanceYears = startLord.years * nak.fractionRemaining;
  
  // Convert dates to fractional years (rough approximation for civil calendar)
  const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
  const targetAgeInYears = (targetDate.getTime() - birthDate.getTime()) / MS_PER_YEAR;

  // If target date is before birth or within the first dasha
  if (targetAgeInYears < balanceYears) {
    const passedInDasha = startLord.years - balanceYears + targetAgeInYears;
    return calculateAntardasha(startLordIndex, passedInDasha);
  }

  // Iterate through Dashas to find the current one
  let yearsAccumulated = balanceYears;
  let currentIndex = (startLordIndex + 1) % 9;

  // Max 120 years
  for (let i = 0; i < 9; i++) {
    const lord = DASHA_LORDS[currentIndex];
    if (targetAgeInYears < yearsAccumulated + lord.years) {
      // Found the Mahadasha!
      const passedInCurrentDasha = targetAgeInYears - yearsAccumulated;
      return calculateAntardasha(currentIndex, passedInCurrentDasha);
    }
    yearsAccumulated += lord.years;
    currentIndex = (currentIndex + 1) % 9;
  }

  return { mahadasha: null, antardasha: null, message: "Lifespan exceeds 120 years cycle" };
}

/**
 * Calculates the Antardasha (Sub-period) within a Mahadasha.
 */
function calculateAntardasha(mahadashaIndex, yearsPassed) {
  const mahaLord = DASHA_LORDS[mahadashaIndex];
  
  let accumulated = 0;
  let currentAntarIndex = mahadashaIndex; // Antardasha always starts with the Mahadasha lord

  for (let i = 0; i < 9; i++) {
    const antarLord = DASHA_LORDS[currentAntarIndex];
    // Length of Antardasha = (Maha Years * Antar Years) / 120
    const antarYears = (mahaLord.years * antarLord.years) / 120;

    if (yearsPassed < accumulated + antarYears) {
      return {
        mahadasha: mahaLord.planet,
        antardasha: antarLord.planet,
        progress: (yearsPassed - accumulated) / antarYears // 0 to 1
      };
    }
    accumulated += antarYears;
    currentAntarIndex = (currentAntarIndex + 1) % 9;
  }

  // Fallback
  return { mahadasha: mahaLord.planet, antardasha: DASHA_LORDS[mahadashaIndex].planet, progress: 0 };
}
