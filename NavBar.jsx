// src/components/NavBar.jsx
//
// Persistent nav bar — visible on every page.
// Links: / (Transits) and /reading (AI Reading).
// Shows a pulsing dot on the AI Reading link when exact/strong aspects are active.

import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSignificantAspectCount() {
  try {
    const cached = localStorage.getItem('astro_aspects');
    if (!cached) return 0;
    const data = JSON.parse(cached);
    return (data.aspects || []).filter(
      (a) => a.strength === 'exact' || a.strength === 'strong'
    ).length;
  } catch {
    return 0;
  }
}

function hasNatalChart() {
  try {
    return Boolean(localStorage.getItem('astro_natal'));
  } catch {
    return false;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ count }) {
  if (!count) return null;
  return (
    <span style={s.dotWrap} title={`${count} significant transit${count > 1 ? 's' : ''} active`}>
      <span style={s.dotOuter} />
      <span style={s.dotInner} />
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function NavBar() {
  const location                  = useLocation();
  const [sigCount, setSigCount]   = useState(0);
  const [hasNatal, setHasNatal]   = useState(false);
  const [moonPos,  setMoonPos]    = useState(null);

  // Check localStorage for significant aspects + natal + moon position
  useEffect(() => {
    function refresh() {
      setSigCount(getSignificantAspectCount());
      setHasNatal(hasNatalChart());

      // Pull moon position for the nav display
      try {
        const cached = localStorage.getItem('astro_aspects');
        if (cached) {
          const data = JSON.parse(cached);
          const moon = data.currentPositions?.moon;
          if (moon?.displayStr) setMoonPos(moon.displayStr);
        }
      } catch {}
    }

    refresh();

    // Re-check every 60s in case the dashboard refreshed in the background
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [location]); // re-check on every route change too

  const isHome    = location.pathname === '/';
  const isReading = location.pathname === '/reading';

  return (
    <nav style={s.nav}>
      {/* Left — logo */}
      <div style={s.logoWrap}>
        <span style={s.logoGlyph}>✦</span>
        {moonPos && (
          <span style={s.moonPill} title="Current Moon position">
            ☽ {moonPos}
          </span>
        )}
      </div>

      {/* Right — nav links */}
      <div style={s.links}>
        {/* Transits */}
        <Link
          to="/"
          style={{
            ...s.link,
            ...(isHome ? s.linkActive : {}),
          }}
        >
          <span style={s.linkIcon}>◉</span>
          <span style={s.linkLabel}>Transits</span>
          {isHome && <span style={s.activeBar} />}
        </Link>

        {/* AI Reading */}
        <Link
          to="/reading"
          style={{
            ...s.link,
            ...(isReading ? s.linkActive : {}),
            ...((!hasNatal) ? s.linkDimmed : {}),
          }}
        >
          <span style={s.linkIcon}>✦</span>
          <span style={s.linkLabel}>Reading</span>
          <PulsingDot count={sigCount} />
          {isReading && <span style={s.activeBar} />}
        </Link>
      </div>
    </nav>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  nav: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '0 1.25rem',
    height:         '52px',
    background:     'rgba(10,10,15,0.97)',
    borderBottom:   '1px solid #1c1a28',
    position:       'sticky',
    top:            0,
    zIndex:         100,
    backdropFilter: 'blur(10px)',
    maxWidth:       '100%',
  },

  // Logo
  logoWrap: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  logoGlyph: {
    fontSize:      '1rem',
    color:         '#c9a84c',
    letterSpacing: '0.04em',
  },
  moonPill: {
    fontSize:    '0.72rem',
    color:       '#9090a8',
    background:  '#13121a',
    border:      '1px solid #2a2740',
    borderRadius:'20px',
    padding:     '2px 10px',
    letterSpacing:'0.02em',
    cursor:      'default',
  },

  // Links
  links: {
    display:    'flex',
    alignItems: 'center',
    gap:        '4px',
  },
  link: {
    display:        'flex',
    alignItems:     'center',
    gap:            '6px',
    color:          '#5a5470',
    textDecoration: 'none',
    fontSize:       '0.85rem',
    fontFamily:     "'Georgia', serif",
    letterSpacing:  '0.03em',
    padding:        '6px 12px',
    borderRadius:   '8px',
    position:       'relative',
    transition:     'color 0.15s',
  },
  linkActive: {
    color:      '#e8e6f0',
    background: '#13121a',
  },
  linkDimmed: {
    opacity: 0.45,
    pointerEvents: 'none',
  },
  linkIcon: {
    fontSize: '0.75rem',
    opacity:  0.7,
  },
  linkLabel: {
    lineHeight: 1,
  },
  activeBar: {
    position:     'absolute',
    bottom:       '-1px',
    left:         '12px',
    right:        '12px',
    height:       '2px',
    background:   '#c9a84c',
    borderRadius: '2px',
  },

  // Pulsing dot
  dotWrap: {
    position:   'relative',
    display:    'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width:      '12px',
    height:     '12px',
    marginLeft: '2px',
  },
  dotOuter: {
    position:     'absolute',
    width:        '12px',
    height:       '12px',
    borderRadius: '50%',
    background:   '#1D9E75',
    opacity:      0.35,
    animation:    'navPulse 2s ease-in-out infinite',
  },
  dotInner: {
    position:     'relative',
    width:        '6px',
    height:       '6px',
    borderRadius: '50%',
    background:   '#1D9E75',
    boxShadow:    '0 0 4px #1D9E75',
  },
};
