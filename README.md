# Ephi

Ephi is a professional-grade astrological and ephemeris web application built with React and powered by a WebAssembly implementation of the Swiss Ephemeris (`swisseph`). It provides high-precision astronomical calculations and features a fully custom, high-fidelity SVG chart renderer, comprehensive natal chart generation, real-time transits, and AI-powered astrological insights.

## ✨ Key Features

- **Professional Ephemeris Engine:** Utilizes a WASM-compiled Swiss Ephemeris (`swe.js`) for rigorous, high-precision planetary positioning, house cusps, and retrograde tracking.
- **Custom SVG Astro Chart Wheel:** A bespoke, dynamic SVG chart renderer (`AstroChartWheel.jsx`) that mimics the quality of Astro-Seek without external charting library dependencies. Features include:
  - Degree ruler rings with precise tick marks.
  - Anti-collision geometric algorithms to neatly fan out clustered planets (stelliums).
  - Distinct aspect lines with varying thickness and patterns based on aspect strength and type.
  - Retrograde markers, precise degree labels, and proper axis labelling (AC, DC, MC, IC).
  - High-resolution PNG export capabilities.
- **Advanced Astrology Support:** 
  - Supports multiple house systems (Placidus, Whole Sign, Koch, Porphyry, Regiomontanus).
  - Tropical (Western) and Sidereal (Vedic/Lahiri) zodiac support.
  - Hellenistic techniques: Essential Dignities, Hermetic Lots (Fortune, Spirit, Eros, etc.), and Annual Profections.
  - Cross-disciplinary features, including Chinese BaZi pillar calculations.
- **AI "Oracle" Integration:** An AI-powered reading system (`oracle.js`) supporting multiple models (Google Gemini and Llama/Groq) to provide deep, personalized interpretations of natal placements and transits.
- **Modern Dashboard & UI:** A sleek, dark-mode inspired "Midnight Cyber" aesthetic. Features include an intuitive time-scrubbing dashboard, robust state management, and real-time transit views.
- **Cloud Sync:** Firebase integration for securely saving and syncing natal charts and user preferences across devices.

## 🚀 Workflow & Architecture

### Core Components
1. **The WASM Engine (`src/lib/swe.js`):** The backbone of the application. It initializes the Emscripten module and provides a clean JavaScript API over raw C functions to calculate planetary longitudes, latitudes, and house cusps based on the input UTC date and geographic coordinates.
2. **Chart Generation (`src/lib/natal.js` & `src/lib/ephemeris.js`):** These modules consume the raw data from `swe.js` and structure it into standardized chart objects, mapping raw degrees to zodiac signs, tracking retrogrades, and computing house placements.
3. **The User Interface (`src/components/` & `src/pages/`):** 
   - `NatalForm.jsx`: A heavily optimized, multi-step entry form handling location geocoding via OSM Nominatim and automatic timezone deduction.
   - `Dashboard.jsx`: The central hub for switching between "Live Sky" transits and saved "Natal" charts, powered by a simplified `datetime-local` scrubber.
   - `AstroChartWheel.jsx`: The standalone SVG renderer for drawing single (natal) or bi-wheel (transits/synastry) charts.
4. **AI Generation (`src/lib/oracle.js`):** Constructs prompt contexts using the highly structured astrological data and queries the selected AI model to generate prose interpretations.

### Typical Data Flow
1. **User Input:** User enters birth data (Date, Time, Location).
2. **Geocoding & Timezone:** `NatalForm.jsx` resolves the city to exact Coordinates (Lat/Lon) and deduces the IANA Timezone.
3. **Calculation:** `useNatal.js` sends the UTC timestamp to `generatePrecisionNatalChart()`, which queries the Swiss Ephemeris WASM module.
4. **State Management:** The resulting chart data is cached locally via `localStorage` and synced remotely via Firebase Firestore.
5. **Rendering:** The data is passed to `AstroChartWheel.jsx` for visual rendering and to `NatalSummary.jsx` for structured data tables and text breakdowns.

## 🛠️ Development Setup

### Prerequisites
- Node.js (v18+ recommended)
- Firebase Account (for auth and database sync)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Ensure your `.env` file contains your Firebase configuration and AI API keys (e.g., Gemini API key).
4. Start the development server:
   ```bash
   npm run dev
   ```

### Important Notes on the Swiss Ephemeris WASM
The core astronomical math depends on the `swisseph.wasm` binary located in the `public/` directory. Ensure this file is always served statically. Interactions with the WASM layer are strictly mediated by `src/lib/swe.js` using `mod.ccall` to prevent TypeScript/wrapper compilation bugs.

## 📜 License
*Note: Include your license here. Ensure compliance with the Swiss Ephemeris open-source/commercial licensing requirements depending on the nature of your deployment.*
