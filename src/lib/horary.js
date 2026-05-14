// src/lib/horary.js
//
// Horary astrology engine using William Lilly's traditional system.
// Casts a chart for the exact moment a question is asked.
//
// Usage:
//   import { castHoraryChart, judgeChart } from '@/lib/horary';
//
//   const chart = castHoraryChart('Will I get the job?', new Date(), 13.14, 123.74);
//   const judgment = judgeChart(chart);

import { getPlanetPositions, getZodiacInfo } from './ephemeris.js';

// ─── Traditional rulerships (Lilly) ──────────────────────────────────────────
// No outer planets as house rulers — Uranus/Neptune/Pluto not used in horary

const TRADITIONAL_RULERS = {
  Aries:       'mars',
  Taurus:      'venus',
  Gemini:      'mercury',
  Cancer:      'moon',
  Leo:         'sun',
  Virgo:       'mercury',
  Libra:       'venus',
  Scorpio:     'mars',
  Sagittarius: 'jupiter',
  Capricorn:   'saturn',
  Aquarius:    'saturn',
  Pisces:      'jupiter',
};

// Exaltations
const EXALTATIONS = {
  sun:     'Aries',
  moon:    'Taurus',
  mercury: 'Virgo',
  venus:   'Pisces',
  mars:    'Capricorn',
  jupiter: 'Cancer',
  saturn:  'Libra',
};

// Detriments
const DETRIMENTS = {
  sun:     'Aquarius',
  moon:    'Capricorn',
  mercury: ['Sagittarius', 'Pisces'],
  venus:   ['Aries', 'Scorpio'],
  mars:    ['Taurus', 'Libra'],
  jupiter: ['Gemini', 'Virgo'],
  saturn:  ['Cancer', 'Leo'],
};

// Falls
const FALLS = {
  sun:     'Libra',
  moon:    'Scorpio',
  mercury: 'Pisces',
  venus:   'Virgo',
  mars:    'Cancer',
  jupiter: 'Capricorn',
  saturn:  'Aries',
};

// House significations for question routing
const HOUSE_TOPICS = {
  1:  ['self', 'querent', 'body', 'appearance', 'vitality', 'character'],
  2:  ['money', 'finances', 'possessions', 'income', 'resources', 'wealth'],
  3:  ['siblings', 'communication', 'short travel', 'neighbors', 'messages', 'contracts'],
  4:  ['home', 'family', 'father', 'property', 'roots', 'land', 'end of matter'],
  5:  ['children', 'romance', 'pleasure', 'creativity', 'gambling', 'fun'],
  6:  ['health', 'illness', 'work', 'service', 'employees', 'pets', 'daily routine'],
  7:  ['partner', 'marriage', 'relationships', 'open enemies', 'other person', 'contracts'],
  8:  ['death', 'transformation', 'inheritance', 'debt', 'taxes', 'partner money', 'fear'],
  9:  ['travel', 'philosophy', 'religion', 'higher education', 'foreigners', 'law', 'dreams'],
  10: ['career', 'reputation', 'status', 'authority', 'mother', 'public life', 'achievement'],
  11: ['friends', 'groups', 'hopes', 'wishes', 'allies', 'social circle'],
  12: ['hidden enemies', 'isolation', 'self-undoing', 'secrets', 'karma', 'spirituality'],
};

// ─── Julian Day & Sidereal Time ───────────────────────────────────────────────

function julianDay(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate()
    + date.getUTCHours()   / 24
    + date.getUTCMinutes() / 1440
    + date.getUTCSeconds() / 86400;
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716))
       + Math.floor(30.6001 * (m + 1))
       + d + B - 1524.5;
}

/**
 * Greenwich Mean Sidereal Time in degrees.
 * Meeus Ch. 12, accurate to ~0.1s.
 */
function greenwichSiderealTime(JD) {
  const T  = (JD - 2451545.0) / 36525;
  const T2 = T * T;
  const T3 = T2 * T;
  // GMST in seconds
  let gmst = 280.46061837
           + 360.98564736629 * (JD - 2451545)
           + 0.000387933 * T2
           - T3 / 38710000;
  return ((gmst % 360) + 360) % 360;
}

