/**
 * src/components/EphiIcons.jsx
 *
 * Centralized SVG icon library for the Ephi platform.
 * Replaces all emoji/Unicode glyphs with clean, scalable inline SVGs.
 *
 * Usage:
 *   import { PlanetIcon, ZodiacIcon, UiIcon } from './EphiIcons';
 *   <PlanetIcon name="sun" size={18} color="var(--accent)" />
 *   <ZodiacIcon name="aries" size={14} />
 *   <UiIcon name="sparkle" size={16} />
 */

// ─── Planet SVG paths ─────────────────────────────────────────────────────────
// Traditional astrological glyphs rendered as crisp SVG paths.

const PLANET_PATHS = {
  sun: (
    <>
      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  moon: (
    <path d="M15.5 9.5A6 6 0 0 1 9.5 15.5 6 6 0 1 0 15.5 9.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  mercury: (
    <>
      <circle cx="12" cy="10" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="13.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1.6" />
      <line x1="9" y1="17.5" x2="15" y2="17.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 6.5 A3.5 3.5 0 0 1 15.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  venus: (
    <>
      <circle cx="12" cy="9.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="13.5" x2="12" y2="20" stroke="currentColor" strokeWidth="1.6" />
      <line x1="9" y1="17" x2="15" y2="17" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  mars: (
    <>
      <circle cx="10" cy="14" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="13.2" y1="10.8" x2="18" y2="6" stroke="currentColor" strokeWidth="1.6" />
      <polyline points="14,6 18,6 18,10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  jupiter: (
    <>
      <path d="M7 8 Q12 6 12 12 Q12 18 7 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  saturn: (
    <>
      <path d="M9 6 L15 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="6" x2="12" y2="14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 14 Q16 14 16 17 Q16 20 12 20 Q9 20 9 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  uranus: (
    <>
      <circle cx="12" cy="17" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="14.5" x2="12" y2="6" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="10" x2="12" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="16" y1="10" x2="12" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="5" r="1" fill="currentColor" />
    </>
  ),
  neptune: (
    <>
      <path d="M6 8 L9 5 L12 8 L15 5 L18 8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="8" x2="12" y2="20" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  pluto: (
    <>
      <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line x1="12" y1="11.5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.6" />
      <line x1="8.5" y1="15.5" x2="15.5" y2="15.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 5.5 A3 3 0 0 1 15 5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  // North Node
  nn: (
    <>
      <path d="M12 4 A6 6 0 0 1 12 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 4 A6 6 0 0 0 12 16" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="16" r="2" fill="currentColor" />
    </>
  ),
  // Rising / Ascendant
  rising: (
    <>
      <path d="M12 4 L12 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 9 L12 4 L17 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="6" y1="20" x2="18" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
};

// ─── Zodiac SVG paths ─────────────────────────────────────────────────────────

const ZODIAC_PATHS = {
  aries: <path d="M6 18 Q6 6 12 6 Q18 6 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  taurus: (
    <>
      <circle cx="12" cy="15" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 7 Q6 11 12 11 Q18 11 18 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  gemini: (
    <>
      <line x1="8" y1="6" x2="8" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <line x1="16" y1="6" x2="16" y2="18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 6 Q12 3 19 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 18 Q12 21 19 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  cancer: (
    <>
      <path d="M6 12 A4 4 0 1 1 14 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 12 A4 4 0 1 1 10 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  leo: (
    <>
      <circle cx="9" cy="15" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 15 Q16 15 16 11 Q16 7 12 7 Q8 7 8 11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  virgo: (
    <>
      <path d="M6 6 L6 18 M10 6 L10 18 M14 6 L14 14 Q14 18 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  libra: (
    <>
      <line x1="5" y1="18" x2="19" y2="18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 13 L18 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 13 Q8 7 12 7 Q16 7 16 13" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  scorpio: (
    <>
      <path d="M6 6 L6 18 M10 6 L10 18 M14 6 L14 18 L18 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="16,16 18,14 18,17" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  sagittarius: (
    <>
      <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="13,6 18,6 18,11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8.5" y1="12" x2="14.5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" transform="rotate(-45 12 12)" />
    </>
  ),
  capricorn: (
    <>
      <path d="M6 6 L6 16 Q6 20 10 18 Q14 16 14 12 L14 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 14 Q18 14 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  aquarius: (
    <>
      <path d="M5 9 L8 7 L11 9 L14 7 L17 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 15 L8 13 L11 15 L14 13 L17 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  pisces: (
    <>
      <path d="M7 6 Q12 12 7 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 6 Q12 12 17 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
};

// ─── UI icon paths ────────────────────────────────────────────────────────────

const UI_PATHS = {
  sparkle: (
    <>
      <path d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z" fill="currentColor" opacity="0.9" />
      <circle cx="18" cy="4" r="1.2" fill="currentColor" opacity="0.6" />
      <circle cx="6" cy="17" r="0.8" fill="currentColor" opacity="0.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="9" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  refresh: (
    <>
      <path d="M4 12a8 8 0 0 1 14.65-4.45" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 12a8 8 0 0 1-14.65 4.45" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="18.65,3.55 18.65,7.55 14.65,7.55" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5.35,20.45 5.35,16.45 9.35,16.45" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  edit: (
    <>
      <path d="M17 3l4 4L7 21H3v-4L17 3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="14" y1="6" x2="18" y2="10" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3L2 21h20L12 3z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <line x1="12" y1="10" x2="12" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </>
  ),
  lightning: (
    <path d="M13 2L5 14h6l-2 8 8-12h-6l2-8z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
  ),
  star: (
    <path d="M12 2l2.4 7.2H22l-6 4.5 2.4 7.3L12 16.5 5.6 21l2.4-7.3-6-4.5h7.6z" fill="currentColor" opacity="0.85" />
  ),
  fourstar: (
    <>
      <path d="M12 3 L13.5 9 L20 10.5 L13.5 12 L12 18 L10.5 12 L4 10.5 L10.5 9 Z" fill="currentColor" />
    </>
  ),
};

// ─── Zodiac name → index map ──────────────────────────────────────────────────

const ZODIAC_NAMES = [
  'aries', 'taurus', 'gemini', 'cancer',
  'leo', 'virgo', 'libra', 'scorpio',
  'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

// ─── Public components ────────────────────────────────────────────────────────

/**
 * Renders a planet SVG icon.
 * @param {{ name: string, size?: number, color?: string, style?: object, className?: string }} props
 */
export function PlanetIcon({ name, size = 18, color, style, className }) {
  const content = PLANET_PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label={name}
    >
      {content}
    </svg>
  );
}

/**
 * Renders a zodiac sign SVG icon.
 * @param {{ name: string, size?: number, color?: string, style?: object }} props
 * `name` can be the sign name (e.g. "aries") or zodiac index (0–11).
 */
export function ZodiacIcon({ name, size = 16, color, style }) {
  const key = typeof name === 'number' ? ZODIAC_NAMES[name] : name?.toLowerCase();
  const content = ZODIAC_PATHS[key];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label={key}
    >
      {content}
    </svg>
  );
}

/**
 * Renders a UI SVG icon.
 * @param {{ name: string, size?: number, color?: string, style?: object, className?: string }} props
 */
export function UiIcon({ name, size = 16, color, style, className }) {
  const content = UI_PATHS[name];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color: color || 'currentColor', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      className={className}
      aria-label={name}
    >
      {content}
    </svg>
  );
}

// ─── String-based helpers (for data layers that can't use JSX) ────────────────

/**
 * Returns a text glyph for a planet key — used in non-React contexts
 * (notifications, data layers). These use proper astrological Unicode
 * characters from the "Miscellaneous Symbols" block rendered via a
 * dedicated astro glyph font, NOT emoji.
 */
export const PLANET_GLYPH = {
  sun: '☉', moon: '☽', mercury: '☿', venus: '♀',
  mars: '♂', jupiter: '♃', saturn: '♄',
  uranus: '♅', neptune: '♆', pluto: '♇',
};

export const ZODIAC_GLYPH = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

export { ZODIAC_NAMES, PLANET_PATHS, ZODIAC_PATHS };
