import React from 'react';
import { PlanetIcon } from './EphiIcons';

/**
 * South Indian style Vedic Chart component.
 * Uses a fixed 4x4 grid where signs are stationary.
 */
export default function VedicChart({ planets = [], ascendantSignIndex, title = "Rasi (D-1)", subtitle = "" }) {
  // Mapping of Sign Index (0 = Aries ... 11 = Pisces) to 4x4 grid positions
  const SIGN_GRID_MAP = {
    11: { row: 0, col: 0, name: 'Pisces' },
    0:  { row: 0, col: 1, name: 'Aries' },
    1:  { row: 0, col: 2, name: 'Taurus' },
    2:  { row: 0, col: 3, name: 'Gemini' },
    10: { row: 1, col: 0, name: 'Aquarius' },
    3:  { row: 1, col: 3, name: 'Cancer' },
    9:  { row: 2, col: 0, name: 'Capricorn' },
    4:  { row: 2, col: 3, name: 'Leo' },
    8:  { row: 3, col: 0, name: 'Sagittarius' },
    7:  { row: 3, col: 1, name: 'Scorpio' },
    6:  { row: 3, col: 2, name: 'Libra' },
    5:  { row: 3, col: 3, name: 'Virgo' },
  };

  // Group planets by sign index
  const planetsBySign = {};
  for (let i = 0; i < 12; i++) {
    planetsBySign[i] = [];
  }

  planets.forEach(p => {
    if (p && typeof p.signIndex === 'number') {
      planetsBySign[p.signIndex].push(p);
    }
  });

  const renderCell = (row, col) => {
    // Find if this cell corresponds to a sign
    const signIndex = Object.keys(SIGN_GRID_MAP).find(
      key => SIGN_GRID_MAP[key].row === row && SIGN_GRID_MAP[key].col === col
    );

    if (!signIndex) {
      // Center 2x2 area
      if (row === 1 && col === 1) {
        return (
          <div key={`center`} style={{ gridRow: '2 / span 2', gridColumn: '2 / span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--surface)' }}>
            <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{title}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subtitle}</div>
          </div>
        );
      }
      return null;
    }

    const isAscendant = parseInt(signIndex) === ascendantSignIndex;
    const occupants = planetsBySign[signIndex];

    return (
      <div 
        key={`cell-${row}-${col}`} 
        style={{
          border: '1px solid var(--border-color)',
          backgroundColor: isAscendant ? 'var(--accent-subtle)' : 'var(--bg-surface)',
          padding: '0.4rem',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85px',
          overflow: 'hidden',
          transition: 'background-color 0.2s',
          boxShadow: isAscendant ? 'inset 0 0 0 2px var(--accent)' : 'none'
        }}
      >
        <div style={{ 
          fontSize: '0.65rem', 
          color: isAscendant ? 'var(--accent-dark)' : 'var(--text-muted)', 
          position: 'absolute', 
          top: '4px', 
          left: '6px', 
          opacity: 0.8,
          textTransform: 'uppercase',
          fontWeight: 600,
          letterSpacing: '0.05em'
        }}>
          {SIGN_GRID_MAP[signIndex].name.substring(0, 3)}
        </div>
        
        {isAscendant && (
          <div style={{ position: 'absolute', top: '4px', right: '6px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)' }}>
            ASC
          </div>
        )}

        <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', width: '100%' }}>
          {occupants.map((p, idx) => (
            p.key !== 'asc' && (
              <div key={idx} style={{ 
                display: 'flex', alignItems: 'center', gap: '3px', 
                fontSize: '0.8rem', fontWeight: 600,
                color: 'var(--text-primary)'
              }}>
                 <PlanetIcon name={p.key} size={14} color={p.color} />
                 {p.label && <span>{p.label.substring(0, 2)}</span>}
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      cells.push(renderCell(r, c));
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px', margin: '0 auto', boxShadow: '0 8px 30px rgba(0,0,0,0.04)', borderRadius: '12px' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr)', 
        gridTemplateRows: 'repeat(4, 1fr)',
        border: '2px solid var(--border-color)',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-card)'
      }}>
        {cells}
      </div>
    </div>
  );
}
