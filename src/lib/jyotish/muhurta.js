/**
 * src/lib/jyotish/muhurta.js
 *
 * Muhurta — Vedic Electional Astrology.
 *
 * Scores a moment for a specific purpose by checking:
 *   1. Panchanga quality (Tithi, Vara, Nakshatra, Yoga, Karana)
 *   2. Tithi suitability for the purpose
 *   3. Moon's Nakshatra suitability
 *   4. Lunar phase (Shukla/Krishna Paksha)
 *   5. Tara Bala (Moon Nakshatra relative to birth Nakshatra)
 *   6. Chandra Bala (Moon's sign relative to Lagna/Moon sign at birth)
 *   7. Hora and Choghadiya favorability
 *   8. Absence of Rahu Kala, Yamaghanta, Gulika Kala
 *
 * @param {object} panchanga         - Output of getPanchanga()
 * @param {object} hora              - Output of getHora()
 *  @param {object} choghadiya       - Output of getChoghadiya()
 * @param {string} purpose           - 'marriage'|'business'|'travel'|'medical'|'education'|'spiritual'|'general'
 * @param {object} [natalData]       - Optional: { moonNakshatraIndex, moonSignIndex, lagnaSignIndex }
 */

// ─── Nakshatra suitability by purpose ────────────────────────────────────────

const NAKSHATRA_SUITABILITY = {
  marriage: {
    best:    ['Rohini','Mrigashira','Magha','Uttara Phalguni','Hasta','Swati','Anuradha','Mula','Uttara Ashadha','Uttara Bhadrapada','Revati'],
    avoid:   ['Bharani','Krittika','Ardra','Ashlesha','Jyeshtha','Vishakha','Shatabhisha','Purva Bhadrapada']
  },
  business: {
    best:    ['Ashwini','Rohini','Pushya','Uttara Phalguni','Hasta','Chitra','Anuradha','Shravana','Dhanishta','Revati'],
    avoid:   ['Bharani','Krittika','Ardra','Ashlesha','Jyeshtha','Mula','Purva Ashadha','Purva Bhadrapada']
  },
  travel: {
    best:    ['Ashwini','Mrigashira','Punarvasu','Pushya','Hasta','Swati','Anuradha','Shravana','Revati'],
    avoid:   ['Bharani','Krittika','Ardra','Ashlesha','Jyeshtha','Mula','Vishakha']
  },
  medical: {
    best:    ['Ashwini','Punarvasu','Pushya','Hasta','Uttara Phalguni','Uttara Ashadha','Uttara Bhadrapada'],
    avoid:   ['Ardra','Ashlesha','Jyeshtha','Mula','Vishakha','Bharani','Krittika']
  },
  education: {
    best:    ['Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Hasta','Swati','Shravana','Dhanishta','Revati'],
    avoid:   ['Bharani','Ashlesha','Jyeshtha','Mula']
  },
  spiritual: {
    best:    ['Ashwini','Rohini','Pushya','Uttara Phalguni','Anuradha','Mula','Uttara Ashadha','Shravana','Revati'],
    avoid:   ['Bharani','Krittika','Vishakha','Jyeshtha']
  },
  general: {
    best:    ['Ashwini','Rohini','Mrigashira','Punarvasu','Pushya','Uttara Phalguni','Hasta','Chitra','Swati','Anuradha','Shravana','Dhanishta','Revati','Uttara Ashadha','Uttara Bhadrapada'],
    avoid:   ['Bharani','Krittika','Ardra','Ashlesha','Jyeshtha','Mula','Vishakha']
  }
};

// ─── Tithi suitability by purpose ────────────────────────────────────────────

const TITHI_SUITABILITY = {
  marriage:  { best: [2,3,5,7,10,11,12,13], avoid: [1,4,6,8,9,14,15,30] },
  business:  { best: [1,2,3,5,7,10,11,12], avoid: [4,6,8,9,14,15,30]    },
  travel:    { best: [2,3,7,10,11,12,13],  avoid: [4,6,8,9,14,30]       },
  medical:   { best: [1,2,3,5,7,11,12],    avoid: [4,6,8,9,14,15,30]   },
  education: { best: [2,3,5,6,7,10,11,12], avoid: [1,4,8,9,14,15,30]   },
  spiritual: { best: [1,5,6,8,9,11,14,15], avoid: [4,30]               },
  general:   { best: [2,3,5,7,10,11,12,13],avoid: [4,8,9,14,30]        }
};

