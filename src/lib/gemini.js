// lib/gemini.js
//
// Calls Gemini Flash to generate a personalized astrology reading.
// Synthesizes natal chart + active transits into one coherent narrative.
//
import { detectPatterns } from './patterns.js';
import { getLatestReading } from './readingCache.js';
import { getBookForTool } from './library.js';
import { store } from './store.js';
// Usage:
//   import { generateReading, generateAspectReading } from '../lib/gemini.js';
//
//   // Full synthesis reading (all active transits together)
//   const reading = await generateReading({ natal, aspects, focus: 'career' });
//
//   // Single aspect deep-dive
//   const dive = await generateAspectReading({ transitPlanet: 'mars', aspectName: 'square', natalPlanet: 'moon', natal });

// ─── Config ───────────────────────────────────────────────────────────────────

const PROXY_URL = '/api/oracle';

const DEFAULT_MAX_TOKENS = 1024;
const TEMPERATURE        = 0.85; // slightly creative but grounded

// ─── Zodiac / planet helpers ──────────────────────────────────────────────────

export const SIGN_FOR = (lon) => {
  const signs = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
  ];
  return signs[Math.floor(((lon % 360) + 360) % 360 / 30)];
};

export const DEG_IN_SIGN = (lon) => (((lon % 360) + 360) % 360 % 30).toFixed(1);

export const PLANET_LABEL = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  chiron: 'Chiron', nnode: 'North Node', snode: 'South Node',
  lilith: 'Lilith', fortune: 'Part of Fortune',
};

const SIGN_RULERS_TRAD = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon',
  Leo: 'sun', Virgo: 'mercury', Libra: 'venus', Scorpio: 'mars',
  Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

/**
 * Formats the natal chart into a readable paragraph for the prompt.
 */
export function formatNatal(natal) {
  if (!natal?.positions) return 'Natal chart not available.';

  const signs = [
    'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
    'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
  ];

  const ascSign = natal.risingSign;
  const ascIdx = ascSign ? signs.indexOf(ascSign) : -1;

  // Helper to trace dispositors
  const getRuler = (planet) => {
    const lon = natal.positions[planet];
    if (lon == null) return null;
    const sign = SIGN_FOR(lon);
    return SIGN_RULERS_TRAD[sign];
  };

  const traceDispositor = (startPlanet) => {
    let current = startPlanet;
    const chain = [];
    const visited = new Set();
    
    while (true) {
      visited.add(current);
      const ruler = getRuler(current);
      if (!ruler) break;
      
      if (ruler === current) {
        chain.push(`Final Dispositor: ${PLANET_LABEL[current]}`);
        break;
      }
      
      if (visited.has(ruler)) {
        chain.push(`Mutual Reception with ${PLANET_LABEL[ruler]}`);
        break;
      }
      
      chain.push(`Disposited by ${PLANET_LABEL[ruler]}`);
      current = ruler;
    }
    return chain.join(' -> ');
  };

  const lines = Object.entries(natal.positions).map(([planet, lon]) => {
    const sign = SIGN_FOR(lon);
    const deg  = DEG_IN_SIGN(lon);
    const exactDegInt = Math.floor((lon % 360) % 30) + 1; // 1-30 for Sabian Symbol
    
    let houseInfo = '';
    if (ascIdx !== -1) {
      const signIdx = signs.indexOf(sign);
      const houseNum = (signIdx - ascIdx + 12) % 12 + 1;
      houseInfo = ` (in ${houseNum}${getOrdinal(houseNum)} House)`;
    }

    const dispChain = traceDispositor(planet);

    return `${PLANET_LABEL[planet] || planet}: ${exactDegInt}° ${sign}${houseInfo} | ${dispChain} | Sabian Degree: ${exactDegInt}° ${sign}`;
  });

  let houseCusps = '';
  if (ascIdx !== -1) {
    houseCusps = '\nWHOLE SIGN HOUSE CUSPS:\n';
    for (let i = 0; i < 12; i++) {
      const signIdx = (ascIdx + i) % 12;
      const sign = signs[signIdx];
      const ruler = SIGN_RULERS_TRAD[sign];
      houseCusps += `• ${i+1}${getOrdinal(i+1)} House: ${sign} (Ruled by ${PLANET_LABEL[ruler]})\n`;
    }
  }

  const meta = natal.meta || {};
  const header = [
    meta.birthDate   ? `Birth date: ${meta.birthDate}`   : null,
    meta.birthTime   ? `Birth time: ${meta.birthTime}`   : null,
    meta.birthCity   ? `Birth city: ${meta.birthCity}`   : null,
    ascSign ? `Rising Sign: ${ascSign}` : null,
    natal.mc ? `Midheaven (MC): ${natal.mc.sign} ${DEG_IN_SIGN(natal.mc.longitude)}°` : null,
  ].filter(Boolean).join(' · ');

  return `${header ? header + '\n' : ''}${lines.join('\n')}${houseCusps}`;
}

