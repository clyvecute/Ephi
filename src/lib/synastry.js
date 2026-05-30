// src/lib/synastry.js
//
// Synastry engine — compares two natal charts bidirectionally.
// Returns all inter-chart aspects, harmony/tension scores, and key connections.
//
// Usage:
//   import { getSynastryAspects, scoreSynastry, getKeyConnections } from '@/lib/synastry';
//
//   const aspects = getSynastryAspects(chartA, chartB);
//   const score   = scoreSynastry(aspects);
//   const keys    = getKeyConnections(aspects);

// ─── Aspect definitions ───────────────────────────────────────────────────────

const ASPECTS = [
  { name: 'conjunction', symbol: '☌', angle: 0,   orb: 8, nature: 'neutral', weight: 3 },
  { name: 'sextile',     symbol: '⚹', angle: 60,  orb: 6, nature: 'soft',    weight: 1 },
  { name: 'square',      symbol: '□', angle: 90,  orb: 8, nature: 'hard',    weight: 2 },
  { name: 'trine',       symbol: '△', angle: 120, orb: 8, nature: 'soft',    weight: 2 },
  { name: 'opposition',  symbol: '☍', angle: 180, orb: 8, nature: 'hard',    weight: 2 },
];

// Personal planets — aspects to these carry the most weight
const PERSONAL_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars'];
const SOCIAL_PLANETS   = ['jupiter', 'saturn'];
const OUTER_PLANETS    = ['uranus', 'neptune', 'pluto'];

// Planet display meta
const PLANET_META = {
  sun:     { label: 'Sun',     glyph: '☉', color: '#F5A623' },
  moon:    { label: 'Moon',    glyph: '☽', color: '#C0C0C0' },
  mercury: { label: 'Mercury', glyph: '☿', color: '#9B8FC7' },
  venus:   { label: 'Venus',   glyph: '♀', color: '#E87D9B' },
  mars:    { label: 'Mars',    glyph: '♂', color: '#E05A3A' },
  jupiter: { label: 'Jupiter', glyph: '♃', color: '#D4942A' },
  saturn:  { label: 'Saturn',  glyph: '♄', color: '#7A9B7A' },
  uranus:  { label: 'Uranus',  glyph: '♅', color: '#5CB8C4' },
  neptune: { label: 'Neptune', glyph: '♆', color: '#5B7FD4' },
  pluto:   { label: 'Pluto',   glyph: '♇', color: '#A05CA0' },
};

// ─── Synastry interpretation keywords ────────────────────────────────────────
// Key relationship combos — [transitPlanet][aspectType][natalPlanet]

