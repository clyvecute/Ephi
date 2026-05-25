# ✦ Ephi — Precision Astrology Platform

> A modern, AI-powered astrology application built on Swiss Ephemeris WASM, Firebase, and React.
> Covers Western, Hellenistic, Jyotish, and BaZi traditions in a single unified interface.

---

## Recent Additions & Improvements

### New Features (this release)

#### 1. Chart Sharing Permalinks (`/chart/:encoded`)
Every natal chart can now be shared as a standalone public URL with no login required.

- `src/lib/shareChart.js` — `encodeChart()` / `decodeChart()` / `copyShareUrl()`
- `src/pages/SharedChartPage.jsx` — public read-only page at `/chart/:encoded`
- Chart is base64url-encoded with planet positions (0.01° precision), house cusps, and meta
- "⎘ Share Chart" button added to Dashboard header
- CTA on shared page drives new user signups

**Usage:**
```js
import { copyShareUrl } from '../lib/shareChart';
await copyShareUrl(natalChart); // copies URL to clipboard
```

---

#### 2. Transit Calendar (`/transit-calendar`)
30-day timeline of every exact aspect between the current sky and the user's natal chart,
with precise date and time down to the minute.

- `src/lib/transitCalendar.js` — two-pass algorithm: 6hr coarse scan + 22-iteration bisection
- `src/pages/TransitCalendarPage.jsx` — day-grouped calendar with filters by nature/planet
- Shows: exact time, applying/separating, aspect symbol, harmonic/tense color coding
- Controls: start date, duration (14/30/60/90 days), nature filter, planet filter
- Summary strip: total events, harmonic count, tense count

---

#### 3. Secondary Progressions (`/progressions`)
Symbolic movement of the natal chart over time — 1 day of life = 1 year of growth.

- `src/pages/ProgressionsPage.jsx` — dual-wheel (natal inner / progressed outer)
- Year slider with ±1y / ±10y quick-jump buttons (birth year to age 90)
- Three tabs: **Positions** (natal vs progressed with degree movement), **Aspects** (tight 1° orbs), **Reading** (AI Oracle)
- Calls existing `getSecondaryProgressions()` from `src/lib/returns.js`
- Wired to `generateReturnReading()` for AI interpretation

---

#### 4. Divine Credits System (monetization)
Full credit economy: earn daily, spend on AI readings, acquire more via anonymous payment.

**Files changed:**
- `src/lib/oracle.js` — all AI functions gated by `checkAndDeductCredit()`
- `src/contexts/AuthContext.jsx` — daily grant of 3 credits on login (Firestore-backed, 24hr cooldown)
- `src/components/NavBar.jsx` — live credit balance shown next to username (red when ≤1)
- `src/pages/SupportPage.jsx` — completely rebuilt with anonymous payment methods only

**Credit flow:**
- Logged-in users: balance stored in `users/{uid}.credits` in Firestore
- Not-logged-in users: 3 free reads per session via `sessionStorage`
- Daily grant: checked on every login, granted if 24+ hours since `lastCreditGrant`
- Deduction: 1 credit per AI reading, checked and deducted before API call

**Environment variables needed:**
```env
VITE_FREE_DAILY_CREDITS=3
VITE_FREE_TRIAL_READS=3
VITE_WALLET_USDT_TRC20=TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF
VITE_WALLET_ETH=0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63
VITE_WALLET_BTC=bc1qr0m76v8t7t5gdq232883exqlz8rc6gf0nmcvf2
VITE_KOFI_URL=https://ko-fi.com/cheshire_catt
```

**Manual credit grant (launch MVP):**
User pays on Ko-fi → sends their Ephi account email → you update `credits` field
in Firebase Console → Firestore → `users/{uid}` → increment the number.

---

#### 5. BaZi Accurate Engine (`src/lib/bazi_accurate.js`)
Solar-term based Four Pillars calculation. Fixes the month pillar inaccuracy
of the original `bazi.js` which used the Gregorian calendar month.

**Key fixes:**
- Month Pillar uses Sun's tropical longitude (15° steps = 24 solar terms) — not calendar month
- Luck Pillar start age calculated from days to nearest solar term ÷ 3
- Hour Pillar uses Local Mean Solar Time (longitude-corrected) — not raw local time
- Sanity check on every init: verifies `swe_julday(2000,1,1,12) ≈ 2451545`

