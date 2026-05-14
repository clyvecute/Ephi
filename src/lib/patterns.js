/**
 * lib/patterns.js
 * 
 * Detects major aspect patterns (Stellium, Grand Trine, Grand Cross, T-Square, Yod).
 */
import { getActiveAspects } from './aspects.js';

/**
 * Detects all major patterns in a natal chart.
 * @param {Object} positions - { sun: 12.3, ... }
 * @returns {Array} List of patterns found
 */
export function detectPatterns(positions) {
  const patterns = [];
  
  // 1. Stelliums (3+ planets in one sign)
  const signs = {};
  for (const [p, lon] of Object.entries(positions)) {
    const sign = Math.floor(((lon % 360) + 360) % 360 / 30);
    if (!signs[sign]) signs[sign] = [];
    signs[sign].push(p);
  }
  
  for (const [signIdx, planets] of Object.entries(signs)) {
    if (planets.length >= 3) {
      const signNames = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
      patterns.push({
        type: 'Stellium',
        planets,
        description: `${planets.length} planets in ${signNames[signIdx]}`,
        focus: `Concentrated energy in ${signNames[signIdx]}`
      });
    }
  }

  // Calculate all aspects between planets
  // We use getActiveAspects but pass positions as both transit and natal
  const aspects = getActiveAspects(positions, positions);
  
  // Create an adjacency list for easier pattern hunting
  const adj = {};
  for (const a of aspects) {
    if (!adj[a.transitPlanet]) adj[a.transitPlanet] = [];
    adj[a.transitPlanet].push({ to: a.natalPlanet, type: a.aspectName });
  }

  // 2. Grand Trine & Kite
  const trines = aspects.filter(a => a.aspectName === 'trine');
  const oppositions = aspects.filter(a => a.aspectName === 'opposition');
  const sextiles = aspects.filter(a => a.aspectName === 'sextile');
  const squares = aspects.filter(a => a.aspectName === 'square');
  const quincunxes = aspects.filter(a => a.aspectName === 'quincunx');

  const grandTrines = [];
  for (let i = 0; i < trines.length; i++) {
    for (let j = i + 1; j < trines.length; j++) {
      const a1 = trines[i];
      const a2 = trines[j];
      
      // Need a triangle: A-B, B-C, C-A
      let A, B, C;
      if (a1.transitPlanet === a2.transitPlanet) {
        A = a1.transitPlanet; B = a1.natalPlanet; C = a2.natalPlanet;
      } else if (a1.natalPlanet === a2.natalPlanet) {
        A = a1.natalPlanet; B = a1.transitPlanet; C = a2.transitPlanet;
      } else if (a1.transitPlanet === a2.natalPlanet) {
        A = a1.transitPlanet; B = a1.natalPlanet; C = a2.transitPlanet;
      } else if (a1.natalPlanet === a2.transitPlanet) {
        A = a1.natalPlanet; B = a1.transitPlanet; C = a2.natalPlanet;
      } else continue;

      // Check if B and C are trine
      const isBC = aspects.find(a => 
        a.aspectName === 'trine' && 
        ((a.transitPlanet === B && a.natalPlanet === C) || (a.transitPlanet === C && a.natalPlanet === B))
      );
      
      if (isBC) {
        const sorted = [A, B, C].sort();
        const id = `GT-${sorted.join('-')}`;
        if (!grandTrines.find(p => p.id === id)) {
          grandTrines.push({
            id,
            type: 'Grand Trine',
            planets: sorted,
            description: `Flowing triangle between ${sorted.join(', ')}`,
            focus: 'Natural talent and ease in these areas'
          });
        }
      }
    }
  }

  // Kites (Grand Trine + Opposition/Sextiles)
  const kites = [];
  for (const gt of grandTrines) {
    const [A, B, C] = gt.planets;
    for (const opp of oppositions) {
      let head, tail;
      if (opp.transitPlanet === A || opp.natalPlanet === A) { head = A; tail = opp.transitPlanet === A ? opp.natalPlanet : opp.transitPlanet; }
      else if (opp.transitPlanet === B || opp.natalPlanet === B) { head = B; tail = opp.transitPlanet === B ? opp.natalPlanet : opp.transitPlanet; }
      else if (opp.transitPlanet === C || opp.natalPlanet === C) { head = C; tail = opp.transitPlanet === C ? opp.natalPlanet : opp.transitPlanet; }
      else continue;

      const others = [A, B, C].filter(p => p !== head);
      const [O1, O2] = others;
      
      const hasSex1 = sextiles.some(s => (s.transitPlanet === tail && s.natalPlanet === O1) || (s.transitPlanet === O1 && s.natalPlanet === tail));
      const hasSex2 = sextiles.some(s => (s.transitPlanet === tail && s.natalPlanet === O2) || (s.transitPlanet === O2 && s.natalPlanet === tail));

      if (hasSex1 && hasSex2) {
        const sorted = [A, B, C, tail].sort();
        const id = `Kite-${sorted.join('-')}`;
        if (!kites.find(p => p.id === id)) {
          kites.push({
            id,
            type: 'Kite',
            planets: sorted,
            apex: head,
            description: `Grand Trine channeled through ${head} via opposition from ${tail}`,
            focus: 'Harnessing natural talents toward a specific goal'
          });
        }
      }
    }
  }

  // Add Grand Trines only if they aren't part of a Kite
  for (const gt of grandTrines) {
    const isPartOfKite = kites.some(k => gt.planets.every(p => k.planets.includes(p)));
    if (!isPartOfKite) {
      patterns.push(gt);
    }
  }
  patterns.push(...kites);

  // 3. Grand Cross (Two oppositions + four squares)
  const grandCrosses = [];

  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i];
      const opp2 = oppositions[j];
      const A = opp1.transitPlanet, B = opp1.natalPlanet;
      const C = opp2.transitPlanet, D = opp2.natalPlanet;
      
      const planetSet = new Set([A, B, C, D]);
      if (planetSet.size !== 4) continue;
      
      // Check squares
      const hasSqAC = squares.some(s => (s.transitPlanet === A && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === A));
      const hasSqAD = squares.some(s => (s.transitPlanet === A && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === A));
      const hasSqBC = squares.some(s => (s.transitPlanet === B && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === B));
      const hasSqBD = squares.some(s => (s.transitPlanet === B && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === B));
      
      // Need at least 3 valid squares to allow for slight orb variances
      if ([hasSqAC, hasSqAD, hasSqBC, hasSqBD].filter(Boolean).length >= 3) {
        const sorted = [A, B, C, D].sort();
        const id = `GC-${sorted.join('-')}`;
        if (!grandCrosses.find(p => p.id === id)) {
          grandCrosses.push({
            id,
            type: 'Grand Cross',
            planets: sorted,
            description: `Intense tension and high-pressure system between ${sorted.join(', ')}`,
            focus: 'Massive potential for achievement if immense inner pressure is harnessed'
          });
        }
      }
    }
  }

  patterns.push(...grandCrosses);

  // 4. T-Square (Opposition + two squares)
  for (const opp of oppositions) {
    const { transitPlanet: A, natalPlanet: B } = opp;
    // Look for a planet C that squares both A and B
    for (const sq1 of squares) {
      let C;
      if (sq1.transitPlanet === A) C = sq1.natalPlanet;
      else if (sq1.natalPlanet === A) C = sq1.transitPlanet;
      else continue;

      const sq2 = squares.find(s => 
        ((s.transitPlanet === B && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === B))
      );

      if (sq2) {
        const sorted = [A, B].sort();
        
        // Filter out if this T-square is fully contained within a Grand Cross
        const isPartOfGC = grandCrosses.some(gc => 
          [A, B, C].every(p => gc.planets.includes(p))
        );

        if (!isPartOfGC) {
          const id = `TS-${sorted.join('-')}-${C}`;
          if (!patterns.find(p => p.id === id)) {
            patterns.push({
              id,
              type: 'T-Square',
              planets: [...sorted, C],
              apex: C,
              description: `Tension between ${sorted[0]} and ${sorted[1]}, driving action through ${C}`,
              focus: 'High drive and inner friction'
            });
          }
        }
      }
    }
  }

  // 5. Mystic Rectangle
  const mysticRectangles = [];
  for (let i = 0; i < oppositions.length; i++) {
    for (let j = i + 1; j < oppositions.length; j++) {
      const opp1 = oppositions[i];
      const opp2 = oppositions[j];
      const A = opp1.transitPlanet, B = opp1.natalPlanet;
      const C = opp2.transitPlanet, D = opp2.natalPlanet;
      const planetSet = new Set([A, B, C, D]);
      if (planetSet.size !== 4) continue;
      
      const hasTrineAC = trines.some(s => (s.transitPlanet === A && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === A));
      const hasTrineAD = trines.some(s => (s.transitPlanet === A && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === A));
      const hasTrineBC = trines.some(s => (s.transitPlanet === B && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === B));
      const hasTrineBD = trines.some(s => (s.transitPlanet === B && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === B));

      const hasSexAC = sextiles.some(s => (s.transitPlanet === A && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === A));
      const hasSexAD = sextiles.some(s => (s.transitPlanet === A && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === A));
      const hasSexBC = sextiles.some(s => (s.transitPlanet === B && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === B));
      const hasSexBD = sextiles.some(s => (s.transitPlanet === B && s.natalPlanet === D) || (s.transitPlanet === D && s.natalPlanet === B));

      const trineCount = [hasTrineAC, hasTrineAD, hasTrineBC, hasTrineBD].filter(Boolean).length;
      const sexCount = [hasSexAC, hasSexAD, hasSexBC, hasSexBD].filter(Boolean).length;

      if (trineCount + sexCount >= 3 && trineCount >= 1 && sexCount >= 1) {
        const sorted = [A, B, C, D].sort();
        const id = `MR-${sorted.join('-')}`;
        if (!mysticRectangles.find(p => p.id === id)) {
          mysticRectangles.push({
            id,
            type: 'Mystic Rectangle',
            planets: sorted,
            description: `Harmonious tension balancing ${sorted.join(', ')}`,
            focus: 'Productive integration of opposing forces'
          });
        }
      }
    }
  }
  patterns.push(...mysticRectangles);

  // 6. Yod (Finger of God)
  const yods = [];
  for (const sex of sextiles) {
    const A = sex.transitPlanet, B = sex.natalPlanet;
    for (const q1 of quincunxes) {
      let C;
      if (q1.transitPlanet === A) C = q1.natalPlanet;
      else if (q1.natalPlanet === A) C = q1.transitPlanet;
      else continue;

      const q2 = quincunxes.find(s => 
        (s.transitPlanet === B && s.natalPlanet === C) || (s.transitPlanet === C && s.natalPlanet === B)
      );

      if (q2) {
        const sorted = [A, B, C].sort();
        const id = `Yod-${sorted.join('-')}-${C}`;
        if (!yods.find(p => p.id === id)) {
          yods.push({
            id,
            type: 'Yod',
            planets: [...[A, B].sort(), C],
            apex: C,
            description: `Intense fated energy directed at ${C} from ${A} and ${B}`,
            focus: 'A specific calling or karmic adjustment required'
          });
        }
      }
    }
  }
  patterns.push(...yods);

  return patterns;
}
