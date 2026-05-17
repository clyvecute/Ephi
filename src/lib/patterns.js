/**
 * lib/patterns.js
 *
 * Detects major aspect patterns in a natal chart:
 *   Stellium, Grand Trine, Kite, Grand Cross, T-Square,
 *   Mystic Rectangle, Yod (Finger of God), Boomerang Yod, Thor's Hammer
 *
 * FIX (v2): getActiveAspects() deduplicates transit-to-natal by skipping i>=j
 * when the same object is passed for both sets. That breaks natal pattern detection
 * because Grand Cross needs symmetric pairs (A-C AND C-A). We now build the
 * aspect list ourselves so we get the full undirected graph.
 */

// ─── Orb table for natal-natal aspects ────────────────────────────────────────
const NATAL_ORBS = {
  conjunction:   10,
  opposition:    10,
  trine:          8,
  square:         8,
  sextile:        6,
  quincunx:       4,
  semisextile:    3,
  sesquiquadrate: 3,
};

const ASPECT_ANGLES = {
  conjunction:    0,
  opposition:   180,
  trine:        120,
  square:        90,
  sextile:       60,
  quincunx:     150,
  semisextile:   30,
  sesquiquadrate:135,
};

const SIGN_NAMES = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function angularDistance(a, b) {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getLon(val) {
  if (val == null) return null;
  return typeof val === 'object' ? val.longitude : val;
}

/**
 * Build a full undirected aspect list from a positions object.
 * Every pair appears ONCE. A fast has(type, p1, p2) lookup is also returned.
 */
function buildNatalAspects(positions) {
  const keys = Object.keys(positions).filter(k => {
    const lon = getLon(positions[k]);
    return lon != null && !isNaN(lon);
  });

  const aspects = [];  // { p1, p2, type, orb }
  const lookup  = {};  // lookup[type][p1][p2] = true (symmetric)

  const mark = (type, a, b) => {
    if (!lookup[type])    lookup[type] = {};
    if (!lookup[type][a]) lookup[type][a] = {};
    if (!lookup[type][b]) lookup[type][b] = {};
    lookup[type][a][b] = true;
    lookup[type][b][a] = true;
  };

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const p1   = keys[i];
      const p2   = keys[j];
      const lon1 = getLon(positions[p1]);
      const lon2 = getLon(positions[p2]);
      const dist = angularDistance(lon1, lon2);

      for (const [type, angle] of Object.entries(ASPECT_ANGLES)) {
        const orb = Math.abs(dist - angle);
        if (orb <= NATAL_ORBS[type]) {
          aspects.push({ p1, p2, type, orb });
          mark(type, p1, p2);
        }
      }
    }
  }

  const has = (type, a, b) => !!(lookup[type]?.[a]?.[b]);

  return { aspects, has, keys };
}

/**
 * Returns a list of all natal aspects using natal orbs.
 */
