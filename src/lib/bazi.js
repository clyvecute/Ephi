/**
 * lib/bazi.js
 * Simplified BaZi (Four Pillars) calculation.
 * 
 * Note: Professional BaZi requires complex solar term (Jie Qi) mappings.
 * This provides a high-fidelity approximation using epoch-based offsets.
 */

const STEMS = ['Jia', 'Yi', 'Bing', 'Ding', 'Wu', 'Ji', 'Geng', 'Xin', 'Ren', 'Gui'];
const BRANCHES = ['Zi', 'Chou', 'Yin', 'Mao', 'Chen', 'Si', 'Wu', 'Wei', 'Shen', 'You', 'Xu', 'Hai'];
const ELEMENTS = {
  Jia: 'Wood+', Yi: 'Wood-', 
  Bing: 'Fire+', Ding: 'Fire-',
  Wu: 'Earth+', Ji: 'Earth-',
  Geng: 'Metal+', Xin: 'Metal-',
  Ren: 'Water+', Gui: 'Water-'
};

const ANIMALS = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'];

/**
 * Calculates the Pillar (Stem + Branch) for a given value and cycle.
 */
function getPillar(index, cycle = 60) {
  const stem = STEMS[index % 10];
  const branch = BRANCHES[index % 12];
  const animal = ANIMALS[index % 12];
  const element = ELEMENTS[stem];
  return { stem, branch, animal, element, label: `${stem} ${branch}` };
}

/**
 * Calculates 10-year Luck Pillars (Da Yun).
 */
export function calculateLuckPillars(birthDate, monthPillarIndex, isForward) {
  const pillars = [];
  let currentIdx = monthPillarIndex;
  
  for (let i = 0; i < 8; i++) {
    currentIdx = isForward ? (currentIdx + 1) % 60 : (currentIdx - 1 + 60) % 60;
    pillars.push({
      age: 10 + i * 10, // Approximation — usually calculated via solar term distance
      pillar: getPillar(currentIdx)
    });
  }
  return pillars;
}

/**
 * Calculates current BaZi transits (Annual, Monthly).
 */
export function getCurrentBazi() {
  const now = new Date();
  const bazi = calculateBaZi(now);
  return {
    year: bazi.year,
    month: bazi.month,
    day: bazi.day
  };
}

/**
 * Calculates the Four Pillars of Destiny.
 */
export function calculateBaZi(date, gender = 'male') {
  const d = new Date(date);
  const year = d.getFullYear();
  
  // 1. Year Pillar
  const yearOffset = (year - 1984 + 6000) % 60;
  const yearPillar = getPillar(yearOffset);

  // 2. Day Pillar
  const epoch = new Date(Date.UTC(2000, 0, 1));
  const diffDays = Math.floor((d.getTime() - epoch.getTime()) / (24 * 60 * 60 * 1000));
  const dayOffset = (54 + diffDays + 6000) % 60;
  const dayPillar = getPillar(dayOffset);

  // 3. Month Pillar
  const month = d.getMonth();
  const monthPillarIdx = (yearOffset * 12 + month + 2) % 60;
  const monthPillar = getPillar(monthPillarIdx);

  // 4. Hour Pillar
  const hour = d.getHours();
  const hourIdx = Math.floor((hour + 1) / 2) % 12;
  const hourPillar = getPillar((dayOffset * 12 + hourIdx) % 60);

  // Luck Pillars Direction
  // Forward if (Male & Yang Year) or (Female & Yin Year)
  const isYangYear = yearOffset % 2 === 0;
  const isForward = gender === 'male' ? isYangYear : !isYangYear;
  const luckPillars = calculateLuckPillars(d, monthPillarIdx, isForward);

  return {
    year: yearPillar,
    month: monthPillar,
    day: dayPillar,
    hour: hourPillar,
    luckPillars,
    isForward,
    summary: `Day Master: ${dayPillar.element} ${dayPillar.stem}`
  };
}