const SYNASTRY_INTERP = {
  sun: {
    sun: {
      conjunction: { keywords: ['ego fusion', 'strong identity bond', 'vitality match'], core: 'A powerful identity connection — you see yourselves in each other and amplify each other\'s sense of self. Strong mutual recognition and vitality.' },
      trine:       { keywords: ['natural harmony', 'ease', 'mutual support'], core: 'Natural flow between your life forces. You support each other\'s goals and identities without friction.' },
      square:      { keywords: ['ego clash', 'competition', 'growth tension'], core: 'Your personalities and wills create friction — stimulating but challenging. Growth comes through learning to honour each other\'s individuality.' },
      opposition:  { keywords: ['attraction', 'polarity', 'mirror dynamic'], core: 'Classic attraction of opposites. You fascinate and complement each other, but can clash when competing for the spotlight.' },
      sextile:     { keywords: ['friendly rapport', 'mutual respect', 'cooperation'], core: 'Easy mutual respect and cooperation. You enjoy each other\'s company and can work well together.' },
    },
    moon: {
      conjunction: { keywords: ['deep emotional bond', 'nurturing', 'home feeling'], core: 'One of the most powerful synastry aspects. The Sun person energises and affirms the Moon person\'s emotional world. Deep sense of home and belonging together.' },
      trine:       { keywords: ['emotional comfort', 'warmth', 'natural care'], core: 'Natural emotional warmth and comfort between you. The Sun person\'s presence soothes and uplifts the Moon person.' },
      square:      { keywords: ['emotional friction', 'needs vs ego', 'tension'], core: 'The Sun person\'s will sometimes overrides the Moon person\'s emotional needs, creating hurt or friction. Requires conscious sensitivity.' },
      opposition:  { keywords: ['emotional push-pull', 'attraction', 'neediness'], core: 'Strong attraction with emotional tension. The Sun person may feel drained by the Moon person\'s needs; the Moon person may feel unseen.' },
      sextile:     { keywords: ['emotional support', 'warmth', 'care'], core: 'Gentle emotional support. The Sun person naturally cheers up and encourages the Moon person.' },
    },
    venus: {
      conjunction: { keywords: ['love', 'attraction', 'beauty bond', 'affection'], core: 'One of the most romantic synastry aspects. The Sun person finds the Venus person beautiful and charming; the Venus person adores the Sun person. Strong romantic attraction.' },
      trine:       { keywords: ['romantic harmony', 'affection', 'pleasure'], core: 'Easy affection and romantic harmony. You enjoy beauty, pleasure, and each other\'s company naturally.' },
      square:      { keywords: ['attraction with friction', 'values clash', 'desire tension'], core: 'Strong attraction mixed with values friction. Desire is real but getting along requires work.' },
      opposition:  { keywords: ['magnetic attraction', 'desire', 'polarity'], core: 'Magnetic, sometimes obsessive attraction. Beautiful tension between what each person wants and offers.' },
      sextile:     { keywords: ['gentle attraction', 'affection', 'social ease'], core: 'Mild but pleasant attraction and social ease. You enjoy each other\'s aesthetic and values.' },
    },
    mars: {
      conjunction: { keywords: ['sexual attraction', 'drive', 'action', 'passion'], core: 'Intense physical and competitive energy. Strong mutual drive and attraction — can be exhilarating or combative.' },
      trine:       { keywords: ['passion', 'vitality', 'active harmony'], core: 'Natural physical chemistry and shared drive. You energise each other and enjoy active, passionate connection.' },
      square:      { keywords: ['friction', 'competition', 'sexual tension'], core: 'Hot friction — sexual tension mixed with power struggles. Can be exciting or exhausting depending on awareness.' },
      opposition:  { keywords: ['intense attraction', 'confrontation', 'push-pull'], core: 'Powerful attraction with confrontational undertones. The energy between you is electric but can escalate into conflict.' },
      sextile:     { keywords: ['energising', 'motivation', 'mild chemistry'], core: 'You motivate and energise each other pleasantly. Good for shared physical activities and projects.' },
    },
    jupiter: {
      conjunction: { keywords: ['expansion', 'generosity', 'growth', 'luck'], core: 'The Jupiter person broadens the Sun person\'s world — brings optimism, opportunity, and a feeling of abundance. Very beneficial.' },
      trine:       { keywords: ['mutual growth', 'generosity', 'inspiration'], core: 'Natural growth and generosity flow between you. You make each other more optimistic and expansive.' },
      square:      { keywords: ['excess', 'overconfidence', 'growth friction'], core: 'The Jupiter person may overinflate the Sun person\'s ego or promise more than can be delivered. Watch for excess.' },
      opposition:  { keywords: ['growth polarity', 'excess', 'philosophical tension'], core: 'Expansive tension — you challenge each other\'s beliefs and worldviews, sometimes to excess.' },
    },
    saturn: {
      conjunction: { keywords: ['serious bond', 'commitment', 'karmic weight', 'duty'], core: 'One of the most significant long-term synastry aspects. Saturn restricts or matures the Sun person — can feel like a karmic bond or heavy obligation.' },
      trine:       { keywords: ['stable commitment', 'structure', 'mutual respect'], core: 'Saturn\'s discipline supports and stabilises the Sun person\'s identity. A mature, reliable bond.' },
      square:      { keywords: ['restriction', 'judgment', 'pressure', 'karmic test'], core: 'Saturn may criticise or limit the Sun person\'s self-expression. Can feel like constant evaluation — growth-producing but difficult.' },
      opposition:  { keywords: ['limitation', 'responsibility', 'karmic pull'], core: 'Saturn opposes the Sun — a powerful karmic indicator. There may be a feeling of obligation or constraint between you.' },
    },
  },

  moon: {
    moon: {
      conjunction: { keywords: ['emotional resonance', 'instinctual bond', 'deep understanding'], core: 'Your emotional worlds are deeply aligned. You instinctively understand each other\'s moods and needs. Powerful emotional bond.' },
      trine:       { keywords: ['emotional harmony', 'comfort', 'safety'], core: 'Natural emotional harmony. You feel emotionally safe and comfortable with each other — like coming home.' },
      square:      { keywords: ['emotional friction', 'mood clashes', 'different needs'], core: 'Your emotional needs and rhythms are at odds. You may misread or trigger each other without meaning to.' },
      opposition:  { keywords: ['emotional polarity', 'projection', 'attraction'], core: 'You experience each other\'s emotional shadow. Strong pull, but also emotional projection and misunderstanding.' },
    },
    venus: {
      conjunction: { keywords: ['romantic warmth', 'emotional love', 'tenderness', 'nurturing'], core: 'Deeply warm and tender emotional connection. The Moon person feels loved and cherished by the Venus person. One of the sweetest synastry aspects.' },
      trine:       { keywords: ['emotional affection', 'warmth', 'care'], core: 'Easy emotional affection and mutual nurturing. You feel genuinely cared for by each other.' },
      square:      { keywords: ['emotional vs aesthetic', 'love style friction', 'neediness'], core: 'Your emotional needs and love styles don\'t naturally match — you may feel unloved even when love is present.' },
      opposition:  { keywords: ['emotional pull', 'longing', 'love tension'], core: 'Strong emotional attraction with a quality of longing or reaching. Deeply felt but not always easy to bridge.' },
    },
    mars: {
      conjunction: { keywords: ['passion', 'emotional drive', 'sexual chemistry', 'reactivity'], core: 'Intense emotional and sexual chemistry. The Mars person stirs up the Moon person\'s emotions powerfully — can be thrilling or volatile.' },
      trine:       { keywords: ['passionate warmth', 'emotional courage', 'sexual flow'], core: 'Emotional passion that flows naturally. You motivate and arouse each other without excessive friction.' },
      square:      { keywords: ['emotional reactivity', 'friction', 'volatility'], core: 'The Mars person\'s drive tends to upset the Moon person\'s emotional equilibrium. Requires careful handling.' },
      opposition:  { keywords: ['emotional intensity', 'push-pull', 'attraction-conflict'], core: 'Powerful emotional and sexual tension. Very attracted but also easily wounded or provoked by each other.' },
    },
    saturn: {
      conjunction: { keywords: ['emotional restriction', 'karmic bond', 'duty', 'cold love'], core: 'Saturn may suppress or mature the Moon person\'s emotional expression. Can feel like love comes with conditions. Deep karmic significance.' },
      trine:       { keywords: ['emotional stability', 'reliable care', 'mature love'], core: 'Saturn provides emotional structure and reliability for the Moon person. A stabilising, dependable bond.' },
      square:      { keywords: ['emotional withholding', 'coldness', 'emotional pressure'], core: 'The Saturn person may feel emotionally distant or critical to the Moon person. Emotional needs may feel unmet.' },
      opposition:  { keywords: ['emotional limitation', 'karmic weight', 'obligation'], core: 'Heavy karmic indicator — a bond that feels fated but also burdened. Emotional needs versus responsibility.' },
    },
    jupiter: {
      conjunction: { keywords: ['emotional generosity', 'warmth', 'abundance', 'nurturing'], core: 'The Jupiter person makes the Moon person feel expansive, optimistic, and emotionally abundant. Very positive.' },
      trine:       { keywords: ['emotional growth', 'generosity', 'joy'], core: 'The Jupiter person naturally uplifts and expands the Moon person\'s emotional world. Brings joy and generosity.' },
    },
  },

  venus: {
    venus: {
      conjunction: { keywords: ['shared values', 'aesthetic harmony', 'mutual pleasure'], core: 'Deep alignment in values, taste, and what you find beautiful. You genuinely enjoy the same things and appreciate each other\'s style.' },
      trine:       { keywords: ['harmony', 'shared taste', 'pleasure'], core: 'Natural harmony in values and pleasures. You enjoy each other\'s company and share aesthetic sensibilities.' },
      square:      { keywords: ['values friction', 'love style clash', 'taste differences'], core: 'Your values and love styles don\'t naturally align. What pleases one may frustrate the other.' },
    },
    mars: {
      conjunction: { keywords: ['sexual magnetism', 'desire', 'passion', 'chemistry'], core: 'Classic romantic and sexual attraction. The Venus-Mars conjunction is one of the strongest indicators of physical chemistry and romantic desire.' },
      trine:       { keywords: ['romantic chemistry', 'passion', 'creative spark'], core: 'Natural romantic and creative chemistry. Desire and affection flow easily between you.' },
      square:      { keywords: ['sexual tension', 'desire friction', 'push-pull'], core: 'Strong desire mixed with friction. The attraction is real but expressing it is complicated.' },
      opposition:  { keywords: ['magnetic attraction', 'desire polarity', 'passion'], core: 'Intense magnetic attraction — the classic "opposite poles" romantic pull. Can be obsessive.' },
    },
    saturn: {
      conjunction: { keywords: ['serious love', 'commitment', 'restriction in affection', 'karmic'], core: 'Saturn may restrict or mature the Venus person\'s expression of love. Can indicate a long-term but serious bond.' },
      trine:       { keywords: ['lasting love', 'committed affection', 'stable bond'], core: 'Saturn gives the Venus person\'s affections stability and longevity. A lasting, committed bond.' },
      square:      { keywords: ['love restricted', 'feeling unloved', 'karmic love test'], core: 'The Saturn person may withhold affection or impose conditions. The Venus person may feel unappreciated or restricted.' },
    },
    jupiter: {
      conjunction: { keywords: ['abundant love', 'generosity', 'romantic expansion'], core: 'Jupiter expands and blesses the Venus person\'s love life. Generous, abundant affection. Very positive for romance.' },
    },
  },

  mars: {
    mars: {
      conjunction: { keywords: ['shared drive', 'competition', 'sexual intensity', 'power'], core: 'Intense shared energy — highly motivating but also competitive and potentially volatile. Major sexual chemistry.' },
      trine:       { keywords: ['harmonious drive', 'shared goals', 'physical harmony'], core: 'Natural shared drive and physical harmony. You motivate each other without unnecessary conflict.' },
      square:      { keywords: ['conflict', 'competition', 'power struggle', 'passion'], core: 'Hot conflict energy — you may bring out each other\'s anger or competitiveness. Needs conscious channeling.' },
    },
    saturn: {
      conjunction: { keywords: ['disciplined drive', 'restriction of action', 'frustration', 'endurance'], core: 'Saturn may block or discipline Mars\'s drive. Can create frustration but also remarkable endurance and focused achievement.' },
      square:      { keywords: ['blocked drive', 'anger', 'power struggle', 'pressure'], core: 'Saturn frustrates Mars — a difficult combination that creates resentment or blocked action if not managed.' },
    },
    jupiter: {
      conjunction: { keywords: ['amplified drive', 'bold action', 'courage', 'success'], core: 'Jupiter amplifies Mars — courage, ambition, and drive are magnified. Very powerful for shared achievement.' },
    },
  },

  jupiter: {
    saturn: {
      conjunction: { keywords: ['expansion vs restriction', 'growth balance', 'tension'], core: 'The classic optimism-vs-reality dynamic. Creates productive tension between growth and discipline.' },
    },
    jupiter: {
      conjunction: { keywords: ['shared vision', 'mutual growth', 'philosophy bond'], core: 'Shared philosophy, optimism, and worldview. You inspire each other to grow and think bigger.' },
    },
  },

  saturn: {
    saturn: {
      conjunction: { keywords: ['generational bond', 'shared discipline', 'mutual responsibility'], core: 'A generational connection — shared sense of duty, responsibility, and life structure. More significant when other aspects are strong.' },
    },
  },
};

