# Ephi — Remaining Fixes & Recommendations

> Companion to `EPHI_BAZI_JYOTISH_UPGRADE.md`.  
> These are the gaps **not** covered by the first document.  
> Each section includes: what's wrong, the exact fix, and the complete drop-in code.

---

## Fix 1 — `src/lib/swe.js`: Ayanamsa never set explicitly

### The Problem

`getPrecisionPositions()` sets `FLAG_SIDEREAL = 65536` when `options.sidereal` is true, but never calls `swe_set_sid_mode` to specify **which** ayanamsa. The Swiss Ephemeris WASM defaults to `SE_SIDM_FAGAN_BRADLEY` (ayanamsa 0), not Lahiri.

Fagan-Bradley vs. Lahiri differs by ~0.27° in 2024. That's enough to shift a planet from one Nakshatra to another at a boundary, and to shift Navamsa sign. Every Jyotish output in the app may be silently wrong.

### The Fix

Add `swe_set_sid_mode` to `initSwe()`, called once, right after the module loads.

```js
// src/lib/swe.js
// ADD these constants near the top with the other flag constants:

// Sidereal modes (SE_SIDM_* from swephexp.h)
const SE_SIDM_LAHIRI          = 1;   // Chitrapaksha — standard for most Jyotish
const SE_SIDM_RAMAN           = 3;   // B.V. Raman
const SE_SIDM_KRISHNAMURTI    = 5;   // KP system
const SE_SIDM_YUKTESHWAR      = 7;   // Sri Yukteshwar

// Expose current ayanamsa setting so VedicPage can display it
export let currentAyanamsa = SE_SIDM_LAHIRI;

export function setAyanamsa(mode) {
  currentAyanamsa = mode;
  // If WASM is already loaded, update it immediately
  if (wasmModule) {
    wasmModule.ccall('swe_set_sid_mode', null, ['number','number','number'], [mode, 0, 0]);
  }
}
```

```js
// src/lib/swe.js — inside initSwe(), right after wasmModule = mod:

      wasmModule = mod;

      // ✅ ADD THIS BLOCK — set Lahiri ayanamsa explicitly
      mod.ccall('swe_set_sid_mode', null, ['number','number','number'],
        [SE_SIDM_LAHIRI, 0, 0]);

      console.log('[SWE] Professional Ephemeris initialized:', _swe_version());
      console.log('[SWE] Ayanamsa: Lahiri (Chitrapaksha)');
      return mod;
```

### Also expose `swe_rise_trans` for accurate sunrise

Panchanga Hora and Choghadiya currently use caller-supplied sunrise minutes. Wrap the real function:

```js
// src/lib/swe.js — add this export after getPrecisionHouses()

/**
 * Calculate sunrise and sunset for a date and location.
 * Returns { sunrise: Date, sunset: Date } in UTC.
 *
 * @param {Date}   date  - The date (time ignored; uses noon as seed)
 * @param {number} lat   - Latitude
 * @param {number} lon   - Longitude
 */
export async function getSunriseSunset(date, lat, lon) {
  const mod = await initSwe();

  // Seed JD at noon UTC on the requested date
  const noon = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0
  ));
  const jdNoon = dateToJD(mod, noon);

  const tret  = mod._malloc(2 * 8); // double[2]: [rise, set]
  const errPtr = mod._malloc(256);

  // SE_CALC_RISE = 1, SE_CALC_SET = 2
  // body = 0 (Sun), atpress = 1013.25, attemp = 15 (standard atmosphere)
  const riseFlag = mod.ccall(
    'swe_rise_trans_wrap', 'number',
    ['number','number','number','number','number','number','number','number'],
    [jdNoon, 0, 1, lat, lon, 1013.25, 15.0, tret]
  );

  const jdRise = mod.getValue(tret, 'double');
  const jdSet  = mod.getValue(tret + 8, 'double');

  mod._free(tret);
  mod._free(errPtr);

  // Convert JD back to JS Date
  const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);

  return {
    sunrise: jdToDate(jdRise),
    sunset:  jdToDate(jdSet),
    sunriseMins: jdToDate(jdRise).getUTCHours() * 60 + jdToDate(jdRise).getUTCMinutes(),
    sunsetMins:  jdToDate(jdSet).getUTCHours()  * 60 + jdToDate(jdSet).getUTCMinutes(),
  };
}
```

> **Note:** `swe_rise_trans_wrap` must be exported from the WASM C wrapper. If the current `swisseph.wasm` build doesn't include it, use the approximation fallback below and add a TODO comment.

