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

function getTenGod(dmStem, targetStem) {
  const dmIdx = STEMS.indexOf(dmStem);
  const targetIdx = STEMS.indexOf(targetStem);
  const diff = (targetIdx - dmIdx + 10) % 10;
  const dmPolarity = dmIdx % 2; 
  const targetPolarity = targetIdx % 2;
  const samePolarity = dmPolarity === targetPolarity;

  const map = {
    0: samePolarity ? 'Friend' : 'RobWealth',
    2: samePolarity ? 'EatingGod' : 'HurtingOfficer',
    4: samePolarity ? 'IndirectWealth' : 'DirectWealth',
    6: samePolarity ? 'SevenKillings' : 'DirectOfficer',
    8: samePolarity ? 'IndirectResource' : 'DirectResource',
  };
  
  if (diff === 1) return 'RobWealth';
  if (diff === 3) return 'HurtingOfficer';
  if (diff === 5) return 'DirectWealth';
  if (diff === 7) return 'DirectOfficer';
  if (diff === 9) return 'DirectResource';

  return map[diff % 2 === 0 ? diff : (diff - 1 + 10) % 10] || 'Friend';
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

  return {
    dayMaster: {
      label: pillars.day.label,
      element: dmEl,
      traits: ELEMENT_TRAITS[dmEl]
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
