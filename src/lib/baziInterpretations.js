/**
 * lib/baziInterpretations.js
 * Professional BaZi interpretation engine.
 */

const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];

const ELEMENT_TRAITS = {
  Wood: {
    strength: "Growth, kindness, flexibility, and vision.",
    weakness: "Stubbornness or emotional volatility.",
    advice: "Focus on grounding and finishing what you start."
  },
  Fire: {
    strength: "Passion, enthusiasm, and charisma.",
    weakness: "Impulsiveness or burnout.",
    advice: "Maintain consistency and avoid over-extending."
  },
  Earth: {
    strength: "Stability, reliability, and nurturing.",
    weakness: "Stagnation or resistance to change.",
    advice: "Embrace new perspectives and keep moving forward."
  },
  Metal: {
    strength: "Precision, determination, and focus.",
    weakness: "Rigidity or overly critical nature.",
    advice: "Soften your approach and embrace vulnerability."
  },
  Water: {
    strength: "Intelligence, wisdom, and adaptability.",
    weakness: "Fear or emotional inconsistency.",
    advice: "Build structures to contain your vast energy."
  }
};

const TEN_GOD_DESCRIPTORS = {
  Friend: "Independence, self-confidence, strong willpower.",
  RobWealth: "Charismatic competition; high social energy but potential for loss.",
  EatingGod: "Refined creativity, enjoyment of life, and output.",
  HurtingOfficer: "High performance, rebellion, and sharp intelligence.",
  DirectWealth: "Practical income, hard work, and stability.",
  IndirectWealth: "Entrepreneurial risk, unexpected gains, and opportunism.",
  DirectOfficer: "Responsibility, traditional authority, and discipline.",
  SevenKillings: "Leadership through challenge, aggression, and power.",
  DirectResource: "Support from elders, traditional learning, and protection.",
  IndirectResource: "Unconventional wisdom, intuition, and mystery."
};

/**
 * Ten God (十神) calculation.
 *
 * The Ten Gods are determined by two axes:
 *   1. The 5-element relationship between Day Master and target stem
 *      (same, produces, controls, controlled-by, produced-by)
 *   2. Polarity (same = Yang/Yang or Yin/Yin; different = Yang/Yin)
 *
 * Element relationship is determined by stem INDEX position:
 *   diff 0,1  → Same element    (diff 0: same stem group)
 *   diff 2,3  → DM produces it  (Wood produces Fire: Jia→Bing = diff 2)
 *   diff 4,5  → DM controls it  (Wood controls Earth: Jia→Wu = diff 4)
 *   diff 6,7  → It controls DM  (Metal controls Wood: Jia→Geng = diff 6)
 *   diff 8,9  → It produces DM  (Water produces Wood: Jia→Ren = diff 8)
 */
function getTenGod(dmStem, targetStem) {
  const STEMS = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];

  const dmIdx     = STEMS.indexOf(dmStem);
  const targetIdx = STEMS.indexOf(targetStem);

  if (dmIdx === -1 || targetIdx === -1) return 'Unknown';

  const diff         = (targetIdx - dmIdx + 10) % 10;
  const samePolarity = (dmIdx % 2) === (targetIdx % 2);

  // Ten God table indexed by [elementRelationship][polarity]
  // elementRelationship = Math.floor(diff / 2), polarity = samePolarity
  const TEN_GOD_TABLE = [
    // diff 0,1 — Same element
    { same: 'Friend',         diff: 'RobWealth'       },
    // diff 2,3 — DM produces target
    { same: 'EatingGod',      diff: 'HurtingOfficer'  },
    // diff 4,5 — DM controls target
    { same: 'IndirectWealth', diff: 'DirectWealth'    },
    // diff 6,7 — Target controls DM
    { same: 'SevenKillings',  diff: 'DirectOfficer'   },
    // diff 8,9 — Target produces DM
    { same: 'IndirectResource', diff: 'DirectResource' },
  ];

  const relationship = Math.floor(diff / 2); // 0–4
  return samePolarity
    ? TEN_GOD_TABLE[relationship].same
    : TEN_GOD_TABLE[relationship].diff;
}

