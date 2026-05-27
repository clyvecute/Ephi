# ✦ Ephi: Strategic Implementation Plan

Roadmap aligned with [README.md](./README.md) and [EPHI_FIXES_V2.txt](./EPHI_FIXES_V2.txt). Emoji markers retained for scanability.

---

## ✦ Status: Recently Completed

- [x] **Firebase Auth & Cloud Sync (Phase 4.1)**: Google OAuth and cross-device chart sync.
- [x] **Serverless API Proxy (Phase 4.2)**: Secured Gemini API key via Vercel Edge.
- [x] **Transit Scrubber (Phase 1.1)**: Precise temporal jumps in the Dashboard.
- [x] **Interactive Chart Hotspots (Phase 1.2 & 3.2)**: Clickable aspects and houses.
- [x] **Synastry Grid (Phase 3.1)**: Technical Planet × Planet matrix.
- [x] **Sacred Inquiry (Horary) AI Synthesis**: Western + Prashna Oracle readings.
- [x] **Private Grimoire / Sys-Archive**: RAG binding, admin console at `/sys-archive`.
- [x] **Progressions on Tools Archive**: Removed from main nav; lives under `/tools`.
- [x] **EphiTimePicker**: Colon-separated time UI (birth form, dashboard scrubber, alerts).
- [x] **AI Reading layout**: Two-column flow; optional chart deep-dive.
- [x] **Natal Placements depth**: Layered Planet · Sign · House copy.
- [x] **Multi chart profiles (Phase 7.1 — MVP)**: Several natal charts per account; Synastry Person A/B from saved profiles; Tools Archive shows active chart.
- [x] **Landing chart**: Download buttons hidden on homepage demo wheel only.

---

## Phase 7: Accounts, Profiles & Data Sync (In Progress)

*Goal: One login, many charts — family, clients, or alternate births — with tools always reading the active profile.*

### 7.1 Multi-profile natal charts ✦ (MVP shipped)

- **Storage**: `astro_natal_profiles` + `astro_active_profile_id` (scoped per UID via `store.js`).
- **Cloud**: Firestore `users/{uid}/data/natal_profiles` + legacy `natal` doc for active chart.
- **UI**: `ChartProfilePicker` on Dashboard and Synastry; **+ New chart** creates a profile without overwriting.
- **Next**: Profile rename UI, duplicate profile, export/import single profile JSON.

### 7.2 Synastry multi-profile ✦ (MVP shipped)

- Person **A** = any saved profile (switcher).
- Person **B** = new birth form, legacy partners list, or another saved profile.
- **Next**: Persist synastry sessions per pair; composite chart tab.

### 7.3 Tools Archive ↔ active natal sync ✦ (MVP shipped)

- **Tools** page (`/tools`) shows **Active natal chart** banner (name, date, city, big three).
- Returns, Vedic, Hellenistic, Progressions should read `getActiveChart()` — audit remaining pages that still use raw `astro_natal` only.

### 7.4 RAG vs Gemini binding (documented + UX)

| Step | What happens |
|------|----------------|
| 1 | Admin binds a **tool key** (`natal`, `transit`, `horary`, `synastry`, `vedic`, `global`, …) in Grimoire or Sys-Archive. |
| 2 | **Gemini path**: Valid `https://generativelanguage.googleapis.com/.../files/...` URIs are sent as `fileUris` on `generateContent` (see `gemini.js` → `callGemini`). |
| 3 | **Local PDF pick**: Only stores `{ name, uri: 'pending_upload' }` — **not** uploaded to Google from the browser today. |
| 4 | **Groq / OpenAI**: Prompt mentions bound book **names** only; no PDF attachment. |

**To activate RAG from a local PDF:**

1. Upload PDF via [Google AI Studio](https://aistudio.google.com) File API or `functions/index.js` `uploadToGemini` (see EPHI_FIXES_V2).
2. Copy the returned **File URI**.
3. Paste in **Gemini RAG Binding** (Grimoire) or Sys-Archive for the target tool.
4. Red dot = `pending_upload`; green = live URI used by Gemini.

### 7.5 Homepage & chart export

- **Landing** (`/`): Demo wheel — **no** PNG/SVG download controls (`allowDownload={false}`).
- **Dashboard / Reading / Synastry**: Download remains available where `allowDownload` defaults true.

---

## Phase 1: High Urgency | Core UX

### 1.3 High-Res Chart Export ✦ (Completed, scoped)

- Export on in-app wheels only; not on marketing homepage demo.

---

## Phase 2: Platform Maturity

### 2.1 PWA & Mobile Installation ✦ (Completed)

### 2.2 Electional Astrology Module

### 2.3 AI Voice/Tone Selector (Oracle Persona in Grimoire)

---

## Phase 4–6: Scaling, Credits, WASM ✦ (Completed per README)

See README for Divine Credits, oracle abstraction, IndexedDB, Swiss Ephemeris WASM.

---

## Phase 8: EPHI_FIXES_V2 backlog

| Item | Priority | Notes |
|------|----------|-------|
| PayPal **Acquire** buttons | High | `SupportPage.jsx` — pre-filled `paypal.me` links |
| GCash tab on bundle cards | Medium | SupportPage |
| `uploadToGemini` Cloud Function | High | Replaces `pending_upload` with real URIs |
| Nav: admin **Sys-Archive** link | Medium | `VITE_ADMIN_UID` only |
| Rename nav **Tools Archive** → **Tools** | Low | Label only |
| Remove duplicate admin tables from Grimoire | Medium | Use `AdminPage` only |
| RAG status dots in file list | Low | Partially in Sys-Archive |

---

## ✦ Urgency Matrix

| Feature | Urgency | Importance |
| :--- | :--- | :--- |
| **Multi-profile charts** | ✦✦✦✦✧ | ✦✦✦✦✦ |
| **Tools active-chart sync** | ✦✦✦✦✧ | ✦✦✦✦✧ |
| **Gemini PDF upload pipeline** | ✦✦✦✦✧ | ✦✦✦✦✦ |
| **Transit Scrubber** | ✦✦✦✦✦ | ✦✦✦✦✦ |
| **Electional Module** | ✦✦✧✧✧ | ✦✦✦✦✦ |
| **API Proxy** | ✦✧✧✧✧ | ✦✦✦✦✦ |

---

## ✦ Final Recommendations

1. Wire **BaziPage** to `bazi_accurate.js` (README outstanding item).
2. After `uploadToGemini` ships, auto-refresh library entry URI on successful upload.
3. Add FAQ entry: “Why doesn’t my PDF work after I picked it?” → point to URI binding flow above.