// ─── Tara Bala (Moon's Nakshatra position from natal Moon Nakshatra) ──────────

// Tara count from natal Moon Nakshatra: 1=Janma, 2=Sampat, 3=Vipat, 4=Kshema,
// 5=Pratyari, 6=Sadhaka, 7=Vadha, 8=Mitra, 9=Atiмitra
const TARA_BALA_QUALITY = {
  1: 'avoid',     // Janma — birth star, avoid new starts
  2: 'excellent', // Sampat — wealth, prosperity
  3: 'avoid',     // Vipat — danger, obstacles
  4: 'good',      // Kshema — welfare, growth
  5: 'avoid',     // Pratyari — obstacle, obstruction
  6: 'good',      // Sadhaka — achievement
  7: 'avoid',     // Vadha — death, extreme caution
  8: 'good',      // Mitra — friend
  9: 'excellent', // Atimitra — great friend
};

function getTaraBala(currentNakshatraIdx, natalMoonNakshatraIdx) {
  const diff   = ((currentNakshatraIdx - natalMoonNakshatraIdx) + 27) % 27;
  const taraNum = (diff % 9) + 1; // 1–9
  return {
    taraNumber: taraNum,
    taraName:   ['','Janma','Sampat','Vipat','Kshema','Pratyari','Sadhaka','Vadha','Mitra','Atimitra'][taraNum],
    quality:    TARA_BALA_QUALITY[taraNum]
  };
}

// ─── Rahu Kala / Yamaghanta / Gulika Kala ────────────────────────────────────

// Each is 1.5 hours (90 min) of the day, starting from sunrise.
// Period index (1-8) by day of week:
const RAHU_KALA   = [8,2,7,5,6,4,3]; // Sun=8th, Mon=2nd...
const YAMAGHANTA  = [4,3,2,1,8,7,6];
const GULIKA_KALA = [6,5,4,3,2,1,8];

/**
 * Check if current time falls in a Kala period.
 * @param {Date}   date        - Current date/time
 * @param {number} sunriseMins - Sunrise minutes from midnight
 * @param {number} sunsetMins  - Sunset minutes from midnight
 */
export function getKalaStatus(date, sunriseMins, sunsetMins) {
  const dayLen    = sunsetMins - sunriseMins;
  const periodLen = dayLen / 8;
  const currentMins = date.getHours() * 60 + date.getMinutes();
  const dayOfWeek = date.getDay();

  if (currentMins < sunriseMins || currentMins >= sunsetMins) {
    return { rahuKala: false, yamaghanta: false, gulikaKala: false, isKala: false };
  }

  const periodIdx = Math.floor((currentMins - sunriseMins) / periodLen) + 1; // 1–8

  const isRahu    = RAHU_KALA[dayOfWeek]  === periodIdx;
  const isYama    = YAMAGHANTA[dayOfWeek]  === periodIdx;
  const isGulika  = GULIKA_KALA[dayOfWeek] === periodIdx;

  return {
    rahuKala:  isRahu,
    yamaghanta: isYama,
    gulikaKala: isGulika,
    isKala:    isRahu || isYama || isGulika
  };
}

// ─── Main Muhurta Score ───────────────────────────────────────────────────────

/**
 * Score a moment for a Muhurta.
 *
 * Returns: { score (0–100), grade ('A'|'B'|'C'|'D'), reasons: [...], warnings: [...] }
 */