const HIDDEN_STEMS = {
  Rat: ['Gui'],
  Ox: ['Ji', 'Xin', 'Gui'],
  Tiger: ['Jia', 'Bing', 'Wu'],
  Rabbit: ['Yi'],
  Dragon: ['Wu', 'Yi', 'Gui'],
  Snake: ['Bing', 'Geng', 'Wu'],
  Horse: ['Ding', 'Ji'],
  Goat: ['Ji', 'Ding', 'Yi'],
  Monkey: ['Geng', 'Ren', 'Wu'],
  Rooster: ['Xin'],
  Dog: ['Wu', 'Xin', 'Ding'],
  Pig: ['Ren', 'Jia']
};

// ─── Seasonal element strength table ──────────────────────────────────────
// For each month branch (season), which elements are Wang/Xiang/Xiu/Qiu/Si
// Wang (旺) = 3pts, Xiang (相) = 2pts, Xiu (休) = 1pt, Qiu (囚) = 0.5pt, Si (死) = 0pt

const SEASONAL_STRENGTH = {
  // Branch:    Wood  Fire  Earth Metal Water
  Yin:         [3,    2,    1,    0,    0.5  ],  // Spring: Wood Wang
  Mao:         [3,    2,    1,    0,    0.5  ],
  Chen:        [1,    2,    3,    0.5,  0    ],  // Earth season transition
  Si:          [0,    3,    2,    1,    0    ],  // Summer: Fire Wang
  Wu:          [0,    3,    2,    1,    0    ],
  Wei:         [0.5,  2,    3,    1,    0    ],  // Earth transition
  Shen:        [0,    0,    1,    3,    2    ],  // Autumn: Metal Wang
  You:         [0,    0,    1,    3,    2    ],
  Xu:          [0.5,  0,    3,    2,    0    ],  // Earth transition
  Hai:         [2,    0,    0,    0.5,  3    ],  // Winter: Water Wang
  Zi:          [2,    0,    0,    0.5,  3    ],
  Chou:        [1,    0,    3,    2,    0.5  ],  // Earth transition
};

const ELEMENT_INDEX = { Wood: 0, Fire: 1, Earth: 2, Metal: 3, Water: 4 };

// Element production cycle: Wood→Fire→Earth→Metal→Water→Wood
const PRODUCES = { Wood:'Fire', Fire:'Earth', Earth:'Metal', Metal:'Water', Water:'Wood' };
// Element control cycle: Wood→Earth→Water→Fire→Metal→Wood
const CONTROLS = { Wood:'Earth', Earth:'Water', Water:'Fire', Fire:'Metal', Metal:'Wood' };

/**
 * Determine if the Day Master is strong or weak.
 *
 * Scoring:
 *   1. Season (month branch) provides the base wang/xiang score for the DM element.
 *   2. Each stem that matches DM element or produces DM element adds support.
 *   3. Each branch's main hidden stem contributes a fraction.
 *   4. Roots (DM element in any branch's hidden stems) add significant support.
 *
 * Returns: { strength: 'strong'|'weak'|'neutral', score, rootCount, supportCount }
 */
function getDayMasterStrength(pillars) {
  const STEMS_LIST  = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
  const STEM_EL = { Jia:'Wood',Yi:'Wood',Bing:'Fire',Ding:'Fire',Wu:'Earth',Ji:'Earth',Geng:'Metal',Xin:'Metal',Ren:'Water',Gui:'Water' };
  const HIDDEN  = {
    Zi:['Gui'], Chou:['Ji','Xin','Gui'], Yin:['Jia','Bing','Wu'], Mao:['Yi'],
    Chen:['Wu','Yi','Gui'], Si:['Bing','Geng','Wu'], Wu:['Ding','Ji'],
    Wei:['Ji','Ding','Yi'], Shen:['Geng','Ren','Wu'], You:['Xin'],
    Xu:['Wu','Xin','Ding'], Hai:['Ren','Jia']
  };

  const dmEl     = STEM_EL[pillars.day.stem];
  const monthBr  = pillars.month.branch;
  const dmElIdx  = ELEMENT_INDEX[dmEl];

  // 1. Seasonal base score (most important factor, ~40% weight)
  let score     = (SEASONAL_STRENGTH[monthBr]?.[dmElIdx] ?? 1) * 10;
  let rootCount = 0;
  let supportCount = 0;

  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.hour];

  // 2. Stem support — stems that share DM element or produce DM element
  for (const p of allPillars) {
    if (p === pillars.day) continue; // Day stem is the DM itself, don't count it
    const stemEl = STEM_EL[p.stem];
    if (stemEl === dmEl) { score += 6; supportCount++; }          // Same element: companion/friend
    else if (PRODUCES[stemEl] === dmEl) { score += 4; supportCount++; } // Produces DM: resource
  }

  // 3. Branch hidden stem roots — DM element appearing in hidden stems
  for (const p of allPillars) {
    const hidden = HIDDEN[p.branch] || [];
    const mainStemEl  = STEM_EL[hidden[0]];
    const midStemEl   = STEM_EL[hidden[1]];
    const resStemEl   = STEM_EL[hidden[2]];

    if (mainStemEl === dmEl) { score += 5; rootCount++; }         // Main qi root
    else if (mainStemEl && PRODUCES[mainStemEl] === dmEl) score += 2; // Main qi produces DM
    if (midStemEl === dmEl) { score += 3; rootCount++; }          // Middle qi root
    if (resStemEl === dmEl) { score += 1; rootCount++; }          // Residual qi root
  }

  // Score thresholds (empirically calibrated — adjust if needed)
  // Strong: score >= 30, Weak: score < 20, Neutral: 20–29
  const strength = score >= 30 ? 'strong' : score < 20 ? 'weak' : 'neutral';

  return { strength, score, rootCount, supportCount,
    usefulGods: strength === 'strong'
      ? ['DirectWealth','IndirectWealth','DirectOfficer','SevenKillings','HurtingOfficer']
      : ['DirectResource','IndirectResource','Friend','RobWealth','EatingGod']
  };
}