**Sunrise approximation fallback** (if WASM doesn't expose rise_trans):

```js
// src/lib/jyotish/panchanga.js — add this helper

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
```

---

## Fix 2 — `src/lib/baziInterpretations.js`: Ten God logic bug

### The Problem

`getTenGod()` has overlapping logic. The `if (diff === 1)` early returns are correct, but the `map` lookup below them uses a flawed key:

```js
// CURRENT — WRONG for even diffs when polarity disagrees with the map default:
return map[diff % 2 === 0 ? diff : (diff - 1 + 10) % 10] || 'Friend';
// When diff=0 and dmPolarity !== targetPolarity, map[0] = 'RobWealth' ✓
// When diff=2 and samePolarity=false, map[2] = 'HurtingOfficer' ✓
// BUT: the early returns for odd diffs (1,3,5,7,9) ignore polarity entirely.
// diff=1 always returns 'RobWealth' — but it should be 'Friend' when samePolarity.
// diff=3 always returns 'HurtingOfficer' — should be 'EatingGod' when samePolarity.
```

### The Fix — complete replacement of `getTenGod()`

```js
// src/lib/baziInterpretations.js
// Replace the existing getTenGod function entirely:

/**
 * Ten God (十神) calculation.
 *
 * The Ten Gods are determined by two axes:
 *   1. The 5-element relationship between Day Master and target stem
 *      (same, produces, controls, controlled-by, produced-by)
 *   2. Polarity (same = Yang/Yang or Yin/Yin; different = Yang/Yin)
 *
 * Element relationship is determined by stem INDEX position:
 *   diff 0,1  → Same element    (diff 0: same stem group)
 *   diff 2,3  → DM produces it  (Wood produces Fire: Jia→Bing = diff 2)
 *   diff 4,5  → DM controls it  (Wood controls Earth: Jia→Wu = diff 4)
 *   diff 6,7  → It controls DM  (Metal controls Wood: Jia→Geng = diff 6)
 *   diff 8,9  → It produces DM  (Water produces Wood: Jia→Ren = diff 8)
 */
function getTenGod(dmStem, targetStem) {
  const STEMS = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];

  const dmIdx     = STEMS.indexOf(dmStem);
  const targetIdx = STEMS.indexOf(targetStem);

  if (dmIdx === -1 || targetIdx === -1) return 'Unknown';

  const diff         = (targetIdx - dmIdx + 10) % 10;
  const samePolarity = (dmIdx % 2) === (targetIdx % 2);

  // Ten God table indexed by [elementRelationship][polarity]
  // elementRelationship = Math.floor(diff / 2), polarity = samePolarity
  const TEN_GOD_TABLE = [
    // diff 0,1 — Same element
    { same: 'Friend',         diff: 'RobWealth'       },
    // diff 2,3 — DM produces target
    { same: 'EatingGod',      diff: 'HurtingOfficer'  },
    // diff 4,5 — DM controls target
    { same: 'IndirectWealth', diff: 'DirectWealth'    },
    // diff 6,7 — Target controls DM
    { same: 'SevenKillings',  diff: 'DirectOfficer'   },
    // diff 8,9 — Target produces DM
    { same: 'IndirectResource', diff: 'DirectResource' },
  ];

  const relationship = Math.floor(diff / 2); // 0–4
  return samePolarity
    ? TEN_GOD_TABLE[relationship].same
    : TEN_GOD_TABLE[relationship].diff;
}
```

### Verification table

| Day Master | Target Stem | Expected Ten God |
|---|---|---|
| Jia (Wood+) | Jia (Wood+) | Friend (same element, same polarity) |
| Jia (Wood+) | Yi (Wood-)  | Rob Wealth (same element, diff polarity) |
| Jia (Wood+) | Bing (Fire+)| Eating God (DM produces, same polarity) |
| Jia (Wood+) | Ding (Fire-)| Hurting Officer (DM produces, diff polarity) |
| Jia (Wood+) | Wu (Earth+) | Indirect Wealth (DM controls, same polarity) |
| Jia (Wood+) | Ji (Earth-) | Direct Wealth (DM controls, diff polarity) |
| Jia (Wood+) | Geng (Metal+)| Seven Killings (controls DM, same polarity) |
| Jia (Wood+) | Xin (Metal-)| Direct Officer (controls DM, diff polarity) |
| Jia (Wood+) | Ren (Water+)| Indirect Resource (produces DM, same polarity) |
| Jia (Wood+) | Gui (Water-)| Direct Resource (produces DM, diff polarity) |

---

## Fix 3 — `src/lib/baziInterpretations.js`: Day Master strength missing

### The Problem

`analyzeBazi()` identifies the dominant element and missing elements but never determines if the Day Master is **strong (旺/相)** or **weak (休/囚/死)**. This is the single most important diagnosis — it determines whether favorable gods are wealth/officer (strong DM) or resource/companion (weak DM). Without it, Ten God recommendations are incomplete.

### The Fix — add `getDayMasterStrength()` and call it from `analyzeBazi()`

```js
// src/lib/baziInterpretations.js
// Add this entire block before the analyzeBazi() function:

// ─── Seasonal element strength table ──────────────────────────────────────
// For each month branch (season), which elements are Wang/Xiang/Xiu/Qiu/Si
// Wang (旺) = 3pts, Xiang (相) = 2pts, Xiu (休) = 1pt, Qiu (囚) = 0.5pt, Si (死) = 0pt

const SEASONAL_STRENGTH = {
  // Branch:    Wood  Fire  Earth Metal Water
  Yin:         [3,    2,    1,    0,    0.5  ],  // Spring: Wood Wang
  Mao:         [3,    2,    1,    0,    0.5  ],
  Chen:        [1,    2,    3,    0.5,  0    ],  // Earth season transition
  Si:          [0,    3,    2,    1,    0    ],  // Summer: Fire Wang
  Wu:          [0,    3,    2,    1,    0    ],
  Wei:         [0.5,  2,    3,    1,    0    ],  // Earth transition
  Shen:        [0,    0,    1,    3,    2    ],  // Autumn: Metal Wang
  You:         [0,    0,    1,    3,    2    ],
  Xu:          [0.5,  0,    3,    2,    0    ],  // Earth transition
  Hai:         [2,    0,    0,    0.5,  3    ],  // Winter: Water Wang
  Zi:          [2,    0,    0,    0.5,  3    ],
  Chou:        [1,    0,    3,    2,    0.5  ],  // Earth transition
};

const ELEMENT_INDEX = { Wood: 0, Fire: 1, Earth: 2, Metal: 3, Water: 4 };

// Element production cycle: Wood→Fire→Earth→Metal→Water→Wood
const PRODUCES = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
// Element control cycle: Wood→Earth→Water→Fire→Metal→Wood
const CONTROLS = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };

/**
 * Determine if the Day Master is strong or weak.
 *
 * Scoring:
 *   1. Season (month branch) provides the base wang/xiang score for the DM element.
 *   2. Each stem that matches DM element or produces DM element adds support.
 *   3. Each branch's main hidden stem contributes a fraction.
 *   4. Roots (DM element in any branch's hidden stems) add significant support.
 *
 * Returns: { strength: 'strong'|'weak'|'neutral', score, rootCount, supportCount }
 */
function getDayMasterStrength(pillars) {
  const STEMS_LIST  = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  const STEM_EL = { Jia:'Wood',Yi:'Wood',Bing:'Fire',Ding:'Fire',Wu:'Earth',Ji:'Earth',Geng:'Metal',Xin:'Metal',Ren:'Water',Gui:'Water' };
  const HIDDEN  = {
    Zi:['Gui'], Chou:['Ji','Xin','Gui'], Yin:['Jia','Bing','Wu'], Mao:['Yi'],
    Chen:['Wu','Yi','Gui'], Si:['Bing','Geng','Wu'], Wu:['Ding','Ji'],
    Wei:['Ji','Ding','Yi'], Shen:['Geng','Ren','Wu'], You:['Xin'],
    Xu:['Wu','Xin','Ding'], Hai:['Ren','Jia']
  };

  const dmEl     = STEM_EL[pillars.day.stem];
  const monthBr  = pillars.month.branch;
  const dmElIdx  = ELEMENT_INDEX[dmEl];

  // 1. Seasonal base score (most important factor, ~40% weight)
  let score     = (SEASONAL_STRENGTH[monthBr]?.[dmElIdx] ?? 1) * 10;
  let rootCount = 0;
  let supportCount = 0;

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.hour];

  // 2. Stem support — stems that share DM element or produce DM element
  for (const p of allPillars) {
    if (p === pillars.day) continue; // Day stem is the DM itself, don't count it
    const stemEl = STEM_EL[p.stem];
    if (stemEl === dmEl) { score += 6; supportCount++; }          // Same element: companion/friend
    else if (PRODUCES[stemEl] === dmEl) { score += 4; supportCount++; } // Produces DM: resource
  }

  // 3. Branch hidden stem roots — DM element appearing in hidden stems
  for (const p of allPillars) {
    const hidden = HIDDEN[p.branch] || [];
    const mainStemEl  = STEM_EL[hidden[0]];
    const midStemEl   = STEM_EL[hidden[1]];
    const resStemEl   = STEM_EL[hidden[2]];

    if (mainStemEl === dmEl) { score += 5; rootCount++; }         // Main qi root
    else if (mainStemEl && PRODUCES[mainStemEl] === dmEl) score += 2; // Main qi produces DM
    if (midStemEl === dmEl) { score += 3; rootCount++; }          // Middle qi root
    if (resStemEl === dmEl) { score += 1; rootCount++; }          // Residual qi root
  }

  // Score thresholds (empirically calibrated — adjust if needed)
  // Strong: score >= 30, Weak: score < 20, Neutral: 20–29
  const strength = score >= 30 ? 'strong' : score < 20 ? 'weak' : 'neutral';

  return { strength, score, rootCount, supportCount,
    usefulGods: strength === 'strong'
      ? ['DirectWealth','IndirectWealth','DirectOfficer','SevenKillings','HurtingOfficer']
      : ['DirectResource','IndirectResource','Friend','RobWealth','EatingGod']
  };
}
```

Then update `analyzeBazi()` to include it:

```js
// src/lib/baziInterpretations.js — inside analyzeBazi(), after the tenGods block:

  const dmStrength = getDayMasterStrength(pillars);

  return {
    dayMaster: {
      label:    pillars.day.label,
      element:  dmEl,
      traits:   ELEMENT_TRAITS[dmEl],
      // ✅ ADD:
      strength: dmStrength.strength,
      strengthScore: dmStrength.score,
      rootCount:     dmStrength.rootCount,
      usefulGods:    dmStrength.usefulGods,
      strengthSummary: dmStrength.strength === 'strong'
        ? `Your ${dmEl} Day Master is strong this season (score ${dmStrength.score}). Wealth, Officer, and Output stars are your useful gods — lean into ambition and external achievement.`
        : dmStrength.strength === 'weak'
        ? `Your ${dmEl} Day Master is weak this season (score ${dmStrength.score}). Resource and Companion stars are your useful gods — prioritize support, learning, and building reserves.`
        : `Your ${dmEl} Day Master is in balance this season (score ${dmStrength.score}). The chart is relatively even — context and Luck Pillar determine the useful god.`
    },
    tenGods,
    dominant,
    missing,
    elementCounts: counts,
    professionalReport: { ... } // unchanged
  };
```

---

## Fix 4 — `src/pages/VedicPage.jsx`: No house occupancy table

### The Problem

The page shows Nakshatra placements but never tells the user **which house** each planet is in relative to the Lagna. This is the backbone of every Jyotish chart reading — "Jupiter in the 9th" means something completely different from "Jupiter in the 5th."

### The Fix

Add a house occupancy table. The logic is simple: compare each planet's sign to the Lagna sign.

```js
// src/pages/VedicPage.jsx
// Add this import at the top:
import { getBhavaLord } from '../lib/vedic.js';

// Add this helper inside the component (or in vedic.js and import it):
function getPlanetHouse(planetSignIndex, lagnaSignIndex) {
  return ((planetSignIndex - lagnaSignIndex + 12) % 12) + 1; // 1–12
}

// Inside calculateVedic(), after building d1Planets, add:
const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const houseOccupancy = {}; // house number → [planet keys]
const planetHouses   = {}; // planet key → house number

ALL_PLANETS.forEach(key => {
  if (rawPositions[key] === undefined) return;
  const lon      = rawPositions[key];
  const signIdx  = Math.floor(lon / 30);
  const house    = getPlanetHouse(signIdx, ascSignIdx);
  planetHouses[key] = house;
  if (!houseOccupancy[house]) houseOccupancy[house] = [];
  houseOccupancy[house].push(key);
});

// Build house lord table
const houseLords = {};
for (let h = 1; h <= 12; h++) {
  houseLords[h] = getBhavaLord(SIGNS[ascSignIdx], h);
}

// Add to setVedicData():
setVedicData({
  d1Planets, d9Planets, nakshatras, ascSignIndex: ascSignIdx,
  ascNavamsaIndex: ascNavamsa.signIndex,
  planetHouses,      // ✅ new
  houseOccupancy,    // ✅ new
  houseLords,        // ✅ new
});
```

Add this JSX block in the right column of VedicPage, after the Nakshatra section:

```jsx
{/* House Occupancy Table */}
<div className="card" style={{ padding: '2rem' }}>
  <div className="form-label" style={{ marginBottom: '1.5rem' }}>
    Bhava Occupancy (Houses)
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
    {Array.from({ length: 12 }, (_, i) => i + 1).map(house => {
      const lord    = vedicData.houseLords[house];
      const planets = vedicData.houseOccupancy[house] || [];
      const HOUSE_MEANINGS = {
        1:'Self & body', 2:'Wealth & speech', 3:'Courage & siblings',
        4:'Home & mother', 5:'Intelligence & children', 6:'Enemies & health',
        7:'Marriage & partnership', 8:'Transformation & longevity',
        9:'Dharma & father', 10:'Career & status', 11:'Gains & networks',
        12:'Liberation & loss'
      };
      return (
        <div key={house} className="ephi-card" style={{
          padding: '0.75rem',
          borderTop: `2px solid ${planets.length > 0 ? 'var(--accent)' : 'var(--border-color)'}`,
          opacity: planets.length === 0 ? 0.6 : 1
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            House {house}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
            {HOUSE_MEANINGS[house]}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Lord: <span style={{ color: 'var(--text-primary)', fontWeight: 600,
              textTransform: 'capitalize' }}>{lord?.lord}</span>
            <span style={{ color: 'var(--text-muted)' }}> ({lord?.sign})</span>
          </div>
          {planets.length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {planets.map(p => (
                <span key={p} style={{
                  fontSize: '0.7rem', fontWeight: 700,
                  padding: '0.15rem 0.4rem', borderRadius: '4px',
                  background: 'var(--accent)', color: '#fff', textTransform: 'capitalize'
                }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>
```

---

## Fix 5 — `src/pages/ElectionalPage.jsx`: Wire in Jyotish Muhurta scoring

### The Problem

`scoreMoment()` is entirely Western. The new `scoreMuhurta()` from `muhurta.js` (in the first upgrade doc) exists but is never called. The page also doesn't calculate sunrise/sunset at all.

### The Fix

Add a parallel Jyotish scoring panel. Keep the Western score — don't replace it, run both.

```js
// src/pages/ElectionalPage.jsx
// Add imports at top:
import { getPrecisionPositions } from '../lib/swe.js';
import { getSunriseSunset } from '../lib/swe.js';
import { getPanchanga, getHora, getChoghadiya, getKalaStatus,
         approximateSunriseSunset } from '../lib/jyotish/panchanga.js';
import { scoreMuhurta } from '../lib/jyotish/muhurta.js';

// Add state:
const [jyotishScore, setJyotishScore] = useState(null);
const [jyotishLoading, setJyotishLoading] = useState(false);

// Add this function inside the component:
async function calculateJyotishScore(date, lat, lon, purpose, natalData) {
  setJyotishLoading(true);
  try {
    // Get sidereal positions
    const positions = await getPrecisionPositions(date, { sidereal: true });
    const sunLon    = positions.sun.longitude;
    const moonLon   = positions.moon.longitude;

    // Get sunrise/sunset (try SWE first, fall back to approximation)
    let sunriseMins, sunsetMins;
    try {
      const sr = await getSunriseSunset(date, lat, lon);
      sunriseMins = sr.sunriseMins;
      sunsetMins  = sr.sunsetMins;
    } catch {
      const approx = approximateSunriseSunset(date, lat);
      sunriseMins  = approx.sunriseMins;
      sunsetMins   = approx.sunsetMins;
    }

    const panchanga  = getPanchanga(sunLon, moonLon, date);
    const hora       = getHora(date, sunriseMins, sunsetMins);
    const choghadiya = getChoghadiya(date, sunriseMins, sunsetMins);
    const kala       = getKalaStatus(date, sunriseMins, sunsetMins);
    const result     = scoreMuhurta(panchanga, hora, choghadiya, kala, purpose, natalData);

    setJyotishScore(result);
  } catch (err) {
    console.error('Jyotish score error:', err);
  } finally {
    setJyotishLoading(false);
  }
}
```

Call `calculateJyotishScore` wherever `scoreMoment` is currently called (the scan loop), passing the same date and purpose.

Add this JSX panel alongside the existing Western score display:

```jsx
{jyotishScore && (
  <div className="card" style={{
    borderTop: `4px solid ${
      jyotishScore.grade === 'A' ? 'var(--harmonic)' :
      jyotishScore.grade === 'B' ? 'var(--accent)' :
      jyotishScore.grade === 'D' ? 'var(--tense)' : 'var(--border-color)'
    }`
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '1rem' }}>
      <div className="card-title" style={{ margin: 0 }}>Muhurta (Jyotish)</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '2rem', fontWeight: 900 }}>{jyotishScore.score}</span>
        <span className="pill" style={{
          background: jyotishScore.grade === 'A' ? 'var(--harmonic)' :
                      jyotishScore.grade === 'B' ? 'var(--accent)' :
                      jyotishScore.grade === 'D' ? 'var(--tense)' : 'var(--border-color)',
          color: '#fff', fontSize: '1.1rem', fontWeight: 800
        }}>{jyotishScore.grade}</span>
      </div>
    </div>

    {/* Panchanga summary */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem',
      marginBottom: '1rem' }}>
      {[
        { label: 'Tithi', value: jyotishScore.panchanga.tithi.name,
          good: jyotishScore.panchanga.tithi.isAuspicious },
        { label: 'Vara', value: jyotishScore.panchanga.vara.name,
          good: jyotishScore.panchanga.vara.isAuspicious },
        { label: 'Nakshatra', value: jyotishScore.panchanga.nakshatra.name, good: true },
        { label: 'Yoga', value: jyotishScore.panchanga.yoga.name,
          good: jyotishScore.panchanga.yoga.isAuspicious },
        { label: 'Karana', value: jyotishScore.panchanga.karana.name,
          good: jyotishScore.panchanga.karana.quality === 'auspicious' },
      ].map(item => (
        <div key={item.label} style={{ textAlign: 'center', padding: '0.5rem',
          borderRadius: '6px', background: item.good ? 'var(--harmonic-subtle)' : 'var(--tense-subtle)' }}>
          <div style={{ fontSize: '0.65rem', textTransform: 'uppercase',
            letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{item.label}</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, marginTop: '0.2rem' }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>

    {/* Warnings */}
    {jyotishScore.warnings.length > 0 && (
      <div style={{ marginBottom: '0.75rem' }}>
        {jyotishScore.warnings.map((w, i) => (
          <div key={i} style={{ fontSize: '0.8rem', color: 'var(--tense)',
            padding: '0.3rem 0', borderBottom: '1px solid var(--border-color)' }}>
            ⚠ {w}
          </div>
        ))}
      </div>
    )}

    {/* Reasons */}
    {jyotishScore.reasons.length > 0 && (
      <div>
        {jyotishScore.reasons.slice(0, 4).map((r, i) => (
          <div key={i} style={{ fontSize: '0.8rem', color: 'var(--harmonic)',
            padding: '0.3rem 0', borderBottom: '1px solid var(--border-color)' }}>
            ✦ {r}
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

---

## Fix 6 — `src/lib/gemini.js`: Vedic AI prompt sends too little data

### The Problem

`generateVedicReading()` sends only 4 fields to Gemini:
- `ascNakshatra.name`
- `moonNakshatra.name`
- `mahadasha`
- `antardasha`

No planet signs, no house positions, no Panchanga, no Pratyantardasha, no Dasha end dates. The AI reading is therefore very generic — it can only discuss the Lagna Nakshatra and Moon Nakshatra in isolation.

### The Fix

Extend the prompt with the full chart context. In `src/lib/gemini.js`:

```js
// src/lib/gemini.js — replace generateVedicReading with this:

export async function generateVedicReading({
  name, mahadasha, antardasha, pratyantardasha,
  mahaEnd, antarEnd,
  ascNakshatra, moonNakshatra,
  lagnaSign, moonSign, sunSign,
  planetHouses,   // { sun: 1, moon: 4, mars: 7, ... }
  planetSigns,    // { sun: 'Aries', moon: 'Cancer', ... }
  planetDignities,// { sun: 'exalted', moon: 'neutral', ... }
  panchanga,      // today's Panchanga (optional, for transit context)
}) {
  const libraryBooks = getBookForTool('vedic');
  const validUris    = libraryBooks.map(b => b.uri).filter(u => u !== 'pending_upload');

  // Build planet placement string
  const placements = Object.entries(planetHouses || {})
    .map(([p, h]) => {
      const sign    = planetSigns?.[p]    || '';
      const dignity = planetDignities?.[p] ? ` [${planetDignities[p]}]` : '';
      return `${p.charAt(0).toUpperCase()+p.slice(1)}: House ${h} (${sign})${dignity}`;
    })
    .join('\n  ');

  const prompt = `You are a world-class Jyotishi trained in the Parashara tradition. You deliver precise, philosophically rich, and practically actionable Vedic readings grounded in classical texts.

${libraryBooks.length > 0 ? `CRITICAL: Base your analysis on the principles in the attached documents (${libraryBooks.map(b=>b.name).join(', ')}).` : ''}

═══ BIRTH CHART (SIDEREAL / LAHIRI) ═══
Name: ${name || 'The native'}
Lagna (Ascendant): ${lagnaSign || 'Unknown'} — Nakshatra: ${ascNakshatra?.name || 'Unknown'} (Pada ${ascNakshatra?.pada || '?'})
Moon: ${moonSign || 'Unknown'} — Nakshatra: ${moonNakshatra?.name || 'Unknown'} (Pada ${moonNakshatra?.pada || '?'})
Sun: ${sunSign || 'Unknown'}

Planetary Placements:
  ${placements || 'Not provided'}

═══ CURRENT DASHA TIMELINE ═══
Mahadasha:       ${mahadasha} (ends ${mahaEnd || 'unknown'})
Antardasha:      ${antardasha} (ends ${antarEnd || 'unknown'})
Pratyantardasha: ${pratyantardasha || 'Not calculated'}

${panchanga ? `═══ TODAY'S PANCHANGA ═══
Tithi: ${panchanga.tithi.name} (${panchanga.tithi.paksha} Paksha)
Moon Nakshatra today: ${panchanga.nakshatra.name}
Yoga: ${panchanga.yoga.name}
` : ''}

Write a sophisticated, non-generic Jyotish reading (~500–700 words). Use classical Vedic concepts (dharma, karma, gunas, yogas, upaya). Be specific to their actual placements — do not give generic Sun/Moon sign readings.

Structure with these exact markdown headers:

**1. The Natal Blueprint (Lagna, Moon & Key Placements)**
Analyze the Lagna Nakshatra as the vehicle of the soul, the Moon Nakshatra as the mind's lens, and 2–3 key planetary placements (especially any exalted, debilitated, or yogakaraka planets). What is the fundamental life orientation this chart creates?

**2. The Current Karmic Season (Dasha Analysis)**
Analyze the ${mahadasha} Mahadasha as the overarching karmic theme. Specifically, how does the ${antardasha} Antardasha (sub-lord) focus and filter that energy right now? Which houses do these planets rule in this chart — and what domains of life are being activated? If Pratyantardasha is provided, briefly note its flavor.

**3. Key Yogas & Chart Strengths**
Identify any notable Raj Yogas, Dhana Yogas, or Viparita Raj Yogas visible in the chart based on house lord positions. Note any planets in their own sign or exaltation.

**4. Practical Prescriptions (Upaya)**
Suggest 3 specific, classical remedies: one Mantra (with the Sanskrit name), one Gemstone/color/metal, and one behavioral/lifestyle practice aligned to strengthen the current Dasha lord and support their chart's needs.

Address the user as "you." Use an authoritative, warm, mystical-but-grounded tone.`;

  const text = await callGemini(prompt, 1200, null, validUris);
  return { text, timestamp: new Date().toISOString() };
}
```

Then in `VedicPage.jsx`, update `handleGenerateInsight()`:

```js
const result = await generateVedicReading({
  name:             natalName,
  mahadasha:        dashaData.mahadasha,
  antardasha:       dashaData.antardasha,
  pratyantardasha:  dashaData.pratyantardasha,  // now available from new vedic.js
  mahaEnd:          dashaData.mahaEnd,
  antarEnd:         dashaData.antarEnd,
  ascNakshatra:     vedicData.nakshatras['asc'],
  moonNakshatra:    vedicData.nakshatras['moon'],
  lagnaSign:        SIGNS[vedicData.ascSignIndex],
  moonSign:         SIGNS[Math.floor((rawPositions.moon?.longitude ?? 0) / 30)],
  sunSign:          SIGNS[Math.floor((rawPositions.sun?.longitude  ?? 0) / 30)],
  planetHouses:     vedicData.planetHouses,
  planetSigns:      Object.fromEntries(
    Object.entries(vedicData.planetHouses).map(([p]) => [
      p, SIGNS[Math.floor((rawPositions[p]?.longitude ?? 0) / 30)]
    ])
  ),
  planetDignities:  Object.fromEntries(
    Object.entries(vedicData.planetHouses).map(([p]) => [
      p, getPlanetDignity(p, SIGNS[Math.floor((rawPositions[p]?.longitude ?? 0) / 30)])
    ])
  ),
});
```

---

## Fix 7 — `functions/index.js`: Gemini model string is wrong

### The Problem

```js
// CURRENT:
const { prompt, model = 'gemini-3.1-pro-preview' } = req.body;
```

`gemini-3.1-pro-preview` does not exist. The current model strings as of mid-2025 are:
- `gemini-2.5-pro-preview-05-06`
- `gemini-2.0-flash`
- `gemini-1.5-pro`

If the frontend doesn't send a model string and the default fires, the function returns a 404 which `oracle.js` silently eats.

### The Fix

```js
// functions/index.js — update the default:
const { prompt, model = 'gemini-2.5-pro-preview-05-06' } = req.body;
```

Also add explicit error logging for 404 so it's visible:

```js
// CURRENT:
if (response.status === 404) {
  return res.status(404).json({ error: 404 });
}

// REPLACE WITH:
if (response.status === 404) {
  console.error(`[Firebase] Gemini model not found: "${model}". Check model string.`);
  return res.status(404).json({
    error: `Model "${model}" not found. Update the model string in functions/index.js.`
  });
}
```

---

## Fix 8 — `src/pages/HoraryPage.jsx`: Add Prashna Jyotish mode

### The Problem

HoraryPage is 100% William Lilly / Western. There's no Prashna (Vedic horary) option, despite the app having a full Vedic section. This is the biggest feature gap given how intuitive Prashna is for users already familiar with the Vedic system.

### Minimum Viable Prashna Engine

Create `src/lib/jyotish/prashna.js`:

```js
/**
 * src/lib/jyotish/prashna.js
 *
 * Prashna Jyotish — Vedic Horary Astrology.
 *
 * Classical Prashna uses the sidereal chart cast for the moment of the question.
 * The Lagna lord and Moon represent the querent.
 * The house governing the question topic represents the matter asked about.
 * Key aspects: Ithasala (applying), Musaripha (separating), Nakta (transfer of light).
 *
 * Based on: Prashna Marga, Kerala tradition.
 */

import { getNakshatra, DASHA_SEQUENCE, getPlanetDignity } from '../vedic.js';
import { getPanchanga } from './panchanga.js';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
               'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

// Traditional lords (no outer planets in Prashna)
const SIGN_LORDS = {
  Aries:'mars', Taurus:'venus', Gemini:'mercury', Cancer:'moon',
  Leo:'sun', Virgo:'mercury', Libra:'venus', Scorpio:'mars',
  Sagittarius:'jupiter', Capricorn:'saturn', Aquarius:'saturn', Pisces:'jupiter'
};

// Average daily motion (degrees/day) for timing
const PLANET_SPEED = {
  moon:10.5, sun:1.0, mercury:1.2, venus:1.1, mars:0.52,
  jupiter:0.083, saturn:0.034, rahu:0.053, ketu:0.053
};

// Prashna house topics (same as Western but with Vedic framing)
export const PRASHNA_HOUSE_TOPICS = {
  1:  ['self','querent','body','general health','personality'],
  2:  ['wealth','savings','family','food','speech','second marriage'],
  3:  ['courage','siblings','short journey','communication','effort'],
  4:  ['home','mother','property','happiness','vehicle','education'],
  5:  ['children','intelligence','speculation','past life merit','creativity'],
  6:  ['enemies','disease','debt','competition','legal disputes','service'],
  7:  ['marriage','partnership','spouse','business partner','opponent'],
  8:  ['death','longevity','inheritance','transformation','chronic illness','hidden things'],
  9:  ['dharma','father','pilgrimage','fortune','guru','long journey'],
  10: ['career','status','government','public life','profession','authority'],
  11: ['gains','friends','elder siblings','wishes','income','fulfilment'],
  12: ['loss','liberation','foreign land','sleep','secret enemies','expenditure'],
};

/**
 * Guess the Prashna house from a question string.
 */
export function guessQuestionHouse(question) {
  const q = question.toLowerCase();
  const KEYWORDS = {
    2:  ['money','wealth','finance','salary','loan','income','save','job offer','investment'],
    3:  ['travel','trip','journey','sibling','brother','sister','message','call'],
    4:  ['house','home','property','mother','real estate','move','relocate'],
    5:  ['child','children','pregnant','pregnancy','exam','study','creative','speculation'],
    6:  ['health','sick','disease','enemy','enemy','court','lawsuit','job'],
    7:  ['marriage','relationship','partner','spouse','love','divorce','contract'],
    8:  ['death','inheritance','surgery','chronic','accident','secret'],
    9:  ['abroad','foreign','father','religion','luck','fortune','pilgrimage'],
    10: ['career','job','promotion','business','work','reputation','boss','government'],
    11: ['wish','desire','friend','gain','profit','income','goal'],
    12: ['loss','expense','hospital','foreign','isolation','prison','meditation'],
  };
  for (const [house, words] of Object.entries(KEYWORDS)) {
    if (words.some(w => q.includes(w))) return parseInt(house);
  }
  return 1; // default to Lagna
}

/**
 * Analyze a Prashna (Vedic horary) chart.
 *
 * @param {object} params
 * @param {string} params.question          - The question text
 * @param {object} params.siderealPositions - Planet longitudes (sidereal, from SWE)
 * @param {number} params.lagnaLongitude    - Sidereal Lagna longitude
 * @param {object} params.panchanga         - Output of getPanchanga()
 * @param {Date}   params.questionTime      - Moment of question
 */
export function analyzePrashna({ question, siderealPositions, lagnaLongitude, panchanga, questionTime }) {
  const lagnaSignIdx = Math.floor(lagnaLongitude / 30);
  const lagnaSign    = SIGNS[lagnaSignIdx];
  const lagnaLord    = SIGN_LORDS[lagnaSign];

  const targetHouse  = guessQuestionHouse(question);
  const targetSignIdx = (lagnaSignIdx + targetHouse - 1) % 12;
  const targetSign    = SIGNS[targetSignIdx];
  const targetLord    = SIGN_LORDS[targetSign];

  const moonLon = siderealPositions.moon?.longitude ?? 0;
  const moonNak = getNakshatra(moonLon);

  // Planet dignities
  const dignities = {};
  for (const [p, data] of Object.entries(siderealPositions)) {
    const signIdx = Math.floor(((data.longitude ?? 0) % 360) / 30);
    dignities[p] = getPlanetDignity(p, SIGNS[signIdx]);
  }

  // ── Strictures (Considerations before judgment) ──────────────────────────
  const strictures = [];

  // 1. Moon in Via Combusta (15° Libra – 15° Scorpio = 195°–225°)
  if (moonLon >= 195 && moonLon <= 225) {
    strictures.push({ type: 'Via Combusta', severity: 'moderate',
      text: 'Moon is in Via Combusta (15° Libra–15° Scorpio). The querent may be confused or distressed. Proceed with caution.' });
  }

  // 2. Moon Void of Course (no applying aspects before leaving sign)
  // Simplified: check if Moon speed > 0 and has applying aspects
  const moonSpeed = siderealPositions.moon?.speed ?? 10;
  if (Math.abs(moonSpeed) < 0.5) {
    strictures.push({ type: 'Slow Moon', severity: 'low',
      text: 'Moon is moving unusually slowly. The matter may be delayed or the querent is in a period of inertia.' });
  }

  // 3. Early/late Lagna (within 3° of sign boundary)
  const lagnaInSign = lagnaLongitude % 30;
  if (lagnaInSign < 3) {
    strictures.push({ type: 'Early Lagna', severity: 'moderate',
      text: 'Lagna is in the first 3° of the sign. The matter may not yet be ready to be judged, or the querent has just become aware of it.' });
  }
  if (lagnaInSign > 27) {
    strictures.push({ type: 'Late Lagna', severity: 'moderate',
      text: 'Lagna is in the last 3° of the sign. The matter may be past the point of resolution — it may already be decided.' });
  }

  // ── Significators ────────────────────────────────────────────────────────
  const querentsSignificators = [lagnaLord, 'moon']; // Lagna lord + Moon always represent querent
  const matterSignificators   = [targetLord];

  // ── Applying aspect (Ithasala) ────────────────────────────────────────────
  // Key question: does the querent's significator apply to the matter's significator?
  const ithasala = checkIthasala(
    lagnaLord, targetLord, siderealPositions
  );

  // ── Moon's applying aspect ────────────────────────────────────────────────
  const moonIthasala = checkIthasala('moon', targetLord, siderealPositions);

  // ── Verdict ───────────────────────────────────────────────────────────────
  const panchangaFavorable = panchanga.favorableCount >= 3;
  const lagnaLordStrong    = ['own','exalted'].includes(dignities[lagnaLord]);
  const moonStrong         = ['own','exalted'].includes(dignities['moon']);
  const targetLordStrong   = ['own','exalted'].includes(dignities[targetLord]);
  const hasIthasala        = ithasala.applies || moonIthasala.applies;

  let verdict, confidence;

  if (strictures.some(s => s.severity === 'moderate') && !hasIthasala) {
    verdict    = 'unclear';
    confidence = 'low';
  } else if (hasIthasala && panchangaFavorable && (lagnaLordStrong || moonStrong)) {
    verdict    = 'yes';
    confidence = lagnaLordStrong && moonStrong ? 'high' : 'moderate';
  } else if (!hasIthasala && !panchangaFavorable) {
    verdict    = 'no';
    confidence = 'moderate';
  } else if (hasIthasala && !panchangaFavorable) {
    verdict    = 'yes_with_obstacles';
    confidence = 'moderate';
  } else {
    verdict    = 'unclear';
    confidence = 'low';
  }

  // ── Timing ────────────────────────────────────────────────────────────────
  let timing = null;
  const activeAspect = ithasala.applies ? ithasala : moonIthasala;
  if (activeAspect.applies && activeAspect.orb != null) {
    const orbDeg = activeAspect.orb;
    // Timing in Prashna: orb degrees ÷ slower planet's speed
    const slowerSpeed = Math.min(
      PLANET_SPEED[lagnaLord] ?? 1,
      PLANET_SPEED[targetLord] ?? 1
    );
    const days = orbDeg / slowerSpeed;
    timing = days < 7    ? `Within days (est. ${Math.round(days)} days)` :
             days < 30   ? `Within weeks (est. ${Math.round(days)} days)` :
             days < 90   ? `Within 1–3 months` : `Several months or longer`;
  }

  return {
    question,
    targetHouse,
    targetSign,
    lagnaSign,
    lagnaLord,
    targetLord,
    moonNakshatra: moonNak.name,
    strictures,
    ithasala,
    moonIthasala,
    dignities,
    panchangaSummary: {
      favorable: panchanga.favorableCount,
      quality:   panchanga.overallQuality
    },
    verdict,
    confidence,
    timing,
    summary: buildPrashnaSummary(verdict, confidence, timing, lagnaLord, targetLord, targetHouse)
  };
}

function checkIthasala(planet1, planet2, positions) {
  const p1 = positions[planet1];
  const p2 = positions[planet2];
  if (!p1 || !p2) return { applies: false };

  const lon1   = p1.longitude ?? 0;
  const lon2   = p2.longitude ?? 0;
  const speed1 = p1.speed ?? (PLANET_SPEED[planet1] ?? 1);
  const speed2 = p2.speed ?? (PLANET_SPEED[planet2] ?? 1);

  // Angular separation
  const diff = ((lon2 - lon1 + 360) % 360);
  const orb  = diff < 180 ? diff : 360 - diff;

  // Applying: faster planet is behind slower planet and moving toward it
  // (in the same sign, within 13°)
  const isApplying = orb < 13 && speed1 > speed2;

  return { applies: isApplying && orb < 13, orb: parseFloat(orb.toFixed(2)), planet1, planet2 };
}

function buildPrashnaSummary(verdict, confidence, timing, lagnaLord, targetLord, house) {
  const V = {
    yes:              `✦ The chart is favorable. The ${lagnaLord} (you) and ${targetLord} (House ${house} matter) indicate a positive outcome.`,
    yes_with_obstacles:`✧ The chart is favorable but obstacles exist. The matter will likely succeed with effort and patience.`,
    no:               `✗ The chart does not support the matter coming to fruition at this time.`,
    unclear:          `◌ The chart is unclear. Either the time is not right to judge, or the matter is genuinely uncertain.`,
  };
  const timingText = timing ? ` Timing: ${timing}.` : '';
  const conf       = confidence === 'high' ? ' (High confidence)' : confidence === 'low' ? ' (Low confidence)' : '';
  return `${V[verdict] || V.unclear}${timingText}${conf}`;
}
```

Then add a **"Prashna Mode"** toggle to `HoraryPage.jsx`:

```jsx
// src/pages/HoraryPage.jsx — add at top of component:
const [mode, setMode] = useState('western'); // 'western' | 'prashna'

// Add mode toggle in the UI header area:
<div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
  {['western','prashna'].map(m => (
    <button key={m} onClick={() => setMode(m)} className="pill" style={{
      background: mode === m ? 'var(--accent)' : 'var(--surface-sunken)',
      color: mode === m ? '#fff' : 'var(--text-primary)',
      border: 'none', cursor: 'pointer', textTransform: 'capitalize'
    }}>
      {m === 'western' ? 'Lilly (Western)' : 'Prashna (Jyotish)'}
    </button>
  ))}
</div>

// In the submit handler — when mode === 'prashna':
import { analyzePrashna } from '../lib/jyotish/prashna.js';
import { getPrecisionPositions, getPrecisionHouses } from '../lib/swe.js';
import { getPanchanga } from '../lib/jyotish/panchanga.js';

// Inside the async submit:
if (mode === 'prashna') {
  const now      = new Date();
  const positions = await getPrecisionPositions(now, { sidereal: true });
  const houses    = await getPrecisionHouses(now, coords.lat, coords.lng, 'P', { sidereal: true });
  const sunLon    = positions.sun.longitude;
  const moonLon   = positions.moon.longitude;
  const panchanga = getPanchanga(sunLon, moonLon, now);

  const prashnaResult = analyzePrashna({
    question,
    siderealPositions: positions,
    lagnaLongitude: houses.ascendant,
    panchanga,
    questionTime: now,
  });

  setPrashnaChart(prashnaResult); // new state
}
```

---

## Fix 9 — Performance: Cache BaZi async calculation

### The Problem

The new `calculateBaZi()` makes 2–4 SWE calls (Sun longitude + 1–2 solar term binary searches). On cold WASM init this is 2–4 seconds with no feedback.

### The Fix

```js
// src/pages/BaziPage.jsx
// Replace the useEffect with this pattern:

const [bazi, setBazi] = useState(null);
const [baziLoading, setBaziLoading] = useState(false);
const [baziError, setBaziError]     = useState('');

useEffect(() => {
  if (!natalChart) return;

  // Check sessionStorage cache first (valid for this browser session)
  const cacheKey = `bazi_${natalChart.meta.date}_${natalChart.meta.time}_${natalChart.meta.lon}`;
  const cached   = sessionStorage.getItem(cacheKey);
  if (cached) {
    try { setBazi(JSON.parse(cached)); return; } catch {}
  }

  setBaziLoading(true);
  setBaziError('');

  const { meta } = natalChart;
  const localDate = new Date(`${meta.date}T${meta.time}`);

  calculateBaZi(localDate, meta.gender || 'male', meta.lon ?? 0, meta.utcOffset ?? 8)
    .then(result => {
      setBazi(result);
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    })
    .catch(err => setBaziError(err.message || 'BaZi calculation failed.'))
    .finally(() => setBaziLoading(false));

}, [natalChart]);

// In the JSX, show loading state:
if (baziLoading) return (
  <div className="page-wrap" style={{ textAlign: 'center', padding: '4rem' }}>
    <div style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
      Calculating Solar Terms via Swiss Ephemeris…
    </div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
      This takes a few seconds the first time.
    </div>
  </div>
);
```

---

## Deployment Order

Push to GitHub in this sequence to avoid broken states:

```
1. src/lib/swe.js                    ← swe_set_sid_mode + getSunriseSunset
2. src/lib/baziInterpretations.js    ← getTenGod fix + getDayMasterStrength
3. src/lib/vedic.js                  ← (from first doc, if not yet pushed)
4. src/lib/bazi.js                   ← (from first doc, if not yet pushed)
5. src/lib/jyotish/panchanga.js      ← (from first doc, if not yet pushed)
6. src/lib/jyotish/muhurta.js        ← (from first doc, if not yet pushed)
7. src/lib/jyotish/prashna.js        ← new
8. src/lib/gemini.js                 ← expanded Vedic prompt
9. src/pages/VedicPage.jsx           ← house occupancy table
10. src/pages/ElectionalPage.jsx     ← Jyotish scoring panel
11. src/pages/HoraryPage.jsx         ← Prashna mode toggle
12. src/pages/BaziPage.jsx           ← async + caching
13. functions/index.js               ← model string fix
```

---

## Quick Reference: What Each Fix Solves

| # | File | Problem | Impact |
|---|---|---|---|
| 1 | `swe.js` | Ayanamsa defaults to Fagan-Bradley, not Lahiri | All Jyotish outputs potentially wrong |
| 2 | `baziInterpretations.js` | Ten God polarity logic bug (odd diffs ignore polarity) | Wrong Ten God for ~50% of pillar pairs |
| 3 | `baziInterpretations.js` | Day Master strength not calculated | Ten God recommendations incomplete |
| 4 | `VedicPage.jsx` | No house occupancy table | Missing core Jyotish analysis |
| 5 | `ElectionalPage.jsx` | Jyotish scoring not wired in | Muhurta engine exists but unused |
| 6 | `gemini.js` | Vedic AI prompt sends 4 fields, gets generic reading | AI reading is not chart-specific |
| 7 | `functions/index.js` | Model string `gemini-3.1-pro-preview` doesn't exist | Silent 404 on AI generation |
| 8 | `HoraryPage.jsx` | No Prashna Jyotish mode | Major Vedic feature gap |
| 9 | `BaziPage.jsx` | No loading state or cache for async BaZi | 2–4s blank screen, repeated SWE calls |
