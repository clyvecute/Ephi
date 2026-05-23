# Ephi — Full Codebase Review & Recommendations

> A fresh audit of every lib and page file. These are new findings — not covered
> in the BaZi/Jyotish upgrade docs or the remaining fixes doc.

---

## Quick Summary

| Area | Issue | Priority |
|---|---|---|
| `returns.js` | Solar Return uses `getPlanetPositions` (low-precision), not SWE | High |
| `hellenistic.js` | Firdaria sub-periods never calculated | High |
| `hellenistic.js` | Void of Course check is wrong (last 2° hack) | High |
| `aspects.js` | Parallel & Contraparallel aspects missing | Medium |
| `aspects.js` | Antiscia pairs not computed | Medium |
| `synastry.js` | Composite chart not built | Medium |
| `notifications.js` | Uses low-precision `getPlanetPositions`, not SWE | Medium |
| `monetization.js` | No payment integration — credits can't actually be purchased | High |
| `readingCache.js` | 24-hour expiry wipes useful history aggressively | Low |
| `interpretations.js` | No minor aspect coverage (semisquare, sesquisquare, quintile) | Low |
| `patterns.js` | Stellium threshold fixed at 3 planets — ignores 10° span rule | Medium |
| `ElectionalPage.jsx` | Scanner only checks one moment, not a time window | High |
| `ReturnsPage.jsx` | Progressed chart uses `getPlanetPositions`, not SWE | Medium |
| `Dashboard.jsx` | Profection lord not linked to current transits | Low |
| General | No error boundary recovery — any page crash shows blank screen | Medium |
| General | `store.js` writes to localStorage synchronously on every call — no batching | Low |

---

## Fix 1 — `src/lib/returns.js`: Solar Return uses low-precision ephemeris

### What Is Wrong

`findSolarReturn()` calls `getPlanetPositions()` from `ephemeris.js`, which uses the VSOP87 truncated series — not the Swiss Ephemeris WASM. For a Solar Return, the Sun needs to return to its natal longitude with sub-minute precision. The truncated VSOP87 has ~1 arcminute error, which means the Solar Return moment could be off by several minutes. The bisection runs 30 iterations which is correct, but the underlying data source undermines it.

The same problem exists in `findLunarReturn()` and `getSecondaryProgressions()`.

### The Fix

Replace `getPlanetPositions` with `getPrecisionPositions` from `swe.js` in all three functions:

```js
// src/lib/returns.js — change this import:
import { getPlanetPositions } from './ephemeris.js';

// To this:
import { getPrecisionPositions } from './swe.js';

// Then in findSolarReturn(), replace every:
getPlanetPositions(new Date(t1), null, { sidereal }).sun
// With:
(await getPrecisionPositions(new Date(t1), { sidereal })).sun.longitude
```

Note: `getPrecisionPositions` is async, so `findSolarReturn` must become `async` and the bisection loop must `await` each call. The ReturnsPage already calls it in an async context so no UI changes needed.

---

## Fix 2 — `src/lib/hellenistic.js`: Firdaria sub-periods never calculated

### What Is Wrong

`calculateFirdaria()` returns the 9 main planetary periods (10, 8, 13, 9, 11, 12, 7, 3, 2 years) but never breaks them into sub-periods. In classical Firdaria, each main period is divided into 7 sub-periods (one for each Chaldean planet), each lasting the main period's years divided by 7. The HellenisticPage only shows top-level periods — there's no sub-period display or current sub-period indicator.

### The Fix

Add sub-period calculation inside `calculateFirdaria()`:

