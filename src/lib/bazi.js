/**
 * src/lib/bazi.js
 *
 * ACCURATE BaZi (Four Pillars of Destiny) calculation engine.
 *
 * Key corrections over the prior version:
 *   1. Month Pillar driven by Swiss Ephemeris solar longitude (Solar Terms),
 *      not Gregorian calendar month.
 *   2. Hour Pillar uses True Local Solar Time (TLST), accounting for both
 *      the longitude offset from the standard meridian AND the Equation of Time.
 *   3. Day Pillar boundary at 23:00 TLST (start of 子時), not UTC midnight.
 *   4. Luck Pillar start age calculated via actual solar-term distance in days
 *      (1 day = 1/3 year = ~4 months), not the flat "10, 20, 30…" approximation.
 *
 * Dependencies: src/lib/swe.js (already in the project).
 */

import { initSwe } from './swe.js';

// ─── Stem / Branch / Element Tables ──────────────────────────────────────────

export const STEMS = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
export const BRANCHES = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
export const ANIMALS  = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];

export const STEM_ELEMENTS = {
  Jia:'Wood', Yi:'Wood', Bing:'Fire', Ding:'Fire',
  Wu:'Earth', Ji:'Earth', Geng:'Metal', Xin:'Metal',
  Ren:'Water', Gui:'Water'
};

export const STEM_POLARITY = {
  Jia:'+', Yi:'-', Bing:'+', Ding:'-', Wu:'+',
  Ji:'-', Geng:'+', Xin:'-', Ren:'+', Gui:'-'
};

// Branch hidden stems: [main qi, middle qi (opt), residual qi (opt)]
export const HIDDEN_STEMS = {
  Zi:   ['Gui'],
  Chou: ['Ji','Xin','Gui'],
  Yin:  ['Jia','Bing','Wu'],
  Mao:  ['Yi'],
  Chen: ['Wu','Yi','Gui'],
  Si:   ['Bing','Geng','Wu'],
  Wu:   ['Ding','Ji'],
  Wei:  ['Ji','Ding','Yi'],
  Shen: ['Geng','Ren','Wu'],
  You:  ['Xin'],
  Xu:   ['Wu','Xin','Ding'],
  Hai:  ['Ren','Jia']
};

// ─── Solar Term boundaries for Month Pillar ───────────────────────────────────
// The 12 Month-Pillar boundaries (the 节 Jie) in solar longitude order:
// Lichun(315)→Yin, Jingzhe(345)→Mao, Qingming(15)→Chen,
// Lixia(45)→Si, Mangzhong(75)→Wu, Xiaoshu(105)→Wei,
// Liqiu(135)→Shen, Bailu(165)→You, Hanlu(195)→Xu,
// Lidong(225)→Hai, Daxue(255)→Zi*, Xiaohan(285)→Chou*
// (*These cross calendar-year boundaries but are still within the same BaZi month system)
const MONTH_TERM_LONGITUDES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];

// ─── SWE helpers ─────────────────────────────────────────────────────────────

let _sweJulday = null; // cached cwrap

function dateToJD(mod, date) {
  if (!_sweJulday) {
    _sweJulday = mod.cwrap('swe_julday_wrap', 'number',
      ['number','number','number','number','number']);
  }
  return _sweJulday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600,
    1 // Gregorian
  );
}

/**
 * Get the Sun's ecliptic longitude for a UTC JS Date via SWE WASM.
 * Returns degrees 0–360.
 */
async function getSunLongitude(utcDate) {
  const mod    = await initSwe();
  const jd     = dateToJD(mod, utcDate);
  const flags  = 4 | 256; // SEFLG_MOSEPH | SEFLG_SPEED
  const xxPtr  = mod._malloc(6 * 8);
  const errPtr = mod._malloc(256);

  mod.ccall('swe_calc_ut_wrap', 'number',
    ['number','number','number','number','number'],
    [jd, 0, flags, xxPtr, errPtr]  // body 0 = Sun
  );

  const lon = mod.getValue(xxPtr, 'double');
  mod._free(xxPtr);
  mod._free(errPtr);
  return ((lon % 360) + 360) % 360;
}