/**
 * Formats detected patterns for the prompt.
 */
export function formatPatterns(natal) {
  if (!natal?.positions) return '';
  const patterns = detectPatterns(natal.positions);
  if (!patterns.length) return 'No major aspect patterns (like Grand Trines or Stelliums) detected.';
  
  return 'CHART PATTERNS DETECTED:\n' + patterns.map(p => `• ${p.type}: ${p.description} (${p.focus})`).join('\n');
}

/**
 * Formats active aspects into a concise list for the prompt.
 * Only includes exact/strong/moderate aspects to avoid noise.
 */
export function formatAspects(aspects) {
  if (!aspects?.length) return 'No significant transits currently active.';

  const notable = aspects
    .filter((a) => a.strength !== 'wide')
    .slice(0, 12); // cap at 12 to keep prompt focused

  if (!notable.length) return 'Only wide transits active — sky is relatively quiet.';

  return notable.map((a) => {
    const tLabel = PLANET_LABEL[a.transitPlanet] || a.transitPlanet;
    const nLabel = PLANET_LABEL[a.natalPlanet]   || a.natalPlanet;
    const status = a.applying ? 'applying' : 'separating';
    const timing = a.exactAtLabel ? ` (Exact: ${a.exactAtLabel})` : '';
    
    // Duration hints for the AI
    let duration = 'short-term (2-4 days)';
    if (a.transitPlanet === 'mars') duration = 'medium-term (1-2 weeks)';
    if (a.transitPlanet === 'jupiter') duration = 'long-term (3-5 weeks)';
    if (a.transitPlanet === 'saturn') duration = 'significant (1-2 months)';
    if (['uranus','neptune','pluto'].includes(a.transitPlanet)) duration = 'major life-shift (several months)';

    return `• Transit ${tLabel} ${a.symbol} Natal ${nLabel} — Orb: ${a.orb.toFixed(1)}°, ${a.strength}, ${status}. Duration: ${duration}. ${timing}`;
  }).join('\n');
}

const PERSONA_CONTEXT = {
  stoic:   'a world-class, professional consultant astrologer who weaves together psychological depth, traditional Hellenistic techniques, and modern evolutionary insights. You avoid generic, simplified horoscope language. You provide "Above Professional" level synthesis that is usually only found in high-end, paid personal consultations. Your tone is sophisticated, editorial, deeply psychological, and empowering.',
  mystic:  'an ancient esoteric oracle. Your language is poetic, symbolic, and deeply mystical. You focus on soul evolution, karmic threads, and the "unseen" realms. You avoid modern corporate or psychological jargon, preferring the language of alchemy and archetypes.',
  analyst: 'a modern psychological analyst. You focus on practical solutions, behavioral patterns, and personal growth. Your language is grounded, clear, and actionable. You bridge the gap between ancient symbols and modern day-to-day reality.',
  jurist:  'a strict traditional Hellenistic astrologer. You focus on essential dignity, house rulership, and objective verdicts. You do not sugarcoat your readings. Your tone is direct, technical, and based on the deterministic rules of the classical tradition.'
};