```js
// src/lib/hellenistic.js — update calculateFirdaria():

export function calculateFirdaria(birthDate, isDayChart) {
  const PLANET_ORDER = ['sun','venus','mercury','moon','saturn','jupiter','mars'];
  const diurnalMain  = ['sun','venus','mercury','moon','saturn','jupiter','mars','nn','sn'];
  const nocturnalMain= ['moon','saturn','jupiter','mars','sun','venus','mercury','nn','sn'];
  const durations    = { sun:10, venus:8, mercury:13, moon:9, saturn:11, jupiter:12, mars:7, nn:3, sn:2 };

  const order  = isDayChart ? diurnalMain : nocturnalMain;
  const birth  = new Date(birthDate);
  const periods = [];
  let currentYear = 0;

  for (const planet of order) {
    const duration  = durations[planet];
    const startDate = new Date(birth);
    startDate.setFullYear(birth.getFullYear() + currentYear);
    const endDate = new Date(birth);
    endDate.setFullYear(birth.getFullYear() + currentYear + duration);

    // Build sub-periods: each main period divides into 7 (one per Chaldean planet)
    // Starting from the main planet itself, cycling through PLANET_ORDER
    const subPeriods = [];
    const subDurationYears = duration / 7;
    const mainIdx = PLANET_ORDER.indexOf(planet);

    let subStart = new Date(startDate);
    for (let i = 0; i < 7; i++) {
      const subPlanet = PLANET_ORDER[(mainIdx + i) % 7];
      const subEnd = new Date(subStart.getTime() + subDurationYears * 365.24219 * 86400000);
      subPeriods.push({
        planet:    subPlanet,
        startDate: subStart.toISOString(),
        endDate:   subEnd.toISOString(),
        years:     parseFloat(subDurationYears.toFixed(2))
      });
      subStart = subEnd;
    }

    periods.push({
      planet,
      startYear:  currentYear,
      endYear:    currentYear + duration,
      startDate:  startDate.toISOString(),
      endDate:    endDate.toISOString(),
      subPeriods,
    });

    currentYear += duration;
  }
  return periods;
}
```

In `HellenisticPage.jsx`, find the current sub-period and highlight it:

```js
const today = new Date().toISOString().slice(0, 10);
const currentMain = firdaria.find(p => p.startDate.slice(0,10) <= today && today < p.endDate.slice(0,10));
const currentSub  = currentMain?.subPeriods?.find(s => s.startDate.slice(0,10) <= today && today < s.endDate.slice(0,10));
```

---

## Fix 3 — `src/lib/hellenistic.js`: Void of Course check is wrong

### What Is Wrong

```js
// CURRENT — in getHoraryStrictures():
if (moonLon % 30 > 28) strictures.push("Moon is Void of Course...");
```

This is not how Void of Course works. VOC means the Moon makes no more applying Ptolemaic aspects (conjunction, sextile, square, trine, opposition) to any planet before leaving its current sign. Being in the last 2° of a sign is a rough heuristic at best — the Moon can be VOC from 15° into a sign if there are no planets ahead of it in that sign's range.

### The Fix

Replace the 2° heuristic with an actual aspect-scan:

```js
// src/lib/hellenistic.js — replace the VOC check in getHoraryStrictures():

function isMoonVoidOfCourse(moonLon, positions) {
  const ASPECTS  = [0, 60, 90, 120, 180];
  const MAX_ORB  = 8;
  const moonSign = Math.floor(moonLon / 30);
  const moonEnd  = (moonSign + 1) * 30; // longitude where Moon leaves its sign

  const planets  = ['sun','mercury','venus','mars','jupiter','saturn'];

  for (const planet of planets) {
    const pLon = typeof positions[planet] === 'object'
      ? positions[planet].longitude : positions[planet];
    if (pLon == null) continue;

    for (const angle of ASPECTS) {
      const targetLon = (pLon + angle) % 360;
      // Is this aspect point between Moon's current position and end of sign?
      const diff = ((targetLon - moonLon + 360) % 360);
      if (diff < (moonEnd - moonLon) + MAX_ORB && diff > 0) {
        return false; // Found an applying aspect — NOT void
      }
    }
  }
  return true; // No applying aspects found — Moon is VOC
}

// In getHoraryStrictures(), replace the VOC line with:
// if (isMoonVoidOfCourse(moonLon, positions)) strictures.push("Moon is Void of Course...");
// (Pass positions as a new parameter to getHoraryStrictures)
```

---

## Fix 4 — `src/lib/aspects.js`: Missing Parallel & Contraparallel aspects