**Affected users:** Anyone born within ~3 days of Feb 4, Mar 6, Apr 5, May 6,
Jun 6, Jul 7, Aug 8, Sep 8, Oct 8, Nov 7, Dec 7, Jan 6 — their month pillar
and luck pillar timing may have been wrong in the old engine.

---

### Bug Fixes

| File | Fix |
|------|-----|
| `src/lib/swe.js` | WASM `func is not a function` — auto-detects `swe_julday` vs `swe_julday_wrap` naming at runtime. Added J2000 sanity check on init |
| `src/pages/HoraryPage.jsx` | Crashed on load — imported deleted `ChartWheel`. Fixed to `NatalWheel` |
| `src/components/SynastryGrid.jsx` | Grid always empty — used `asp.p1/p2` but aspects use `transitPlanet/natalPlanet`. Fixed with field normalization |
| `src/pages/ReturnsPage.jsx` | Unscoped localStorage + Safari date crash (`date + ' ' + time`) |
| `src/pages/HellenisticPage.jsx` | Unscoped localStorage — Profections/Firdaria/Lots returned null |
| `src/pages/VedicPage.jsx` | Unscoped `ephi_settings` — purist mode ignored per-user |
| `src/pages/BaziPage.jsx` | Safari date crash |
| `src/pages/GrimoirePage.jsx` | `ephi_settings`, `ephi_persona`, `ephi_oracle_provider` writes unscoped |
| `src/pages/ReadingPage.jsx` | Imported dead `ChartWheel` + unscoped localStorage |
| `src/pages/SynastryPage.jsx` | Unscoped localStorage for natal + partners |
| `src/pages/Dashboard.jsx` | Profection null guard + Escape key for modal + scoped settings |
| `src/pages/ElectionalPage.jsx` | Scoring stub — now includes Void of Course Moon (−35), Mercury Rx (−20), mode-specific benefic/malefic weighting |
| `src/pages/FaqPage.jsx` | Privacy copy said "LocalStorage only" — updated to reflect Firestore sync |
| `src/pages/AboutPage.jsx` | Raw `**text**` markdown in JSX — fixed to `<strong>` tags |
| `src/components/NatalForm.jsx` | No "Time Unknown" option — added checkbox, defaults to 12:00 noon, passes `timeUnknown: true` flag |
| `src/components/NatalSummary.jsx` | Safari date crash + shows "Unknown (≈ noon)" badge when `timeUnknown` |
| `src/hooks/useNatal.js` | Missing `getIdToken(true)` before `onSnapshot` — caused Firestore `permission-denied` |
| `src/hooks/useTransits.js` | No error state — silent failures on ephemeris errors. Added `error` state |
| `src/lib/aspects.js` | Retrograde-aware `applying` — uses actual planet speed, not hardcoded constants |
| `src/lib/patterns.js` | Grand Cross always failed — `getActiveAspects(pos, pos)` deduplicates pairs, breaking natal pattern detection. Rewrote with symmetric `buildNatalAspects()` |
| `src/lib/notifications.js` | Used low-precision `getPlanetPositions` — now uses `getPrecisionPositions` (WASM) |
| `src/components/NavBar.jsx` | `setInterval` polling replaced with `storage` event + interval combo |
| `src/components/AdSlot.jsx` | Rendered empty layout gap when unconfigured — now returns `null` |
| `src/contexts/AuthContext.jsx` | `onAuthStateChanged` → `onSnapshot` race condition. Fixed with `getIdToken(true)` before any Firestore call. Added `ephi_current_uid` to localStorage for non-hook helpers. Added logout cleanup |
| `src/main.jsx` | Removed React Strict Mode in dev (caused Firestore stream double-mount = phantom `permission-denied`). StrictMode still active in production |

---

### Architecture Changes

#### localStorage → scoped per user
All localStorage keys are now prefixed with the user's UID to prevent data leakage
between accounts on the same browser.

Pattern used everywhere:
```js
const uid = JSON.parse(localStorage.getItem('ephi_current_uid') || 'null');
const key = uid ? `uid_${uid}__astro_natal` : 'astro_natal';
localStorage.getItem(key);
```

`AuthContext` writes `ephi_current_uid` on login and removes it on logout.

