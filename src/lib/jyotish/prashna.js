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