### What Is Wrong

The app calculates the five Ptolemaic aspects but ignores Parallel (same declination within 1°) and Contraparallel (opposite declination within 1°). These are considered equivalent in strength to a conjunction and opposition respectively in traditional astrology, and are especially meaningful in horary and electional work.

The `aspects.js` file uses ecliptic longitudes only — declinations are never computed.

### What to Add

Add a `getParallelAspects()` function. Declinations require converting ecliptic longitude + latitude to equatorial coordinates, which `astronomy.js` already has `eclipticToEquatorial()` for:

```js
// src/lib/aspects.js — add this export:

import { eclipticToEquatorial, meanObliquity, julianCenturies, dateToJD } from './astronomy.js';

/**
 * Calculate declinations for all planets from their ecliptic coordinates.
 * Requires the full precision position objects (with latitude field).
 */
function getDeclination(lon, lat, obliquity) {
  const eq = eclipticToEquatorial(lon, lat, obliquity);
  return eq.dec; // degrees
}

/**
 * Find Parallel and Contraparallel aspects between transit and natal planets.
 * Parallel = within 1° of same declination (acts like conjunction).
 * Contraparallel = within 1° of opposite declination (acts like opposition).
 *
 * @param {Object} currentPrecision - Full precision positions (with latitude)
 * @param {Object} natalPrecision   - Full precision natal positions (with latitude)
 * @param {Date}   date             - Current date (for obliquity)
 */
export function getParallelAspects(currentPrecision, natalPrecision, date = new Date()) {
  const T   = julianCenturies(dateToJD(date));
  const eps = meanObliquity(T);
  const ORB = 1.0; // degrees

  const results = [];

  for (const [tName, tData] of Object.entries(currentPrecision)) {
    if (!tData || tData.latitude == null) continue;
    const tDec = getDeclination(tData.longitude, tData.latitude, eps);

    for (const [nName, nData] of Object.entries(natalPrecision)) {
      if (!nData || nData.latitude == null) continue;
      const nDec = getDeclination(nData.longitude, nData.latitude, eps);

      const diff = Math.abs(tDec - nDec);
      const sumDiff = Math.abs(Math.abs(tDec) + Math.abs(nDec));

      if (diff <= ORB) {
        results.push({
          transitPlanet: tName, natalPlanet: nName,
          aspectName: 'parallel', symbol: '‖',
          orb: parseFloat(diff.toFixed(2)),
          transitDec: parseFloat(tDec.toFixed(2)),
          natalDec:   parseFloat(nDec.toFixed(2)),
          nature: 'neutral',
          strength: diff < 0.3 ? 'exact' : diff < 0.6 ? 'strong' : 'moderate',
        });
      } else if (sumDiff <= ORB) {
        results.push({
          transitPlanet: tName, natalPlanet: nName,
          aspectName: 'contraparallel', symbol: '⊗',
          orb: parseFloat(sumDiff.toFixed(2)),
          transitDec: parseFloat(tDec.toFixed(2)),
          natalDec:   parseFloat(nDec.toFixed(2)),
          nature: 'hard',
          strength: sumDiff < 0.3 ? 'exact' : sumDiff < 0.6 ? 'strong' : 'moderate',
        });
      }
    }
  }

  return results.sort((a, b) => a.orb - b.orb);
}
```

---

## Fix 5 — `src/lib/synastry.js`: No Composite chart

### What Is Wrong

The synastry system calculates inter-chart aspects bidirectionally and scores them — good. But it never builds a Composite chart (midpoint chart), which is the other standard relationship analysis method. Many practitioners use both Synastry and Composite together, and a "Composite" tab is a common expectation in any professional synastry tool.

### What to Add

Add `buildCompositeChart()` to `synastry.js`:

```js
// src/lib/synastry.js — add this export:

/**
 * Build a Composite chart from two natal position sets.
 * Method: Midpoint of each planet's longitude (shortest arc midpoint).
 *
 * @param {Object} positionsA - Planet longitudes for person A
 * @param {Object} positionsB - Planet longitudes for person B
 * @returns {Object} Composite planet longitudes
 */
export function buildCompositeChart(positionsA, positionsB) {
  const composite = {};
  const planets   = new Set([...Object.keys(positionsA), ...Object.keys(positionsB)]);

  for (const planet of planets) {
    const lonA = typeof positionsA[planet] === 'object'
      ? positionsA[planet].longitude : positionsA[planet];
    const lonB = typeof positionsB[planet] === 'object'
      ? positionsB[planet].longitude : positionsB[planet];

    if (lonA == null || lonB == null) continue;

    // Shortest arc midpoint — handles the 0°/360° wrap
    let diff = lonB - lonA;
    if (diff > 180)  diff -= 360;
    if (diff < -180) diff += 360;

    composite[planet] = ((lonA + diff / 2) + 360) % 360;
  }

  return composite;
}

/**
 * Build a Composite Ascendant from two natal Ascendants.
 * Same shortest-arc midpoint method.
 */
export function buildCompositeAscendant(ascA, ascB) {
  let diff = ascB - ascA;
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;
  return ((ascA + diff / 2) + 360) % 360;
}
```

In `SynastryPage.jsx`, add a "Composite" tab alongside "Synastry Grid" and render the composite positions in a `NatalWheel` or `TransitWheel` component (both accept a positions object).

---

## Fix 6 — `src/lib/notifications.js`: Uses low-precision ephemeris

### What Is Wrong

`runAspectCheck()` calls `getPlanetPositions(new Date())` from `ephemeris.js`. This is the low-precision VSOP87 truncated version. For notification alerts, the 1-arcminute precision difference rarely matters — but it creates an inconsistency: the Dashboard shows SWE precision positions while the notification system fires on a different set of positions. A user could see a transit as `exact` in the Dashboard but the notification already fired 10 minutes earlier (or fires 10 minutes late) because the two systems disagree on the planet's position.

### The Fix

Switch to `getPrecisionPositions` from `swe.js`. Since WASM init is async and `runAspectCheck` already runs in a `setInterval`, this is straightforward:

```js
// src/lib/notifications.js — change the import:
import { getPlanetPositions } from './ephemeris.js';
// To:
import { getPrecisionPositions } from './swe.js';

// In runAspectCheck():
// Replace:
const currentPositions = getPlanetPositions(new Date());
// With:
const currentPositions = await getPrecisionPositions(new Date());
// (runAspectCheck is already async so no signature change needed)
```

---

## Fix 7 — `src/lib/monetization.js`: Credits can't actually be purchased

### What Is Wrong

`CREDIT_TIERS` defines three purchase options with prices ($3, $10, $30) but there is no payment processing anywhere — no Stripe integration, no webhook, no Firebase function that adds credits after payment. The SupportPage presumably shows the tiers but clicking "Buy" does nothing. This means the monetization system is defined but completely non-functional.

### What to Add

The minimal working path is a Stripe Checkout integration via Firebase Functions:

```js
// functions/index.js — add this alongside generateReading:

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

    const idToken = authHeader.split('Bearer ')[1];
    let uid;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { tierId } = req.body;
    const TIERS = {
      tier_1: { credits: 10,  price_cents: 300,  name: 'Neophyte Bundle'  },
      tier_2: { credits: 50,  price_cents: 1000, name: 'Adept Bundle'     },
      tier_3: { credits: 200, price_cents: 3000, name: 'Master Grimoire'  },
    };
    const tier = TIERS[tierId];
    if (!tier) return res.status(400).json({ error: 'Invalid tier' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: tier.name },
          unit_amount: tier.price_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.origin}/support?payment=success`,
      cancel_url:  `${req.headers.origin}/support?payment=cancelled`,
      metadata: { uid, credits: tier.credits, tierId },
    });

    res.json({ url: session.url });
  });
});