/**
 * Local Sidereal Time in degrees.
 */
function localSiderealTime(JD, lngDeg) {
  const gmst = greenwichSiderealTime(JD);
  return ((gmst + lngDeg) % 360 + 360) % 360;
}

/**
 * Ascendant longitude from LST and geographic latitude.
 * Standard formula: tan(ASC) = -cos(RAMC) / (sin(ε)·tan(φ) + cos(ε)·sin(RAMC))
 */
function calcAscendant(lstDeg, latDeg) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  const ramc = toRad(lstDeg);   // Right Ascension of Midheaven in radians
  const lat  = toRad(latDeg);
  const eps  = toRad(23.4397);  // obliquity of ecliptic (approx)

  const y = -Math.cos(ramc);
  const x =  Math.sin(eps) * Math.tan(lat) + Math.cos(eps) * Math.sin(ramc);

  let asc = toDeg(Math.atan2(y, x));

  // Correct quadrant based on RAMC
  if (lstDeg >= 0   && lstDeg < 90)  asc = (asc + 360) % 360;
  if (lstDeg >= 90  && lstDeg < 180) asc = (asc + 180) % 360;
  if (lstDeg >= 180 && lstDeg < 270) asc = (asc + 180) % 360;
  if (lstDeg >= 270 && lstDeg < 360) asc = (asc + 360) % 360;

  return ((asc % 360) + 360) % 360;
}

/**
 * Midheaven (MC) longitude — simply the LST converted to ecliptic.
 */
function calcMidheaven(lstDeg) {
  // MC = atan(tan(RAMC) / cos(ε))
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;
  const ramc  = toRad(lstDeg);
  const eps   = toRad(23.4397);
  let mc = toDeg(Math.atan(Math.tan(ramc) / Math.cos(eps)));
  // Quadrant correction
  if (lstDeg >= 0   && lstDeg < 180) mc = (mc + 360) % 360;
  if (lstDeg >= 180 && lstDeg < 360) mc = (mc + 180) % 360;
  return ((mc % 360) + 360) % 360;
}

// ─── House system (Regiomontanus) ─────────────────────────────────────────────

function calcRegiomontanusHouses(lstDeg, latDeg) {
  const toRad = (d) => d * Math.PI / 180;
  const toDeg = (r) => r * 180 / Math.PI;

  const ramc = toRad(lstDeg);
  const lat  = toRad(latDeg);
  const eps  = toRad(23.4392911); 

  const houseCusps = {};

  const hOffsets = {
    10: 0, 11: 30, 12: 60, 1: 90, 2: 120, 3: 150
  };

  for (let i of [10, 11, 12, 1, 2, 3]) {
    const H = toRad(hOffsets[i]);
    const alpha = ramc + H;
    const y = Math.sin(alpha);
    const x = Math.cos(alpha) * Math.cos(eps) - Math.tan(lat) * Math.sin(H) * Math.sin(eps);
    let cuspLon = toDeg(Math.atan2(y, x));
    cuspLon = ((cuspLon % 360) + 360) % 360;
    
    houseCusps[i] = cuspLon;
    const oppositeCusp = i < 7 ? i + 6 : i - 6;
    houseCusps[oppositeCusp] = ((cuspLon + 180) % 360);
  }

  return { houseCusps };
}

/**
 * Determine which house a planet is in using exact cusps.
 */
function getPlanetHouse(planetLon, houseCusps) {
  for (let h = 1; h <= 12; h++) {
    const nextH = h === 12 ? 1 : h + 1;
    const start = houseCusps[h];
    const end = houseCusps[nextH];
    if (start < end) {
      if (planetLon >= start && planetLon < end) return h;
    } else {
      if (planetLon >= start || planetLon < end) return h;
    }
  }
  return 1;
}

// ─── Dignities ────────────────────────────────────────────────────────────────

