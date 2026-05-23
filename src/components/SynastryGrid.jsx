/**
 * src/components/SynastryGrid.jsx
 * Technical grid showing relationship aspects between two charts.
 * Planet X (Person A) vs Planet Y (Person B).
 */
import { PlanetIcon } from './EphiIcons.jsx';

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

const NATURE_SYMBOLS = {
  hard: '□',
  soft: '△',
  conjunction: '☌',
  opposition: '☍',
};

const ASPECT_GLYPHS = {
  conjunction: '☌',
  opposition: '☍',
  square: '□',
  trine: '△',
  sextile: '✳',
};

export default function SynastryGrid({ aspects }) {
  // Map aspects by planet pair for quick lookup
  const gridMap = {};
  aspects.forEach(asp => {
    const p1 = asp.transitPlanet || asp.planet1 || asp.p1 || '';
    const p2 = asp.natalPlanet  || asp.planet2 || asp.p2 || '';
    const key = `${p1.toLowerCase()}-${p2.toLowerCase()}`;
    // Store only the strongest aspect if multiple exist (unlikely in most engines but safe)
    if (!gridMap[key] || asp.orb < gridMap[key].orb) {
      gridMap[key] = asp;
    }
  });

  return (
    <div className="card" style={{ padding: '0', overflowX: 'auto', border: '1px solid var(--border)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
        <thead>
          <tr>
            <th style={headerCornerStyle}>A \ B</th>
            {PLANETS.map(p => (
              <th key={p} style={headerColStyle}>
                <PlanetIcon name={p} size={14} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLANETS.map(p1 => (
            <tr key={p1}>
              <td style={headerRowStyle}>
                <PlanetIcon name={p1} size={14} />
              </td>
              {PLANETS.map(p2 => {
                const aspect = gridMap[`${p1}-${p2}`];
                return (
                  <td key={p2} style={{
                    ...cellStyle,
                    background: aspect ? (aspect.nature === 'hard' ? 'rgba(224, 108, 117, 0.05)' : 'rgba(92, 184, 122, 0.05)') : 'none',
                    color: aspect ? (aspect.nature === 'hard' ? 'var(--tense)' : 'var(--harmonic)') : 'var(--text-muted)'
                  }}>
                    {aspect ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                          {ASPECT_GLYPHS[aspect.aspectName.toLowerCase()] || '·'}
                        </span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>
                          {aspect.orb.toFixed(1)}°
                        </span>
                      </div>
                    ) : (
                      <span style={{ opacity: 0.1 }}>·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const headerCornerStyle = {
  background: 'var(--bg-deep)',
  padding: '12px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const headerColStyle = {
  background: 'var(--bg-deep)',
  padding: '12px',
  borderBottom: '1px solid var(--border)',
  borderRight: '1px solid var(--border)',
  textAlign: 'center',
  width: '10%'
};

const headerRowStyle = {
  background: 'var(--bg-deep)',
  padding: '12px',
  borderRight: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'center',
  width: '40px'
};

const cellStyle = {
  padding: '10px 4px',
  textAlign: 'center',
  borderRight: '1px solid var(--border)',
  borderBottom: '1px solid var(--border)',
  minWidth: '40px',
  transition: 'background 0.2s'
};