// Stripe webhook to add credits after successful payment
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig     = req.headers['stripe-signature'];
  const webhook = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhook);
  } catch {
    return res.status(400).send('Webhook signature error');
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { uid, credits } = session.metadata;
    if (uid && credits) {
      const userRef = admin.firestore().doc(`users/${uid}`);
      await userRef.update({ credits: admin.firestore.FieldValue.increment(parseInt(credits)) });
    }
  }

  res.json({ received: true });
});
```

In `SupportPage.jsx`, replace the static tier display with an async `handlePurchase()` that calls the Firebase function and redirects to Stripe Checkout.

---

## Fix 8 — `src/pages/ElectionalPage.jsx`: Scanner checks one moment, not a window

### What Is Wrong

The current Electional scanner scores `positions` for a single moment (whatever time the user has selected). A real electional tool needs to scan forward through time — hours or days — and find the **best** moments within a window. There's no "find the best time this week" feature. The user has to manually scrub through time themselves, which defeats the purpose.

### What to Add

Add a `findBestMoments()` scanner:

```js
// src/pages/ElectionalPage.jsx — add this function:

async function findBestMoments(startDate, hoursForward = 72, intervalMinutes = 30, mode, natal) {
  const results = [];
  const stepMs  = intervalMinutes * 60 * 1000;
  const endMs   = startDate.getTime() + hoursForward * 3600000;

  for (let t = startDate.getTime(); t <= endMs; t += stepMs) {
    const date      = new Date(t);
    const positions = getPlanetPositions(date, null);
    const scored    = scoreMoment(positions, mode, natal);

    if (scored.score >= 70) { // Only keep good moments
      results.push({ date, score: scored.score, reasons: scored.reasons });
    }
  }

  // Return top 10, sorted by score
  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}
```

Add a "Find Best Times" button in the UI that calls this function and displays the top windows in a list. Each result should be a clickable date that sets the scanner to that moment for further inspection.

---

## Fix 9 — `src/lib/patterns.js`: Stellium threshold ignores span rule

### What Is Wrong

The Stellium detector counts any 3+ planets in the same sign and calls it a Stellium. But the classical definition requires planets to be **within 10°** of each other (some traditions say 8°). Three planets spread across a full 30° sign — e.g. Sun at 2°, Mercury at 15°, Mars at 28° Aries — are not a Stellium. They're just three planets in the same sign, which is common.

### The Fix

```js
// src/lib/patterns.js — update the Stellium detection:

function detectStelliums(positions, orbDegrees = 10) {
  const planets = Object.entries(positions).map(([name, lon]) => ({
    name, lon: typeof lon === 'object' ? lon.longitude : lon
  })).filter(p => p.lon != null).sort((a, b) => a.lon - b.lon);

  const stelliums = [];

  for (let i = 0; i < planets.length - 2; i++) {
    const group = [planets[i]];
    for (let j = i + 1; j < planets.length; j++) {
      const span = planets[j].lon - planets[i].lon;
      if (span <= orbDegrees) {
        group.push(planets[j]);
      } else {
        break;
      }
    }
    if (group.length >= 3) {
      stelliums.push({
        type: 'Stellium',
        planets: group.map(p => p.name),
        span: parseFloat((group[group.length-1].lon - group[0].lon).toFixed(2)),
        midpoint: (group[0].lon + group[group.length-1].lon) / 2,
      });
      i += group.length - 1; // Skip already-grouped planets
    }
  }

  return stelliums;
}
```

---

## Fix 10 — `src/lib/readingCache.js`: 24-hour expiry is too aggressive

### What Is Wrong

```js
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
```

AI readings take credits to generate. A reading about a natal chart doesn't expire — the natal chart doesn't change. A reading about current transits is only slightly stale after 24 hours. The 24-hour cutoff means a user who generates a reading before midnight, then opens the app after midnight, gets "no recent reading" and is prompted to spend another credit.

### The Fix

Separate expiry by reading type:

```js
// src/lib/readingCache.js

