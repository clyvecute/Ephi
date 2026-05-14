import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { UiIcon } from './EphiIcons';

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

function PulsingDot({ count }) {
  if (!count) return null;
  return (
    <span className="nav-dot-wrap">
      <span className="nav-dot-outer" />
      <span className="nav-dot-inner" />
    </span>
  );
}

export default function NavBar() {
  const location = useLocation();
  const toast = useToast();
  const { currentUser, loginWithGoogle, logout } = useAuth();
  const [sigCount, setSigCount] = useState(0);
  const [hasNatal, setHasNatal] = useState(false);

  useEffect(() => {
    function refresh() {
      setSigCount(getSignificantAspectCount());
      setHasNatal(hasNatalChart());
    }
    refresh();
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [location]);

  const tabs = [
    { 
      path: '/dashboard', 
      label: 'Transits', 
      reqNatal: false, 
      active: location.pathname === '/dashboard',
      icon: 'sparkle'
    },
    { 
      path: '/reading', 
      label: 'Reading', 
      reqNatal: true, 
      active: location.pathname === '/reading',
      icon: 'sparkle' // Will use a better one if available, but sparkle works for now
    },
    { 
      path: '/synastry', 
      label: 'Synastry', 
      reqNatal: true, 
      active: location.pathname === '/synastry',
      icon: 'sparkle'
    },
    { 
      path: '/tools', 
      label: 'Tools Archive', 
      reqNatal: false, 
      active: location.pathname === '/tools',
      icon: 'star'
    }
  ];

  return (
    <nav className="nav-bar">
      {/* Home / Back button */}
      <Link to="/" className="nav-home-link">
        <UiIcon name="sparkle" size={18} color="var(--accent)" />
        <span className="nav-link-label">Home</span>
      </Link>

      {/* Divider */}
      <div className="nav-divider" />

      {/* Tab links */}
      {tabs.map((tab) => {
        const isDisabled = tab.reqNatal && !hasNatal;
        return (
          <Link
            key={tab.path}
            to={isDisabled ? '#' : tab.path}
            className={`nav-link ${tab.active ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            onClick={(e) => {
              if (isDisabled) {
                e.preventDefault();
                toast('Set up your natal chart on the Transits page first.');
              }
            }}
          >
            <span className="nav-link-icon">
              <UiIcon name={tab.icon} size={18} />
              {tab.path === '/reading' && <PulsingDot count={sigCount} />}
            </span>
            <span className="nav-link-label">{tab.label}</span>
            {tab.active && <span className="nav-active-bar" />}
          </Link>
        );
      })}

      <div style={{ flex: 1 }} />

      <Link 
        to="/support" 
        className="nav-link nav-support-link"
        style={{ color: 'var(--neutral)' }}
      >
        <span className="nav-link-icon">
          <UiIcon name="star" size={18} color="var(--neutral)" />
        </span>
        <span className="nav-link-label">Support</span>
      </Link>

      {/* Auth State */}
      <div className="nav-auth" style={{ paddingRight: '1rem', display: 'flex', alignItems: 'center' }}>
        {currentUser ? (
          <button onClick={logout} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <UiIcon name="gear" size={14} style={{ marginRight: 6 }} />
            {currentUser.displayName?.split(' ')[0] || 'User'}
          </button>
        ) : (
          <button onClick={loginWithGoogle} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