// ─── Utility ──────────────────────────────────────────────────────────────────

function norm(d) { return ((d % 360) + 360) % 360; }

function angularDist(a, b) {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function getLongitudes(chartData) {
  // Support .positions (our standard), .planets (legacy), or flat longitudes
  if (chartData?.positions) {
    return chartData.positions;
  }
  if (chartData?.planets) {
    const out = {};
    for (const [p, info] of Object.entries(chartData.planets)) {
      out[p] = typeof info === 'object' ? info.longitude : info;
    }
    return out;
  }
  return chartData;
}

function getZodiacSign(lon) {
  const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                 'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
  return signs[Math.floor(norm(lon) / 30)];
}

function getZodiacDisplay(lon) {
  const sign = getZodiacSign(lon);
  const deg  = (norm(lon) % 30).toFixed(1);
  return `${deg}° ${sign}`;
}

// ─── Interpretation lookup ────────────────────────────────────────────────────

function getSynastryInterpretation(planetA, planetB, aspectName) {
  // Try A→B first, then B→A (table is not always bidirectional)
  const entry =
    SYNASTRY_INTERP[planetA]?.[planetB]?.[aspectName] ||
    SYNASTRY_INTERP[planetB]?.[planetA]?.[aspectName] ||
    SYNASTRY_INTERP[planetA]?.[planetB]?.['conjunction'] ||
    null;

  if (entry) return entry;

  // Generic fallback
  const aspectNature = ASPECTS.find(a => a.name === aspectName)?.nature || 'neutral';
  const modeMap = { soft: 'harmonious flow', hard: 'productive tension', neutral: 'significant fusion' };
  return {
    keywords: [`${planetA}-${planetB} ${aspectName}`, aspectNature],
    core: `${PLANET_META[planetA]?.label || planetA} and ${PLANET_META[planetB]?.label || planetB} form a ${aspectName}, creating ${modeMap[aspectNature] || 'notable energy'} between these two energies in the relationship.`,
  };
}

// ─── Planet importance weighting ─────────────────────────────────────────────

function planetWeight(planet) {
  if (PERSONAL_PLANETS.includes(planet)) return 3;
  if (SOCIAL_PLANETS.includes(planet))   return 2;
  if (OUTER_PLANETS.includes(planet))    return 1;
  return 1;
}

// ─── Main exports ─────────────────────────────────────────────────────────────

/**
 * Get all inter-chart aspects between two natal charts.
 * Checks A's planets against B's, and B's against A's.
 *
 * @param {Object} chartA — natal data (from localStorage astro_natal or { planets: {...} })
 * @param {Object} chartB — second person's natal data
 * @param {Object} options
 * @param {string[]} [options.aspectNames]    — which aspects to include
 * @param {string[]} [options.planetsToCheck] — which planets to compare (defaults to all)
 * @returns {Array} sorted by importance (personal planets first, tightest orb)
 */
export function getSynastryAspects(chartA, chartB, options = {}) {
  const {
    aspectNames    = ASPECTS.map(a => a.name),
    planetsToCheck = Object.keys(PLANET_META),
  } = options;

  const posA = getLongitudes(chartA);
  const posB = getLongitudes(chartB);

  const activeAspects = ASPECTS.filter(a => aspectNames.includes(a.name));
  const results = [];
  const seen    = new Set(); // avoid exact duplicates

  // A → B and B → A
  for (const [personFrom, personTo, posFrom, posTo, labelFrom, labelTo] of [
    ['A', 'B', posA, posB, 'Person A', 'Person B'],
    ['B', 'A', posB, posA, 'Person B', 'Person A'],
  ]) {
    for (const pFrom of planetsToCheck) {
      const lonFrom = posFrom[pFrom];
      if (lonFrom == null) continue;

      for (const pTo of planetsToCheck) {
        if (pFrom === pTo && personFrom === personTo) continue;
        const lonTo = posTo[pTo];
        if (lonTo == null) continue;

        const dist = angularDist(lonFrom, lonTo);

        for (const asp of activeAspects) {
          const orb = Math.abs(dist - asp.angle);
          if (orb > asp.orb) continue;

          // Dedup key (order-independent)
          const key = [personFrom + pFrom, personTo + pTo, asp.name].sort().join('_');
          if (seen.has(key)) continue;
          seen.add(key);

          const interp = getSynastryInterpretation(pFrom, pTo, asp.name);

          results.push({
            // Who has what
            personFrom,
            personTo,
            labelFrom,
            labelTo,
            planetFrom:   pFrom,
            planetTo:     pTo,
            // Aspect details
            aspectName:   asp.name,
            symbol:       asp.symbol,
            angle:        asp.angle,
            nature:       asp.nature,
            orb:          parseFloat(orb.toFixed(2)),
            // Positions
            lonFrom:      parseFloat(lonFrom.toFixed(2)),
            lonTo:        parseFloat(lonTo.toFixed(2)),
            signFrom:     getZodiacSign(lonFrom),
            signTo:       getZodiacSign(lonTo),
            displayFrom:  getZodiacDisplay(lonFrom),
            displayTo:    getZodiacDisplay(lonTo),
            // Meta
            metaFrom:     PLANET_META[pFrom] || { label: pFrom, glyph: '?' },
            metaTo:       PLANET_META[pTo]   || { label: pTo,   glyph: '?' },
            // Importance score (for sorting)
            importance:   (planetWeight(pFrom) + planetWeight(pTo)) * asp.weight * (1 - orb / asp.orb),
            // Interpretation
            keywords:     interp.keywords,
            core:         interp.core,
          });
        }
      }
    }
  }

  // Sort by importance descending
  results.sort((a, b) => b.importance - a.importance);
  return results;
}

/**
 * Score the synastry.
 *
 * @param {Array} aspects — from getSynastryAspects()
 * @returns {{ harmony: number, tension: number, total: number, grade: string, summary: string }}
 */
export function scoreSynastry(aspects) {
  let harmonyScore  = 0;
  let tensionScore  = 0;
  let totalWeight   = 0;

  for (const asp of aspects) {
    const w = asp.importance;
    totalWeight += w;

    if (asp.nature === 'soft') {
      harmonyScore += w;
    } else if (asp.nature === 'hard') {
      tensionScore += w;
    } else {
      // Neutral (conjunction) — split based on planets involved
      const isPersonal = PERSONAL_PLANETS.includes(asp.planetFrom) &&
                         PERSONAL_PLANETS.includes(asp.planetTo);
      harmonyScore += w * 0.5;
      tensionScore += w * (isPersonal ? 0.5 : 0.3);
    }
  }

  if (totalWeight === 0) return { harmony: 50, tension: 50, total: 0, grade: 'N/A', summary: 'Not enough aspects to score.' };

  const harmonyPct = Math.round((harmonyScore / totalWeight) * 100);
  const tensionPct = Math.round((tensionScore  / totalWeight) * 100);

  // Grade
  let grade, summary;
  if (harmonyPct >= 70) {
    grade   = 'A';
    summary = 'Highly harmonious — strong natural compatibility and ease.';
  } else if (harmonyPct >= 55) {
    grade   = 'B';
    summary = 'Good compatibility with some dynamic tension — a healthy balance.';
  } else if (harmonyPct >= 40) {
    grade   = 'C';
    summary = 'Mixed — significant attraction alongside real challenges. Growth-oriented bond.';
  } else if (harmonyPct >= 25) {
    grade   = 'D';
    summary = 'More tension than ease — a challenging bond that demands conscious work.';
  } else {
    grade   = 'F';
    summary = 'High tension — this bond is intensely challenging and requires extraordinary maturity.';
  }

  return {
    harmony:  harmonyPct,
    tension:  tensionPct,
    total:    aspects.length,
    grade,
    summary,
  };
}

/**
 * Extract the most significant connections — conjunctions and oppositions
 * involving personal planets (Sun, Moon, Venus, Mars).
 *
 * @param {Array} aspects — from getSynastryAspects()
 * @param {number} limit  — max to return (default 5)
 * @returns {Array}
 */
export function getKeyConnections(aspects, limit = 5) {
  return aspects
    .filter(asp => {
      const isPrimary   = ['conjunction', 'opposition', 'trine', 'square'].includes(asp.aspectName);
      const isPersonalA = PERSONAL_PLANETS.includes(asp.planetFrom);
      const isPersonalB = PERSONAL_PLANETS.includes(asp.planetTo);
      return isPrimary && (isPersonalA || isPersonalB);
    })
    .slice(0, limit);
}

/**
 * Get aspects grouped by nature for display.
 *
 * @param {Array} aspects
 * @returns {{ soft: Array, hard: Array, neutral: Array }}
 */
export function groupAspectsByNature(aspects) {
  return {
    soft:    aspects.filter(a => a.nature === 'soft'),
    hard:    aspects.filter(a => a.nature === 'hard'),
    neutral: aspects.filter(a => a.nature === 'neutral'),
  };
}

/**
 * Get aspects grouped by person direction (A→B vs B→A).
 *
 * @param {Array} aspects
 * @returns {{ AtoB: Array, BtoA: Array }}
 */
export function groupAspectsByDirection(aspects) {
  return {
    AtoB: aspects.filter(a => a.personFrom === 'A'),
    BtoA: aspects.filter(a => a.personFrom === 'B'),
  };
}

/**
 * Generates a Composite Chart (midpoint method).
 * Calculates the shortest-arc midpoint for each planet between chartA and chartB.
 *
 * @param {Object} chartA — First person's natal data
 * @param {Object} chartB — Second person's natal data
 * @returns {Object} A map of planet keys to their composite midpoint longitude
 */
export function getCompositeChart(chartA, chartB) {
  const posA = getLongitudes(chartA);
  const posB = getLongitudes(chartB);
  const composite = {};

  const planetsToCheck = Object.keys(PLANET_META);
  for (const p of planetsToCheck) {
    if (posA[p] != null && posB[p] != null) {
      const a = posA[p];
      const b = posB[p];
      
      let diff = Math.abs(a - b);
      let mid = (a + b) / 2;
      
      if (diff > 180) {
        mid = (mid + 180) % 360;
      }
      composite[p] = parseFloat(mid.toFixed(2));
    }
  }

  return composite;
}

// ─── Exports for UI ───────────────────────────────────────────────────────────

export { PLANET_META, PERSONAL_PLANETS, ASPECTS };