function getPersona() {
  return store.get('ephi_persona') || 'stoic';
}

/**
 * Focus area descriptions used in the prompt to steer the reading.
 */
const FOCUS_CONTEXT = {
  general:   'Give a holistic synthesis covering the most prominent themes across all life areas.',
  love:      'Emphasise romantic relationships, attraction, emotional intimacy, and partnership dynamics.',
  career:    'Focus on ambition, work, public reputation, finances, and practical achievements.',
  health:    'Address physical vitality, energy levels, nervous system, stress, and body awareness.',
  spiritual: 'Explore inner growth, shadow work, intuition, spiritual practice, and soul evolution.',
  mind:      'Highlight mental clarity, communication, learning, decisions, and perception.',
};

/**
 * Builds the main synthesis prompt.
 */
export function buildSynthesisPrompt({ natal, natalText, aspectsText, focus, userName, userQuery, mode = 'transit' }) {
  const personaKey = getPersona();
  const personaDesc = PERSONA_CONTEXT[personaKey] || PERSONA_CONTEXT.stoic;
  const focusInstruction = FOCUS_CONTEXT[focus] || FOCUS_CONTEXT.general;
  const name = userName ? `The person's name is ${userName}.` : '';

  const libraryBooks = getBookForTool(mode === 'natal' ? 'natal' : 'transit');
  let ragPrompt = '';
  if (libraryBooks.length > 0) {
    const bookLabels = libraryBooks.map(b => b.name).join(', ');
    ragPrompt = `\nCRITICAL RAG INSTRUCTION: You MUST base your interpretations, techniques, and synthesis on the specific astrological principles, house-ruling styles, and transit-forecast techniques outlined in the reference book(s): ${bookLabels}. Align your tone and technical approach with these works.`;
  }

  let queryInstruction = '';
  if (userQuery) {
    queryInstruction = `
THE USER HAS A SPECIFIC INQUIRY:
"${userQuery}"
Please prioritize answering this question deeply using the provided data.
`;
  }

  const previousReading = getLatestReading();
  let previousReadingContext = '';
  if (previousReading && previousReading.text) {
    previousReadingContext = `HISTORICAL CONTEXT (Your Last Reading):
The user recently received the following reading from you. Acknowledge this past context in your new synthesis so it feels like an ongoing conversation. If the user asks a question, refer back to the themes in this past reading if relevant.
--START PAST READING--
${previousReading.text.substring(0, 1500)} // Truncated to save context
--END PAST READING--`;
  }

  if (mode === 'natal') {
    return `You are "Antigravity," ${personaDesc}

YOUR TASK: Write a comprehensive, essay-style reading focusing SOLELY on the user's Natal Chart (their fundamental soul blueprint). Do NOT discuss transits.

${name}

${queryInstruction}

${previousReadingContext}

${ragPrompt}

NATAL CHART DATA (Whole Sign Houses & Dispositor Trees):
${natalText}

${formatPatterns(natal)}

READING FOCUS: ${focusInstruction}

REQUIRED DEPTH:
1. **Dispositor Trees & House Rulership**: Integrate the dispositor chains provided. Do not just say a planet is in a house; trace its energy back to the final dispositor to explain its true motivation.
2. **Sabian Symbols**: Incorporate the imagery and esoteric meaning of the exact Sabian degree provided for the Sun and Ascendant to add poetic depth.
3. **The "Shadow to Gift" Spectrum**: For every challenge in the chart, describe the specific psychological mechanism of the shadow, and the exact spiritual discipline required to turn it into a gift.
3. **Essay Length**: The reading must be a deep, multi-paragraph essay (400-600 words) that connects disparate parts of the chart into a unified life-narrative.

Structure your response using these headers:

1. **The Direct Inquiry** (If user asked a question): Address it with brutal honesty and technical precision.
2. **Chart Architecture & Core Blueprint**: Analyze the overall natal geometry. What is the fundamental "Internal Engine" of this person?
3. **The Karmic Curriculum**: What are the major life themes and deepest lessons embedded in this chart?
4. **The Shadow Pitfall**: What is the ONE most dangerous trap they repeatedly fall into?
5. **The Evolutionary Homework**: 3 precise, high-level actions they must master to align with their chart's highest potential.

Tone: Sophisticated, editorial, deeply psychological, and empowering. Use the language of an elite consultant.`;
  }

  // Default transit mode
  return `You are "Antigravity," ${personaDesc}

YOUR TASK: Write a comprehensive, essay-style reading focusing on the ACTIVE TRANSITS currently hitting the natal chart. Do not write a general natal reading. Only discuss natal placements when they are being directly activated by a current transit.

${name}

${queryInstruction}

${previousReadingContext}

${ragPrompt}

NATAL CHART DATA (For Reference):
${natalText}

ACTIVE TRANSITS RIGHT NOW:
${aspectsText}

READING FOCUS: ${focusInstruction}

REQUIRED DEPTH:
1. **Transit Activation & Dispositors**: Explain exactly how the active transits trigger specific natal planets. Reference the natal planet's dispositor chain (who rules it) to show the true root of the transit.
2. **Phase & Timing**: Use the "Applying vs Separating" orb data to explain if an energy is building toward a crisis, peaking now, or leaving a "wake" of transformation.
3. **Essay Length**: The reading must be a deep, multi-paragraph essay (400-600 words) that connects the current astrological weather to the user's life.

Structure your response using these headers:

1. **The Direct Inquiry** (If user asked a question): Address it with brutal honesty based on the current transits.
2. **The Current Cosmic Crucible**: Analyze the 2-3 most powerful transits happening right now. Explain the "Surface to Roots" impact. How does this transit activate their core natal potential?
3. **Timeline of Transformation**: Give specific windows of intensity based on the transits. Is this a 2-day mental spark or a 6-month identity overhaul?
4. **The Shadow Pitfall**: What is the ONE most dangerous trap they could fall into *this week* due to the current transits?
5. **The Evolutionary Homework**: 3 precise, high-level actions they must take to navigate this specific cosmic weather.

Tone: Sophisticated, editorial, deeply psychological, and empowering. Use the language of an elite consultant.`;
}

