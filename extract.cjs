const fs = require('fs');
const txt1 = fs.readFileSync('EPHI_BAZI_JYOTISH_UPGRADE.md', 'utf8');

// Extract panchanga.js
const p5 = txt1.split('## Part 5 — New file: `src/lib/jyotish/panchanga.js`')[1];
const p6 = p5.split('## Part 6 — New file: `src/lib/jyotish/muhurta.js`');
let panchangaCode = p6[0].split('```js')[1].split('```')[0].trim();

// Append approximateSunriseSunset
panchangaCode += `\n
/**
 * Approximate sunrise/sunset in minutes from midnight (UTC-local).
 * Accurate to ±10 minutes. Use only as fallback when SWE rise_trans unavailable.
 */
export function approximateSunriseSunset(date, latDeg) {
  const doy = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
  const p   = Math.asin(0.39795 * Math.cos(0.2163108 + 2 * Math.atan(0.9671396 * Math.tan(0.00860 * (doy - 186)))));
  const D   = 24 - (24 / Math.PI) * Math.acos(
    (Math.sin(0.8333 * Math.PI / 180) + Math.sin(latDeg * Math.PI / 180) * Math.sin(p)) /
    (Math.cos(latDeg * Math.PI / 180) * Math.cos(p))
  );
  const halfDay   = D / 2;
  const sunriseMins = Math.round((12 - halfDay) * 60);
  const sunsetMins  = Math.round((12 + halfDay) * 60);
  return { sunriseMins, sunsetMins };
}
`;
if (!fs.existsSync('src/lib/jyotish')) {
  fs.mkdirSync('src/lib/jyotish', { recursive: true });
}
fs.writeFileSync('src/lib/jyotish/panchanga.js', panchangaCode);

// Extract muhurta.js
const p7 = p6[1].split('## Part 7 — Updated `src/lib/vedicInterpretations.js`');
const muhurtaCode = p7[0].split('```js')[1].split('```')[0].trim();
fs.writeFileSync('src/lib/jyotish/muhurta.js', muhurtaCode);

// Extract prashna.js from EPHI_REMAINING_FIXES.md
const txt2 = fs.readFileSync('EPHI_REMAINING_FIXES.md', 'utf8');
const p8 = txt2.split('## Fix 8 — `src/pages/HoraryPage.jsx`: Add Prashna Jyotish mode')[1];
const p9 = p8.split('## Fix 9 — Performance: Cache BaZi async calculation');
const prashnaCode = p9[0].split('```js')[1].split('```')[0].trim();
fs.writeFileSync('src/lib/jyotish/prashna.js', prashnaCode);

console.log('Extraction complete.');
