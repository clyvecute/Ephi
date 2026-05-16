import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NatalWheel } from '../components/AstroChartWheel.jsx';
import { UiIcon } from '../components/EphiIcons.jsx';
import { useAuth } from '../contexts/AuthContext';

// Dummy data for the "Live Sky" snapshot on homepage
const DUMMY_SKY = {
  sun: 40.5, moon: 120.2, mercury: 35.1, venus: 55.4, mars: 10.8,
  jupiter: 300.5, saturn: 315.2, uranus: 50.1, neptune: 345.5, pluto: 295.1
};

function BentoCard({ title, desc, sizeClass, imgUrl, children }) {
  return (
    <div className={`bento-card ${sizeClass}`} style={{ padding: 0, gap: 0, display: 'flex', flexDirection: 'column', aspectRatio: '1 / 1', minHeight: '300px' }}>
      {imgUrl && (
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center', background: '#050505', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)', flex: 1, alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <img src={imgUrl} alt="Bento Graphic" style={{ width: '110px', opacity: 0.8 }} />
        </div>
      )}
      <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', flex: 'none', height: '45%', justifyContent: 'center' }}>
        <h3 className="bento-title" style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }} dangerouslySetInnerHTML={{ __html: title }} />
        <p className="bento-desc" style={{ fontSize: '0.9rem', lineHeight: '1.5', margin: 0 }}>{desc}</p>
        {children}
      </div>
    </div>
  );
}

function StarryDecoderText({ text, delayOffset = 500 }) {
  const [revealedChars, setRevealedChars] = useState(0);
  const [tick, setTick] = useState(0);
  const chars = text.split('');
  const starSymbols = ['✦', '✧', '·', '*', '+', '°'];

  useEffect(() => {
    const to = setTimeout(() => {
      const int = setInterval(() => {
        setRevealedChars(prev => {
          if (prev >= chars.length) {
            clearInterval(int);
            return prev;
          }
          return prev + 1; 
        });
      }, 25);
      return () => clearInterval(int);
    }, delayOffset);
    return () => clearTimeout(to);
  }, [chars.length, delayOffset]);

  useEffect(() => {
    if (revealedChars >= chars.length) return;
    const int = setInterval(() => setTick(t => t + 1), 40);
    return () => clearInterval(int);
  }, [revealedChars, chars.length]);

  return (
    <p className="landing-paragraph" style={{ textAlign: 'center', minHeight: '80px' }}>
      {chars.map((char, i) => {
        if (char === ' ') return <span key={i}> </span>;

        let displayChar = char;
        let opacity = 1;
        let color = 'inherit';
        
        if (i < revealedChars) {
          displayChar = char;
        } else if (i < revealedChars + 8) { // Decoding tail length
          displayChar = starSymbols[(i + tick) % starSymbols.length];
          color = 'var(--accent)';
        } else {
          opacity = 0;
        }

        return (
          <span key={i} style={{ opacity, color, transition: 'color 0.1s ease' }}>
            {displayChar}
          </span>
        );
      })}
    </p>
  );
}