export function getNatalAspects(positions) {
  const { aspects } = buildNatalAspects(positions);
  const SYMBOLS = {
    conjunction: '☌', sextile: '⚹', square: '□', trine: '△', quincunx: '⚻', opposition: '☍',
    semisextile: '⚺', sesquiquadrate: '⚼'
  };
  const NATURE = {
    conjunction: 'neutral', sextile: 'soft', square: 'hard', trine: 'soft', quincunx: 'hard', opposition: 'hard',
    semisextile: 'neutral', sesquiquadrate: 'hard'
  };
  
  return aspects.map(a => ({
    transitPlanet: a.p1,
    natalPlanet: a.p2,
    aspectName: a.type,
    symbol: SYMBOLS[a.type],
    nature: NATURE[a.type],
    orb: a.orb,
  })).sort((a, b) => a.orb - b.orb);
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect all major aspect patterns in a natal chart.
 * @param {Object} positions  e.g. { sun: 182.5, moon: 262.1, ... }
 * @returns {Array}
 */
export function detectPatterns(positions) {
  const patterns   = [];
  const { aspects, has, keys } = buildNatalAspects(positions);

  const ofType = t => aspects.filter(a => a.type === t);
  const oppositions = ofType('opposition');
  const trines      = ofType('trine');
  const squares     = ofType('square');
  const sextiles    = ofType('sextile');
  const quincunxes  = ofType('quincunx');
  const sesquis     = ofType('sesquiquadrate');

  // ── 1. Stellium ───────────────────────────────────────────────────────────────
  const bySign = {};
  for (const p of keys) {
    const lon  = ((getLon(positions[p]) % 360) + 360) % 360;
    const sign = Math.floor(lon / 30);
    (bySign[sign] = bySign[sign] || []).push(p);
  }
  for (const [signIdx, planets] of Object.entries(bySign)) {
    if (planets.length >= 3) {
      patterns.push({
        id: `Stellium-${signIdx}`,
        type: 'Stellium',
        planets,
        description: `${planets.length} planets in ${SIGN_NAMES[signIdx]}`,
        focus: `Concentrated energy in ${SIGN_NAMES[signIdx]}`,
      });
    }
  }

  // ── 2. Grand Trine ────────────────────────────────────────────────────────────
  const gtIds    = new Set();
  const grandTrines = [];

  for (let i = 0; i < trines.length; i++) {
    for (let j = i + 1; j < trines.length; j++) {
      const t1 = trines[i], t2 = trines[j];
      let A, B, C;
      if      (t1.p1 === t2.p1) { A = t1.p1; B = t1.p2; C = t2.p2; }
      else if (t1.p1 === t2.p2) { A = t1.p1; B = t1.p2; C = t2.p1; }
      else if (t1.p2 === t2.p1) { A = t1.p2; B = t1.p1; C = t2.p2; }
      else if (t1.p2 === t2.p2) { A = t1.p2; B = t1.p1; C = t2.p1; }
      else continue;

      if (!has('trine', B, C)) continue;

      const id = `GT-${[A,B,C].sort().join('-')}`;
      if (gtIds.has(id)) continue;
      gtIds.add(id);

      const element = sharedElement(positions, [A,B,C]);
      grandTrines.push({
        id, type: 'Grand Trine',
        planets: [A,B,C].sort(), element,
        description: `Harmonious triangle${element ? ` in ${element}` : ''} — ${[A,B,C].join(', ')}`,
        focus: 'Natural gifts and ease — mobilise this energy deliberately',
      });
    }
  }

  // ── 3. Kite ───────────────────────────────────────────────────────────────────
  const kiteIds = new Set();
  const kites   = [];

  for (const gt of grandTrines) {
    const [A, B, C] = gt.planets;
    for (const opp of oppositions) {
      let head, tail;
      for (const corner of [A, B, C]) {
        if (opp.p1 === corner && ![A,B,C].includes(opp.p2)) { head = corner; tail = opp.p2; break; }
        if (opp.p2 === corner && ![A,B,C].includes(opp.p1)) { head = corner; tail = opp.p1; break; }
      }
      if (!head) continue;
      const others = [A,B,C].filter(p => p !== head);
      if (!has('sextile', tail, others[0]) || !has('sextile', tail, others[1])) continue;

      const id = `Kite-${[A,B,C,tail].sort().join('-')}`;
      if (kiteIds.has(id)) continue;
      kiteIds.add(id);

      kites.push({
        id, type: 'Kite',
        planets: [A,B,C,tail].sort(), apex: head, tail,
        description: `Grand Trine channelled through ${head} opposing ${tail}`,
        focus: 'Directed purpose — natural gifts harnessed toward a specific outcome',
      });
    }
  }

  for (const gt of grandTrines) {
    if (!kites.some(k => gt.planets.every(p => k.planets.includes(p)))) {
      patterns.push(gt);
    }
  }
  patterns.push(...kites);

  // ── 4. Grand Cross ────────────────────────────────────────────────────────────
  const gcIds       = new Set();
  const grandCrosses = [];

  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const { p1: A, p2: B } = oppositions[i];
      const { p1: C, p2: D } = oppositions[j];

      if (new Set([A,B,C,D]).size !== 4) continue;

      // All 4 squares MUST exist
      if (!has('square',A,C) || !has('square',A,D) ||
          !has('square',B,C) || !has('square',B,D)) continue;

      const id = `GC-${[A,B,C,D].sort().join('-')}`;
      if (gcIds.has(id)) continue;
      gcIds.add(id);

      const modality = sharedModality(positions, [A,B,C,D]);
      grandCrosses.push({
        id, type: 'Grand Cross',
        planets: [A,B,C,D].sort(), modality,
        description: `Four-way tension${modality ? ` (${modality})` : ''} — ${[A,B,C,D].join(', ')}`,
        focus: 'Immense pressure that forges resilience and drives achievement',
      });
    }
  }
  patterns.push(...grandCrosses);

  // ── 5. T-Square ───────────────────────────────────────────────────────────────
  const tsIds = new Set();

  for (const opp of oppositions) {
    const { p1: A, p2: B } = opp;
    for (const k of keys) {
      if (k === A || k === B) continue;
      if (!has('square', k, A) || !has('square', k, B)) continue;
      if (grandCrosses.some(gc => [A,B,k].every(p => gc.planets.includes(p)))) continue;

      const id = `TS-${[A,B].sort().join('-')}-${k}`;
      if (tsIds.has(id)) continue;
      tsIds.add(id);

      const modality = sharedModality(positions, [A,B,k]);
      patterns.push({
        id, type: 'T-Square',
        planets: [[A,B].sort(), k].flat(), apex: k, modality,
        description: `${A} ☍ ${B}, both □ apex ${k}`,
        focus: 'High drive and friction seeking an outlet through the apex planet',
      });
    }
  }

  // ── 6. Mystic Rectangle ───────────────────────────────────────────────────────
  // Structure: two oppositions cross as diagonals; the rectangle sides
  // alternate trine-sextile-trine-sextile (long = trine, short = sextile or vice-versa)
  const mrIds = new Set();

  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const { p1: A, p2: C } = oppositions[i]; // diagonal A—C
      const { p1: B, p2: D } = oppositions[j]; // diagonal B—D

      if (new Set([A,B,C,D]).size !== 4) continue;

      for (const [b, d] of [[B,D],[D,B]]) {
        const sideAB = has('trine',A,b) ? 'trine' : has('sextile',A,b) ? 'sextile' : null;
        const sideBC = has('trine',b,C) ? 'trine' : has('sextile',b,C) ? 'sextile' : null;
        const sideCD = has('trine',C,d) ? 'trine' : has('sextile',C,d) ? 'sextile' : null;
        const sideDA = has('trine',d,A) ? 'trine' : has('sextile',d,A) ? 'sextile' : null;

        if (!sideAB || !sideBC || !sideCD || !sideDA) continue;
        // Must alternate: AB≠BC, BC≠CD, CD≠DA
        if (sideAB === sideBC || sideBC === sideCD || sideCD === sideDA) continue;

        const id = `MR-${[A,b,C,d].sort().join('-')}`;
        if (mrIds.has(id)) continue;
        mrIds.add(id);

        patterns.push({
          id, type: 'Mystic Rectangle',
          planets: [A,b,C,d].sort(),
          description: `Alternating trines and sextiles — ${[A,b,C,d].join(', ')}`,
          focus: 'Productive tension — opposing forces harmoniously integrated',
        });
        break;
      }
    }
  }

  // ── 7. Yod / Finger of God ────────────────────────────────────────────────────
  const yodIds  = new Set();
  const yodList = [];

  for (const sex of sextiles) {
    const { p1: A, p2: B } = sex;
    for (const k of keys) {
      if (k === A || k === B) continue;
      if (!has('quincunx', A, k) || !has('quincunx', B, k)) continue;

      const id = `Yod-${[A,B].sort().join('-')}-${k}`;
      if (yodIds.has(id)) continue;
      yodIds.add(id);

      const yod = {
        id, type: 'Yod',
        planets: [[A,B].sort(), k].flat(), apex: k,
        description: `${A} ⚹ ${B}, both ⚻ apex ${k}`,
        focus: 'A fated calling — karmic adjustment through the apex planet',
      };
      yodList.push(yod);
    }
  }

  // ── 8. Boomerang Yod (Yod + planet opposing the apex) ────────────────────────
  for (const yod of yodList) {
    const { apex, planets } = yod;
    const base = planets.filter(p => p !== apex);
    let isBoomerang = false;
    for (const k of keys) {
      if (planets.includes(k)) continue;
      if (!has('opposition', apex, k)) continue;
      if (!has('sextile', k, base[0]) && !has('sextile', k, base[1])) continue;

      isBoomerang = true;
      patterns.push({
        id: `Boomerang-${[...planets, k].sort().join('-')}`,
        type: 'Boomerang Yod',
        planets: [...planets, k].sort(), apex, redirector: k,
        description: `Yod (${base.join(', ')} → ${apex}) redirected through ${k}`,
        focus: 'Extreme fated tension bouncing between apex and redirector',
      });
    }
    if (!isBoomerang) {
      patterns.push(yod);
    }
  }

  // ── 9. Thor's Hammer / Fist of God ───────────────────────────────────────────
  const thorIds = new Set();

  for (const sq of squares) {
    const { p1: A, p2: B } = sq;
    for (const k of keys) {
      if (k === A || k === B) continue;
      if (!has('sesquiquadrate', A, k) || !has('sesquiquadrate', B, k)) continue;

      const id = `Thor-${[A,B].sort().join('-')}-${k}`;
      if (thorIds.has(id)) continue;
      thorIds.add(id);

      patterns.push({
        id, type: "Thor's Hammer",
        planets: [[A,B].sort(), k].flat(), apex: k,
        description: `${A} □ ${B}, both ⊼ apex ${k}`,
        focus: 'Explosive compulsive energy demanding release through the apex planet',
      });
    }
  }

  return patterns;
}

// ─── Element / modality helpers ───────────────────────────────────────────────

const SIGN_ELEMENT  = ['fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'];
const SIGN_MODALITY = ['cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable','cardinal','fixed','mutable'];

function signIdx(positions, planet) {
  const lon = ((getLon(positions[planet]) % 360) + 360) % 360;
  return Math.floor(lon / 30);
}

function sharedElement(positions, planets) {
  const elems = [...new Set(planets.map(p => SIGN_ELEMENT[signIdx(positions, p)]))];
  return elems.length === 1 ? elems[0] : null;
}

function sharedModality(positions, planets) {
  const mods = [...new Set(planets.map(p => SIGN_MODALITY[signIdx(positions, p)]))];
  return mods.length === 1 ? mods[0] : null;
}
