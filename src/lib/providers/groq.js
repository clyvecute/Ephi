/**
 * src/lib/providers/groq.js
 *
 * Groq AI Provider for Ephi.
 * Integrates Llama 3 (llama3-70b-8192) for extremely low-latency,
 * high-fidelity open source interpretations.
 */
import { getBookForTool } from '../library.js';
import { 
  formatNatal, 
  formatPatterns, 
  formatAspects, 
  buildSynthesisPrompt, 
  buildAspectPrompt,
  PLANET_LABEL,
  SIGN_FOR,
  DEG_IN_SIGN
} from '../gemini';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Standard fetch interface for Groq Completions (OpenAI Compatible API).
 */
async function callGroq(prompt, maxTokens = 2000, model = 'llama-3.3-70b-versatile') {
  if (!API_KEY) {
    throw new Error('Groq API key not found. Add VITE_GROQ_API_KEY to your env variables.');
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are Antigravity, an elite consultant astrologer.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.85,
      max_tokens: maxTokens
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq API Error ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Groq returned an empty response.');
  return text.trim();
}

/**
 * Generate a full transit/natal synthesis using Llama 3.
 */
export async function generateReading({ natal, aspects, focus = 'general', userName, userQuery, mode = 'transit' }) {
  const natalText = formatNatal(natal);
  const aspectsText = formatAspects(aspects);
  const prompt = buildSynthesisPrompt({ natal, natalText, aspectsText, focus, userName, userQuery, mode });
  
  const text = await callGroq(prompt, 1400);

  return {
    text,
    focus,
    userQuery,
    timestamp: new Date().toISOString(),
    aspectCount: aspects?.length || 0,
    provider: 'groq'
  };
}

/**
 * Single aspect interpretation.
 */
export async function generateAspectReading({ transitPlanet, aspectName, natalPlanet, natal, orb, applying }) {
  const lon = natal?.positions?.[natalPlanet];
  const natalSign = lon != null ? SIGN_FOR(lon) : null;
  const transitSign = null;

  const prompt = buildAspectPrompt({
    transitPlanet,
    aspectName,
    natalPlanet,
    natalSign,
    transitSign,
    orb,
    applying,
  });

  const text = await callGroq(prompt, 600);

  return {
    text,
    aspect: { transitPlanet, aspectName, natalPlanet, orb, applying },
    timestamp: new Date().toISOString(),
    provider: 'groq'
  };
}

/**
 * Relationship Synastry Reading.
 */
export async function generateSynastryReading({ nameA, chartA, nameB, chartB, aspects, score }) {
  const natalAText = formatNatal(chartA);
  const natalBText = formatNatal(chartB);

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

Avoid clichés and generic horoscopes. The reading should feel bespoke, sophisticated, and life-affirming. Avoid calling them "the natives." Use "you" and "your".`;

  const libraryBooks = getBookForTool('synastry');
  if (libraryBooks.length > 0) {
    prompt += `\n\nCRITICAL: Base your synastry analysis on the techniques in: ${libraryBooks.map(b => b.name).join(', ')}. (Groq cannot read PDF attachments; use your training aligned to these named texts.)`;
  }

  const text = await callGroq(prompt, 1400);

  return {
    text,
    timestamp: new Date().toISOString(),
    provider: 'groq'
  };
}

/**
 * Vedic Jyotish Reading.
 */
export async function generateVedicReading({ name, mahadasha, antardasha, ascNakshatra, moonNakshatra }) {
  const prompt = `You are a world-class expert Vedic Astrologer (Jyotishi) steeped in ancient Indian astrological tradition (Parashara). You provide deep, philosophical, and highly actionable insights based on the sidereal zodiac and lunar mansions.

PROFILE:
Name: ${name || 'The native'}
Ascendant Nakshatra (Lagna): ${ascNakshatra?.name || 'Unknown'}
Moon Nakshatra (Chandra): ${moonNakshatra?.name || 'Unknown'}
Current Vimshottari Dasha Timeline: ${mahadasha} Mahadasha, ${antardasha} Antardasha

Write a comprehensive, sophisticated Jyotish reading (around 400-600 words). Avoid generic horoscopes. Use classical Vedic concepts (karma, dharma, moksha, gunas) but apply them to a highly practical, modern psychological context.

Structure your response with the exact following markdown headers:
1. **The Soul's Architecture (Lagna & Chandra)**: Explain the fundamental nature of their soul's vehicle (Ascendant Nakshatra) and their emotional mind/perceptive lens (Moon Nakshatra). How do these two specific lunar mansions interact? What is their core evolutionary drive?
2. **The Ripening Karma (Current Dasha)**: Analyze the overarching karmic theme of their ${mahadasha} Mahadasha, and specifically how the ${antardasha} sub-period is focusing that energy *right now*. What specific area of life is being activated?
3. **Spiritual Prescriptions (Upaya)**: Suggest 3 precise, practical actions, mindset shifts, or disciplines they must adopt to harmonize with the turbulent or expansive energies of their current Dasha cycle.

Use formatting like **bold** text and bullet points appropriately. Address the user directly as "you" in an editorial, empowering, yet deeply mystical tone.`;

  const text = await callGroq(prompt, 1000);

  return {
    text,
    timestamp: new Date().toISOString(),
    provider: 'groq'
  };
}

/**
 * Return Charts Forecast (Solar / Lunar Returns).
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

  const text = await callGroq(prompt, 1200);
  return {
    text,
    timestamp: new Date().toISOString(),
    provider: 'groq'
  };
}

/**
 * Traditional Horary Astrology Judgement.
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

  const prompt = `You are "Antigravity," a master traditional Horary Astrologer. You follow the strict, technical rules of William Lilly's "Christian Astrology" but provide your judgment with modern psychological depth and editorial sophistication.

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

  const text = await callGroq(prompt, 1500);

  return {
    text,
    timestamp: new Date().toISOString(),
    provider: 'groq'
  };
}

/**
 * Check if Groq is fully ready.
 */
export function isGroqConfigured() {
  return Boolean(API_KEY);
}

/**
 * Diagnostic test probe.
 */
export async function testApi() {
  const prompt = "REPLY ONLY WITH 'PULSE_OK'. THIS IS A CONNECTIVITY TEST.";
  const start = Date.now();
  const text = await callGroq(prompt, 10);
  const end = Date.now();
  return {
    latency: end - start,
    status: text.includes('PULSE_OK') ? 'healthy' : 'degraded'
  };
}