/**
 * Binary-search for the UTC Date when the Sun reaches targetLon (±0.0001°).
 * Handles the 0°/360° wrap correctly.
 */
async function findSolarTermDate(targetLon, startDate, endDate) {
  let lo = startDate.getTime();
  let hi = endDate.getTime();

  for (let i = 0; i < 52; i++) {
    const mid  = (lo + hi) / 2;
    const lon  = await getSunLongitude(new Date(mid));
    // Angular distance with direction: positive = targetLon is ahead of current lon
    const diff = ((targetLon - lon + 540) % 360) - 180;
    if (Math.abs(diff) < 0.0001) break;
    if (diff > 0) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

// ─── Equation of Time ─────────────────────────────────────────────────────────

function getDayOfYear(date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 0));
  return Math.floor((date - start) / 86400000);
}

/**
 * Equation of Time in MINUTES (Fourier approximation, ±30s accuracy).
 * Positive = clock noon arrives before solar noon.
 */
function equationOfTimeMinutes(date) {
  const B = (2 * Math.PI / 365) * (getDayOfYear(date) - 81);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// ─── True Local Solar Time ────────────────────────────────────────────────────

/**
 * Convert a UTC JS Date to True Local Solar Time in decimal hours.
 * TLST = UTC_hours + (longitude / 15) + (EqT / 60)
 *
 * @param {Date}   utcDate - Moment in UTC
 * @param {number} lonDeg  - Geographic longitude (decimal °, E positive)
 */
function getTLST(utcDate, lonDeg) {
  const utcH = utcDate.getUTCHours()
    + utcDate.getUTCMinutes() / 60
    + utcDate.getUTCSeconds() / 3600;
  return ((utcH + lonDeg / 15 + equationOfTimeMinutes(utcDate) / 60) % 24 + 24) % 24;
}

// ─── Pillar helpers ───────────────────────────────────────────────────────────

function getPillar(stemIdx, branchIdx) {
  const stem   = STEMS[((stemIdx   % 10) + 10) % 10];
  const branch = BRANCHES[((branchIdx % 12) + 12) % 12];
  return {
    stem,
    branch,
    animal:   ANIMALS[BRANCHES.indexOf(branch)],
    element:  STEM_ELEMENTS[stem],
    polarity: STEM_POLARITY[stem],
    label:    `${stem} ${branch}`
  };
}

// ─── Month Pillar via Solar Terms ─────────────────────────────────────────────

/**
 * Determine Month Pillar from the Sun's current ecliptic longitude.
 *
 * Month stem formula (Five-Rat Escape rule):
 *   Jia/Ji year → Yin month = Bing stem (index 2)
 *   Yi/Geng     → Wu (4)
 *   Bing/Xin    → Geng (6)
 *   Ding/Ren    → Ren (8)
 *   Wu/Gui      → Jia (0)
 */
function getMonthPillar(sunLongitude, yearStemIndex) {
  let monthIdx = 0; // default: Yin month

  for (let i = 0; i < 12; i++) {
    const termLon = MONTH_TERM_LONGITUDES[i];
    const nextLon = MONTH_TERM_LONGITUDES[(i + 1) % 12];

    // Wrap case: term range crosses 0° (e.g., termLon=345 nextLon=15)
    if (termLon > nextLon) {
      let sn = sunLongitude;
      if (sn < nextLon) sn += 360; // fold the early part up
      if (termLon <= sn) { monthIdx = i; break; }
    } else {
      if (sunLongitude >= termLon && (i === 11 || sunLongitude < MONTH_TERM_LONGITUDES[i + 1])) {
        monthIdx = i; break;
      }
    }
  }

  // Branch: Yin=2, Mao=3, … offset by 2 from month index
  const branchIdx = (monthIdx + 2) % 12;

  // Stem: Five-Rat Escape (五鼠遁年起月法)
  const MONTH_STEM_STARTS = [2, 4, 6, 8, 0]; // per year-stem group mod 5
  const stemIdx = (MONTH_STEM_STARTS[yearStemIndex % 5] + monthIdx) % 10;

  return { pillar: getPillar(stemIdx, branchIdx), monthIdx, monthStemIdx: stemIdx, monthBranchIdx: branchIdx };
}

// ─── Hour Pillar via TLST ─────────────────────────────────────────────────────

/**
 * Two-hour segment index (0=Zi 23:00–01:00, 1=Chou 01:00–03:00, …)
 * Zi straddles midnight: 23:00–00:00 and 00:00–01:00 belong to the same Zi hour
 * but to DIFFERENT Day Pillars (the day changes at 23:00).
 */
function getHourIndex(tlstHours) {
  return Math.floor(((tlstHours - 23 + 24) % 24) / 2);
}

/**
 * Hour Stem via Five-Tiger Escape rule applied to Day Stem:
 *   Jia/Ji day  → Zi hour = Jia stem (0)
 *   Yi/Geng     → Bing (2)
 *   Bing/Xin    → Wu  (4)
 *   Ding/Ren    → Geng (6)
 *   Wu/Gui      → Ren  (8)
 */
function getHourPillar(dayStemIndex, hourBranchIdx) {
  const HOUR_STEM_STARTS = [0, 2, 4, 6, 8];
  const stemIdx = (HOUR_STEM_STARTS[dayStemIndex % 5] + hourBranchIdx) % 10;
  return getPillar(stemIdx, hourBranchIdx);
}

// ─── Day Pillar ───────────────────────────────────────────────────────────────

/**
 * The BaZi day changes at 23:00 TLST (start of Zi hour).
 * Anchor: 2000-01-07 UTC is confirmed 甲子 (Jia Zi) by multiple BaZi references.
 */
function getDayPillarInfo(utcDate, lonDeg) {
  const tlst = getTLST(utcDate, lonDeg);

  // If current TLST < 23:00, we are still in yesterday's BaZi day.
  let baziDayDate = new Date(utcDate);
  if (tlst < 23) baziDayDate = new Date(utcDate.getTime() - 86400000);

  const anchor   = Date.UTC(2000, 0, 7); // Jan 7 2000 = Jia Zi (cycle index 0)
  const daysDiff = Math.round(
    (Date.UTC(baziDayDate.getUTCFullYear(), baziDayDate.getUTCMonth(), baziDayDate.getUTCDate()) - anchor)
    / 86400000
  );

  const cycleIdx  = ((daysDiff % 60) + 60) % 60;
  return {
    pillar:  getPillar(cycleIdx % 10, cycleIdx % 12),
    stemIdx: cycleIdx % 10,
    tlst
  };
}

// ─── Luck Pillar Start Age ────────────────────────────────────────────────────

/**
 * Distance (in days) to the nearest solar-term boundary.
 * Returns a positive number of days.
 * isForward=true → count forward to next term; false → count back to prior term.
 */
async function getLuckPillarStartAge(birthUtc, isForward) {
  const windowMs   = 46 * 86400000; // ±46 days covers one full solar term gap
  const startSearch = isForward ? birthUtc : new Date(birthUtc.getTime() - windowMs);
  const endSearch   = isForward ? new Date(birthUtc.getTime() + windowMs) : birthUtc;

  const sunAtBirth = await getSunLongitude(birthUtc);

  let nearestMs = Infinity;
  let nearestTerm = null;

  for (const targetLon of MONTH_TERM_LONGITUDES) {
    // Skip terms that are more than ~50° away (unreachable in 46 days)
    const angularDist = isForward
      ? ((targetLon - sunAtBirth + 360) % 360)
      : ((sunAtBirth - targetLon + 360) % 360);
    if (angularDist > 50) continue;

    try {
      const termDate = await findSolarTermDate(targetLon, startSearch, endSearch);
      const distMs   = Math.abs(termDate.getTime() - birthUtc.getTime());
      if (distMs < nearestMs) {
        nearestMs   = distMs;
        nearestTerm = termDate;
      }
    } catch { /* term not in window */ }
  }

  if (!nearestTerm || nearestMs === Infinity) return 1; // fallback: 1 year

  // Traditional: 3 days = 1 year of luck pillar life
  return nearestMs / (3 * 86400000);
}

// ─── Main Export: calculateBaZi ───────────────────────────────────────────────

/**
 * Calculate the complete Four Pillars chart.
 *
 * @param {Date}   localDate  - Birth date/time in local clock time
 * @param {string} gender     - 'male' | 'female'
 * @param {number} lonDeg     - Geographic longitude (decimal °, E positive). Default 0.
 * @param {number} utcOffset  - UTC offset in hours (e.g., +8 for Philippines). Default 0.
 * @returns {Promise<BaziChart>}
 */
export async function calculateBaZi(localDate, gender = 'male', lonDeg = 0, utcOffset = 0) {
  const utcDate = new Date(localDate.getTime() - utcOffset * 3600000);

  // 1. Sun longitude for month determination
  const sunLon = await getSunLongitude(utcDate);

  // 2. Year Pillar (anchored to 1984 = Jia Zi)
  const utcYear    = utcDate.getUTCFullYear();
  const yearOffset = ((utcYear - 1984) % 60 + 60) % 60;
  const yearPillar = getPillar(yearOffset % 10, yearOffset % 12);

  // 3. Month Pillar (Solar Term boundary via SWE)
  const { pillar: monthPillar, monthIdx, monthStemIdx, monthBranchIdx } =
    getMonthPillar(sunLon, yearOffset % 10);

  // 4. Day Pillar (23:00 TLST boundary)
  const { pillar: dayPillar, stemIdx: dayStemIdx, tlst } = getDayPillarInfo(utcDate, lonDeg);

  // 5. Hour Pillar (TLST two-hour segments)
  const hourIdx   = getHourIndex(tlst);
  const hourPillar = getHourPillar(dayStemIdx, hourIdx);

  // 6. Luck Pillar direction
  const isYangYear = (yearOffset % 10) % 2 === 0; // Yang year = even stem index
  const isForward  = gender === 'male' ? isYangYear : !isYangYear;

  // 7. Luck Pillar start age (async solar-term calculation)
  const startAge = await getLuckPillarStartAge(utcDate, isForward);

  // 8. Build 8 Luck Pillars (10-year cycles)
  const luckPillars = [];
  for (let i = 1; i <= 8; i++) {
    const delta  = isForward ? i : -i;
    const sIdx   = ((monthStemIdx   + delta) % 10 + 10) % 10;
    const bIdx   = ((monthBranchIdx + delta) % 12 + 12) % 12;
    const ageStart = startAge + (i - 1) * 10;
    luckPillars.push({
      ageStart: parseFloat(ageStart.toFixed(1)),
      ageEnd:   parseFloat((ageStart + 10).toFixed(1)),
      pillar:   getPillar(sIdx, bIdx)
    });
  }

  return {
    year:          yearPillar,
    month:         monthPillar,
    day:           dayPillar,
    hour:          hourPillar,
    luckPillars,
    isForward,
    startAge:      parseFloat(startAge.toFixed(2)),
    tlstAtBirth:   parseFloat(tlst.toFixed(4)),
    sunLonAtBirth: parseFloat(sunLon.toFixed(4)),
    summary: `Day Master: ${dayPillar.element} ${dayPillar.polarity} (${dayPillar.stem})`
  };
}

/**
 * Current year/month BaZi pillars for transit display.
 * Uses the current moment with longitude 0 (calendar-level accuracy is sufficient).
 * @returns {Promise<{year, month}>}
 */
export async function getCurrentBazi() {
  const now     = new Date();
  const sunLon  = await getSunLongitude(now);
  const yearOff = ((now.getUTCFullYear() - 1984) % 60 + 60) % 60;
  const { pillar: monthPillar } = getMonthPillar(sunLon, yearOff % 10);
  return {
    year:  getPillar(yearOff % 10, yearOff % 12),
    month: monthPillar
  };
}