function getDignity(planet, sign) {
  if (!planet || !sign) return 'peregrine';

  const ruler = TRADITIONAL_RULERS[sign];
  if (ruler === planet) return 'domicile';

  if (EXALTATIONS[planet] === sign) return 'exaltation';

  const det = DETRIMENTS[planet];
  if (Array.isArray(det) ? det.includes(sign) : det === sign) return 'detriment';

  if (FALLS[planet] === sign) return 'fall';

  return 'peregrine';
}

// ─── Aspect detection for horary ─────────────────────────────────────────────

const HORARY_ASPECTS = [
  { name: 'conjunction', angle: 0,   orb: 8 },
  { name: 'sextile',     angle: 60,  orb: 6 },
  { name: 'square',      angle: 90,  orb: 8 },
  { name: 'trine',       angle: 120, orb: 8 },
  { name: 'opposition',  angle: 180, orb: 8 },
];

function angularDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function getHoraryAspects(positions) {
  const planets = Object.keys(positions).filter(p =>
    !['uranus','neptune','pluto', 'nnode', 'snode', 'fortune'].includes(p) // traditional only
  );
  const aspects = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      const pos1 = positions[p1];
      const pos2 = positions[p2];

      const dist1 = angularDist(pos1.longitude, pos2.longitude);

      for (const asp of HORARY_ASPECTS) {
        const orb1 = Math.abs(dist1 - asp.angle);
        if (orb1 <= asp.orb) {
          // Applying check — are they getting closer to the exact aspect?
          const lon1Tom = pos1.longitude + (pos1.dailyMotion || 0);
          const lon2Tom = pos2.longitude + (pos2.dailyMotion || 0);
          const dist2 = angularDist(lon1Tom, lon2Tom);
          const orb2 = Math.abs(dist2 - asp.angle);

          const applying = orb2 < orb1;
          const faster = Math.abs(pos1.dailyMotion || 0) > Math.abs(pos2.dailyMotion || 0) ? p1 : p2;

          aspects.push({
            planet1:  p1,
            planet2:  p2,
            aspect:   asp.name,
            angle:    asp.angle,
            orb:      parseFloat(orb1.toFixed(2)),
            applying,
            faster,
          });
        }
      }
    }
  }
  return aspects;
}

// ─── Void of Course Moon ──────────────────────────────────────────────────────

/**
 * Moon is Void of Course if it makes no more major aspects
 * before leaving its current sign (traditional 7 planets only).
 */
function isVoidOfCourse(moonLon, positions) {
  const moonSign     = Math.floor(moonLon / 30);
  const signEnd      = (moonSign + 1) * 30; // end of current sign
  const moonRemaining = signEnd - moonLon;  // degrees left in sign

  // Average daily motions
  const DAILY = {
    sun: 0.9856, moon: 13.176, mercury: 1.3833, venus: 1.2,
    mars: 0.524, jupiter: 0.0831, saturn: 0.0335,
  };

  const trad = ['sun','mercury','venus','mars','jupiter','saturn'];

  for (const planet of trad) {
    if (!positions[planet]) continue;
    const dist = angularDist(moonLon, positions[planet].longitude);
    for (const asp of HORARY_ASPECTS) {
      const orb = Math.abs(dist - asp.angle);
      if (orb <= asp.orb) {
        // Already in aspect — not VOC based on this planet
        return false;
      }
      // Will Moon reach this aspect before leaving the sign?
      const moonSpeed   = DAILY.moon;
      const planetSpeed = DAILY[planet] || 0;
      const relSpeed    = moonSpeed - planetSpeed;
      if (relSpeed <= 0) continue;
      const degToExact  = asp.angle - dist; // rough
      if (degToExact > 0 && degToExact < moonRemaining) return false;
    }
  }
  return true;
}

// ─── Question → house mapping ─────────────────────────────────────────────────

/**
 * Guess the relevant house for a question based on keywords.
 * Returns { house: number, confidence: 'high'|'medium'|'low', topic: string }
 */
