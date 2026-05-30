/**
 * src/lib/hellenistic.js
 * Advanced Hellenistic and Medieval predictive engines.
 */

function norm(deg) {
  return ((deg % 360) + 360) % 360;
}

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const TRADITIONAL_RULERS = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon',
  Leo: 'sun', Virgo: 'mercury', Libra: 'venus', Scorpio: 'mars',
  Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter'
};

const EXALTATIONS = {
  Aries: { planet: 'sun', degree: 19 },
  Taurus: { planet: 'moon', degree: 3 },
  Cancer: { planet: 'jupiter', degree: 15 },
  Virgo: { planet: 'mercury', degree: 15 },
  Libra: { planet: 'saturn', degree: 21 },
  Capricorn: { planet: 'mars', degree: 28 },
  Pisces: { planet: 'venus', degree: 27 }
};

const DETRIMENTS = {
  Aries: 'venus', Taurus: 'mars', Gemini: 'jupiter', Cancer: 'saturn',
  Leo: 'saturn', Virgo: 'jupiter', Libra: 'mars', Scorpio: 'venus',
  Sagittarius: 'mercury', Capricorn: 'moon', Aquarius: 'sun', Pisces: 'mercury'
};

const FALLS = {
  Aries: 'saturn', Taurus: 'none', Gemini: 'none', Cancer: 'mars',
  Leo: 'none', Virgo: 'venus', Libra: 'sun', Scorpio: 'moon',
  Sagittarius: 'none', Capricorn: 'jupiter', Aquarius: 'none', Pisces: 'mercury'
};

/**
 * Calculates the total Essential Dignity (Score) of a planet.
 * This is a highly technical medieval scoring system (Point based).
 */
export function calculateDignity(planet, lon, isDay) {
  const signIdx = Math.floor(lon / 30);
  const sign = SIGNS[signIdx];
  const degree = lon % 30;
  
  let score = 0;
  let status = [];

  // 1. Domicile (+5)
  if (TRADITIONAL_RULERS[sign] === planet) {
    score += 5;
    status.push('Domicile');
  }

  // 2. Exaltation (+4)
  if (EXALTATIONS[sign]?.planet === planet) {
    score += 4;
    status.push('Exaltation');
  }

  // 3. Detriment (-5)
  if (DETRIMENTS[sign] === planet) {
    score -= 5;
    status.push('Detriment');
  }

  // 4. Fall (-4)
  if (FALLS[sign] === planet) {
    score -= 4;
    status.push('Fall');
  }

  // 5. Peregrine (No dignity -5)
  if (status.length === 0) {
    // Check minor dignities (Simplified Triplicity check)
    // Professional systems use Term/Face here too.
    score -= 5;
    status.push('Peregrine');
  }

  return { score, status: status.join(', ') };
}

/**
 * Horary Strictures against Judgment.
 * Used by professional horary astrologers to determine if a chart is readable.
 */
export function getHoraryStrictures(ascLon, moonLon, moonPhase, hourLord, chartPositions = null) {
  const strictures = [];
  const ascDegree = ascLon % 30;
  
  if (ascDegree < 3) strictures.push("Ascendant is too early (< 3°). Question may be premature.");
  if (ascDegree > 27) strictures.push("Ascendant is too late (> 27°). The matter is already settled.");
  
  const moonSignIdx = Math.floor(moonLon / 30);
  const moonSign = SIGNS[moonSignIdx];
  const viaCombusta = moonLon > 195 && moonLon < 225; // 15 Lib to 15 Sco
  if (viaCombusta) strictures.push("Moon is in Via Combusta (15° Libra - 15° Scorpio). Unpredictable outcome.");
  
  // Void of Course
  if (chartPositions) {
    const nextSignEdge = (moonSignIdx + 1) * 30;
    const distToEdge = nextSignEdge - moonLon;
    
    // Check if moon makes any exact ptolemaic aspect to traditional planets before leaving sign
    const targets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
    const ptolemaicAngles = [0, 60, 90, 120, 180];
    let hasApplyingAspect = false;
    
    for (const t of targets) {
      if (chartPositions[t] == null) continue;
      let pLon = chartPositions[t];
      
      for (const angle of ptolemaicAngles) {
        const exact1 = (pLon + angle) % 360;
        const exact2 = (pLon - angle + 360) % 360;
        
        const checkForward = (exact) => {
           let dist = exact - moonLon;
           if (dist < 0) dist += 360;
           return dist > 0 && dist < distToEdge; // Must reach exact aspect before entering next sign
        };
        
        if (checkForward(exact1) || checkForward(exact2)) {
          hasApplyingAspect = true;
          break;
        }
      }
      if (hasApplyingAspect) break;
    }
    
    if (!hasApplyingAspect) {
      strictures.push("Moon is Void of Course. Nothing will come of this matter.");
    }
  } else {
    // Simplified fallback: Last 2 degrees of any sign
    if (moonLon % 30 > 28) strictures.push("Moon is Void of Course. Nothing will come of this matter.");
  }

  return strictures;
}

