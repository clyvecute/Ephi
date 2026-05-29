import { useState, useMemo } from 'react';
import { useNatal } from '../hooks/useNatal';
import { getPlanetPositions, getZodiacInfo, PLANET_META } from '../lib/ephemeris';
import { getActiveAspects } from '../lib/aspects';
import { UiIcon } from '../components/EphiIcons';
import { useToast } from '../components/Toast';
import EphiMarkdown from '../components/EphiMarkdown';
import ChartWheel from '../components/AstroChartWheel.jsx';
import { generateReading } from '../lib/oracle';
import { useAuth } from '../contexts/AuthContext';
import { getPanchanga, getHora, getChoghadiya, getKalaStatus } from '../lib/jyotish/panchanga.js';
import { scoreMuhurta } from '../lib/jyotish/muhurta.js';
import { getSunriseSunset, getPrecisionPositions } from '../lib/swe.js';

async function scoreJyotishMoment(date, lat, lon, sunriseMins, sunsetMins, purpose, natalData) {
  const positions = await getPrecisionPositions(date, { sidereal: true });
  const sunLon    = positions.sun.longitude;
  const moonLon   = positions.moon.longitude;

  const panchanga  = getPanchanga(sunLon, moonLon, date);
  const hora       = getHora(date, sunriseMins, sunsetMins);
  const choghadiya = getChoghadiya(date, sunriseMins, sunsetMins);
  const kala       = getKalaStatus(date, sunriseMins, sunsetMins);

  return scoreMuhurta(panchanga, hora, choghadiya, kala, purpose, natalData);
}

const LOGIC_MODES = [
  { id: 'general',  label: 'General Vitality', icon: 'fourstar', color: 'var(--accent)', desc: 'Optimizing overall health, energy level, and daily tasks.' },
  { id: 'love',     label: 'Love & Attraction', icon: 'sparkle',  color: 'var(--harmonic)', desc: 'Bolstering romance, proposals, dates, and emotional bonding.' },
  { id: 'business', label: 'Business & Launch',  icon: 'gear',     color: 'var(--accent-subtle)', desc: 'Seeding business starts, signings, investments, and product launches.' },
  { id: 'spirit',   label: 'Ritual & Insight',  icon: 'pin',      color: 'var(--harmonic-dark)', desc: 'Ideal for meditation, esoteric studies, ritual work, and wisdom.' },
];

/**
 * Refined Electional Scoring Logic
 */
// Mode-specific weights for planets
const MODE_BENEFICS = {
  general:  ['jupiter', 'venus'],
  love:     ['venus', 'moon'],
  business: ['jupiter', 'saturn', 'mercury'],
  spirit:   ['moon', 'neptune', 'jupiter'],
};
const MODE_MALEFICS = {
  general:  ['saturn', 'mars'],
  love:     ['saturn', 'mars'],
  business: ['mars', 'neptune'],
  spirit:   ['saturn', 'mars'],
};

function getLon(val) {
  return typeof val === 'object' ? val?.longitude : val;
}

function isVoidOfCourse(moonLon, positions) {
  // Moon is Void of Course when it makes no more major aspects
  // before leaving its current sign.
  const moonDegInSign = moonLon % 30;
  const degreesLeft = 30 - moonDegInSign;
  const ASPECT_ANGLES = [0, 60, 90, 120, 180];
  const ORB = 1;
  const otherPlanets = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (const planet of otherPlanets) {
    const pLon = getLon(positions[planet]);
    if (pLon == null) continue;
    for (const angle of ASPECT_ANGLES) {
      for (let target = moonLon; target < moonLon + degreesLeft; target += 0.5) {
        const dist = Math.abs(((target - pLon) % 360 + 360) % 360);
        const orb = Math.min(dist, 360 - dist);
        if (Math.abs(orb - angle) < ORB) return false;
      }
    }
  }
  return true;
}