const EXPIRY_BY_TYPE = {
  synthesis:  7 * 24 * 60 * 60 * 1000,   // 7 days — transit readings
  natal:      30 * 24 * 60 * 60 * 1000,  // 30 days — natal readings don't change
  horary:     24 * 60 * 60 * 1000,       // 24 hours — horary is moment-specific
  synastry:   14 * 24 * 60 * 60 * 1000,  // 14 days — synastry is stable
  vedic:      7 * 24 * 60 * 60 * 1000,   // 7 days
  return:     30 * 24 * 60 * 60 * 1000,  // 30 days — return chart is date-specific
};

function isExpired(reading) {
  if (!reading?.timestamp) return true;
  const expiry = EXPIRY_BY_TYPE[reading.type] ?? (24 * 60 * 60 * 1000);
  return Date.now() - new Date(reading.timestamp).getTime() > expiry;
}
```

---

## New Feature Recommendations

These don't fix bugs — they add meaningful functionality that fits naturally with what's already built.

### A — Lunar Calendar / Moon Phase Widget

The app tracks the Moon's position in real time but never displays:
- Current Moon phase name (New, Waxing Crescent, First Quarter, etc.)
- Days to next Full Moon / New Moon
- Void of Course windows for the week ahead

This would be a natural addition to the Dashboard's `SummaryBar`. The Moon phase from Sun-Moon elongation is already calculated in `ElectionalPage.jsx` — extract it into a shared utility.

### B — Dignity Table on the Natal Chart

The `hellenistic.js` file has `calculateDignity()` but the Dashboard and NatalSummary never display it. A compact dignity table — showing each planet's sign, house, and dignity status (Domicile / Exaltation / Detriment / Fall / Peregrine) with scores — would be a high-value addition that serious users expect. The data is already computed, just never shown.

### C — Transit Calendar (Week/Month View)

The Alerts system checks for active aspects but there's no visual timeline of upcoming transits. A simple calendar view showing which exact aspects fire on which days this week/month — color coded hard/soft — would be the most practically useful feature for users planning around transits. The `exactAt` field already exists on each aspect object; it just needs to be aggregated and rendered in a calendar grid.

### D — Antiscia / Solstice Points

Classical horary and Hellenistic techniques use Antiscia (mirror points across the Cancer-Capricorn axis at 0° Cancer/Capricorn). A planet's Antiscia point is at `(90° - (planet's lon % 90)) * sign_factor`. This is a few lines of math and would add depth to the HellenisticPage and HoraryPage without requiring new data sources.

### E — Arabic Parts / Lots on Horary Page

The HoraryPage uses `hellenistic.js` for strictures but never calculates the Hermetic Lots for the question chart. The Lot of Fortune, Spirit, and relevant house lots are standard horary tools. `calculateLots()` already exists in `hellenistic.js` — just call it with the horary chart positions and display it on the HoraryPage alongside the strictures.

### F — Ayanamsa Selector in Settings

The `setAyanamsa()` function will exist after Fix 1 of the previous doc. Expose it in the app settings (or on the VedicPage header) as a dropdown: Lahiri / KP (Krishnamurti) / Raman / Yukteshwar. KP users are a significant audience and the app is otherwise KP-ready. One `<select>` element and one `setAyanamsa()` call.

### G — Chart Shape Detection

The `patterns.js` file detects aspect configurations but never identifies the overall chart shape (Bucket, Bowl, Bundle, Locomotive, Splash, See-Saw, Splay, Fan). These are high-level interpretive tools that practitioners use immediately when looking at a chart. The detection is purely geometric — count planet spread across the wheel and check for handles/dominants.

---

## Deployment Priority

```
Immediate (correctness):
  1. returns.js — SWE precision for Solar/Lunar Returns
  2. hellenistic.js — VOC fix (wrong formula)
  3. notifications.js — SWE precision

Soon (feature completeness):
  4. hellenistic.js — Firdaria sub-periods
  5. patterns.js — Stellium span rule
  6. ElectionalPage — Time window scanner
  7. synastry.js — Composite chart
  8. readingCache.js — Smarter expiry

When ready to monetize:
  9. monetization.js — Stripe integration

Nice to have:
  10. aspects.js — Parallels & Contraparallels
  11. New features A–G above
```
