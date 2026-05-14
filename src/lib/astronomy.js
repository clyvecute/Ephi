/**
 * lib/astronomy.js — Step 2
 * Low-level astronomical math: Julian dates, obliquity, coordinate transforms.
 * Pure JS, no dependencies. Testable directly: node lib/astronomy.js
 */

// ─── Julian Date ─────────────────────────────────────────────────────────────

/**
 * Convert a JS Date to Julian Day Number (JDN).
 * Reference epoch: J2000.0 = JD 2451545.0 = 2000-01-01 12:00 TT
 */
export function dateToJD(date = new Date()) {
  const ms = date instanceof Date ? date.getTime() : date;
  return ms / 86400000 + 2440587.5;
}

/**
 * Convert Julian Day Number back to a JS Date.
 */
export function jdToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

/**
 * Julian centuries since J2000.0 (T).
 * Most VSOP87 series use this as the time argument.
 */
export function julianCenturies(jd) {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Julian millennia since J2000.0 (tau).
 */
export function julianMillennia(jd) {
  return (jd - 2451545.0) / 365250.0;
}

// ─── Angle utilities ─────────────────────────────────────────────────────────

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function toRad(deg) { return deg * DEG; }
export function toDeg(rad) { return rad * RAD; }

/** Normalize angle to [0, 360). */
export function norm360(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Normalize angle to (-180, 180]. */
export function norm180(deg) {
  let d = norm360(deg);
  return d > 180 ? d - 360 : d;
}

/** Angular difference a - b, result in (-180, 180]. */
export function angleDiff(a, b) {
  return norm180(a - b);
}

// ─── Mean obliquity of the ecliptic ──────────────────────────────────────────

/**
 * Mean obliquity of the ecliptic (IAU 2006 formula), in degrees.
 * @param {number} T — Julian centuries since J2000.0
 */
export function meanObliquity(T) {
  // Laskar 1986 / IAU formula
  const eps0 = 23.0 + 26.0 / 60.0 + 21.448 / 3600.0;
  return (
    eps0
    - (4680.93 / 3600.0) * T
    - (1.55 / 3600.0) * T * T
    + (1999.25 / 3600.0) * T * T * T
    - (51.38 / 3600.0) * T * T * T * T
    - (249.67 / 3600.0) * T * T * T * T * T
    - (39.05 / 3600.0) * T * T * T * T * T * T
    + (7.12 / 3600.0) * T * T * T * T * T * T * T
    + (27.87 / 3600.0) * T * T * T * T * T * T * T * T
    + (5.79 / 3600.0) * T * T * T * T * T * T * T * T * T
    + (2.45 / 3600.0) * T * T * T * T * T * T * T * T * T * T
  );
}

// ─── Coordinate transforms ────────────────────────────────────────────────────

/**
 * Ecliptic → Equatorial conversion.
 * @param {number} lon  — ecliptic longitude (degrees)
 * @param {number} lat  — ecliptic latitude (degrees)
 * @param {number} eps  — obliquity (degrees)
 * @returns {{ ra: number, dec: number }} RA and Dec in degrees
 */
export function eclipticToEquatorial(lon, lat, eps) {
  const l = toRad(lon);
  const b = toRad(lat);
  const e = toRad(eps);

  const sinDec = Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l);
  const dec = Math.asin(sinDec);

  const y = Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e);
  const x = Math.cos(l);
  const ra = norm360(toDeg(Math.atan2(y, x)));

  return { ra, dec: toDeg(dec) };
}

/**
 * Equatorial → Horizontal (Altitude/Azimuth).
 * @param {number} ra   — Right Ascension (degrees)
 * @param {number} dec  — Declination (degrees)
 * @param {number} lst  — Local Sidereal Time (degrees)
 * @param {number} lat  — Observer latitude (degrees)
 * @returns {{ alt: number, az: number }}
 */