export function analyzeBazi(pillars) {
  const dmStem = pillars.day.stem;
  const dmEl = pillars.day.element.replace(/[+-]/g, '');
  
  const allPillars = [
    { type: 'Year', p: pillars.year },
    { type: 'Month', p: pillars.month },
    { type: 'Day', p: pillars.day },
    { type: 'Hour', p: pillars.hour }
  ];

  const tenGods = allPillars.map(item => ({
    type: item.type,
    label: getTenGod(dmStem, item.p.stem),
    pillar: item.p,
    description: TEN_GOD_DESCRIPTORS[getTenGod(dmStem, item.p.stem)],
    hidden: (HIDDEN_STEMS[item.p.animal] || []).map(hStem => ({
      stem: hStem,
      label: getTenGod(dmStem, hStem)
    }))
  }));

  const counts = { Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0 };
  allPillars.forEach(item => {
    const el = item.p.element.replace(/[+-]/g, '');
    counts[el]++;
  });

  const dominant = Object.entries(counts).reduce((a, b) => b[1] > a[1] ? b : a)[0];
  const missing = Object.entries(counts).filter(e => e[1] === 0).map(e => e[0]);

  const dmStrength = getDayMasterStrength(pillars);

  return {
    dayMaster: {
      label: pillars.day.label,
      element: dmEl,
      traits: ELEMENT_TRAITS[dmEl],
      strength: dmStrength.strength,
      strengthScore: dmStrength.score,
      rootCount:     dmStrength.rootCount,
      usefulGods:    dmStrength.usefulGods,
      strengthSummary: dmStrength.strength === 'strong'
        ? `Your ${dmEl} Day Master is strong this season (score ${dmStrength.score}). Wealth, Officer, and Output stars are your useful gods — lean into ambition and external achievement.`
        : dmStrength.strength === 'weak'
        ? `Your ${dmEl} Day Master is weak this season (score ${dmStrength.score}). Resource and Companion stars are your useful gods — prioritize support, learning, and building reserves.`
        : `Your ${dmEl} Day Master is in balance this season (score ${dmStrength.score}). The chart is relatively even — context and Luck Pillar determine the useful god.`
    },
    tenGods,
    dominant,
    missing,
    elementCounts: counts,
    professionalReport: {
      Career: tenGods.some(tg => tg.label.includes('Officer') || tg.label.includes('Wealth')) 
        ? "Dynamic career path with strong focus on results or authority."
        : "Creative or independent path preferred; avoid rigid corporate structures.",
      Wealth: tenGods.some(tg => tg.label.includes('Wealth'))
        ? "Potential for significant accumulation through consistent effort."
        : "Focus on knowledge (Resource) and skills (Output) to unlock financial flow.",
      Social: tenGods.some(tg => tg.label === 'RobWealth' || tg.label === 'Friend')
        ? "Highly collaborative nature, though competition exists in your circles."
        : "Self-reliant and independent; you work best when trusting your own vision."
    }
  };
}