export default function Landing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loginWithGoogle } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [navSticky, setNavSticky] = useState(false);
  const heroRef = useRef(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleEnterApp = (e) => {
    if (!currentUser) {
      e.preventDefault();
      loginWithGoogle();
    } else {
      navigate('/dashboard');
    }
  };

  // When the hero section scrolls out of view, we add .is-sticky to the nav
  // to toggle the background opacity and reveal the brand/CTA.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setNavSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );
    if (heroRef.current) observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, []);

  const navLinks = [
    { to: '/dashboard', label: 'Transits' },
    { to: '/reading',   label: 'Reading'  },
    { to: '/synastry',  label: 'Synastry' },
    { to: '/horary',    label: 'Horary'   },
    { to: '/alerts',    label: 'Alerts'   },
    { to: '/tools',     label: 'Tools'    },
  ];

  return (
    <div className="landing-container">

      {/* ── SECTION 1: HERO ────────────────────────────────────── */}
      <section className="hero-section" ref={heroRef}>
        <p className="landing-small-sans">Modern astrology for the conscious soul</p>

        <h1 className="landing-huge-serif">ephi</h1>

        <StarryDecoderText 
          text="Unlock the wisdom of the stars. By integrating ancient techniques with modern insights, Ephi provides you with a clear, celestial roadmap for your journey." 
          delayOffset={300} 
        />

        <div className="scroll-indicator">
          <span className="scroll-text">SCROLL</span>
          <div className="scroll-line" />
        </div>
      </section>

      {/* ── NAV — native sticky below hero ── */}
      <nav className={`landing-nav${navSticky ? ' is-sticky' : ''}`}>
        <span className={`landing-nav-brand${navSticky ? ' visible' : ''}`}>
          ephi
        </span>
        <div className="landing-nav-links">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={currentUser ? to : '#'}
              onClick={(e) => {
                if (!currentUser) {
                  e.preventDefault();
                  loginWithGoogle();
                }
              }}
              className={`landing-nav-link${location.pathname === to ? ' active' : ''}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile Toggle Button */}
        <button className="landing-mobile-toggle" onClick={toggleMenu} aria-label="Toggle Menu">
          <UiIcon name="sparkle" size={24} />
        </button>

        <button
          onClick={handleEnterApp}
          className={`landing-nav-cta${navSticky ? ' visible' : ''}`}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          {currentUser ? 'Enter App →' : 'Login / Sign Up'}
        </button>
      </nav>

      {/* ── SECTION 2: BENTO FEATURES ──────────────────────────── */}
      <section className="landing-section">
        <span className="section-label">Celestial Tools</span>
        <div className="bento-grid">
          <BentoCard
            title="Natal Blueprint"
            desc="High-fidelity birth chart analysis using VSOP87 precision and traditional house systems."
            sizeClass="span-4"
            imgUrl="/cyber-icons/natal.png"
          >
            <div style={{ marginTop: 'auto', paddingTop: '2rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <UiIcon name="sparkle" size={16} /> Precision Astronomy
            </div>
          </BentoCard>

          <BentoCard
            title="Horary"
            desc="Ask the heavens a specific question."
            sizeClass="span-4"
            imgUrl="/cyber-icons/horary.png"
          />

          <BentoCard
            title="Celestial Connections"
            desc="Deep-dive synastry and composite charts to understand your relational geometry."
            sizeClass="span-4"
            imgUrl="/cyber-icons/synastry.png"
          />

          <BentoCard
            title="Vedic Jyotish"
            desc="Authentic sidereal D-1/D-9 charts, Nakshatras, and Vimshottari Dasha timelines."
            sizeClass="span-4"
            imgUrl="/cyber-icons/vedic.png"
          />

          <BentoCard
            title="Alerts"
            desc="Real-time notifications for exact transits."
            sizeClass="span-4"
            imgUrl="/cyber-icons/alerts.png"
          />

          <BentoCard
            title="Cycles"
            desc="Solar and Lunar return monitoring."
            sizeClass="span-4"
            imgUrl="/cyber-icons/cycles.png"
          />
        </div>
      </section>

      {/* ── SECTION 3: LIVE SKY ────────────────────────────────── */}
      <section className="sky-section">
        <div className="sky-content">
          <span className="section-label" style={{ color: '#c9a0dc' }}>Live Sky</span>
          <h2 className="sky-title">The heavens, in real-time.</h2>
          <p className="landing-paragraph" style={{ color: '#94a3b8', maxWidth: '400px' }}>
            Ephi computes planetary positions every 60 seconds. Observe the current
            geometry of the cosmos as it unfolds above you.
          </p>
          <button
            onClick={handleEnterApp}
            className="btn btn-primary"
            style={{ marginTop: '3rem', display: 'inline-block' }}
          >
            {currentUser ? 'Enter Dashboard' : 'Login to View Sky'}
          </button>
        </div>
        <div className="sky-wheel-wrap">
          <NatalWheel natal={DUMMY_SKY} size={500} />
        </div>
      </section>

      {/* ── SECTION 4: AI INSIGHTS ─────────────────────────────── */}
      <section className="ai-section">
        <div className="ai-container">
          <div className="chat-preview">
            <div className="chat-bubble bubble-user">What does my Mars in the 8th house mean for my career?</div>
            <div className="chat-bubble bubble-ai">
              Your Mars in the 8th suggests a drive for deep, transformative work.
              In the context of your Saturn return, this indicates a period of
              restructuring how you handle shared resources and professional power...
            </div>
          </div>
          <div className="ai-content">
            <span className="ai-label">The Oracle</span>
            <h2 className="ai-title">Ancient logic,<br/>Modern AI.</h2>
            <p className="ai-description">
              We've bridged the gap between traditional Hellenistic techniques and
              cutting-edge LLMs to provide context-aware readings that feel human.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-section" style={{ textAlign: 'center', padding: '60px' }}>
        <p className="landing-small-sans" style={{ opacity: 0.5, marginBottom: '1rem' }}>© 2026 EPHI ASTROLOGY. ALL RIGHTS RESERVED.</p>
        <Link 
          to="/support" 
          style={{ 
            color: 'var(--accent)', 
            textDecoration: 'none', 
            fontSize: '0.8rem', 
            fontWeight: '600',
            letterSpacing: '0.1em',
            textTransform: 'uppercase'
          }}
        >
          Support the Project
        </Link>
      </footer>

      {/* Fullscreen Overlay Menu */}
      {isMenuOpen && (
        <div className="landing-overlay">
          <button className="landing-close-btn" onClick={toggleMenu} aria-label="Close Menu">✕</button>
          <div className="landing-overlay-content">
            <h2 className="landing-overlay-title">ephi</h2>
            <nav className="landing-overlay-nav">
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>{currentUser ? 'Transits' : 'Login to Start'}</button>
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>AI Reading</button>
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>Alerts</button>
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>Horary</button>
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>Synastry</button>
              <button className="landing-overlay-link" onClick={(e) => { toggleMenu(); handleEnterApp(e); }}>Jyotish</button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