export function equatorialToHorizontal(ra, dec, lst, lat) {
  const H = toRad(norm360(lst - ra));   // hour angle
  const d = toRad(dec);
  const phi = toRad(lat);

  const sinAlt = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(H);
  const alt = toDeg(Math.asin(sinAlt));

  const cosAz = (Math.sin(d) - Math.sin(phi) * sinAlt) / (Math.cos(phi) * Math.cos(toRad(alt)));
  let az = toDeg(Math.acos(Math.max(-1, Math.min(1, cosAz))));
  if (Math.sin(H) > 0) az = 360 - az;

  return { alt, az };
}

// ─── Greenwich Mean Sidereal Time ─────────────────────────────────────────────

/**
 * Greenwich Mean Sidereal Time (GMST) in degrees.
 * @param {number} jd — Julian Day Number
 */
export function gmst(jd) {
  const T = julianCenturies(jd);
  let gmstDeg = 280.46061837
    + 360.98564736629 * (jd - 2451545.0)
    + 0.000387933 * T * T
    - T * T * T / 38710000;
  return norm360(gmstDeg);
}

/**
 * Local Sidereal Time in degrees.
 * @param {number} jd  — Julian Day
 * @param {number} lon — Observer longitude (degrees, East positive)
 */
export function lst(jd, lon) {
  return norm360(gmst(jd) + lon);
}

// ─── Zodiac sign from longitude ───────────────────────────────────────────────

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

/**
 * Return zodiac sign info for a given ecliptic longitude.
 * @param {number} lon — ecliptic longitude [0, 360)
 */
export function zodiacSign(lon) {
  const l = norm360(lon);
  const idx = Math.floor(l / 30);
  const deg = l - idx * 30;
  const min = Math.floor((deg % 1) * 60);
  return {
    sign: SIGNS[idx],
    symbol: SIGN_SYMBOLS[idx],
    index: idx,
    degree: Math.floor(deg),
    minute: min,
    label: `${Math.floor(deg)}°${min.toString().padStart(2, '0')}' ${SIGNS[idx]}`,
  };
}

export const SIGN_RULERS = {
  Aries: { traditional: 'mars', modern: 'mars' },
  Taurus: { traditional: 'venus', modern: 'venus' },
  Gemini: { traditional: 'mercury', modern: 'mercury' },
  Cancer: { traditional: 'moon', modern: 'moon' },
  Leo: { traditional: 'sun', modern: 'sun' },
  Virgo: { traditional: 'mercury', modern: 'mercury' },
  Libra: { traditional: 'venus', modern: 'venus' },
  Scorpio: { traditional: 'mars', modern: 'pluto' },
  Sagittarius: { traditional: 'jupiter', modern: 'jupiter' },
  Capricorn: { traditional: 'saturn', modern: 'saturn' },
  Aquarius: { traditional: 'saturn', modern: 'uranus' },
  Pisces: { traditional: 'jupiter', modern: 'neptune' },
};

export { SIGNS, SIGN_SYMBOLS };

// ─── Self-test ────────────────────────────────────────────────────────────────

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('astronomy.js')) {
  const now = new Date();
  const jd = dateToJD(now);
  const T = julianCenturies(jd);
  const eps = meanObliquity(T);

  console.log('=== astronomy.js self-test ===');
  console.log(`Current time : ${now.toISOString()}`);
  console.log(`Julian Day   : ${jd.toFixed(5)}`);
  console.log(`T (centuries): ${T.toFixed(8)}`);
  console.log(`Obliquity    : ${eps.toFixed(6)}°`);
  console.log(`GMST         : ${gmst(jd).toFixed(4)}°`);

  // Test zodiac
  console.log('\nZodiac positions:');
  for (let i = 0; i < 360; i += 30) {
    const z = zodiacSign(i);
    console.log(`  ${i.toString().padStart(3)}° → ${z.symbol} ${z.sign}`);
  }
}
