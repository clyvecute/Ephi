/**
 * src/pages/SharedChartPage.jsx
 *
 * Public-facing Shared Chart Landing Page.
 * Decodes compressed base64url chart payload client-side,
 * displaying an interactive NatalWheel, positions, and houses.
 * Includes a premium CTA to invite visitors to create their own charts.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decodeChart } from '../lib/shareChart.js';
import { NatalWheel } from '../components/AstroChartWheel.jsx';
import { PlanetIcon, ZodiacIcon, UiIcon } from '../components/EphiIcons.jsx';
import { getZodiacInfo } from '../lib/ephemeris.js';

const PLANET_LABELS = {
  sun: 'Sun', moon: 'Moon', mercury: 'Mercury', venus: 'Venus',
  mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
  node: 'North Node', nnode: 'North Node', snode: 'South Node',
  lilith: 'Lilith', fortune: 'Part of Fortune'
};

const PLANET_COLORS = {
  sun: '#f5a623', moon: '#a0a0d0', mercury: '#7ec8e3', venus: '#98c379',
  mars: '#e06c75', jupiter: '#c678dd', saturn: '#c0a070', uranus: '#56b6c2',
  neptune: '#6ba8d6', pluto: '#e5c07b', node: '#aaaaaa', nnode: '#aaaaaa', snode: '#aaaaaa'
};

const HOUSE_THEMES = {
  1: 'Identity, Self, Physical Appearance',
  2: 'Value, Assets, Personal Finances',
  3: 'Communication, Siblings, Intellect',
  4: 'Home, Ancestry, Inner Foundations',
  5: 'Creativity, Joy, romance, children',
  6: 'Wellness, Routines, Daily Duties',
  7: 'Commitments, Partnerships, 1-on-1s',
  8: 'Transformation, Shared Resources, Shadow',
  9: 'Wisdom, Philosophy, Global Travels',
  10: 'Legacy, Career, Public Standing',
  11: 'Alliances, Community, Visionary Hopes',
  12: 'Solitude, Subconscious, Healing'
};

export default function SharedChartPage() {
  const { encoded } = useParams();
  const [chart, setChart] = useState(null);
  const [error, setError] = useState('');
  const [selectedPlanet, setSelectedPlanet] = useState(null);

  useEffect(() => {
    try {
      if (encoded) {
        const decoded = decodeChart(encoded);
        setChart(decoded);
        setError('');
      }
    } catch (err) {
      console.error(err);
      setError('The shared URL is invalid or has been corrupted. Please ask the sender for a new link.');
    }
  }, [encoded]);

  if (error) {
    return (
      <div className="page-wrap" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', border: '1px solid rgba(244,63,94,0.2)', background: 'var(--bg-card)' }}>
          <div style={{ fontSize: '3rem', color: 'var(--tense)', marginBottom: '1rem' }}>✦</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.8rem', color: 'var(--text-primary)' }}>Failed to Decode Chart</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.9rem' }}>{error}</p>
          <Link to="/" className="btn btn-primary">Create a New Chart</Link>
        </div>
      </div>
    );
  }

  if (!chart) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
        <span style={{ fontSize: '1.5rem', color: 'var(--accent)', animation: 'pulse 1.5s infinite' }}>✦</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Decoding stellar coordinates...</p>
      </div>
    );
  }

  const { meta, positions, cusps, aspects, sunSign, moonSign, risingSign } = chart;

  // Format longitudes
  const formatDeg = (lon) => {
    if (lon == null) return '—';
    const norm = ((lon % 360) + 360) % 360;
    const signIndex = Math.floor(norm / 30);
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
    const deg = Math.floor(norm % 30);
    const min = Math.floor((norm % 1) * 60);
    return `${signs[signIndex]} ${deg}°${String(min).padStart(2,'0')}′`;
  };

  // Find house numbers for planets based on whole-sign or cusps
  const getHouseNumber = (lon) => {
    if (lon == null) return '—';
    if (!cusps || cusps.length < 12) return '—';
    const normLon = ((lon % 360) + 360) % 360;
    const ascLon = cusps[0]?.longitude ?? cusps[0] ?? 0;
    const ascSign = Math.floor(ascLon / 30);
    const planetSign = Math.floor(normLon / 30);
    return (planetSign - ascSign + 12) % 12 + 1;
  };

  return (
    <div className="page-wrap" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="page-header" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span className="page-label" style={{ letterSpacing: '0.15em', color: 'var(--accent)' }}>COSMIC BLUEPRINT</span>
        <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem', fontFamily: 'var(--font-serif)' }}>
          {meta.name}'s Natal Chart
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
          First breath: <strong>{new Date(meta.date).toLocaleDateString(undefined, { dateStyle: 'long' })}</strong> at <strong>{meta.time || '12:00'}</strong> in <strong>{meta.city || 'Unknown Location'}</strong>.
        </p>

        {/* Core Pillars (Sun, Moon, Rising) */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
          {[
            { label: 'Sun', val: sunSign, icon: 'sun', color: '#f5a623' },
            { label: 'Moon', val: moonSign, icon: 'moon', color: '#a0a0d0' },
            { label: 'Rising', val: risingSign, icon: 'rising', color: '#b8860b' }
          ].map(p => (
            <div key={p.label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              padding: '0.6rem 1.2rem', borderRadius: '50px', fontSize: '0.82rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
            }}>
              <PlanetIcon name={p.icon === 'rising' ? 'rising' : p.icon} size={14} color={p.color} />
              <span style={{ color: 'var(--text-muted)' }}>{p.label}:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{p.val}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Main Grid ──────────────────────────────────────────────── */}
      <div className="dashboard-grid" style={{ gap: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        
        {/* Left Column: Wheel Chart */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem', background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)' }}>
            <NatalWheel 
              natal={chart} 
              aspects={aspects} 
              onAspectClick={(asp) => setSelectedPlanet(asp)}
              size={480} 
            />
          </div>

          {/* Quick Informational card */}
          <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <UiIcon name="sparkle" size={14} color="var(--accent)" style={{ marginRight: '0.5rem' }} />
            This birth chart maps the precise alignment of the planets and houses from a serverless cryptographic link. All calculations are performed directly within your browser.
          </div>
        </div>

        {/* Right Column: Tables & Analysis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Planet Table */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="card-title" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              Stellar Inventory
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', fontSize: '0.72rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.5rem' }}>Planet</th>
                    <th style={{ padding: '0.5rem' }}>House</th>
                    <th style={{ padding: '0.5rem' }}>Position</th>
                    <th style={{ padding: '0.5rem', textAlign: 'right' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(positions).map(([key, val]) => {
                    const cleanKey = key.toLowerCase();
                    const lon = val.longitude ?? val.l;
                    const houseNum = getHouseNumber(lon);
                    return (
                      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.7rem 0.5rem', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <PlanetIcon name={cleanKey} size={15} color={PLANET_COLORS[cleanKey] || 'var(--text-primary)'} />
                            {PLANET_LABELS[cleanKey] || key}
                          </div>
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', color: 'var(--accent-dark)', fontWeight: 600 }}>
                          House {houseNum}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {formatDeg(lon)}
                        </td>
                        <td style={{ padding: '0.7rem 0.5rem', textAlign: 'right' }}>
                          {val.retrograde && (
                            <span style={{ color: 'var(--tense)', fontSize: '0.7rem', background: 'rgba(224,108,117,0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>Rx</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* House Cusps */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div className="card-title" style={{ fontSize: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              House Cusps & Angles
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {cusps.slice(0, 12).map((c, i) => {
                const lon = c.longitude ?? c;
                const hNum = i + 1;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.5rem 0.75rem', background: 'var(--bg-deep)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      <strong>House {hNum}</strong> ({HOUSE_THEMES[hNum].split(',')[0]})
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {formatDeg(lon).split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>

      {/* ─── Premium Call to Action (CTA) ─────────────────────────── */}
      <div className="card" style={{
        marginTop: '3.5rem',
        padding: '3rem 2rem',
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-deep))',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
          background: 'radial-gradient(circle, rgba(201,160,220,0.04) 0%, transparent 60%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <span style={{ fontSize: '2rem', color: 'var(--accent)', display: 'block', marginBottom: '1rem' }}>✦</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', marginBottom: '0.8rem' }}>Discover Your Personal Astral Map</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
            Understand the cosmic blueprint that shapes your energy, cycles, relationships, and potentials. Calculate your own precision chart, track live transits, and unlock personalized AI interpretations.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary" style={{ padding: '12px 30px', fontSize: '0.92rem' }}>
              Create Your Chart
            </Link>
            <Link to="/about" className="btn btn-ghost" style={{ padding: '12px 30px', fontSize: '0.92rem' }}>
              Learn More
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
