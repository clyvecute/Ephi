# Ephi

Ephi is a professional-grade multi-tradition astrological web application built with React and powered by a WebAssembly build of the Swiss Ephemeris (`swisseph`). It provides high-precision astronomical calculations across three complete astrological systems — Western, Jyotish (Vedic), and BaZi (Chinese Four Pillars) — with a fully custom SVG chart renderer, real-time transits, and AI-powered interpretations via Google Gemini.

## ✨ Key Features

### 🌐 Shared Engine
- **WASM Swiss Ephemeris (`swe.js`):** The calculation backbone. Provides sub-arcsecond planetary positions, house cusps, retrograde tracking, and sidereal/tropical coordinate transforms. Uses Lahiri Ayanamsa for all Vedic calculations (`swe_set_sid_mode(1, 0, 0)`).
- **Custom SVG Chart Wheel (`AstroChartWheel.jsx`):** A bespoke, high-fidelity SVG renderer with degree ruler rings, anti-collision stellium algorithms, aspect lines with varying weight by type and strength, retrograde markers, axis labels (AC/DC/MC/IC), and PNG export.
- **AI Oracle (`gemini.js`):** Google Gemini–powered reading system with full chart context passed per tradition. Supports natal, transit, synastry, horary, Vedic, BaZi, electional, and return readings.
- **Cloud Sync:** Firebase Firestore for cross-device natal chart and reading persistence. Firebase Auth for user accounts.

---

### ♈ Western Astrology

- **Natal Charts:** Full precision natal chart generation with multiple house systems — Placidus, Whole Sign, Koch, Porphyry, Regiomontanus.
- **Transits & Live Sky:** Real-time transiting planet overlay against natal chart with aspect orb tracking.
- **Transit Calendar (`TransitCalendarPage`):** Month-view calendar of exact aspect ingresses with customizable planet and aspect filters.
- **Synastry (`SynastryPage`):** Bi-wheel chart comparison between two natal charts with composite aspect grid (`SynastryGrid`).
- **Progressions (`ProgressionsPage`):** Secondary progressions (day-for-a-year) with bi-wheel rendering.
- **Solar & Lunar Returns (`ReturnsPage`):** Return charts calculated to the exact solar/lunar return moment.
- **Hellenistic Techniques (`HellenisticPage` + `hellenistic.js`):** Essential dignities, Hermetic Lots (Fortune, Spirit, Eros, Necessity, Courage, Victory, Nemesis), Annual Profections, and horary strictures.
- **Pattern Detection (`patterns.js`):** Identifies stelliums, grand trines, T-squares, yods, kites, and other major chart configurations.
- **Horary (William Lilly) (`HoraryPage`):** Full traditional horary judgment engine — significator assignment, applying/separating aspects, reception, strictures against judgment, Moon VOC detection. Includes multi-turn AI Oracle dialogue.

---

### 🕉️ Jyotish (Vedic Astrology)

- **Sidereal Positions (Lahiri Ayanamsa):** All Vedic calculations use the IAU Lahiri standard enforced at the WASM level.
- **Rasi & Navamsa Charts (`VedicPage` + `VedicChart`):** D-1 (Rasi) and D-9 (Navamsa/soul chart) rendered as traditional South Indian square charts.
- **Nakshatra Engine (`vedic.js`):** All 27 Nakshatras with Pada, lord, and symbolic meaning. Covers Lagna, Moon, Sun and all planets.
- **Vimshottari Dasha — 3 Levels (`vedic.js`):** Julian Day–accurate Mahadasha, Antardasha (Bhukti), and Pratyantardasha with ISO start/end dates and current progress.
- **Bhava (House) Occupancy Table (`VedicPage`):** Whole-sign house grid showing sign, Bhava lord, and planet occupants for all 12 houses.
- **Planet Dignity (`vedic.js`):** Classical dignity classification — exalted, own, moolatrikona, neutral, debilitated — fed into the AI reading prompt.
- **Panchanga (`jyotish/panchanga.js`):** Full five-limb calculation: Tithi (lunar day + Paksha), Vara (weekday lord), Nakshatra, Yoga (27 luni-solar yogas), and Karana (half-tithi). Includes Hora and Choghadiya.
- **Muhurta Scoring (`jyotish/muhurta.js`):** Purpose-aware electional scoring for 10 categories (marriage, business, travel, medical, etc.) using Nakshatra suitability, Tara Bala, Kala period analysis, and Choghadiya quality.
- **Prashna Jyotish (`jyotish/prashna.js` + `HoraryPage`):** Vedic horary mode. Analyzes the sidereal chart for the moment of the question — Lagna lord, target house lord, Ithasala (applying aspects), Via Combusta stricture, early/late Lagna checks, Panchanga favorability, verdict with timing estimate.
- **AI Jyotish Reading (`gemini.js`):** Full chart context sent to Gemini — Lagna, Moon, Sun signs and Nakshatras, all planetary house placements with dignities, 3-level Dasha timeline with end dates, and today's Panchanga. Structured as 4 sections: Natal Blueprint, Karmic Season (Dasha), Yogas, and Upaya (remedies).