/**
 * Builds a single-aspect deep-dive prompt.
 */
export function buildAspectPrompt({ transitPlanet, aspectName, natalPlanet, natalSign, transitSign, orb, applying }) {
  const tLabel = PLANET_LABEL[transitPlanet] || transitPlanet;
  const nLabel = PLANET_LABEL[natalPlanet]   || natalPlanet;
  const status = applying ? 'applying (building in intensity)' : 'separating (peak has passed)';

  return `You are a skilled astrologer. Write a deep, nuanced interpretation of the following transit aspect.

Transit: ${tLabel} in ${transitSign || 'unknown sign'}
Natal:   ${nLabel} in ${natalSign   || 'unknown sign'}
Aspect:  ${aspectName}
Orb:     ${orb?.toFixed(2) || '?'}° (${status})

Write 2–3 paragraphs covering:
- The core psychological and energetic meaning of this combination
- How the natal placement (${nLabel} in ${natalSign}) colours the experience
- Shadow expression to watch for
- The gift or growth opportunity available

Tone: psychological depth + practical grounding + spiritual awareness. Speak directly to the person ("you"). Avoid generic horoscope language. Be specific and insightful.`;
}

// ─── Core API call ────────────────────────────────────────────────────────────

/**
 * Makes a single call to the Gemini Flash API.
 *
 * @param {string} prompt
 * @param {number} maxTokens
 * @returns {Promise<string>} the generated text
 */