function guessQuestionHouse(question) {
  const q = question.toLowerCase();

  const matchers = [
    { house: 7,  keywords: ['relationship','partner','marriage','boyfriend','girlfriend','wife','husband','love','date','together','they','them','someone'], topic: 'relationships' },
    { house: 10, keywords: ['job','career','work','promotion','hired','fired','business','profession','boss','company','success','achieve'], topic: 'career' },
    { house: 2,  keywords: ['money','finances','salary','income','afford','rich','wealth','debt','loan','financial','invest'], topic: 'finances' },
    { house: 5,  keywords: ['pregnant','baby','child','children','romance','date','fun','creative','win','lottery'], topic: 'romance & children' },
    { house: 4,  keywords: ['house','home','move','property','real estate','apartment','family','father','land'], topic: 'home & property' },
    { house: 6,  keywords: ['health','sick','illness','recover','heal','doctor','treatment','disease','symptom','pet','dog','cat'], topic: 'health' },
    { house: 9,  keywords: ['travel','trip','abroad','foreign','university','study','degree','legal','court','law','spiritual'], topic: 'travel & education' },
    { house: 8,  keywords: ['death','die','inherit','will','estate','surgery','transformation','fear','debt','owe'], topic: 'transformation & death' },
    { house: 3,  keywords: ['sibling','brother','sister','message','contract','sign','communicate','short trip','neighbor','exam'], topic: 'communication' },
    { house: 11, keywords: ['friend','group','team','ally','hope','wish','dream','social','club','network'], topic: 'friends & hopes' },
    { house: 12, keywords: ['secret','hidden','alone','isolated','karma','past','subconscious','hospital','prison','enemy'], topic: 'hidden matters' },
  ];

  for (const m of matchers) {
    if (m.keywords.some(kw => q.includes(kw))) {
      return { house: m.house, confidence: 'high', topic: m.topic };
    }
  }

  // Default — 7th house (the other person / outcome)
  return { house: 7, confidence: 'low', topic: 'general outcome' };
}

// ─── Radicality check ─────────────────────────────────────────────────────────

/**
 * A chart is radical (fit to judge) if:
 * - Ascendant is not in the first 3° or last 27°+ (too early/late degrees)
 * - Saturn is not in the 7th house (undermines the querent)
 * - Moon is not Void of Course (usually — VOC has its own meaning)
 */
function checkRadicality(ascLon, saturnHouse, isVOC, ascRuler, planets) {
  const issues   = [];
  const ascDeg   = ascLon % 30;

  if (ascDeg < 3) {
    issues.push('Ascendant is in early degrees (< 3°) — the matter may be too new or not yet ready to judge.');
  }
  if (ascDeg > 27) {
    issues.push('Ascendant is in late degrees (> 27°) — the matter may be too far along; outcomes are already set.');
  }
  if (saturnHouse === 7) {
    issues.push('Saturn in the 7th — the astrologer (or method) may not be reliable for this question.');
  }
  if (ascRuler && planets[ascRuler]) {
    if (planets[ascRuler].isCombust) {
      issues.push(`Ascendant Ruler (${ascRuler}) is Combust — the querent is blind to the situation, powerless, or in danger.`);
    }
    if (planets[ascRuler].isRetrograde) {
      issues.push(`Ascendant Ruler (${ascRuler}) is Retrograde — the querent may retreat, change their mind, or withdraw from the matter.`);
    }
  }

  const radical = issues.length === 0;
  return {
    radical,
    issues,
    note: radical
      ? 'Chart is radical — fit to judge.'
      : 'Chart has radicality concerns — interpret carefully.',
  };
}

// ─── Planet data enrichment ───────────────────────────────────────────────────

const PLANET_META = {
  sun:     { label: 'Sun',     glyph: '☉', traditional: true  },
  moon:    { label: 'Moon',    glyph: '☽', traditional: true  },
  mercury: { label: 'Mercury', glyph: '☿', traditional: true  },
  venus:   { label: 'Venus',   glyph: '♀', traditional: true  },
  mars:    { label: 'Mars',    glyph: '♂', traditional: true  },
  jupiter: { label: 'Jupiter', glyph: '♃', traditional: true  },
  saturn:  { label: 'Saturn',  glyph: '♄', traditional: true  },
  uranus:  { label: 'Uranus',  glyph: '♅', traditional: false },
  neptune: { label: 'Neptune', glyph: '♆', traditional: false },
  pluto:   { label: 'Pluto',   glyph: '♇', traditional: false },
  fortune: { label: 'Fortune', glyph: '⊗', traditional: true  },
  nnode:   { label: 'N. Node', glyph: '☊', traditional: true  },
};

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Cast a horary chart.
 *
 * @param {string} question  — the question being asked
 * @param {Date}   date      — moment the question is asked (defaults to now)
 * @param {number} lat       — geographic latitude of querent
 * @param {number} lng       — geographic longitude of querent
 * @returns {Object} full horary chart
 */