---

### 🀄 BaZi (Chinese Four Pillars)

- **Solar Term Month Pillar (`bazi.js`):** Month pillar boundary is determined by actual solar term (节气) crossing using a binary search against the Swiss Ephemeris Sun longitude — not the Gregorian calendar month. Accurate to the hour.
- **True Local Solar Time (TLST) Hour Pillar (`bazi.js`):** Hour pillar uses the astronomically-corrected local solar noon for the birth longitude, not the timezone clock. Accounts for the Equation of Time.
- **Day Pillar Midnight (`bazi.js`):** Day boundary uses TLST midnight, not UTC midnight, matching classical Chinese convention.
- **Luck Pillars:** Calculated from the next/prior solar term distance with gender and year polarity rules.
- **Branch Interactions (`bazi/interactions.js`):** Complete classical interaction system — Six Combinations, Three Harmonies, Six Clashes, Six Harms, Six Destructions, Three Penalties, and Stem Combinations with element transform outputs.
- **Ten Gods (`baziInterpretations.js`):** Corrected polarity logic for all 10 stem-to-stem relationships. Includes Day Master strength scoring by season, branch roots, and stem support.

---

### 🗓️ Electional Astrology

- **`ElectionalPage`:** Scan up to 365 days for auspicious windows with peak-filtered results for long horizons (90+ days).
- **Dual Scoring:** Each candidate day is scored by both:
  - **Western engine** — Moon phase, Venus/Mercury/Jupiter dignity by mode (love, business, spirit, general).
  - **Jyotish Muhurta engine** — Panchanga quality, Nakshatra suitability, Choghadiya, Kala avoidance, Tara Bala.
- **AI Electional Reading:** Gemini synthesis includes both scores and all active Jyotish factors in the prompt.

---

### 📚 Grimoire & Readings

- **`GrimoirePage`:** Personal astrology journal — save AI readings, notes, and chart snapshots. Full reading history with search.
- **`ReadingPage`:** In-depth AI natal + transit reading with structured sections. Supports uploaded astrology books as context (via `library.js` + Firebase Storage).
- **`AlertsPage`:** Configurable planetary aspect alerts — notify when a transit hits a natal point within a set orb.

---

## 🗂️ Project Structure