async function callGemini(prompt, maxTokens = DEFAULT_MAX_TOKENS, fileUri = null, fileUris = null) {
  // ── Proxy mode (production): route through Vercel /api/oracle ──
  let headers = { 'Content-Type': 'application/json' };

  // Attach Firebase auth token if user is logged in
  try {
    const { auth } = await import('./firebase');
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch { /* non-auth environments */ }

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, fileUri, fileUris }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      if (res.status === 404) {
        throw new Error('Oracle Proxy not found (404). Server endpoint is down.');
      }
      throw new Error(err?.error || `Proxy error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Oracle returned an empty response.');
    return text.trim();
  } catch (err) {
    console.error('[Gemini] Proxy request failed:', err.message);
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a full personalized reading synthesizing natal + all active transits.
 *
 * @param {string} [params.userName]  — optional, personalises the prompt
 * @param {string} [params.userQuery] — optional, custom question
 * @returns {Promise<{ text: string, focus: string, timestamp: string, aspectCount: number }>}
 */
export async function generateReading({ natal, aspects, focus = 'general', userName, userQuery, fileUri, mode = 'transit' }) {
  const natalText   = formatNatal(natal);
  const aspectsText = formatAspects(aspects);
  
  // Check library for a tool-specific book if no manual fileUri is passed
  let activeFileUris = fileUri ? [fileUri] : [];
  const libraryBooks = getBookForTool(mode === 'natal' ? 'natal' : 'transit');
  if (activeFileUris.length === 0) {
    activeFileUris = libraryBooks.map(b => b.uri).filter(u => u !== 'pending_upload');
  }

  // If we are passing a book, add a note to the prompt to use it
  let prompt = buildSynthesisPrompt({ natal, natalText, aspectsText, focus, userName, userQuery, mode });
  if (activeFileUris.length > 0) {
    const bookLabels = libraryBooks.map(b => b.name).join(', ') || 'reference material';
    prompt += `\n\nCRITICAL INSTRUCTION: I have attached reference books (${bookLabels}) to this request. You MUST base your interpretations, techniques, and synthesis on the principles outlined in these specific documents.`;
  }

  const text = await callGemini(prompt, 1400, null, activeFileUris);

  return {
    text,
    focus,
    userQuery,
    timestamp:   new Date().toISOString(),
    aspectCount: aspects?.length || 0,
  };
}

/**
 * Generate a deep-dive reading for a single transit aspect.
 *
 * @param {Object} params
 * @param {string} params.transitPlanet
 * @param {string} params.aspectName
 * @param {string} params.natalPlanet
 * @param {Object} params.natal         — natal data (for sign lookup)
 * @param {number} [params.orb]
 * @param {boolean} [params.applying]
 * @returns {Promise<{ text: string, aspect: Object, timestamp: string }>}
 */
export async function generateAspectReading({ transitPlanet, aspectName, natalPlanet, natal, orb, applying }) {
  // Look up signs from natal data
  const lon = natal?.positions?.[natalPlanet];
  const natalSign = lon != null ? SIGN_FOR(lon) : null;
  const transitSign = null; // transit sign not stored in natal — could pass currentPositions if needed

  const prompt = buildAspectPrompt({
    transitPlanet,
    aspectName,
    natalPlanet,
    natalSign,
    transitSign,
    orb,
    applying,
  });

  const text = await callGemini(prompt, 600);

  return {
    text,
    aspect: { transitPlanet, aspectName, natalPlanet, orb, applying },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Rapid diagnostic probe for System Observatory.
 * Measures latency and API availability.
 */
export async function testApi() {
  const prompt = "REPLY ONLY WITH 'PULSE_OK'. THIS IS A CONNECTIVITY TEST.";
  const start = Date.now();
  const text = await callGemini(prompt, 10);
  const end = Date.now();
  return {
    latency: end - start,
    status: text.includes('PULSE_OK') ? 'healthy' : 'degraded'
  };
}

/**
 * Quick check: is the Gemini API key configured?
 */
export function isGeminiConfigured() {
  return Boolean(API_KEY);
}

/**
 * Generate a relationship synastry reading for two people.
 *
 * @param {Object} params
 * @param {string} params.nameA
 * @param {Object} params.chartA
 * @param {string} params.nameB
 * @param {Object} params.chartB
 * @param {Array}  params.aspects
 * @param {Object} params.score
 * @returns {Promise<{ text: string, timestamp: string }>}
 */
export async function generateSynastryReading({ nameA, chartA, nameB, chartB, aspects, score }) {
  const natalAText = formatNatal(chartA);
  const natalBText = formatNatal(chartB);

  // Custom format for synastry aspects
  const formatSynastryAspects = (asps) =>
    asps.slice(0, 15).map(a => {
      const pFrom = PLANET_LABEL[a.transitPlanet] || a.transitPlanet;
      const pTo   = PLANET_LABEL[a.natalPlanet]   || a.natalPlanet;
      return `• ${pFrom} (${nameA}) ${a.symbol} ${pTo} (${nameB}) — ${a.orb.toFixed(1)}° orb, ${a.nature} (${a.aspectName})`;
    }).join('\n');

  const aspectsText = formatSynastryAspects(aspects);

  const prompt = `You are a world-class relationship astrologer and synastry expert. You provide nuanced, deep, and compassionate readings for couples, friends, or partners. You weave together psychological dynamics, karmic connections, and practical relationship advice.

PROFILES:
Person A: ${nameA}
${natalAText}

Person B: ${nameB}
${natalBText}

COMPATIBILITY METRICS:
- Harmony Score: ${score.harmony}%
- Tension Score: ${score.tension}%
- Grade: ${score.grade}
- Brief Summary: ${score.summary}

KEY INTER-CHART ASPECTS:
${aspectsText}

Write a comprehensive relationship reading for ${nameA} and ${nameB}. Use a warm, editorial, and deeply insightful tone. Address them directly as a pair. Structure it as follows:

1. **The Core Dynamic** (2–3 paragraphs): What is the foundational energy between these two? Is it a "slow burn," an "electric attraction," or a "karmic challenge"? Use their Sun and Moon signs specifically to describe how their core identities and emotional needs mesh.

2. **Cosmic Strengths** (2–3 paragraphs): Which aspects create the most ease and longevity? How do they support each other's growth? Be specific about the planetary links (e.g., "The Venus-Jupiter trine suggests...").

3. **Tensions & Triggers** (2 paragraphs): Where do they naturally clash? What are the "growth edges" in this relationship? Offer psychological perspective on how to navigate these frictions without blame.

4. **Karmic Purpose** (1 paragraph): Why have these two souls come together? What is the larger mission or lesson of this union?

5. **Advice for the Path Ahead** (3 clear bullet points): Practical, grounded steps they can take to strengthen their bond and navigate their unique tensions.

Avoid clichés and generic horoscopes. The reading should feel bespoke, sophisticated, and life-affirming. Avoid calling them "the natives." Use "you" and "your."`;

  const text = await callGemini(prompt, 1400);

  return {
    text,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a specialized Jyotish (Vedic) reading.
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.mahadasha
 * @param {string} params.antardasha
 * @param {Object} params.ascNakshatra
 * @param {Object} params.moonNakshatra
 * @returns {Promise<{ text: string, timestamp: string }>}
 */
export async function generateVedicReading({
  name, mahadasha, antardasha, pratyantardasha,
  mahaEnd, antarEnd,
  ascNakshatra, moonNakshatra,
  lagnaSign, moonSign, sunSign,
  planetHouses,
  planetSigns,
  planetDignities,
  panchanga,
}) {
  const libraryBooks = getBookForTool('vedic');
  const validUris    = libraryBooks.map(b => b.uri).filter(u => u !== 'pending_upload');

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

/**
 * Generate a Return chart or Progression reading.
 */
export async function generateReturnReading({ natal, returnChart, mode }) {
  const natalText = formatNatal(natal);
  const returnText = formatNatal(returnChart);

  let modeDesc = '';
  if (mode === 'solar') modeDesc = 'Solar Return (Year Ahead Forecast)';
  if (mode === 'lunar') modeDesc = 'Lunar Return (Month Ahead Emotional Forecast)';
  if (mode === 'progressed') modeDesc = 'Secondary Progressions (Current Evolution of the Natal Soul)';

  const prompt = `You are "Antigravity," an elite consultant astrologer. You provide "Above Professional" level synthesis. 
  
YOUR TASK: Analyze the user's ${modeDesc} against their Natal Chart.

NATAL CHART (The Baseline):
${natalText}

${mode.toUpperCase()} CHART (The Current Cycle):
${returnText}

REQUIRED DEPTH:
Write a comprehensive, deep psychological essay (400-600 words) analyzing this specific ${modeDesc} chart. 
- If this is a Solar Return, focus on the theme of the upcoming year. What is the "mission" of this year? 
- If Lunar Return, focus on the emotional undertones of the next 28 days.
- If Secondary Progressions, focus on how their inner identity, needs, and desires have slowly evolved from the natal baseline. What "phase" of life are they in now?

Structure your response using these headers:
1. **The Theme of the Cycle**: Give a high-level, poetic yet grounded summary of this period.
2. **Key Activations**: What are the 2-3 most critical planetary shifts or exact conjunctions happening in this return/progression chart relative to the natal?
3. **The Shadow Pitfall**: What is the ONE most dangerous trap they could fall into during this cycle?
4. **The Evolutionary Homework**: 3 precise, high-level actions they must take to master this cycle.

Tone: Sophisticated, editorial, deeply psychological, and empowering. Use "you" and address them directly.`;

  const text = await callGemini(prompt, 1200);
  return {
    text,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a deep Horary judgment synthesis.
 */
export async function generateHoraryReading({ chart, judgment }) {
  const formatHorary = (c) => {
    const pLines = Object.entries(c.planets).filter(([_,p]) => p.traditional).map(([key, p]) => {
      return `• ${p.label}: ${p.degree.toFixed(1)}° ${p.sign} in H${p.house} (${p.dignity})${p.isRetrograde ? ' Rx' : ''}${p.isCombust ? ' COMBUST' : ''}${p.isCazimi ? ' CAZIMI' : ''}`;
    }).join('\n');

    const aspLines = c.aspects.map(a => `• ${a.planet1} ${a.aspect} ${a.planet2} (${a.orb.toFixed(1)}°, ${a.applying ? 'applying' : 'separating'})`).join('\n');
    
    return `
QUESTION: "${c.question}"
DATE/TIME: ${c.date}
LOCATION: Lat ${c.lat.toFixed(2)}, Lng ${c.lng.toFixed(2)}

SIGNIFICATORS:
- Querent (Self): ${c.significators.querent.planet} (Lord of H1)
- Co-significator: Moon
- Quesited (Topic): ${c.significators.quesited.planet} (Lord of H${c.significators.quesited.house}, ${c.significators.quesited.topic})

TECHNICAL DATA:
${pLines}

KEY ASPECTS:
${aspLines}

STRICTURES & RADICALITY:
- Radical: ${c.radicality.radical ? 'Yes' : 'No'}
- Issues: ${c.radicality.issues.join(', ') || 'None'}
- Void of Course Moon: ${c.voidOfCourse ? 'Yes' : 'No'}
`;
  };

  const dataText = formatHorary(chart);
  const libraryBooks = getBookForTool('horary');
  const validUris = libraryBooks.map(b => b.uri).filter(u => u !== 'pending_upload');

  const prompt = `You are "Antigravity," a master traditional Horary Astrologer. You follow the strict, technical rules of William Lilly's "Christian Astrology" but provide your judgment with modern psychological depth and editorial sophistication.
  
${libraryBooks.length > 0 ? `CRITICAL: Base your analysis on the specific techniques in the attached documents (${libraryBooks.map(b=>b.name).join(', ')}).` : ''}

YOUR TASK: Provide an "Above Professional" level synthesis and final judgment for the user's question.

HORARY CHART DATA:
${dataText}

JUDGMENT INDICATORS:
Favorable: ${judgment.favorable.join(' · ')}
Unfavorable: ${judgment.unfavorable.join(' · ')}
Neutral: ${judgment.neutral.join(' · ')}

Write a deep, multi-paragraph essay (500-700 words) that "tells the client everything." Do not be vague. Address the user directly as "you."

Structure your response using these headers:
1. **The Verdict**: Start with a direct, honest answer to the question. Yes, No, or Unlikely? Explain the technical core of the decision immediately.
2. **The Querent's State**: Analyze the condition of the Lord of the 1st and the Moon. What is your current mindset and power in this situation?
3. **The State of the Matter**: Analyze the Lord of the questioned house. Is the thing you seek strong, flawed, or hidden?
4. **The Path to Completion**: Describe how the matter resolves. Look for aspects, translation of light, or mutual reception. Who or what is the deciding factor?
5. **The Oracle's Warning**: What is the shadow element or the one thing you are not seeing?
6. **Timing**: Based on the applying aspects and significator speed, when will this resolve?

Tone: Sophisticated, technical yet accessible, deeply insightful, and objective.`;

  const text = await callGemini(prompt, 1500, null, validUris);

  return {
    text,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Continue a Horary session with follow-up questions.
 */
export async function continueHoraryReading({ chart, history, userMessage }) {
  const formatHorary = (c) => {
    const pLines = Object.entries(c.planets).filter(([_,p]) => p.traditional).map(([key, p]) => {
      return `• ${p.label}: ${p.degree.toFixed(1)}° ${p.sign} in H${p.house} (${p.dignity})${p.isRetrograde ? ' Rx' : ''}`;
    }).join('\n');
    return `QUESTION: "${c.question}"\nCHART DATA:\n${pLines}`;
  };

  const chartContext = formatHorary(chart);
  const libraryBooks = getBookForTool('horary');
  const validUris = libraryBooks.map(b => b.uri).filter(u => u !== 'pending_upload');

  const historyContext = history.map(h => `${h.role === 'user' ? 'User' : 'Oracle'}: ${h.text}`).join('\n\n');

  const prompt = `You are "Antigravity," the master Horary Astrologer from our previous session. The user is asking a follow-up question regarding their horary inquiry.

ORIGINAL CHART CONTEXT:
${chartContext}

PREVIOUS CONVERSATION:
${historyContext}

USER FOLLOW-UP:
"${userMessage}"

YOUR TASK: Answer the follow-up question deeply and technically, but keep it within the context of the original horary chart. Do not cast a new chart. Refer back to the original significators and aspects. If the user asks something that the chart cannot answer, explain why based on traditional rules.

Tone: Maintain your sophisticated, technical, yet editorial and objective tone.`;

  const text = await callGemini(prompt, 800, null, validUris);

  return {
    text,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Focus area options — use this to populate the UI dropdown/tabs.
 */
export const FOCUS_AREAS = [
  { value: 'general',   label: 'General',   iconType: 'ui',     iconName: 'fourstar' },
  { value: 'love',      label: 'Love',      iconType: 'planet', iconName: 'venus' },
  { value: 'career',    label: 'Career',    iconType: 'planet', iconName: 'saturn' },
  { value: 'health',    label: 'Health',    iconType: 'planet', iconName: 'sun' },
  { value: 'spiritual', label: 'Spiritual', iconType: 'planet', iconName: 'moon' },
  { value: 'mind',      label: 'Mind',      iconType: 'planet', iconName: 'mercury' },
  { value: 'custom',    label: 'Custom Question', iconType: 'ui', iconName: 'edit' },
];