export function castHoraryChart(question, date = new Date(), lat = 0, lng = 0) {
  const JD  = julianDay(date);
  const lst = localSiderealTime(JD, lng);
  const asc = calcAscendant(lst, lat);
  const mc  = calcMidheaven(lst);

  // Planet positions (pass asc to calculate Part of Fortune)
  const rawPositions = getPlanetPositions(date, asc, { lat, lon: lng });
  
  // Tomorrow's positions for daily motion
  const tomorrow = new Date(date.getTime() + 86400000);
  const rawPositionsTomorrow = getPlanetPositions(tomorrow, asc, { lat, lon: lng });

  // Calculate Regiomontanus Houses
  const { houseCusps } = calcRegiomontanusHouses(lst, lat);
  houseCusps[1] = asc;
  houseCusps[10] = mc;
  houseCusps[7] = (asc + 180) % 360;
  houseCusps[4] = (mc + 180) % 360;

  const planets = {};

  for (const [planet, lon] of Object.entries(rawPositions)) {
    const zodiac  = getZodiacInfo(lon);
    const house   = getPlanetHouse(lon, houseCusps);
    const dignity = getDignity(planet, zodiac.sign);
    const meta    = PLANET_META[planet] || {};
    
    let diff = (rawPositionsTomorrow[planet] || lon) - lon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const isRetrograde = diff < 0 && !['sun', 'moon', 'nnode', 'snode', 'fortune'].includes(planet);

    let isCombust = false;
    let isCazimi = false;
    if (planet !== 'sun' && rawPositions.sun !== undefined && !['nnode', 'snode', 'fortune'].includes(planet)) {
      let sunDiff = Math.abs(lon - rawPositions.sun);
      if (sunDiff > 180) sunDiff = 360 - sunDiff;
      if (sunDiff <= 0.2833) {
        isCazimi = true;
      } else if (sunDiff <= 8.5) {
        isCombust = true;
      }
    }

    planets[planet] = {
      longitude: lon,
      ...zodiac,
      house,
      dignity,
      isRetrograde,
      isCombust,
      isCazimi,
      label:       meta.label  || planet,
      glyph:       meta.glyph  || '?',
      traditional: meta.traditional !== false,
      dailyMotion: diff,
      ruler:       TRADITIONAL_RULERS[zodiac.sign] || null,
    };
  }

  // Ascendant info
  const ascZodiac  = getZodiacInfo(asc);
  const ascSign    = ascZodiac.sign;
  const ascRuler   = TRADITIONAL_RULERS[ascSign];

  // MC info
  const mcZodiac   = getZodiacInfo(mc);
  const mcSign     = mcZodiac.sign;
  const mcRuler    = TRADITIONAL_RULERS[mcSign];

  // Void of Course check
  const moonLon  = rawPositions.moon;
  const voc      = isVoidOfCourse(moonLon, planets);

  // Question → house
  const questionHouse = guessQuestionHouse(question);

  // Significators
  // Querent = Lord of Ascendant (+ Moon always co-significator)
  // Quesited = Lord of questioned house
  const quesitedHouseNum = questionHouse.house;
  const quesitedSignIdx  = Math.floor(houseCusps[quesitedHouseNum] / 30);
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                 'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  const quesitedSign  = SIGNS[quesitedSignIdx];
  const quesitedRuler = TRADITIONAL_RULERS[quesitedSign];

  // Aspects between planets
  const aspects = getHoraryAspects(planets);

  // Key aspects — between querent significator and quesited significator
  const keyAspects = aspects.filter(
    (a) =>
      (a.planet1 === ascRuler || a.planet2 === ascRuler ||
       a.planet1 === 'moon'   || a.planet2 === 'moon') &&
      (a.planet1 === quesitedRuler || a.planet2 === quesitedRuler)
  );

  // Saturn house (for radicality)
  const saturnHouse = planets.saturn?.house || 0;

  // Radicality
  const radicality = checkRadicality(asc, saturnHouse, voc, ascRuler, planets);

  return {
    question,
    date:       date.toISOString(),
    lat,
    lng,
    asc:        { longitude: asc, ...ascZodiac, ruler: ascRuler },
    mc:         { longitude: mc,  ...mcZodiac,  ruler: mcRuler  },
    lst,
    planets,
    houseCusps,
    aspects,
    keyAspects,
    voidOfCourse: voc,
    questionHouse,
    significators: {
      querent:  { planet: ascRuler, coSignificator: 'moon' },
      quesited: {
        planet:     quesitedRuler,
        house:      quesitedHouseNum,
        topic:      questionHouse.topic,
        sign:       quesitedSign,
      },
    },
    radicality,
  };
}

