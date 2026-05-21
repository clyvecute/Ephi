/**
 * src/pages/TransitCalendarPage.jsx
 *
 * Transit Calendar Page — /transit-calendar
 * Generates high-precision calendar events showing exact aspect crossings.
 * Groups events by day, offering powerful filters (planet, speed, nature)
 * and rich archetypal details with optional AI Oracle synthesis.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNatal } from '../hooks/useNatal.js';
import { calculateTransitCalendar } from '../lib/transitCalendar.js';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';
import EphiMarkdown from '../components/EphiMarkdown.jsx';
import { useToast } from '../components/Toast.jsx';

const ALL_TRANSIT_PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];

const PLANET_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto'
};

const NATURE_COLORS = {
  harmonic: 'var(--harmonic)',
  tense: 'var(--tense)',
  neutral: 'var(--accent)'
};

const ASPECT_SYMBOL = {
  conjunction: '☌', sextile: '⚹', square: '□',
  trine: '△', quincunx: '⚻', opposition: '☍'
};

export default function TransitCalendarPage() {
  const { natalChart, loading: natalLoading } = useNatal();
  const toast = useToast();

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // YYYY-MM-DD
  });
  const [durationDays, setDurationDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  
  // Filters
  const [selectedPlanets, setSelectedPlanets] = useState(ALL_TRANSIT_PLANETS);
  const [natureFilter, setNatureFilter] = useState('all'); // all | harmonic | tense
  const [speedFilter, setSpeedFilter] = useState('all'); // all | fast | slow
  
  // Interactive Modal
  const [deepDive, setDeepDive] = useState(null);
  const [puristMode, setPuristMode] = useState(false);

  // Check purist mode
  useEffect(() => {
    try {
      const uid = JSON.parse(localStorage.getItem('ephi_current_uid') || 'null');
      const settingsKey = uid ? `uid_${uid}__ephi_settings` : 'ephi_settings';
      const settings = JSON.parse(localStorage.getItem(settingsKey) || '{}');
      setPuristMode(settings.puristMode || false);
    } catch {}
  }, []);

  const calculate = useCallback(async () => {
    if (!natalChart) return;
    setLoading(true);
    setError('');
    try {
      const start = new Date(`${startDate}T00:00:00`);
      const results = await calculateTransitCalendar(natalChart, {
        startDate: start,
        durationDays,
        transitPlanets: ALL_TRANSIT_PLANETS
      });
      setEvents(results);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to scan transit crossings.');
    } finally {
      setLoading(false);
    }
  }, [natalChart, startDate, durationDays]);

  useEffect(() => {
    if (natalChart) calculate();
  }, [natalChart, startDate, durationDays]);

  // Handle Planet Filter Toggle
  const togglePlanet = (planet) => {
    setSelectedPlanets(prev => 
      prev.includes(planet)
        ? prev.filter(p => p !== planet)
        : [...prev, planet]
    );
  };

  const selectAllPlanets = () => setSelectedPlanets(ALL_TRANSIT_PLANETS);
  const selectNonePlanets = () => setSelectedPlanets([]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 1. Planet match
      if (!selectedPlanets.includes(e.transitPlanet)) return false;
      
      // 2. Nature match
      if (natureFilter !== 'all' && e.nature !== natureFilter) return false;
      
      // 3. Speed match
      const isFast = ['sun', 'moon', 'mercury', 'venus', 'mars'].includes(e.transitPlanet);
      if (speedFilter === 'fast' && !isFast) return false;
      if (speedFilter === 'slow' && isFast) return false;
      
      return true;
    });
  }, [events, selectedPlanets, natureFilter, speedFilter]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    const groups = {};
    filteredEvents.forEach(e => {
      const dateStr = new Date(e.exactTime).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(e);
    });
    return Object.entries(groups);
  }, [filteredEvents]);

  // Deep-dive Oracle interprets transit aspect
  const handleSynthesize = async (asp) => {
    setDeepDive({ asp, loading: true, text: '' });
    try {
      const { generateAspectReading } = await import('../lib/gemini');
      const res = await generateAspectReading({
        transitPlanet: asp.transitPlanet,
        natalPlanet: asp.natalPlanet,
        aspectName: asp.aspectName,
        natal: natalChart
      });
      setDeepDive({ asp, loading: false, text: res.text });
    } catch (err) {
      setDeepDive({ asp, loading: false, text: 'The Oracle is silent on this connection.' });
    }
  };

  // Close modal on escape
  useEffect(() => {
    if (!deepDive) return;
    const handler = (e) => { if (e.key === 'Escape') setDeepDive(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deepDive]);

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
            We need your birth details to map precision cosmic crossings against your unique blueprint.
          </p>
          <Link to="/dashboard?tab=natal" className="btn btn-primary">Configure Natal Chart</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap" style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <span className="page-label" style={{ color: 'var(--accent)' }}>Astrological Timeline</span>
        <h1 className="page-title" style={{ fontSize: '2.2rem', fontFamily: 'var(--font-serif)' }}>Transit Calendar</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.4rem' }}>
          Calculates the exact minute transits enter orb or become exact against your natal planetary coordinates.
        </p>
      </div>

      {/* ─── Controls & Options ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Start Date</label>
            <input 
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none'
              }}
            />
          </div>

          <div style={{ width: '150px' }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Duration</label>
            <select 
              value={durationDays} 
              onChange={e => setDurationDays(Number(e.target.value))}
              style={{
                width: '100%', background: 'var(--bg-deep)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)', fontSize: '0.88rem', outline: 'none'
              }}
            >
              <option value={15}>15 Days</option>
              <option value={30}>30 Days</option>
              <option value={60}>60 Days</option>
              <option value={90}>90 Days</option>
            </select>
          </div>

          <button 
            className="btn btn-primary"
            onClick={calculate}
            disabled={loading}
            style={{ padding: '10px 24px', fontSize: '0.88rem', height: '40px' }}
          >
            {loading ? 'Scanning Sky...' : 'Recalculate Timeline'}
          </button>

        </div>

        {/* Dynamic Filters Divider */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
          
          {/* Planet filters */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Filter Transit Planets</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={selectAllPlanets} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>All</button>
                <span style={{ color: 'var(--border)' }}>|</span>
                <button onClick={selectNonePlanets} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600 }}>Clear</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {ALL_TRANSIT_PLANETS.map(p => {
                const isActive = selectedPlanets.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlanet(p)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '5px 10px', borderRadius: '20px', fontSize: '0.75rem',
                      fontFamily: 'var(--font-sans)', border: '1px solid var(--border)',
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: isActive ? 'var(--accent-subtle)' : 'var(--bg-deep)',
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                      color: isActive ? 'var(--accent-dark)' : 'var(--text-secondary)'
                    }}
                  >
                    <PlanetIcon name={p} size={11} color={isActive ? 'var(--accent)' : 'var(--text-muted)'} />
                    {PLANET_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Speed / Nature filters */}
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            
            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Aspect Nature</span>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-deep)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {['all', 'harmonic', 'tense'].map(n => (
                  <button
                    key={n}
                    onClick={() => setNatureFilter(n)}
                    style={{
                      border: 'none', background: natureFilter === n ? 'var(--bg-card)' : 'transparent',
                      padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                      color: natureFilter === n ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: natureFilter === n ? 700 : 500
                    }}
                  >
                    {n.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Movement Speed</span>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-deep)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {[
                  { id: 'all', label: 'ALL' },
                  { id: 'fast', label: 'FAST (LUNAR/INNER)' },
                  { id: 'slow', label: 'SLOW (OUTER)' }
                ].map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSpeedFilter(s.id)}
                    style={{
                      border: 'none', background: speedFilter === s.id ? 'var(--bg-card)' : 'transparent',
                      padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
                      color: speedFilter === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontWeight: speedFilter === s.id ? 700 : 500
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* ─── Timeline / Results ─────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '5rem 0', gap: '1rem' }}>
          <div className="spinner" />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Iterating precision ephemerides over {durationDays} days...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'var(--tense)' }}>
          <p style={{ color: 'var(--tense)', fontSize: '0.9rem' }}>{error}</p>
        </div>
      ) : groupedEvents.length === 0 ? (
        <div className="empty-state" style={{ padding: '5rem 2rem' }}>
          <UiIcon name="warning" size={32} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <div style={{ color: 'var(--text-secondary)' }}>No transit events match your active filters. Try expanding your search.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {groupedEvents.map(([dateStr, dayEvents]) => (
            <div key={dateStr} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem' }}>
              
              {/* Day column */}
              <div style={{ position: 'sticky', top: '2rem', height: 'fit-content', paddingTop: '0.5rem' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: 'var(--text-primary)' }}>
                  {dateStr}
                </h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {dayEvents.length} Alignment{dayEvents.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Events list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayEvents.map(e => {
                  const exactDate = new Date(e.exactTime);
                  const timeFormatted = exactDate.toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={e.id}
                      onClick={() => setDeepDive({ asp: e, loading: false, text: '' })}
                      className="card table-row-hover"
                      style={{
                        padding: '1rem 1.25rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        borderLeft: `3px solid ${NATURE_COLORS[e.nature] || 'var(--accent)'}`,
                        background: 'var(--bg-card)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                    >
                      {/* Left side: Aspect Formula */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <PlanetIcon name={e.transitPlanet} size={16} color="var(--accent)" />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Transit</span>
                        </div>

                        <span style={{
                          fontSize: '1rem', fontWeight: 800,
                          color: NATURE_COLORS[e.nature] || 'var(--text-primary)'
                        }}>
                          {ASPECT_SYMBOL[e.aspectName] || e.symbol}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <PlanetIcon name={e.natalPlanet} size={15} color="var(--text-secondary)" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Natal {PLANET_LABELS[e.natalPlanet] || e.natalPlanet}</span>
                        </div>
                      </div>

                      {/* Right side: Time & Status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="pill" style={{
                          fontSize: '0.7rem',
                          background: e.applying ? 'var(--accent-subtle)' : 'var(--bg-deep)',
                          color: e.applying ? 'var(--accent-dark)' : 'var(--text-muted)'
                        }}>
                          {e.applying ? 'Applying' : 'Separating'}
                        </span>
                        
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {timeFormatted}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ─── Deep Dive Modal ─────────────────────────────────────────── */}
      {deepDive && (
        <div className="reading-modal-overlay" onClick={() => setDeepDive(null)}>
          <div className="reading-modal-content card" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '10px', background: 'var(--bg-deep)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <UiIcon name="sparkle" size={20} color="var(--accent)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize' }}>
                  Transit {PLANET_LABELS[deepDive.asp.transitPlanet]} {deepDive.asp.aspectName} Natal {PLANET_LABELS[deepDive.asp.natalPlanet]}
                </h3>
              </div>
              <button onClick={() => setDeepDive(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem', lineHeight: '1' }}>×</button>
            </div>

            {/* Event Meta Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, padding: '0.75rem 1rem', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: '0.2rem' }}>Exact Timing</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {new Date(deepDive.asp.exactTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>

                <div style={{ width: '130px', padding: '0.75rem 1rem', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, marginBottom: '0.2rem' }}>Aspect Nature</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: NATURE_COLORS[deepDive.asp.nature], textTransform: 'capitalize' }}>
                    {deepDive.asp.nature}
                  </span>
                </div>
              </div>

              {deepDive.asp.description ? (
                <div style={{ padding: '1rem', background: 'rgba(201,160,220,0.04)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {deepDive.asp.description}
                </div>
              ) : (
                <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No core interpretation archived for this specific planet configuration.
                </div>
              )}

              {/* Keywords */}
              {deepDive.asp.keywords?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {deepDive.asp.keywords.map(k => (
                    <span key={k} className="pill" style={{ fontSize: '0.7rem', background: 'var(--bg-deep)', color: 'var(--text-secondary)' }}>
                      #{k}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* AI Interpretative Deep Dive Synthesis */}
            {!puristMode && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                {deepDive.loading ? (
                  <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Synthesizing personalized crossing insights with Gemini Flash...</p>
                  </div>
                ) : deepDive.text ? (
                  <div className="reading-body" style={{ padding: 0 }}>
                    <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontFamily: 'var(--font-serif)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <UiIcon name="sparkle" size={14} color="var(--accent)" />
                      The Oracle's Personal Synthesis
                    </h4>
                    <EphiMarkdown text={deepDive.text} />
                  </div>
                ) : (
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleSynthesize(deepDive.asp)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '12px', fontSize: '0.88rem' }}
                  >
                    <UiIcon name="sparkle" size={14} />
                    Synthesize Interpretation With AI Oracle
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      <style>{`
        .table-row-hover:hover {
          background: var(--bg-card);
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.03);
        }
      `}</style>
      
    </div>
  );
}
