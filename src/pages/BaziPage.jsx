import { useState, useEffect } from 'react';
import { useNatal } from '../hooks/useNatal.js';
import { calculateBaZi, getCurrentBazi } from '../lib/bazi.js';
import { analyzeBazi } from '../lib/baziInterpretations.js';
import { birthDataToDate } from '../lib/natal.js';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';

export default function BaziPage() {
  const { natalChart } = useNatal();
  const [bazi, setBazi] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [currentPillars, setCurrentPillars] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!natalChart?.meta) {
      setBazi(null);
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const { meta } = natalChart;
        const localDate = birthDataToDate(meta);
        const lon = meta.lon ?? meta.lng ?? 0;
        const utcOffset = meta.utcOffset ?? 0;
        const chart = await calculateBaZi(localDate, meta.gender || 'male', lon, utcOffset);
        if (cancelled) return;
        setBazi(chart);
        setAnalysis(analyzeBazi(chart));
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'BaZi calculation failed.');
          setBazi(null);
          setAnalysis(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [natalChart]);

  useEffect(() => {
    getCurrentBazi().then(setCurrentPillars).catch(() => setCurrentPillars(null));
  }, []);

  if (!natalChart) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <span className="page-label">Chinese Metaphysics</span>
          <h1 className="page-title">BaZi: Four Pillars</h1>
        </div>
        <div className="empty-state" style={{ paddingTop: '5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}><UiIcon name="sparkle" size={40} color="var(--accent)" /></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            To calculate your Four Pillars of Destiny,
            <br />please first set your birth data in the Dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <span className="page-label">Chinese Metaphysics</span>
          <h1 className="page-title">BaZi: Four Pillars</h1>
        </div>
        <div className="empty-state" style={{ paddingTop: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Calculating solar-term pillars…</p>
        </div>
      </div>
    );
  }

  if (error || !bazi || !analysis) {
    return (
      <div className="page-wrap">
        <div className="page-header">
          <span className="page-label">Chinese Metaphysics</span>
          <h1 className="page-title">BaZi: Four Pillars</h1>
        </div>
        <div className="empty-state" style={{ paddingTop: '4rem', color: 'var(--tense)' }}>
          {error || 'Unable to compute BaZi chart.'}
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Metaphysical Synthesis</span>
        <h1 className="page-title">BaZi: Destiny & Cycles</h1>
        <p className="page-subtitle">Solar-term month pillar, TLST hour pillar, and luck cycles via Swiss Ephemeris.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div className="bazi-pillar-label" style={{ marginBottom: '0.5rem' }}>Natal Destiny Chart</div>
              <h2 className="page-title" style={{ fontSize: '1.75rem', margin: 0 }}>The Four Pillars</h2>
            </div>
            <div className="bazi-pillars-grid">
              {analysis.tenGods.map((tg, i) => (
                <PillarCard
                  key={i}
                  type={tg.type}
                  p={tg.pillar}
                  tg={tg}
                  isDayMaster={tg.type === 'Day'}
                />
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div className="card-title" style={{ margin: 0 }}>Professional Destiny Report</div>
              <span className="pill" style={{ background: 'var(--accent)', color: '#fff' }}>Expert Analysis</span>
            </div>
            <div className="bazi-report-grid">
              {Object.entries(analysis.professionalReport).map(([key, text]) => (
                <div key={key} className="bazi-report-item">
                  <div className="bazi-report-label">{key}</div>
                  <p className="bazi-report-text">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">Ten Gods Mapping (Shi Shen)</div>
            <div className="bazi-table-wrap">
              <table className="bazi-table">
                <thead>
                  <tr>
                    <th>Pillar</th>
                    <th style={{ color: 'var(--accent)' }}>Ten God</th>
                    <th>Metaphysical Role</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.tenGods.map((tg, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{tg.type}</td>
                      <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{tg.label}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{tg.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Luck Pillars (Da Yun)</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Start age {bazi.startAge}y — {bazi.isForward ? 'forward' : 'reverse'} luck direction from solar-term distance.
            </p>
            <div className="bazi-luck-scroll">
              {bazi.luckPillars.map((lp, idx) => (
                <div key={idx} className="bazi-luck-card">
                  <div className="bazi-luck-age">AGE {lp.ageStart}–{lp.ageEnd}</div>
                  <div className="bazi-luck-char">{lp.pillar.label}</div>
                  <div className="bazi-luck-desc">{lp.pillar.element} {lp.pillar.animal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {currentPillars && (
            <div className="card" style={{ border: '1px solid var(--accent)', background: 'var(--accent-subtle)' }}>
              <div className="card-title" style={{ fontSize: '0.85rem', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UiIcon name="sparkle" size={14} /> Current Year: {new Date().getFullYear()}
              </div>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{currentPillars.year.label}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentPillars.year.element} {currentPillars.year.animal} Year</div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title" style={{ fontSize: '0.85rem' }}>Pillar Symbolism</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
              <InsightItem title="Stems (Surface)" text="Represent your external world, public personality, and visible actions." />
              <InsightItem title="Branches (Internal)" text="Represent your internal state, health, and deep physical vitality." />
              <InsightItem title="Hidden Roots (Essence)" text="Represent dormant potential — surfaced during specific luck cycles." />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const getPillarColor = (el) => {
  if (el.includes('Wood')) return '#4ade80';
  if (el.includes('Fire')) return '#f87171';
  if (el.includes('Earth')) return '#fbbf24';
  if (el.includes('Metal')) return '#94a3b8';
  if (el.includes('Water')) return '#60a5fa';
  return 'var(--border)';
};

const PillarCard = ({ type, p, tg, isDayMaster }) => (
  <div className={`bazi-pillar-card ${isDayMaster ? 'day-master' : ''}`} style={{ borderTopColor: getPillarColor(p.element) }}>
    <div className="bazi-pillar-label">{type}</div>
    <div className="bazi-stem-wrap">
      <div className="bazi-stem-char">{p.stem}</div>
      <div className="bazi-god-label">{tg.label}</div>
    </div>
    <div className="bazi-branch-wrap">
      <div className="bazi-branch-char">{p.animal}</div>
      <div className="bazi-branch-el">{p.element}</div>
    </div>
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
      <div className="bazi-hidden-label">Hidden Roots</div>
      <div className="bazi-hidden-grid">
        {tg.hidden?.map((h, i) => (
          <div key={i} className="bazi-hidden-item">
            <span className="bazi-hidden-char">{h.stem}</span>
            <span className="bazi-hidden-god">{h.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

function InsightItem({ title, text }) {
  return (
    <div>
      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}
