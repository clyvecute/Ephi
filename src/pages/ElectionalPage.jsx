import { useState, useMemo } from 'react';
import { useNatal } from '../hooks/useNatal';
import { getPlanetPositions } from '../lib/ephemeris';
import { getActiveAspects } from '../lib/aspects';
import { getZodiacInfo } from '../lib/ephemeris';
import { UiIcon, PlanetIcon } from '../components/EphiIcons';
import { useToast } from '../components/Toast';
import EphiMarkdown from '../components/EphiMarkdown';

const LOGIC_MODES = [
  { id: 'general',  label: 'General Vitality', icon: 'fourstar', color: 'var(--accent)' },
  { id: 'love',     label: 'Love & Attraction', icon: 'sparkle',  color: 'var(--harmonic)' },
  { id: 'business', label: 'Business & Launch',  icon: 'gear',     color: 'var(--accent-subtle)' },
  { id: 'spirit',   label: 'Ritual & Insight',  icon: 'pin',      color: 'var(--harmonic-dark)' },
];

/**
 * Basic Electional Scoring Logic
 */
function scoreMoment(date, mode, natal) {
  const positions = getPlanetPositions(date);
  const aspects = getActiveAspects(positions);
  const tn = natal ? getActiveAspects(positions, natal.positions) : [];
  
  let score = 50; // Neutral baseline
  const reasons = [];

  // 1. The Moon (Foundation of all Elections)
  const moonLon = positions['moon'];
  const moonSign = getZodiacInfo(moonLon).sign;
  
  // Moon Phase
  const sunLon = positions['sun'];
  const phaseAngle = (moonLon - sunLon + 360) % 360;
  if (phaseAngle < 180) {
    score += 10; reasons.push('Waxing Moon (+)');
  } else {
    score -= 5; reasons.push('Waning Moon (-)');
  }

  // 2. Mode Specifics
  if (mode === 'love') {
    const v = aspects.find(a => (a.transitPlanet === 'venus' || a.natalPlanet === 'venus') && a.nature === 'soft');
    if (v) { score += 15; reasons.push('Strong Venus Flow'); }
    const m = aspects.find(a => a.transitPlanet === 'mars' && a.nature === 'hard');
    if (m) { score -= 10; reasons.push('Mars Friction'); }
  }

  if (mode === 'business') {
    const s = aspects.find(a => a.transitPlanet === 'saturn' && a.nature === 'soft');
    if (s) { score += 10; reasons.push('Saturn Stability'); }
    const mer = aspects.find(a => a.transitPlanet === 'mercury' && a.nature === 'hard');
    if (mer) { score -= 15; reasons.push('Mercury Interference'); }
  }

  // 3. Overall Sky Quality
  const hard = aspects.filter(a => a.nature === 'hard').length;
  const soft = aspects.filter(a => a.nature === 'soft').length;
  score += (soft * 2) - (hard * 3);

  return {
    score: Math.min(Math.max(score, 0), 100),
    reasons: reasons.slice(0, 3)
  };
}

export default function ElectionalPage() {
  const { natalChart } = useNatal();
  const [mode, setMode] = useState('general');
  const [rangeDays, setRangeDays] = useState(14);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const toast = useToast();

  const handleScan = () => {
    setScanning(true);
    setResults(null);

    // Run in a small timeout to let the UI show scanning state
    setTimeout(() => {
      const start = new Date();
      const output = [];
      
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        // Step through day in 6h intervals for better precision
        const slots = [0, 6, 12, 18];
        const dayScores = slots.map(h => {
          const testDate = new Date(d);
          testDate.setHours(h, 0, 0, 0);
          return {
            date: testDate,
            ...scoreMoment(testDate, mode, natalChart)
          };
        });
        
        // Pick best slot of the day
        const best = dayScores.sort((a,b) => b.score - a.score)[0];
        output.push(best);
      }

      setResults(output);
      setScanning(false);
      toast(`Scanned ${rangeDays} days for ${mode} windows.`);
    }, 500);
  };

  const currentModeMeta = LOGIC_MODES.find(m => m.id === mode);

  return (
    <div className="page-wrap" style={{ maxWidth: '1000px' }}>
      <div className="page-header">
        <span className="page-label">Electional Module</span>
        <h1 className="page-title">The Chronos Finder</h1>
      </div>

      <div className="dashboard-grid">
        {/* Left: Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Search Parameters</h2>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="section-label" style={{ marginBottom: '0.75rem' }}>Inquiry Focus</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {LOGIC_MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`btn ${mode === m.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ justifyContent: 'flex-start', padding: '0.75rem' }}
                  >
                    <UiIcon name={m.icon} size={14} style={{ marginRight: 8 }} color={mode === m.id ? 'white' : m.color} />
                    <span style={{ fontSize: '0.75rem' }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="section-label" style={{ marginBottom: '0.75rem' }}>Search Window</label>
              <select 
                value={rangeDays} 
                onChange={e => setRangeDays(Number(e.target.value))}
                className="input-field"
                style={{ background: 'var(--bg-deep)' }}
              >
                <option value={7}>Next 7 Days</option>
                <option value={14}>Next 2 Weeks</option>
                <option value={30}>Next 30 Days</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1rem' }} 
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? 'Consulting the Spheres...' : 'Search for Auspicious Time'}
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <strong>Traditional Electional Logic.</strong> This engine scans for windows where the Moon is waxing and free from affliction, and where the specific planetary significators for your goal are bolstered by harmonic aspects.
            </p>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          {!results && !scanning && (
            <div className="empty-state" style={{ minHeight: '300px' }}>
              <UiIcon name="refresh" size={32} color="var(--border)" style={{ marginBottom: '1rem' }} />
              <p>Define your focus and window to begin the search.</p>
            </div>
          )}

          {scanning && (
            <div className="empty-state" style={{ minHeight: '300px' }}>
              <div className="spinner" style={{ marginBottom: '1.5rem' }} />
              <p style={{ letterSpacing: '0.1em', fontSize: '0.8rem', textTransform: 'uppercase' }}>Calculating Harmonics...</p>
            </div>
          )}

          {results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1rem', margin: 0 }}>Scan Results: {currentModeMeta.label}</h3>
                <span className="pill" style={{ background: 'var(--bg-deep)', fontSize: '0.7rem' }}>{rangeDays} Day Window</span>
              </div>

              <div className="election-timeline" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {results.map((r, i) => (
                  <div key={i} className="card" style={{ 
                    padding: '1rem 1.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1.5rem',
                    borderLeft: `4px solid ${r.score > 70 ? 'var(--harmonic)' : (r.score < 40 ? 'var(--tense)' : 'var(--border)')}`,
                    opacity: r.score < 30 ? 0.6 : 1
                  }}>
                    <div style={{ width: '80px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                        {r.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700 }}>
                        {r.date.getDate()} {r.date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {r.reasons.map((res, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-deep)', padding: '2px 8px', borderRadius: '4px' }}>
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Potency</div>
                      <div style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 900, 
                        color: r.score > 70 ? 'var(--harmonic)' : (r.score < 40 ? 'var(--tense)' : 'var(--text-primary)') 
                      }}>
                        {r.score}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
