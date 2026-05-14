/**
 * src/components/PlanetTable.jsx
 * Shows all current planetary positions with signs, degrees, as pills.
 */
import { ALL_PLANETS, PLANET_META, getZodiacInfo } from '../lib/ephemeris.js';
import { PlanetIcon, ZodiacIcon, UiIcon } from './EphiIcons.jsx';

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const PLANET_KEYWORDS = {
  sun: 'Core vitality and focus',
  moon: 'Emotional needs and mood',
  mercury: 'Communication and ideas',
  venus: 'Connection and values',
  mars: 'Drive and action',
  jupiter: 'Expansion and optimism',
  saturn: 'Structure and discipline',
  uranus: 'Innovation and change',
  neptune: 'Dreams and intuition',
  pluto: 'Transformation and depth',
};

const SIGN_KEYWORDS = {
  Aries: 'in a bold, pioneering, and fast-paced way.',
  Taurus: 'with a focus on stability, comfort, and pacing.',
  Gemini: 'through curiosity, adaptability, and exchange.',
  Cancer: 'sensitively, protectively, and emotionally.',
  Leo: 'with dramatic flair, warmth, and confidence.',
  Virgo: 'analytically, practically, and with refinement.',
  Libra: 'seeking balance, harmony, and partnership.',
  Scorpio: 'intensely, strategically, and transformatively.',
  Sagittarius: 'optimistically, philosophically, and freely.',
  Capricorn: 'with ambition, discipline, and pragmatism.',
  Aquarius: 'innovatively, objectively, and unconventionally.',
  Pisces: 'imaginatively, empathetically, and fluidly.',
};

const HOUSE_NAMES = [
  '1st House (Identity, Self, Appearance)',
  '2nd House (Values, Finances, Resources)',
  '3rd House (Communication, Learning, Local)',
  '4th House (Home, Family, Roots, Private Life)',
  '5th House (Creativity, Romance, Joy, Children)',
  '6th House (Health, Daily Routines, Work)',
  '7th House (Partnerships, Marriage, 1-on-1s)',
  '8th House (Transformation, Shared Resources, Shadow)',
  '9th House (Higher Learning, Travel, Beliefs)',
  '10th House (Career, Public Image, Calling)',
  '11th House (Community, Friends, Future Vision)',
  '12th House (Subconscious, Retreat, Spirituality)'
];

const HOUSE_THEMES = [
  "projects your identity, vitality, and first impressions onto the world.",
  "influences your values, personal finances, and sense of security.",
  "is expressed through your mind, local community, and how you share ideas.",
  "shapes your private life, family roots, and emotional foundation.",
  "is channeled into creativity, romance, children, and personal pleasure.",
  "manifests through your daily work, health habits, and sense of duty.",
  "plays out in your committed relationships, business partnerships, and open interactions.",
  "influences shared resources, deep intimacy, and personal evolution.",
  "seeks expansion through higher education, travel, and spiritual philosophies.",
  "drives your public status, career ambitions, and overall legacy.",
  "is expressed through your social networks, friendships, and future hopes.",
  "is focused on your inner life, subconscious, and spiritual release."
];

const PLANET_DURATIONS = {
  moon: 'Quick (~2 hours)',
  sun: 'Short (2 days)',
  mercury: 'Short (2 days)',
  venus: 'Short (2-3 days)',
  mars: 'Medium (1 week)',
  jupiter: 'Long (1 month)',
  saturn: 'Extended (1-2 months)',
  uranus: 'Major (3+ months)',
  neptune: 'Major (4+ months)',
  pluto: 'Major (6+ months)',
};

const TRADITIONAL_RULERS = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
};

export default function PlanetTable({ positions, natal }) {
  if (!positions) {
    return (
      <div className="card">
        <div className="card-title">Live Planetary Positions</div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  let ascSignIndex = null;
  if (natal && natal.risingSign) {
    ascSignIndex = SIGNS.indexOf(natal.risingSign);
  }

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="card-title" style={{ marginBottom: '1.25rem', fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        Planetary Inventory
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Planet</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Sign</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Degree</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>House</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {ALL_PLANETS.map(key => {
              const lon = positions[key];
              if (lon == null) return null;
              
              const meta = PLANET_META[key];
              const zodiac = getZodiacInfo(lon);
              const transitSignIndex = SIGNS.indexOf(zodiac.sign);
              
              let houseNum = null;
              if (ascSignIndex !== null && transitSignIndex !== -1) {
                houseNum = (transitSignIndex - ascSignIndex + 12) % 12 + 1;
              }

              const isRetro = false; // Add actual logic if available
              const duration = PLANET_DURATIONS[key];

              return (
                <tr key={key} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="table-row-hover">
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <PlanetIcon name={key} size={16} color={meta.color} />
                      <span style={{ fontWeight: 600 }}>{meta.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ZodiacIcon name={zodiac.sign.toLowerCase()} size={14} color="var(--text-secondary)" />
                      <span>{zodiac.sign}</span>
                    </div>
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {zodiac.displayStr.split(' ')[0]}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600, color: 'var(--accent-dark)' }}>
                    {houseNum ? `${houseNum}${getOrdinal(houseNum)}` : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 0.5rem' }}>
                    {duration && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--bg-deep)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
                        {duration.split(' ')[0]}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <style>{`
        .table-row-hover:hover { background: var(--bg-deep); }
      `}</style>
    </div>
  );
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
