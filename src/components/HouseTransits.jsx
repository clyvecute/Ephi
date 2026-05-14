/**
 * src/components/HouseTransits.jsx
 *
 * Above Professional analysis of active House transits.
 * Explains what areas of life are being lit up by current planetary movements.
 */
import { PlanetIcon } from './EphiIcons.jsx';

const HOUSE_DATA = {
  1: { label: 'First House: The Self', focus: 'Identity, appearance, and physical presence. The portal of incarnation.' },
  2: { label: 'Second House: Value', focus: 'Finances, possessions, self-worth, and tangible resources.' },
  3: { label: 'Third House: Perception', focus: 'Communication, intellect, local environment, and sibling dynamics.' },
  4: { label: 'Fourth House: Roots', focus: 'Home, family, foundations, and the private inner life.' },
  5: { label: 'Fifth House: Creation', focus: 'Creativity, romance, pleasure, children, and risk-taking.' },
  6: { label: 'Sixth House: Service', focus: 'Health, daily routine, work environment, and ritualized labor.' },
  7: { label: 'Seventh House: Partnership', focus: 'One-to-one relationships, marriage, and open contracts.' },
  8: { label: 'Eighth House: Transformation', focus: 'Shared resources, deep intimacy, death, taxes, and rebirth.' },
  9: { label: 'Ninth House: Expansion', focus: 'Philosophy, higher education, long-distance travel, and belief systems.' },
  10: { label: 'Tenth House: Purpose', focus: 'Career, public reputation, status, and authority.' },
  11: { label: 'Eleventh House: Community', focus: 'Friends, networks, social ideals, and future visions.' },
  12: { label: 'Twelfth House: Dissolution', focus: 'Subconscious, hidden things, solitude, and spiritual surrender.' }
};

const PLANET_LABEL = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  nnode: 'North Node', snode: 'South Node', lilith: 'Lilith'
};

export default function HouseTransits({ transitPositions, natalChart }) {
  if (!transitPositions || !natalChart) return null;

  const ascLon = natalChart.ascendant?.longitude;
  if (ascLon == null) return null;

  const ascSignIdx = Math.floor(ascLon / 30);

  // Group planets by house (Whole Sign system)
  const houseGroups = {};
  Object.entries(transitPositions).forEach(([planet, lon]) => {
    if (!PLANET_LABEL[planet]) return;
    const signIdx = Math.floor(lon / 30);
    const houseNum = (signIdx - ascSignIdx + 12) % 12 + 1;
    if (!houseGroups[houseNum]) houseGroups[houseNum] = [];
    houseGroups[houseNum].push(planet);
  });

  return (
    <div className="card">
      <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: 'var(--accent)' }}>🏛️</span>
        House Energy Transits
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Analyzing which life areas are currently "activated" by the planets in the sky. These movements trigger specific natal themes based on your Rising sign.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {Object.entries(houseGroups).sort((a, b) => a[0] - b[0]).map(([house, planets]) => (
          <div key={house} style={{ 
            background: 'var(--bg-deep)', 
            padding: '1rem', 
            borderRadius: '12px', 
            border: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Subtle house number background */}
            <div style={{ 
              position: 'absolute', right: '-10px', bottom: '-20px', 
              fontSize: '5rem', fontWeight: 900, color: 'var(--text-primary)', 
              opacity: 0.03, pointerEvents: 'none', fontStyle: 'italic'
            }}>
              {house}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{HOUSE_DATA[house].label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{HOUSE_DATA[house].focus}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {planets.map(p => (
                <div key={p} style={{ 
                  display: 'flex', alignItems: 'center', gap: '6px', 
                  background: 'var(--bg-card)', padding: '4px 10px', 
                  borderRadius: '20px', border: '1px solid var(--border)',
                  fontSize: '0.75rem', color: 'var(--text-secondary)'
                }}>
                  <PlanetIcon name={p} size={14} color="var(--accent)" />
                  {PLANET_LABEL[p]}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
