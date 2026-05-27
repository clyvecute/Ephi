/**
 * src/pages/ProgressionsPage.jsx
 *
 * Secondary Progressions — /progressions
 * Symbolic Day-for-a-Year unfolding of the natal blueprint.
 * Features a dynamic timeline year scrubber, interactive dual bi-wheel,
 * positions comparison table, tight-orb progressed aspect list, and AI Oracle.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNatal } from '../hooks/useNatal.js';
import { getSecondaryProgressions } from '../lib/returns.js';
import { getActiveAspects } from '../lib/aspects.js';
import { TransitWheel } from '../components/AstroChartWheel.jsx';
import { PlanetIcon, ZodiacIcon, UiIcon } from '../components/EphiIcons.jsx';
import EphiMarkdown from '../components/EphiMarkdown.jsx';
import { generateReturnReading } from '../lib/oracle.js';
import { useToast } from '../components/Toast.jsx';
import { Link } from 'react-router-dom';
import { store } from '../lib/store.js';

const ALL_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

const PLANET_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto'
};

const ASPECT_SYMBOL = {
  conjunction: '☌', sextile: '⚹', square: '□',
  trine: '△', quincunx: '⚻', opposition: '☍'
};

const ASPECT_COLORS = {
  harmonic: 'var(--harmonic)',
  tense: 'var(--tense)',
  neutral: 'var(--accent)'
};

export default function ProgressionsPage() {
  const { natalChart, loading: natalLoading } = useNatal();
  const toast = useToast();

  const [targetYear, setTargetYear] = useState(() => new Date().getFullYear());
  const [progressed, setProgressed] = useState(null);
  const [aspects, setAspects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tabs: positions | aspects | reading
  const [activeTab, setActiveTab] = useState('positions');

  // AI Reading State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiReading, setAiReading] = useState('');
  const [puristMode, setPuristMode] = useState(false);

  // Check purist mode
  useEffect(() => {
    const settings = store.getJSON('ephi_settings') || {};
    setPuristMode(settings.puristMode || false);
  }, []);

  // Compute birth year boundaries
  const birthYear = useMemo(() => {
    if (!natalChart?.meta?.date) return new Date().getFullYear() - 30;
    return new Date(natalChart.meta.date).getFullYear();
  }, [natalChart]);

  const minYear = birthYear;
  const maxYear = birthYear + 90;

  // Initialize target year to current year if valid
  useEffect(() => {
    const current = new Date().getFullYear();
    if (current >= minYear && current <= maxYear) {
      setTargetYear(current);
    } else {
      setTargetYear(minYear + 30); // fallback to age 30
    }
  }, [minYear, maxYear]);

  const calculate = useCallback(async () => {
    if (!natalChart) return;
    setLoading(true);
    setError('');
    try {
      const birthDate = new Date(`${natalChart.meta.date}T${natalChart.meta.time || '12:00:00'}`);
      const targetDate = new Date(`${targetYear}-07-01T12:00:00`); // mid year
      
      const ascLon = natalChart.ascendant?.longitude ?? null;
      const isSidereal = !!natalChart.meta?.sidereal;

      // getSecondaryProgressions returns Promise positions
      const rawProg = getSecondaryProgressions(birthDate, targetDate, ascLon, isSidereal);
      const resolvedPos = await rawProg.positions;

      const progData = {
        ...rawProg,
        positions: resolvedPos,
        planets: resolvedPos
      };

      setProgressed(progData);

      // Reconstruct clean object with lowercased keys for natal positions
      const natalPosLons = {};
      for (const [k, v] of Object.entries(natalChart.positions)) {
        natalPosLons[k.toLowerCase()] = typeof v === 'object' ? v.longitude : v;
      }

      // Reconstruct clean progressed positions lons
      const progPosLons = {};
      for (const [k, v] of Object.entries(resolvedPos)) {
        progPosLons[k.toLowerCase()] = typeof v === 'object' ? v.longitude : v;
      }

      // Calculate aspects
      const allAspects = getActiveAspects(progPosLons, natalPosLons);
      // Tight orb filter for progressions (< 1.0 degree orb)
      const tightAspects = allAspects.filter(a => a.orb <= 1.0);
      setAspects(tightAspects);

    } catch (err) {
      console.error(err);
      setError('Secondary progression calculation failed.');
    } finally {
      setLoading(false);
    }
  }, [natalChart, targetYear]);

  useEffect(() => {
    if (natalChart) calculate();
  }, [natalChart, targetYear, calculate]);

  // AI Interpretation Generation
  const handleGenerateReading = async () => {
    if (!progressed || !natalChart) return;
    setAiLoading(true);
    setAiError('');
    setAiReading('');
    try {
      const result = await generateReturnReading({
        natal: natalChart,
        returnChart: progressed,
        mode: 'progressed'
      });
      setAiReading(result.text);
    } catch (err) {
      setAiError(err.message || 'The Oracle was unable to formulate a reading.');
    } finally {
      setAiLoading(false);
    }
  };

  const formatDeg = (lon) => {
    if (lon == null) return '—';
    const norm = ((lon % 360) + 360) % 360;
    const signIndex = Math.floor(norm / 30);
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const deg = Math.floor(norm % 30);
    const min = Math.floor((norm % 1) * 60);
    return `${signs[signIndex]} ${deg}°${String(min).padStart(2,'0')}′`;
  };

  // Helper to get angle difference (0-360) shortest distance
  const getProgressedShift = (planetKey) => {
    if (!progressed || !natalChart) return null;
    const natalVal = natalChart.positions[planetKey] ?? natalChart.positions[planetKey.charAt(0).toUpperCase() + planetKey.slice(1)];
    const progVal = progressed.positions[planetKey];
    
    if (natalVal == null || progVal == null) return null;
    const nLon = typeof natalVal === 'object' ? natalVal.longitude : natalVal;
    const pLon = typeof progVal === 'object' ? progVal.longitude : progVal;

    let diff = pLon - nLon;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    return diff;
  };

  if (natalLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!natalChart) {
    return (
      <div className="page-wrap" style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '1.5rem' }}>✦</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.8rem' }}>Set up Your Natal Chart</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
            Secondary progressions map symbolic unfolding over your lifespan, requiring an active natal chart base.
          </p>
          <Link to="/dashboard?tab=natal" className="btn btn-primary">Configure Natal Chart</Link>
        </div>
      </div>
    );
  }

  const age = targetYear - birthYear;

  return (
    <div className="page-wrap" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <span className="page-label" style={{ color: 'var(--accent)' }}>Symbolic Timing</span>
        <h1 className="page-title" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-serif)' }}>Secondary Progressions</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
          One symbolic day equals one calendar year of life. Tracks the slow, internal evolution of your core soul blueprint.
        </p>
      </div>

      {/* ─── Scrubber & Age Timeline ───────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Progressed Year / Age</span>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: 'var(--accent)' }}>{targetYear}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 400 }}>— Age {age}</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {[
                { label: 'Birth', yr: birthYear },
                { label: '-10y', yr: Math.max(minYear, targetYear - 10) },
                { label: '-1y', yr: Math.max(minYear, targetYear - 1) },
                { label: '+1y', yr: Math.min(maxYear, targetYear + 1) },
                { label: '+10y', yr: Math.min(maxYear, targetYear + 10) },
              ].map(btn => (
                <button
                  key={btn.label}
                  className="btn btn-ghost"
                  onClick={() => setTargetYear(btn.yr)}
                  disabled={targetYear === btn.yr}
                  style={{ padding: '8px 12px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '35px' }}>{minYear}</span>
            <input 
              type="range"
              min={minYear}
              max={maxYear}
              value={targetYear}
              onChange={e => setTargetYear(Number(e.target.value))}
              style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '35px', textAlign: 'right' }}>{maxYear}</span>
          </div>
        </div>
      </div>

      {/* ─── Bi-Wheel Grid ─────────────────────────────────────────── */}
      <div className="dashboard-grid" style={{ gap: '2rem' }}>
        
        {/* Left Column: Dual Wheel */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
                Inner Ring: Natal
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--harmonic)', display: 'inline-block' }} />
                Outer Ring: Progressed
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '460px', width: '460px' }}>
                <div className="spinner" />
              </div>
            ) : progressed ? (
              <TransitWheel
                natal={natalChart}
                transits={progressed}
                aspects={aspects}
                size={460}
              />
            ) : null}
          </div>
        </div>

        {/* Right Column: Comparison / Aspects / Reading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Tab Selection */}
          <nav className="tab-bar" style={{ marginBottom: 0 }}>
            {[
              { id: 'positions', label: 'Evolving Positions' },
              { id: 'aspects', label: `Progressed Aspects (${aspects.length})` },
              { id: 'reading', label: 'AI Oracle Synthesis' }
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Tab 1: Positions comparison */}
          {activeTab === 'positions' && progressed && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '0.5rem' }}>Planet</th>
                      <th style={{ padding: '0.5rem' }}>Natal</th>
                      <th style={{ padding: '0.5rem' }}>Progressed</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_PLANETS.map(p => {
                      const natalVal = natalChart.positions[p] ?? natalChart.positions[p.charAt(0).toUpperCase() + p.slice(1)];
                      const progVal = progressed.positions[p];
                      if (natalVal == null || progVal == null) return null;

                      const nLon = typeof natalVal === 'object' ? natalVal.longitude : natalVal;
                      const pLon = typeof progVal === 'object' ? progVal.longitude : progVal;
                      const shift = getProgressedShift(p);

                      return (
                        <tr key={p} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.7rem 0.5rem', fontWeight: 600 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <PlanetIcon name={p} size={15} color="var(--accent)" />
                              {PLANET_LABELS[p]}
                            </div>
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {formatDeg(nLon).split(' ')[0]} {formatDeg(nLon).split(' ')[1]}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', fontWeight: 600, fontSize: '0.8rem' }}>
                            {formatDeg(pLon).split(' ')[0]} {formatDeg(pLon).split(' ')[1]}
                          </td>
                          <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: shift >= 0 ? 'var(--harmonic)' : 'var(--tense)' }}>
                            {shift >= 0 ? `+${shift.toFixed(2)}°` : `${shift.toFixed(2)}°`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Tight aspects */}
          {activeTab === 'aspects' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              {aspects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No tight progressed aspects (within a strict 1° orb) are active in {targetYear}.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                    Because progressed planets move extremely slowly, progressed aspects within a <strong>1° orb</strong> trigger crucial major life chapters and structural evolutions.
                  </p>
                  {aspects.map((a, idx) => (
                    <div
                      key={idx}
                      className="card"
                      style={{
                        padding: '0.85rem 1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderLeft: `3px solid ${ASPECT_COLORS[a.nature] || 'var(--accent)'}`,
                        background: 'var(--bg-deep)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <PlanetIcon name={a.transitPlanet} size={15} color="var(--harmonic)" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Prog. {PLANET_LABELS[a.transitPlanet]}</span>
                        </div>
                        
                        <strong style={{ fontSize: '0.95rem', color: ASPECT_COLORS[a.nature] }}>
                          {ASPECT_SYMBOL[a.aspectName] || a.symbol}
                        </strong>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <PlanetIcon name={a.natalPlanet} size={14} color="var(--accent)" />
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Natal {PLANET_LABELS[a.natalPlanet]}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="pill" style={{ fontSize: '0.65rem', background: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                          Orb {a.orb.toFixed(2)}°
                        </span>
                        <span style={{ fontSize: '0.72rem', color: ASPECT_COLORS[a.nature], textTransform: 'capitalize', fontWeight: 700 }}>
                          {a.nature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: AI Oracle reading */}
          {activeTab === 'reading' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              {puristMode ? (
                <div style={{ color: 'var(--tense)', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem 0' }}>
                  AI synthesis readings are currently disabled in your Purist Mode settings.
                </div>
              ) : aiLoading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Analyzing day-for-a-year progression alignment geometry...</p>
                </div>
              ) : aiReading ? (
                <div className="reading-body" style={{ padding: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UiIcon name="sparkle" size={14} color="var(--accent)" />
                      The Progression Oracle
                    </h4>
                    <button className="btn btn-ghost" onClick={handleGenerateReading} style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                      Re-synthesize
                    </button>
                  </div>
                  <EphiMarkdown text={aiReading} />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    Consult the Oracle to synthesize how these symbolic progressed degree movements represent the maturation of your consciousness at age {age}.
                  </p>
                  <button className="btn btn-primary" onClick={handleGenerateReading}>
                    <UiIcon name="sparkle" size={14} style={{ marginRight: '0.4rem' }} />
                    Synthesize Progression Chapter
                  </button>
                </div>
              )}
              {aiError && (
                <div style={{ color: 'var(--tense)', fontSize: '0.85rem', marginTop: '1rem', background: 'rgba(224,108,117,0.05)', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(224,108,117,0.1)' }}>
                  {aiError}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