/**
 * Traditional Predictive Timelords.
 */
export function calculateProfections(ascLon, birthDate, targetDate = new Date()) {
  const birth = new Date(birthDate);
  const target = new Date(targetDate);
  let age = target.getFullYear() - birth.getFullYear();
  if (target.getMonth() < birth.getMonth() || (target.getMonth() === birth.getMonth() && target.getDate() < birth.getDate())) age--;
  
  const profectedSignIdx = (Math.floor(ascLon / 30) + age) % 12;
  const sign = SIGNS[profectedSignIdx];
  return {
    age,
    sign,
    lord: TRADITIONAL_RULERS[sign],
    house: (age % 12) + 1
  };
}

export function calculateFirdaria(birthDate, isDayChart) {
  const diurnalPlanets = ['sun', 'venus', 'mercury', 'moon', 'saturn', 'jupiter', 'mars', 'nn', 'sn'];
  const nocturnalPlanets = ['moon', 'saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'nn', 'sn'];
  const planetDurations = { sun: 10, venus: 8, mercury: 13, moon: 9, saturn: 11, jupiter: 12, mars: 7, nn: 3, sn: 2 };
  
  const order = isDayChart ? diurnalPlanets : nocturnalPlanets;
  const periods = [];
  let currentYear = 0;
  const birth = new Date(birthDate);
  
  for (const planet of order) {
    const duration = planetDurations[planet];
    const startYear = currentYear;
    const endYear = currentYear + duration;
    const startDate = new Date(birth);
    startDate.setFullYear(birth.getFullYear() + startYear);
    const endDate = new Date(birth);
    endDate.setFullYear(birth.getFullYear() + endYear);
    
    const subPeriods = [];
    if (planet !== 'nn' && planet !== 'sn') {
      const chaldean = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
      const startIndex = chaldean.indexOf(planet);
      const subDurationYears = duration / 7;
      
      let subCurrentDate = new Date(startDate);
      
      for (let i = 0; i < 7; i++) {
        const subLordIndex = (startIndex + i) % 7;
        const subLord = chaldean[subLordIndex];
        
        const subEndDate = new Date(subCurrentDate.getTime() + subDurationYears * 365.25 * 24 * 60 * 60 * 1000);
        
        subPeriods.push({
          planet: subLord,
          startDate: subCurrentDate.toISOString(),
          endDate: subEndDate.toISOString()
        });
        subCurrentDate = subEndDate;
      }
    }
    
    periods.push({
      planet,
      startYear,
      endYear,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      subPeriods,
    });
    currentYear += duration;
  }
  return periods;
}

export function calculateLots(ascLon, sunLon, moonLon, marsLon, jupiterLon, saturnLon, venusLon, mercuryLon, isDayChart) {
  const getLot = (a, b) => isDayChart ? norm(ascLon + a - b) : norm(ascLon + b - a);
  const getSignInfo = (lon) => ({ 
    longitude: lon, 
    sign: SIGNS[Math.floor(lon / 30)], 
    degree: parseFloat((lon % 30).toFixed(2)) 
  });

  const fortune = getLot(moonLon, sunLon);
  const spirit = getLot(sunLon, moonLon);

  return {
    fortune: getSignInfo(fortune),
    spirit: getSignInfo(spirit),
    eros: getSignInfo(isDayChart ? norm(ascLon + venusLon - spirit) : norm(ascLon + spirit - venusLon)),
    necessity: getSignInfo(isDayChart ? norm(ascLon + fortune - mercuryLon) : norm(ascLon + mercuryLon - fortune)),
    victory: getSignInfo(isDayChart ? norm(ascLon + jupiterLon - spirit) : norm(ascLon + spirit - jupiterLon)),
    nemesis: getSignInfo(isDayChart ? norm(ascLon + fortune - saturnLon) : norm(ascLon + saturnLon - fortune)),
    courage: getSignInfo(isDayChart ? norm(ascLon + fortune - marsLon) : norm(ascLon + marsLon - fortune))
  };
}