export function scoreMuhurta(panchanga, hora, choghadiya, kalaStatus, purpose = 'general', natalData = null) {
  let score   = 50;
  const reasons  = [];
  const warnings = [];

  const suitability = NAKSHATRA_SUITABILITY[purpose] || NAKSHATRA_SUITABILITY.general;
  const tithiSuit   = TITHI_SUITABILITY[purpose]     || TITHI_SUITABILITY.general;

  // 1. Panchanga quality (max +25)
  score += (panchanga.favorableCount - 2.5) * 5; // -12.5 to +12.5

  // 2. Nakshatra check (+15 / -15)
  if (suitability.best.includes(panchanga.nakshatra.name)) {
    score += 15; reasons.push(`${panchanga.nakshatra.name} is excellent for ${purpose}`);
  } else if (suitability.avoid.includes(panchanga.nakshatra.name)) {
    score -= 15; warnings.push(`${panchanga.nakshatra.name} is inauspicious for ${purpose}`);
  }

  // 3. Tithi check (+10 / -10)
  if (tithiSuit.best.includes(panchanga.tithi.displayNumber)) {
    score += 10; reasons.push(`${panchanga.tithi.name} (Tithi ${panchanga.tithi.displayNumber}) supports ${purpose}`);
  } else if (tithiSuit.avoid.includes(panchanga.tithi.displayNumber)) {
    score -= 10; warnings.push(`${panchanga.tithi.name} is unsuitable for ${purpose}`);
  }

  // 4. Lunar phase (+8 waxing for most purposes)
  if (panchanga.tithi.paksha === 'Shukla' && purpose !== 'spiritual') {
    score += 8; reasons.push('Waxing Moon (Shukla Paksha) supports growth and new beginnings');
  } else if (panchanga.tithi.paksha === 'Krishna' && purpose === 'spiritual') {
    score += 5; reasons.push('Waning Moon (Krishna Paksha) favors spiritual and contemplative work');
  } else if (panchanga.tithi.paksha === 'Krishna' && purpose !== 'spiritual') {
    score -= 5; warnings.push('Waning Moon may weaken outcomes for material endeavors');
  }

  // 5. Yoga (+8 / -8)
  if (panchanga.yoga.isAuspicious) {
    score += 8; reasons.push(`${panchanga.yoga.name} Yoga is favorable`);
    if (panchanga.yoga.isMahayoga) {
      score += 5; reasons.push(`${panchanga.yoga.name} is a Maha Yoga — highly auspicious`);
    }
  } else {
    score -= 8; warnings.push(`${panchanga.yoga.name} Yoga is inauspicious — avoid major decisions`);
  }

  // 6. Karana (+5 / -10)
  if (panchanga.karana.quality === 'auspicious') {
    score += 5; reasons.push(`${panchanga.karana.name} Karana supports the activity`);
  } else if (panchanga.karana.isVishti) {
    score -= 10; warnings.push('Vishti (Bhadra) Karana — strongly avoid initiating new work');
  }

  // 7. Hora (+8 / -5)
  if (hora.isAuspicious) {
    score += 8; reasons.push(`${hora.planet.charAt(0).toUpperCase()+hora.planet.slice(1)} Hora is auspicious`);
  } else if (['saturn','mars'].includes(hora.planet)) {
    score -= 5; warnings.push(`${hora.planet} Hora — unfavorable for new beginnings`);
  }

  // 8. Choghadiya (+8 / -8)
  if (choghadiya.quality === 'excellent') {
    score += 8; reasons.push(`${choghadiya.name} Choghadiya — excellent period`);
  } else if (choghadiya.isAuspicious) {
    score += 4; reasons.push(`${choghadiya.name} Choghadiya is favorable`);
  } else {
    score -= 8; warnings.push(`${choghadiya.name} Choghadiya — inauspicious period`);
  }

  // 9. Kala periods (-20 for Rahu Kala)
  if (kalaStatus.rahuKala) {
    score -= 20; warnings.push('Rahu Kala — avoid ALL new beginnings during this period');
  }
  if (kalaStatus.yamaghanta) {
    score -= 10; warnings.push('Yamaghanta — inauspicious, avoid important work');
  }
  if (kalaStatus.gulikaKala) {
    score -= 8;  warnings.push('Gulika Kala — avoid new initiatives');
  }

  // 10. Tara Bala (if natal data provided) (+10 / -10)
  if (natalData?.moonNakshatraIndex != null) {
    const tara = getTaraBala(panchanga.nakshatra.index, natalData.moonNakshatraIndex);
    if (tara.quality === 'excellent') {
      score += 10; reasons.push(`Tara Bala: ${tara.taraName} — highly auspicious for you personally`);
    } else if (tara.quality === 'good') {
      score += 5;  reasons.push(`Tara Bala: ${tara.taraName} — favorable`);
    } else {
      score -= 10; warnings.push(`Tara Bala: ${tara.taraName} — unfavorable for your natal Moon`);
    }
  }

  // Clamp 0–100
  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';

  return { score, grade, reasons, warnings, panchanga };
}