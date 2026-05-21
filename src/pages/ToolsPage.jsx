import { Link } from 'react-router-dom';
import { UiIcon } from '../components/EphiIcons';

export default function ToolsPage() {
  const tools = [
    { 
      path: '/chronos', 
      name: 'Chronos (Time Finder)', 
      tag: 'Beginner Friendly',
      desc: 'Electional astrology is the art of choosing the perfect moment. Tell Chronos what you are planning to do, and it will scan the calendar to find the most mathematically supportive date and time based on planetary alignments.',
      useCase: 'Best for: Planning weddings, business launches, or signing important contracts.',
      icon: 'refresh' 
    },
    { 
      path: '/horary', 
      name: 'Sacred Inquiry (Horary)', 
      tag: 'Advanced',
      desc: 'Instead of looking at your birth chart, Horary astrology casts a chart for the exact moment you ask a burning question. The AI Oracle acts as a traditional diviner to give you a highly specific answer based on the current sky.',
      useCase: 'Best for: "Where did I lose my ring?" or "Will I get this promotion?"',
      icon: 'pin' 
    },
    { 
      path: '/returns', 
      name: 'Return Charts', 
      tag: 'Intermediate',
      desc: 'A Solar Return chart is cast every year on your birthday, providing a unique "theme" for the upcoming year of your life. Lunar Returns happen every month for emotional forecasting.',
      useCase: 'Best for: Planning your year ahead right around your birthday.',
      icon: 'sparkle' 
    },
    { 
      path: '/transit-calendar', 
      name: 'Transit Calendar', 
      tag: 'Intermediate',
      desc: 'Calculates the exact minute transits cross into orbs or become exact against your natal coordinates. Day-grouped timeline mapping out all planetary opportunities and warnings.',
      useCase: 'Best for: Timing big initiatives and spotting major energetic windows.',
      icon: 'star' 
    },
    { 
      path: '/progressions', 
      name: 'Secondary Progressions', 
      tag: 'Advanced',
      desc: 'One symbolic day of planetary motion equals one year of human life. Tracks the slow maturation and shifting priorities of your natal soul blueprint across your lifespan.',
      useCase: 'Best for: Understanding long-term internal cycles and soul evolution.',
      icon: 'sparkle' 
    },
    { 
      path: '/bazi', 
      name: 'Four Pillars (Bazi)', 
      tag: 'Specialist',
      desc: 'An ancient Chinese destiny analysis system based on the elements (Wood, Fire, Earth, Metal, Water) present at your birth. Focuses heavily on career, wealth cycles, and structural life balance.',
      useCase: 'Best for: Understanding your structural energy and multi-year luck pillars.',
      icon: 'star' 
    },
    { 
      path: '/vedic', 
      name: 'Vedic Astrology (Jyotish)', 
      tag: 'Specialist',
      desc: 'The traditional astrological system of India. It uses the sidereal zodiac (the actual, current position of the constellations) and highly specific planetary periods (Dashas) to predict major life events.',
      useCase: 'Best for: Highly predictive, concrete event forecasting.',
      icon: 'star' 
    },
    { 
      path: '/hellenistic', 
      name: 'Traditional Western', 
      tag: 'Intermediate',
      desc: 'Strips away modern psychological astrology to look at the ancient Greek rules (Sect, Essential Dignities, Bounds). It treats the chart not just as your personality, but as objective events in your life.',
      useCase: 'Best for: Hardline, traditional analysis of fate and circumstance.',
      icon: 'sparkle' 
    },
    { 
      path: '/alerts', 
      name: 'Cosmic Alerts', 
      tag: 'Utility',
      desc: 'Configure background tracking. Ephi will silently monitor the sky and send you a notification when a major transit (like Saturn crossing your Ascendant) is about to happen.',
      useCase: 'Best for: Never missing a massive astrological shift in your life.',
      icon: 'warning' 
    },
  ];

  return (
    <div className="page-wrap">
      <div className="page-header" style={{ marginBottom: '3rem' }}>
        <span className="page-label">Grimoire & Utilities</span>
        <h1 className="page-title">The Tools Archive</h1>
        <p className="page-subtitle" style={{ maxWidth: '600px', lineHeight: 1.6 }}>
          Astrology is a vast discipline. While the Dashboard handles your daily transits, this archive contains specialized calculators and ancient techniques. 
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', paddingBottom: '4rem' }}>
        {tools.map((t) => (
          <Link key={t.path} to={t.path} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="ephi-card" style={{ 
              height: '100%', 
              display: 'flex',
              flexDirection: 'column',
              padding: '1.5rem',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
              cursor: 'pointer',
              border: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    background: 'var(--bg-deep)', 
                    padding: '8px', 
                    borderRadius: '8px',
                    color: 'var(--accent)',
                    display: 'flex'
                  }}>
                    <UiIcon name={t.icon} size={20} />
                  </div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', margin: 0 }}>{t.name}</h3>
                </div>
              </div>
              
              <div style={{ 
                display: 'inline-block', 
                fontSize: '0.7rem', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                color: t.tag === 'Beginner Friendly' ? '#5CB87A' : 'var(--text-muted)',
                marginBottom: '1rem',
                fontWeight: 600
              }}>
                {t.tag}
              </div>

              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6, margin: '0 0 1rem 0', flex: 1 }}>
                {t.desc}
              </p>

              <div style={{ 
                background: 'var(--bg-deep)', 
                padding: '0.75rem 1rem', 
                borderRadius: '6px',
                borderLeft: '2px solid var(--accent)',
                fontSize: '0.85rem',
                color: 'var(--text-primary)'
              }}>
                <i>{t.useCase}</i>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <style>{`
        .ephi-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 12px 32px rgba(0,0,0,0.12); 
          border-color: var(--accent);
        }
      `}</style>
    </div>
  );
}