```
src/
├── lib/
│   ├── swe.js                   # WASM Swiss Ephemeris API (Lahiri ayanamsa, sunrise/sunset)
│   ├── ephemeris.js             # Planet position structuring & zodiac mapping
│   ├── natal.js                 # Natal chart generation & caching
│   ├── aspects.js               # Aspect calculation (tropical & sidereal)
│   ├── patterns.js              # Configuration detection (grand trine, T-square, etc.)
│   ├── hellenistic.js           # Lots, profections, essential dignities
│   ├── horary.js                # William Lilly horary judgment engine
│   ├── synastry.js              # Synastry & composite calculations
│   ├── returns.js               # Solar/lunar return chart engine
│   ├── vedic.js                 # Jyotish: Nakshatra, Dasha (3 levels), Navamsa, D-10, dignity
│   ├── vedicInterpretations.js  # Nakshatra meanings, Tithi/Yoga/Karana dictionaries
│   ├── jyotish/
│   │   ├── panchanga.js         # Tithi, Vara, Yoga, Karana, Hora, Choghadiya
│   │   ├── muhurta.js           # Muhurta scoring engine (purpose-aware)
│   │   └── prashna.js           # Prashna Jyotish (Vedic horary)
│   ├── bazi.js                  # BaZi Four Pillars (solar term month, TLST hour, luck pillars)
│   ├── baziInterpretations.js   # Ten Gods, Day Master strength, pillar meanings
│   ├── bazi/
│   │   └── interactions.js      # Six Combinations, Clashes, Harms, Penalties, Stem Combos
│   ├── gemini.js                # All AI reading generators (Gemini API)
│   ├── oracle.js                # Oracle routing layer (model selection)
│   ├── interpretations.js       # Western planet/sign/house interpretation dictionary
│   ├── transitCalendar.js       # Transit ingress event generation
│   ├── patterns.js              # Chart pattern recognition
│   ├── library.js               # Astrology book upload & Firebase Storage management
│   ├── store.js                 # localStorage abstraction
│   └── firebase.js / db.js      # Firebase initialization & Firestore helpers
│
├── components/
│   ├── AstroChartWheel.jsx      # SVG chart wheel (natal & bi-wheel)
│   ├── VedicChart.jsx           # South Indian square Vedic chart
│   ├── NatalForm.jsx            # Birth data entry (geocoding, timezone detection)
│   ├── NatalSummary.jsx         # Structured natal data tables & text breakdown
│   ├── AspectList.jsx           # Aspect table with orb and nature columns
│   ├── PlanetTable.jsx          # Planet position table
│   ├── EphiMarkdown.jsx         # Markdown renderer for AI readings
│   └── NavBar.jsx               # App navigation
│
└── pages/
    ├── Dashboard.jsx            # Main hub: live sky transits & natal overview
    ├── VedicPage.jsx            # Jyotish: Rasi/Navamsa charts, Dasha, house table, AI
    ├── BaziPage.jsx             # BaZi Four Pillars with async loading + session cache
    ├── HoraryPage.jsx           # Horary: Western (Lilly) + Prashna (Jyotish) modes
    ├── ElectionalPage.jsx       # Electional: dual Western + Jyotish Muhurta scoring
    ├── GrimoirePage.jsx         # Personal reading journal & history
    ├── ReadingPage.jsx          # Deep AI natal + transit reading
    ├── HellenisticPage.jsx      # Hermetic Lots, Profections, Essential Dignities
    ├── SynastryPage.jsx         # Relationship chart comparison
    ├── ProgressionsPage.jsx     # Secondary progressions
    ├── ReturnsPage.jsx          # Solar & Lunar returns
    ├── TransitCalendarPage.jsx  # Month-view transit aspect calendar
    └── AlertsPage.jsx           # Planetary transit alert configuration
```

---

## 🛠️ Development Setup

### Prerequisites
- Node.js v18+
- Firebase project (Auth + Firestore + Storage)
- Google Gemini API key

### Installation

```bash
git clone https://github.com/clyvecute/Ephi.git
cd Ephi
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GEMINI_API_KEY=...
```

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
```

---

## ⚠️ Swiss Ephemeris WASM

The core calculation engine depends on `swisseph.wasm` in the `public/` directory. This file must always be statically served. All interactions with the WASM module are mediated exclusively through `src/lib/swe.js` using `mod.ccall` / `mod.cwrap`. Do not call WASM functions directly from components.

**Ayanamsa:** `swe_set_sid_mode(1, 0, 0)` is called at module initialization to enforce Lahiri Ayanamsa for all sidereal calculations. All BaZi and Western calculations use the tropical zodiac.

---

## 🧪 Accuracy Verification

### BaZi Reference Points
| Birth Data | Expected Day Master | Expected Month Pillar |
|---|---|---|
| 1984-02-02 12:00 Manila | Ren Xu (Water Dog) | Gui Chou (still Chou — Lichun ~Feb 4) |
| 1984-02-05 12:00 Manila | Bing Yin (Fire Tiger) | Jia Yin (AFTER Lichun, month flips) |

Cross-check: **bazi.fengshui.plus** or **bazi.masteryacademy.com**

### Jyotish Reference Points
| Parameter | Test | Expected |
|---|---|---|
| Nakshatra | Moon at 47.33° sidereal | Mrigashira, Pada 3 |
| Tithi | Moon 180° from Sun | Purnima (Full Moon) |
| Yoga | Sun 45° + Moon 300° = 345° | Brahma Yoga (index 25) |

Cross-check: **drikpanchang.com** (Panchanga), **astrosage.com** (Dasha)

---

## 📜 License

*Ensure compliance with Swiss Ephemeris licensing (AGPL or commercial) based on your deployment type.*