function scoreMoment(positions, mode, natal) {
  const aspects   = getActiveAspects(positions);
  const tn        = natal ? getActiveAspects(positions, natal?.positions || {}) : [];

  let score = 50;
  const reasons  = [];
  const warnings = [];

  const moonLon = getLon(positions['moon']);
  const sunLon  = getLon(positions['sun']);

  // 1. Void of Course Moon (most important — hard block on all elections)
  if (isVoidOfCourse(moonLon, positions)) {
    score -= 35;
    warnings.push('⚠ Void of Course Moon — avoid all elections');
  }

  // 2. Mercury Retrograde
  const mercVal = positions['mercury'];
  const mercRx  = typeof mercVal === 'object' && mercVal?.retrograde;
  if (mercRx && (mode === 'business' || mode === 'general')) {
    score -= 20;
    warnings.push('⚠ Mercury Retrograde — avoid contracts/communications');
  }

  // 3. Moon Phase
  const phaseAngle = ((moonLon - sunLon) % 360 + 360) % 360;
  if (phaseAngle < 45) {
    score -= 5;  reasons.push('New Moon — beginnings only');
  } else if (phaseAngle < 180) {
    score += 12; reasons.push('Waxing Moon ✓');
  } else if (phaseAngle < 225) {
    score += 5;  reasons.push('Full Moon — culmination');
  } else {
    score -= 8;  reasons.push('Waning Moon — avoid new starts');
  }

  // 4. Mode-specific benefic/malefic planets
  const benefics = MODE_BENEFICS[mode] || ['jupiter', 'venus'];
  const malefics = MODE_MALEFICS[mode] || ['saturn', 'mars'];

  for (const planet of benefics) {
    const harmonic = aspects.find(a =>
      (a.transitPlanet === planet || a.natalPlanet === planet) &&
      (a.nature === 'harmonic' || a.nature === 'soft')
    );
    if (harmonic) {
      score += 12;
      reasons.push(`${planet[0].toUpperCase() + planet.slice(1)} well-aspected ✓`);
    }
  }

  for (const planet of malefics) {
    const tense = aspects.find(a =>
      (a.transitPlanet === planet || a.natalPlanet === planet) &&
      (a.nature === 'tense' || a.nature === 'hard')
    );
    if (tense) {
      score -= 10;
      reasons.push(`${planet[0].toUpperCase() + planet.slice(1)} friction ✗`);
    }
  }

  // 5. Natal transit bonus
  const natalHarmonic = tn.filter(a => a.nature === 'harmonic' || a.nature === 'soft').length;
  const natalTense    = tn.filter(a => a.nature === 'tense'    || a.nature === 'hard').length;
  score += (natalHarmonic * 4) - (natalTense * 5);

  // 6. Overall sky quality
  const hard = aspects.filter(a => a.nature === 'tense' || a.nature === 'hard').length;
  const soft = aspects.filter(a => a.nature === 'harmonic' || a.nature === 'soft').length;
  score += (soft * 1.5) - (hard * 2);

  return {
    score:    Math.min(Math.max(Math.round(score), 0), 100),
    reasons:  [...warnings, ...reasons].slice(0, 5),
    warnings: warnings.length > 0,
  };
}