/**
 * Judge the horary chart — returns a structured verdict.
 *
 * @param {Object} chart — from castHoraryChart()
 * @returns {Object} judgment
 */
export function judgeChart(chart) {
  const { significators, keyAspects, voidOfCourse, radicality, planets } = chart;
  const queruentPlanet  = significators.querent.planet;
  const quesitedPlanet  = significators.quesited.planet;

  // ── Favorable indicators ──────────────────────────────────────────────────
  const favorable = [];
  const unfavorable = [];
  const neutral = [];

  // VOC Moon
  if (voidOfCourse) {
    unfavorable.push('Moon is Void of Course — the matter may come to nothing, or the situation resolves without intervention. "Nothing will come of the matter."');
  } else {
    favorable.push('Moon is not Void of Course — the matter is active and can develop.');
  }

  // Radicality
  if (!radicality.radical) {
    radicality.issues.forEach(i => unfavorable.push(i));
  } else {
    favorable.push('Chart is radical — fit to judge.');
  }

  // Key aspects between significators
  if (keyAspects.length > 0) {
    for (const asp of keyAspects) {
      const nature = ['conjunction','trine','sextile'].includes(asp.aspect) ? 'soft' : 'hard';
      if (nature === 'soft') {
        favorable.push(
          `${asp.planet1} and ${asp.planet2} form a ${asp.aspect} (${asp.orb.toFixed(1)}° orb${asp.applying ? ', applying' : ', separating'}) — ${asp.applying ? 'a favorable connection is developing' : 'a connection has recently completed'}.`
        );
      } else {
        unfavorable.push(
          `${asp.planet1} and ${asp.planet2} form a ${asp.aspect} (${asp.orb.toFixed(1)}° orb) — tension or obstacles between querent and the matter.`
        );
      }
    }
  } else {
    neutral.push('No direct aspect between the main significators — the outcome is unclear or may not develop as expected.');
  }

  // Dignity of querent significator
  if (queruentPlanet && planets[queruentPlanet]) {
    const dignity = planets[queruentPlanet].dignity;
    if (['domicile','exaltation'].includes(dignity)) {
      favorable.push(`Querent's significator (${queruentPlanet}) is in ${dignity} — the querent is strong and able to act.`);
    } else if (['detriment','fall'].includes(dignity)) {
      unfavorable.push(`Querent's significator (${queruentPlanet}) is in ${dignity} — the querent may be weakened, distracted, or acting against their own interests.`);
    }
  }

  // Dignity of quesited significator
  if (quesitedPlanet && planets[quesitedPlanet]) {
    const dignity = planets[quesitedPlanet].dignity;
    if (['domicile','exaltation'].includes(dignity)) {
      favorable.push(`Quesited significator (${quesitedPlanet}) is in ${dignity} — the thing sought is strong and attainable.`);
    } else if (['detriment','fall'].includes(dignity)) {
      unfavorable.push(`Quesited significator (${quesitedPlanet}) is in ${dignity} — the thing sought may be flawed, unavailable, or not what it appears.`);
    }
  }

  // Mutual Reception Check
  if (queruentPlanet && quesitedPlanet && planets[queruentPlanet] && planets[quesitedPlanet]) {
    const qSign = planets[queruentPlanet].sign;
    const tSign = planets[quesitedPlanet].sign;
    const rulerOfQ = TRADITIONAL_RULERS[qSign];
    const rulerOfT = TRADITIONAL_RULERS[tSign];

    if (rulerOfQ === quesitedPlanet && rulerOfT === queruentPlanet) {
      favorable.push(`Mutual Reception: Querent and Quesited are in each other's ruling signs. There is strong mutual desire and a high likelihood of coming together, even without a direct aspect.`);
    }
  }

  // Antiscia Check between significators
  function isAntiscia(lon1, lon2) {
    const ant1 = (180 - lon1 + 360) % 360;
    let diff = Math.abs(ant1 - lon2);
    if (diff > 180) diff = 360 - diff;
    return diff <= 2.0; // 2 degree orb for antiscia
  }

  if (queruentPlanet && quesitedPlanet && planets[queruentPlanet] && planets[quesitedPlanet]) {
    const qLon = planets[queruentPlanet].longitude;
    const tLon = planets[quesitedPlanet].longitude;
    if (isAntiscia(qLon, tLon)) {
      favorable.push(`Querent and Quesited are in Antiscia (secret connection) — a hidden alliance, secret meeting, or shadow connection brings this together.`);
    }
  }

  // ── Translation & Collection of Light ─────────────────────────────────────
  const directApplying = keyAspects.find(a => a.applying);
  
  if (!directApplying && queruentPlanet && quesitedPlanet) {
    const tradPlanets = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
    for (const p3 of tradPlanets) {
      if (p3 === queruentPlanet || p3 === quesitedPlanet) continue;
      
      const aspQ = chart.aspects.find(a => (a.planet1 === p3 && a.planet2 === queruentPlanet) || (a.planet2 === p3 && a.planet1 === queruentPlanet));
      const aspT = chart.aspects.find(a => (a.planet1 === p3 && a.planet2 === quesitedPlanet) || (a.planet2 === p3 && a.planet1 === quesitedPlanet));
      
      if (aspQ && aspT) {
        // Translation of Light
        const p3FasterQ = aspQ.faster === p3;
        const p3FasterT = aspT.faster === p3;
        
        if (p3FasterQ && p3FasterT) {
          if ((aspQ.applying && !aspT.applying) || (!aspQ.applying && aspT.applying)) {
            favorable.push(`Translation of Light by ${p3}: The ${p3} connects the Querent (${queruentPlanet}) and Quesited (${quesitedPlanet}) by separating from one and applying to the other. A third party or event brings the matter to fruition.`);
            break;
          }
        }

        // Collection of Light
        const p3SlowerQ = aspQ.faster !== p3;
        const p3SlowerT = aspT.faster !== p3;

        if (p3SlowerQ && p3SlowerT && aspQ.applying && aspT.applying) {
          favorable.push(`Collection of Light by ${p3}: Both Querent and Quesited are applying to the heavier planet ${p3}. A person of authority or external force will collect the matter and bring it together.`);
          break;
        }
      }
    }
  }

  // Fixed Stars Check for Significators & Ascendant
  const FIXED_STARS = [
    { name: 'Algol', lon: 56.5, orb: 1.5, nature: 'malefic', meaning: 'danger, losing control, intense difficulty' },
    { name: 'Alcyone (Pleiades)', lon: 60.25, orb: 1.5, nature: 'malefic', meaning: 'sorrow, weeping, public scrutiny' },
    { name: 'Regulus', lon: 150.1, orb: 1.5, nature: 'benefic', meaning: 'great success, fame, royal favor' },
    { name: 'Spica', lon: 204.1, orb: 1.5, nature: 'benefic', meaning: 'eminent success, wealth, brilliance' },
    { name: 'Antares', lon: 250.0, orb: 1.5, nature: 'malefic', meaning: 'conflict, sudden endings, warfare' },
  ];

  function getFixedStar(lon) {
    for (const star of FIXED_STARS) {
      let diff = Math.abs(lon - star.lon);
      if (diff > 180) diff = 360 - diff;
      if (diff <= star.orb) return star;
    }
    return null;
  }

  const ascStar = getFixedStar(chart.asc.longitude);
  if (ascStar) {
    (ascStar.nature === 'benefic' ? favorable : unfavorable).push(
      `Ascendant is conjunct ${ascStar.name}: Brings ${ascStar.meaning} to the Querent's situation.`
    );
  }

  if (queruentPlanet && planets[queruentPlanet]) {
    const qStar = getFixedStar(planets[queruentPlanet].longitude);
    if (qStar) {
      (qStar.nature === 'benefic' ? favorable : unfavorable).push(
        `Querent (${queruentPlanet}) is conjunct ${qStar.name}: Indicates ${qStar.meaning}.`
      );
    }
  }

  if (quesitedPlanet && planets[quesitedPlanet]) {
    const tStar = getFixedStar(planets[quesitedPlanet].longitude);
    if (tStar) {
      (tStar.nature === 'benefic' ? favorable : unfavorable).push(
        `Quesited (${quesitedPlanet}) is conjunct ${tStar.name}: The matter involves ${tStar.meaning}.`
      );
    }
  }

  // Moon's last aspect (shows how things have unfolded)
  const moonAspects = chart.aspects
    .filter(a => a.planet1 === 'moon' || a.planet2 === 'moon')
    .sort((a, b) => a.orb - b.orb);

  if (moonAspects.length > 0) {
    const lastMoon = moonAspects[0];
    neutral.push(`Moon's nearest aspect: ${lastMoon.aspect} with ${lastMoon.planet1 === 'moon' ? lastMoon.planet2 : lastMoon.planet1} (${lastMoon.orb.toFixed(1)}°${lastMoon.applying ? ' applying' : ' separating'}).`);
  }

  // ── Verdict ───────────────────────────────────────────────────────────────
  const favorableCount   = favorable.length;
  const unfavorableCount = unfavorable.length;

  let verdict, confidence;

  if (voidOfCourse) {
    verdict    = 'unlikely';
    confidence = 'moderate';
  } else if (favorableCount > unfavorableCount + 1) {
    verdict    = 'yes';
    confidence = keyAspects.length > 0 ? 'high' : 'moderate';
  } else if (unfavorableCount > favorableCount + 1) {
    verdict    = 'no';
    confidence = 'moderate';
  } else {
    verdict    = 'unclear';
    confidence = 'low';
  }

  // ── Timing ────────────────────────────────────────────────────────────────
  // Rough timing from applying aspect orb — degrees ≈ days/weeks/months
  // depending on planets' speed
  let timing = null;
  if (keyAspects.length > 0 && keyAspects[0].applying) {
    const orb = keyAspects[0].orb;
    if (orb < 2)      timing = 'Very soon — days';
    else if (orb < 5) timing = 'Within weeks';
    else              timing = 'Within months';
  }

  return {
    verdict,       // 'yes' | 'no' | 'unlikely' | 'unclear'
    confidence,    // 'high' | 'moderate' | 'low'
    favorable,
    unfavorable,
    neutral,
    timing,
    summary: buildVerdict(verdict, confidence, timing, chart.question),
  };
}

function buildVerdict(verdict, confidence, timing, question) {
  const verdictText = {
    yes:      '✦ The chart suggests a positive outcome.',
    no:       '✗ The chart suggests the matter will not come to pass as hoped.',
    unlikely: '◌ The Moon is Void of Course — the matter is likely to come to nothing, or resolve without your involvement.',
    unclear:  '? The chart does not give a clear answer — the situation is genuinely uncertain or too complex to read simply.',
  };

  const timingText = timing ? ` ${timing}.` : '';

  return `${verdictText[verdict] || '?'}${timingText}`;
}

// ─── House topics export (for UI) ─────────────────────────────────────────────
export { HOUSE_TOPICS, TRADITIONAL_RULERS, guessQuestionHouse };
