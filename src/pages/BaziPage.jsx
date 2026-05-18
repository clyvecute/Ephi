import { useMemo } from 'react';
import { useNatal } from '../hooks/useNatal.js';
import { calculateBaZi, getCurrentBazi } from '../lib/bazi.js';
import { analyzeBazi } from '../lib/baziInterpretations.js';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';

export default function BaziPage() {
  const { natalChart } = useNatal();

  const bazi = useMemo(() => {
    if (!natalChart) return null;
    const { meta } = natalChart;
    const d = new Date(meta.date + 'T' + meta.time);
    return calculateBaZi(d, meta.gender || 'male');
  }, [natalChart]);

  const analysis = useMemo(() => {
    if (!bazi) return null;
    return analyzeBazi(bazi);
  }, [bazi]);

  const currentPillars = useMemo(() => getCurrentBazi(), []);

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

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Metaphysical Synthesis</span>
        <h1 className="page-title">BaZi: Destiny & Cycles</h1>
        <p className="page-subtitle">A layered analysis of your energetic blueprint, from surface interactions to hidden roots.</p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Natal Pillars */}
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

          {/* Professional Life Report */}
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

          {/* Ten Gods Mapping */}
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

          {/* Luck Pillars (10-Year Cycles) */}
          <div className="card">
            <div className="card-title">Luck Pillars (Da Yun)</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              These 10-year cycles represent the changing tides of your life's path. Each pillar activates different elements of your natal potential.
            </p>
            <div className="bazi-luck-scroll">
              {bazi.luckPillars.map((lp, idx) => (
                <div key={idx} className="bazi-luck-card">
                  <div className="bazi-luck-age">AGE {lp.age}+</div>
                  <div className="bazi-luck-char">{lp.pillar.label}</div>
                  <div className="bazi-luck-desc">{lp.pillar.element} {lp.pillar.animal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Forecasting */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Current Year Forecast */}
          <div className="card" style={{ border: '1px solid var(--accent)', background: 'var(--accent-subtle)' }}>
            <div className="card-title" style={{ fontSize: '0.85rem', color: 'var(--accent-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UiIcon name="sparkle" size={14} /> Current Year: {new Date().getFullYear()}
            </div>
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{currentPillars.year.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--accent-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{currentPillars.year.element} {currentPillars.year.animal} Year</div>
            </div>
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(201,160,220,0.2)', paddingTop: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>How it affects you:</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {bazi.day.element.includes(currentPillars.year.element.replace(/[+-]/g, ''))
                  ? "This year reinforces your natal elements, bringing strength and stability."
                  : "This year brings contrasting energies, demanding flexibility and internal balance."}
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-title" style={{ fontSize: '0.85rem' }}>Pillar Symbolism</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
              <InsightItem title="Stems (Surface)" text="Represent your external world, public personality, and visible actions. This is what the world sees." />
              <InsightItem title="Branches (Internal)" text="Represent your internal state, health, and deep physical vitality. This is your core being." />
              <InsightItem title="Hidden Roots (Essence)" text="Represent your dormant potential and unseen motivations. These only surface during specific life cycles." />
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
    
    {/* Stem (Surface) */}
    <div className="bazi-stem-wrap">
      <div className="bazi-stem-char">{p.stem}</div>
      <div className="bazi-god-label">{tg.label}</div>
    </div>

    {/* Branch (Internal) */}
    <div className="bazi-branch-wrap">
      <div className="bazi-branch-char">{p.animal}</div>
      <div className="bazi-branch-el">{p.element}</div>
    </div>

    {/* Hidden Roots (The Roots) */}
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