export default function ElectionalPage() {
  const { currentUser } = useAuth();
  const { natalChart } = useNatal();
  const [mode, setMode] = useState('general');
  const [rangeDays, setRangeDays] = useState(14);
  const [userQuestion, setUserQuestion] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  
  // AI synthesis states
  const [synthesizing, setSynthesizing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  
  const toast = useToast();

  // Perform highly accurate async scan
  const handleScan = async () => {
    setScanning(true);
    setResults(null);
    setAiAnalysis('');
    setSelectedIdx(0);

    try {
      const start = new Date();
      const output = [];
      
      for (let i = 0; i < rangeDays; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        
        // Scan noon slot for optimal average daily positions
        const testDate = new Date(d);
        testDate.setHours(12, 0, 0, 0);

        // Fetch actual physical coordinates
        const positions = await getPlanetPositions(testDate);
        const momentScore = scoreMoment(positions, mode, natalChart);

        // Jyotish Muhurta
        const lat = natalChart?.meta?.lat || 0;
        const lon = natalChart?.meta?.lon || 0;
        const { sunriseMins, sunsetMins } = await getSunriseSunset(testDate, lat, lon);
        const jyotishScore = await scoreJyotishMoment(testDate, lat, lon, sunriseMins, sunsetMins, mode, natalChart);

        output.push({
          date: testDate,
          positions,
          ...momentScore,
          jyotish: jyotishScore
        });
      }

      setResults(output);
      toast(`Successfully analyzed ${rangeDays} cosmic windows.`);
    } catch (err) {
      console.error(err);
      toast('Scan failed: check network/ephemeris.');
    } finally {
      setScanning(false);
    }
  };

  // Compile displayed results (Top peak search vs Chronological timeline)
  const displayedResults = useMemo(() => {
    if (!results) return [];
    
    // For large scopes, pick distinct peaks separated by at least 7 days
    if (rangeDays >= 90) {
      const sorted = [...results].sort((a, b) => b.score - a.score);
      const filtered = [];

      for (const item of sorted) {
        const isTooClose = filtered.some(f => {
          const diffTime = Math.abs(f.date.getTime() - item.date.getTime());
          const diffDays = diffTime / (1000 * 60 * 60 * 24);
          return diffDays < 7; // Must be spaced out by at least 7 days
        });

        if (!isTooClose) {
          filtered.push(item);
        }

        if (filtered.length >= 12) break;
      }

      // Re-sort chronologically so timeline is structured properly
      return filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    
    return results; // chronological for shorter periods
  }, [results, rangeDays]);

  // Run AI analysis for the selected day
  const handleAiSynthesis = async () => {
    if (!selectedMoment) return;
    setSynthesizing(true);
    setAiAnalysis('');

    const placementsText = Object.entries(selectedMoment.positions).map(([key, val]) => {
      const meta = PLANET_META[key];
      const z = getZodiacInfo(val);
      const isRx = val?.retrograde ? ' (Retrograde)' : '';
      return `${meta?.label ?? key}: ${z?.displayStr}${isRx}`;
    }).join(', ');

    // Calculate Moon Phase name dynamically
    const moonLon = selectedMoment.positions['moon']?.longitude ?? 0;
    const sunLon = selectedMoment.positions['sun']?.longitude ?? 0;
    const phaseAngle = (moonLon - sunLon + 360) % 360;
    let moonPhaseName = '';
    if (phaseAngle < 22.5 || phaseAngle >= 337.5) moonPhaseName = 'New Moon';
    else if (phaseAngle < 67.5) moonPhaseName = 'Waxing Crescent';
    else if (phaseAngle < 112.5) moonPhaseName = 'First Quarter';
    else if (phaseAngle < 157.5) moonPhaseName = 'Waxing Gibbous';
    else if (phaseAngle < 202.5) moonPhaseName = 'Full Moon';
    else if (phaseAngle < 247.5) moonPhaseName = 'Waning Gibbous';
    else if (phaseAngle < 292.5) moonPhaseName = 'Last Quarter';
    else moonPhaseName = 'Waning Crescent';

    // Calculate details for prompt
    const potencyScore = selectedMoment.score;
    const assets = selectedMoment.reasons.join(', ');
    const aspectCount = selectedMomentAspects.length;

    const dateStr = selectedMoment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const query = `ELECTIONAL ASTROLOGICAL INQUIRY:
Focus Area: ${currentModeMeta.label}
Target Date: ${dateStr}
Custom Launch Intent: "${userQuestion || 'General daily task launch'}"
Ephi Potency Score: ${potencyScore}%
Jyotish Muhurta Score: ${selectedMoment.jyotish.score}%
Core Scoring Assets: ${assets || 'Neutral baseline'}
Jyotish Factors: ${selectedMoment.jyotish.reasons.map(r => r.factor).join(', ') || 'Neutral'}

PLANETARY COORDINATES:
${placementsText}
Active Moon Phase: ${moonPhaseName}
Geometric Aspect Count: ${aspectCount} lines active

CRITICAL PRESENTATION INSTRUCTIONS:
1. You MUST align your astrological judgment strictly with the calculated Ephi Potency Score of ${potencyScore}%. If the score is high (e.g. >70%), be encouraging and highlight the cosmic support. If the score is low (e.g. <50%), clearly caution the user about obstacles and recommend remedies or safer alternative times.
2. DO NOT use ANY markdown heading symbols (such as '#' or '##') in your response! Instead, separate paragraphs using clean capital bold labels like '**THE COSMIC VERDICT**', '**STELLAR SHADOWS & CHALLENGES**', or '**TACTICAL OBSERVATORY PATHWAY**'.
3. Provide a highly profound, technical, and elegant astrological analysis (around 300 words). Incorporate the exact planetary transits, the active moon phase (${moonPhaseName}), the specific retrograde planets (if any), and active aspects to explain *why* this moment fits their launch intent. Avoid generic horary clichés. Address the user directly.`;

    try {
      const res = await generateReading({
        natal: natalChart || { positions: {} },
        aspects: selectedMomentAspects,
        focus: mode,
        userName: currentUser?.displayName || 'Seeker',
        userQuery: query,
        mode: 'transit'
      });
      
      setAiAnalysis(res.text);
      toast('The Oracle has spoken.');
    } catch (err) {
      console.error(err);
      toast('Failed to channel the AI Oracle: ' + err.message);
    } finally {
      setSynthesizing(false);
    }
  };

  const currentModeMeta = LOGIC_MODES.find(m => m.id === mode);
  const selectedMoment = displayedResults ? displayedResults[selectedIdx] : null;

  // Dynamically compute aspect lines for the selected moment!
  const selectedMomentAspects = useMemo(() => {
    if (!selectedMoment?.positions) return [];
    return getActiveAspects(selectedMoment.positions);
  }, [selectedMoment]);

  // Build high-fidelity placements table list
  const placementsList = useMemo(() => {
    if (!selectedMoment?.positions) return [];
    return Object.entries(selectedMoment.positions)
      .map(([key, val]) => {
        const meta = PLANET_META[key];
        if (!meta) return null;
        const z = getZodiacInfo(val);
        return {
          key,
          label: meta.label,
          symbol: meta.symbol,
          color: meta.color,
          zodiac: z,
          retrograde: val?.retrograde || (val?.speed != null && val.speed < 0)
        };
      })
      .filter(Boolean);
  }, [selectedMoment]);

  return (
    <div className="page-wrap" style={{ maxWidth: '1200px', padding: '4rem 2rem' }}>
      <div className="page-header" style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <span className="section-label">Electional Module</span>
        <h1 className="page-title" style={{ fontSize: '3rem', fontFamily: 'var(--font-serif)', marginBottom: '0.75rem' }}>The Chronos Finder</h1>
        <p className="page-subtitle" style={{ opacity: 0.7, maxWidth: '600px', margin: '0 auto' }}>
          Pinpoint highly auspicious moments for launches, contracts, or rituals by scanning local time windows against stellar harmonics.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '3rem', alignItems: 'start' }}>
        
        {/* Left Panel: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="ephi-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
              <UiIcon name="gear" size={20} color="var(--accent)" />
              <h2 style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.05em' }}>Search Parameters</h2>
            </div>
            
            {/* Custom Intent */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                1. What are you launching?
              </label>
              <input 
                type="text"
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                placeholder="e.g. Launching my SaaS startup, proposing..."
                style={{ 
                  width: '100%', 
                  background: 'var(--bg-deep)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  color: 'var(--text-primary)', 
                  outline: 'none', 
                  fontSize: '0.85rem' 
                }}
              />
            </div>

            {/* Inquiry Focus */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                2. Inquiry Focus
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {LOGIC_MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setAiAnalysis(''); }}
                    className={`card ${mode === m.id ? 'active' : ''}`}
                    style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      background: mode === m.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                      borderColor: mode === m.id ? 'var(--accent)' : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <UiIcon name={m.icon} size={14} color={mode === m.id ? 'var(--accent)' : 'var(--text-muted)'} />
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: mode === m.id ? '#fff' : 'var(--text-secondary)' }}>{m.label}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Window */}
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                3. Scan Horizon
              </label>
              <select 
                value={rangeDays} 
                onChange={e => { setRangeDays(Number(e.target.value)); setAiAnalysis(''); }}
                style={{ 
                  width: '100%', 
                  background: '#121218', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  padding: '12px', 
                  color: '#ffffff', 
                  outline: 'none',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
                  fontWeight: 600
                }}
              >
                <option value={7} style={{ background: '#121218', color: '#ffffff' }}>Next 7 Days</option>
                <option value={14} style={{ background: '#121218', color: '#ffffff' }}>Next 2 Weeks</option>
                <option value={30} style={{ background: '#121218', color: '#ffffff' }}>Next 30 Days</option>
                <option value={90} style={{ background: '#121218', color: '#ffffff' }}>Next 90 Days (Peak Search)</option>
                <option value={180} style={{ background: '#121218', color: '#ffffff' }}>Next 180 Days (Peak Search)</option>
                <option value={365} style={{ background: '#121218', color: '#ffffff' }}>Next 365 Days (Peak Search)</option>
              </select>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 700 }} 
              onClick={handleScan}
              disabled={scanning}
            >
              {scanning ? 'Consulting the Spheres...' : 'Calculate Auspicious Times'}
            </button>
          </div>

          <div className="ephi-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.01)', borderLeft: '4px solid var(--accent)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              <strong>Rigid Planetary Logic:</strong> The engine scores waxing cycles, verifies that Mercury is Direct for launches, and confirms your mode significators are bolstered.
            </p>
          </div>
        </div>

        {/* Right Panel: Results & Interactive Observatory */}
        <div style={{ minWidth: 0 }}>
          {!results && !scanning && (
            <div className="ephi-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <UiIcon name="refresh" size={36} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Define your launch intent and click parameter scan to begin.</p>
            </div>
          )}

          {scanning && (
            <div className="ephi-card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <div className="spinner" style={{ marginBottom: '1.5rem' }} />
              <p style={{ letterSpacing: '0.15em', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--accent)' }}>Calculating Cosmic Alignment...</p>
            </div>
          )}

          {results && selectedMoment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Auspicious Timeline List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1rem', margin: 0, fontWeight: 700, letterSpacing: '0.05em' }}>
                    {rangeDays >= 90 ? '1. Top Auspicious Moments (Peak Sorted)' : '1. Scanned Potency Windows (Timeline)'}
                  </h3>
                  <span className="pill" style={{ background: 'var(--bg-deep)', fontSize: '0.65rem' }}>
                    {rangeDays >= 90 ? 'Top 12 Peaks Spaced Out' : `${rangeDays} Days Horizon`}
                  </span>
                </div>

                {/* Timeline Grid Scrollable */}
                <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                  {displayedResults.map((r, idx) => (
                    <button 
                      key={idx}
                      onClick={() => { setSelectedIdx(idx); setAiAnalysis(''); }}
                      style={{
                        flex: '0 0 110px',
                        background: selectedIdx === idx ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                        border: selectedIdx === idx ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '1.25rem 0.75rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                    >
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                        {r.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
                        {r.date.getDate()} {r.date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      
                      {/* Potency score bar */}
                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: 900,
                        color: r.score > 70 ? 'var(--harmonic)' : (r.score < 40 ? 'var(--tense)' : 'var(--text-primary)')
                      }}>
                        {r.score}%
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {r.score > 70 ? 'Optimal' : (r.score < 40 ? 'Weak' : 'Moderate')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Austere Observatory: Chart and placements */}
              <div className="ephi-card" style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '2rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', margin: 0, fontFamily: 'var(--font-serif)', color: '#fff' }}>
                      Selected Observatory moment
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.25rem 0 0' }}>
                      {selectedMoment.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '2rem', textAlign: 'right' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Western Score</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: selectedMoment.score > 70 ? 'var(--harmonic)' : 'var(--text-primary)' }}>
                        {selectedMoment.score}%
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Jyotish Muhurta</span>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: selectedMoment.jyotish.score > 70 ? 'var(--harmonic)' : 'var(--text-primary)' }}>
                        {selectedMoment.jyotish.score}%
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '3rem', alignItems: 'start' }}>
                  
                  {/* Astronomical Chart Wheel with dynamic aspects enabled! */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
                    <div style={{ width: '100%', maxWidth: '380px' }}>
                      <ChartWheel 
                        natal={{ positions: selectedMoment.positions, ascendant: 0 }} 
                        aspects={selectedMomentAspects}
                        size={380} 
                        mode="natal" 
                      />
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Solar/Flat Horizon Map (0° Aries Ascendant)
                    </span>
                  </div>

                  {/* Placements Overview */}
                  <div>
                    <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Placements Overview
                    </h4>
                    
                    <div style={{ 
                      maxHeight: '340px', 
                      overflowY: 'auto', 
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      background: 'var(--bg-deep)'
                    }}>
                      {placementsList.map(p => (
                        <div key={p.key} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '10px 14px', 
                          borderBottom: '1px solid var(--border)' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ color: p.color, fontSize: '1rem' }}>{p.symbol}</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.label}</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textAlign: 'right' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              {p.zodiac?.displayStr}
                            </span>
                            {p.retrograde && (
                              <span style={{ 
                                fontSize: '0.55rem', 
                                background: 'rgba(235, 94, 85, 0.1)', 
                                border: '1px solid rgba(235, 94, 85, 0.3)', 
                                color: 'var(--tense)',
                                padding: '2px 4px', 
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                fontWeight: 800
                              }}>
                                Rx
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* AI Synthesis segment */}
                <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed var(--border)' }}>
                  {!aiAnalysis && !synthesizing && (
                    <div style={{ textAlign: 'center' }}>
                      <button 
                        onClick={handleAiSynthesis}
                        className="btn btn-primary"
                        style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        <UiIcon name="sparkle" size={12} style={{ marginRight: 8 }} />
                        Synthesize Electional Oracle Reading
                      </button>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                        Translates these coordinates and your custom launch intent into a comprehensive electional judgment.
                      </p>
                    </div>
                  )}

                  {synthesizing && (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                      <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--accent)' }}>
                        Consulting Oracle for intent alignment...
                      </p>
                    </div>
                  )}

                  {aiAnalysis && (
                    <div style={{ background: 'var(--bg-deep)', border: '1px solid var(--border)', borderRadius: '16px', padding: '2rem', animation: 'ephi-fade-in 0.3s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        <UiIcon name="sparkle" size={16} color="var(--accent)" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                          Oracle Judgement & Advisory
                        </span>
                      </div>
                      <EphiMarkdown text={aiAnalysis} />
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
