/**
 * src/components/AspectList.jsx
 * Renders a list of aspects with quality indicators, filter tabs, and expanding interpretations.
 */
import { useState } from 'react';
import { PLANET_META } from '../lib/ephemeris.js';
import { PlanetIcon, UiIcon } from './EphiIcons.jsx';

const PLANET_DURATIONS = {
  moon: 'Quick (2 hrs)',
  sun: 'Short (2 days)',
  mercury: 'Short (2 days)',
  venus: 'Short (2-3 days)',
  mars: 'Medium (1 week)',
  jupiter: 'Long (1 month)',
  saturn: 'Extended (1-2 mo)',
  uranus: 'Major (3+ mo)',
  neptune: 'Major (4+ mo)',
  pluto: 'Major (6+ mo)',
};

const QUALITY_COLORS = {
  soft:    '#4ade80', // green
  hard:    '#f87171', // red
  neutral: '#fbbf24', // yellow
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AspectList({ aspects, title = 'Current Aspects', emptyMsg = 'No aspects found.', onSynthesize = null }) {
  const [filter, setFilter] = useState('all');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(30);

  if (!aspects) return null;

  const filteredAspects = aspects.filter(a => {
    if (filter === 'hard') return a.nature === 'hard';
    if (filter === 'soft') return a.nature === 'soft';
    if (filter === 'tight') return a.strength === 'exact' || a.strength === 'strong';
    return true;
  });

  const toggleCard = (index) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="card" style={{ height: 'fit-content' }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{title}</span>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
          {['all', 'hard', 'soft', 'tight'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? 'var(--accent-subtle)' : 'transparent',
                border: 'none', color: filter === f ? 'var(--accent-dark)' : 'var(--text-primary)', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredAspects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><PlanetIcon name="moon" size={28} color="var(--accent)" /></div>
          <div className="empty-text">{emptyMsg}</div>
        </div>
      ) : (
        <div className="aspect-list">
          {filteredAspects.slice(0, visibleCount).map((a, i) => {
            const metaT = PLANET_META[a.transitPlanet] || {};
            const metaN = PLANET_META[a.natalPlanet] || {};
            const color = QUALITY_COLORS[a.nature] || 'var(--border)';
            const isExpanded = expandedCards.has(i);
            const interp = a.interp || {};

            return (
              <div
                key={i}
                className="aspect-card"
                onClick={() => toggleCard(i)}
                style={{ borderLeftColor: color, borderLeftWidth: '3px', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <div className="quality-dot" style={{ background: color }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="aspect-planets">
                      {metaT.symbol} {capitalize(a.transitPlanet)}
                      {' '}<span style={{ color }}>{a.symbol}</span>{' '}
                      {metaN.symbol} {capitalize(a.natalPlanet)}
                    </span>
                    <span className="aspect-name">{capitalize(a.aspectName)}</span>
                    <span className="aspect-orb">{a.orb}°</span>
                    {a.applying !== null && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.2rem' }}>
                        ({a.applying ? 'Applying: Building intensity' : 'Separating: Energy fading'})
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
                    {a.strength === 'exact' && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', background: 'var(--tense)', color: '#fff', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.02em' }}>
                        URGENT / PEAK
                      </span>
                    )}
                    {a.exactAtLabel && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', background: 'var(--accent-subtle)', color: 'var(--accent-dark)', borderRadius: '4px', border: '1px solid var(--accent)', fontWeight: 600 }}>
                        <UiIcon name="refresh" size={10} style={{ marginRight: '3px' }} /> Exact: {a.exactAtLabel}
                      </span>
                    )}
                    {PLANET_DURATIONS[a.transitPlanet] && (
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', background: 'var(--bg-deep)', color: 'var(--text-muted)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        ⏱ {PLANET_DURATIONS[a.transitPlanet]}
                      </span>
                    )}
                  </div>
                  
                  {a.description && (
                    <div className="aspect-interp" style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {a.description}
                    </div>
                  )}

                  {isExpanded && (
                    <div className="aspect-full-interp" style={{ marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--border)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {interp.insight && (
                        <div style={{ 
                          background: 'var(--accent-subtle)', 
                          padding: '1rem', 
                          borderRadius: '8px', 
                          border: '1px solid var(--accent)',
                          color: 'var(--text-primary)',
                          fontStyle: 'italic',
                          lineHeight: 1.6,
                          position: 'relative'
                        }}>
                          <span style={{ position: 'absolute', top: '-10px', left: '10px', background: 'var(--accent)', color: '#fff', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 900, textTransform: 'uppercase' }}>
                            Above Professional Insight
                          </span>
                          {interp.insight}
                        </div>
                      )}
                      {interp.shadow && <div><strong>Shadow:</strong> {interp.shadow}</div>}
                      {interp.gift && <div><strong>Gift:</strong> {interp.gift}</div>}
                      {interp.advice && <div><strong>Advice:</strong> {interp.advice}</div>}
                      {interp.domains && interp.domains.length > 0 && (
                        <div><strong>Focus Areas:</strong> {interp.domains.join(', ')}</div>
                      )}

                      {onSynthesize && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '0.6rem', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSynthesize(a);
                            }}
                          >
                            <UiIcon name="sparkle" size={12} style={{ marginRight: 6 }} />
                            Synthesize with AI
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {a.keywords && a.keywords.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                      {a.keywords.map((kw, idx) => (
                        <span key={idx} style={{
                          fontSize: '0.65rem', padding: '0.1rem 0.4rem',
                          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '4px',
                          textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)'
                        }}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredAspects.length > visibleCount && (
            <button className="btn btn-ghost" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setVisibleCount(v => v + 30)}>
              Show More Aspects
            </button>
          )}
        </div>
      )}
    </div>
  );
}