#### Firestore security rules (nested structure)
Flat `match /users/{userId}/{document=**}` was replaced with properly nested rules:
```js
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  match /{document=**} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

---

## Payment & Anonymity

Ephi uses **anonymous-only** payment methods. Your location, legal name, and bank
details are never exposed to supporters.

| Method | Anonymity | How |
|--------|-----------|-----|
| Crypto (USDT/ETH/BTC) | Perfect | Wallet address only |
| Ko-fi (`ko-fi.com/cheshire_catt`) | High | Username only |

**Credit grant flow (manual, launch MVP):**
1. User pays on Ko-fi or sends crypto
2. User DMs their Ephi account email
3. Find their UID: Firebase Console → Authentication → Users
4. Update `credits` field: Firestore → `users/{uid}` → increment

**Automated flow (future):** Ko-fi webhook → Firebase Cloud Function → `addCredits(uid, amount)`

---

## Firestore Data Structure

```
users/{uid}/
  email: string
  displayName: string
  createdAt: ISO string
  credits: number            ← Divine Credits balance
  lastCreditGrant: timestamp ← for daily grant cooldown
  settings: {
    persona: string
    notifications: boolean
    puristMode: boolean
  }
  
users/{uid}/data/library    ← saved library config
users/{uid}/data/natal      ← natal chart (cloud backup)

feedback/{docId}/           ← user feedback (admin-only read)
analytics/{docId}/          ← page view events (admin-only read)
```

---

## Environment Variables

```env
# Firebase (required)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# AI Oracle (at least one required)
VITE_GEMINI_API_KEY=
VITE_USE_PROXY=true
VITE_PROXY_URL=/api/oracle

# Admin
VITE_ADMIN_UID=your_firebase_uid_here

# Credits
VITE_FREE_DAILY_CREDITS=3
VITE_FREE_TRIAL_READS=3

# Payments (anonymous)
VITE_KOFI_URL=https://ko-fi.com/cheshire_catt
VITE_WALLET_USDT_TRC20=TS4aYAGCjXwNYrqQaZjrWz8ue5AviHfzCF
VITE_WALLET_ETH=0xa33bB114FbAa5071a6d3E30740ca2e072ccd6B63
VITE_WALLET_BTC=bc1qr0m76v8t7t5gdq232883exqlz8rc6gf0nmcvf2
```

---

## Known Outstanding Items

| Item | Status | Notes |
|------|--------|-------|
| BaZi accurate engine | Built, not yet wired to BaziPage | Requires async refactor of BaziPage |
| Jyotish Prashna (Horary) | Planned | Architecture documented in `ACCURACY_AND_DEPTH.md` |
| Muhurta (Jyotish Electional) | Planned | Panchanga scoring designed |
| Automated payment webhook | Planned | Ko-fi → Firebase Function → `addCredits()` |
| Composite chart | Planned | Midpoint formula ready |
| Astrocartography | Planned | Requires Leaflet.js integration |
| Void of Course Moon widget | Planned | Dashboard addition |
| Public chart gallery (`/@username`) | Planned | Requires public Firestore rules |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Auth | Firebase Authentication (Google OAuth) |
| Database | Firestore (user data, credits, feedback) |
| Ephemeris | Swiss Ephemeris WASM (`@swisseph/browser`) |
| Fallback Ephemeris | VSOP87 (ephemeris.js) |
| AI Oracle | Google Gemini (primary) + Groq (secondary) |
| Charts | Custom SVG (AstroChartWheel.jsx) |
| Styling | CSS custom properties + utility classes |
| Analytics | Firebase Analytics |

---

## Pages Reference

| Route | Page | Auth Required |
|-------|------|---------------|
| `/` | Landing | No |
| `/dashboard` | Natal + Transits | Yes |
| `/reading` | AI Reading | Yes |
| `/synastry` | Synastry | Yes |
| `/horary` | Horary Astrology | Yes |
| `/electional` | Electional | Yes |
| `/hellenistic` | Hellenistic | Yes |
| `/vedic` | Jyotish | Yes |
| `/bazi` | BaZi | Yes |
| `/returns` | Solar/Lunar Returns | Yes |
| `/progressions` | Secondary Progressions | Yes ✨ New |
| `/transit-calendar` | Transit Calendar | Yes ✨ New |
| `/tools` | Tools Archive | Yes |
| `/alerts` | Transit Alerts | Yes |
| `/grimoire` | Settings + Library | Yes |
| `/support` | Divine Credits | No |
| `/chart/:encoded` | Shared Chart | No ✨ New |
| `/about` | About | No |
| `/faq` | FAQ | No |
