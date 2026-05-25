# System Fixes & Operational Summary

This document summarizes the critical bugs fixed in Ephi, structural refinements to the administrative **Sys-Archive** console, and instructions on how to dynamically link your personal PayPal as a support channel.

---

## 🛠️ Resolved Runtime Bugs

### 1. Swiss Ephemeris WASM Initialization Error
* **Problem**: Astrological calculations threw a console error:
  ```
  swe.js:109 [SWE] Failed to initialize WASM: TypeError: func is not a function at swe.js:101:11
  ```
* **Root Cause**: Emscripten/WASM compilation sometimes changes exported C function names, wrapping them with a `_wrap` suffix (e.g. `_swe_set_sid_mode_wrap` instead of `_swe_set_sid_mode`). The system already resolved dynamic wrapped names for standard calculations but was calling `ccall('swe_set_sid_mode')` directly using a static string which threw a `TypeError` on load.
* **Fix**: Extended the runtime `FN` discovery map in `src/lib/swe.js` to probe for `swe_set_sid_mode` vs `swe_set_sid_mode_wrap` and bound the initialization call to the resolved dynamic method name.

### 2. NatalSummary Component Crash
* **Problem**: Natal summary dashboard crashed on load:
  ```
  NatalSummary.jsx:162 Uncaught TypeError: Cannot read properties of undefined (reading 'longitude')
  ```
* **Root Cause**: Calculation of Hermetic Lots and Essential Dignities attempted to read the `longitude` property from planet keys on the `positions` object. If any planet (e.g. Venus, Mars) failed to load asynchronously or was absent, it crashed the entire page render.
* **Fix**: Upgraded `lots` and `dignities` memo hooks in `src/components/NatalSummary.jsx` with defensive null-guards (`val == null`) and default fallback coordinates (`0`) to prevent any crashes from missing or partially loaded placements.

---

## 🔒 Sys-Archive (Internal Admin Panel) Decoupling

* **Problem**: Navigating to the admin panel at `/sys-archive` displayed "The Grimoire" header and external user-facing RAG reference binding forms. This felt cluttered and exposed external features on internal control systems.
* **Fix**:
  * **Dynamic Path Detection**: Integrated `window.location.pathname === '/sys-archive'` detection inside `GrimoirePage.jsx`.
  * **Tailored Administrative Header**: Custom headers now render for `/sys-archive` displaying **Sys-Archive (Admin)** instead of "The Grimoire".
  * **View Separation**: Decoupled the library binding grid completely. External reference uploading/binding is hidden entirely on the `/sys-archive` panel, leaving a focused dashboard consisting solely of the **System Observatory** (real-time diagnostics, pulse latency, API quota, RAG integrity) and **System Analytics** (User Feedback logs, telemetry).

---

## 💳 Linking Your Personal PayPal

You do not need a PayPal Business account. The Ephi donation hub now dynamically binds to your personal PayPal link via environment variables.

### How to configure:
1. Open your local `.env` (or `.env.local`) file.
2. Add your custom PayPal link:
   ```env
   VITE_PAYPAL_URL=https://paypal.me/your_custom_username
   ```
3. Save the file. The Support Page will automatically fetch this link, format the PayPal option for personal transfers, and route donors to your personal PayPal profile.
