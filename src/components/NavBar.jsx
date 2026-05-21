import { useLocation, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { UiIcon } from './EphiIcons';
import { store } from '../lib/store';

function getSignificantAspectCount() {
  try {
    const data = store.getJSON('astro_aspects');
    if (!data) return 0;
    return (data.aspects || []).filter(
      (a) => a.strength === 'exact' || a.strength === 'strong'
    ).length;
  } catch {
    return 0;
  }
}

function hasNatalChart() {
  try {
    return Boolean(store.get('astro_natal'));
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
  const [puristMode, setPuristMode] = useState(false);

  useEffect(() => {
    function refresh() {
      setSigCount(getSignificantAspectCount());
      setHasNatal(hasNatalChart());
      const settings = store.getJSON('ephi_settings') || {};
      setPuristMode(settings.puristMode || false);
    }
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
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
      icon: 'sparkle',
      isAi: true
    },
    { 
      path: '/transit-calendar', 
      label: 'Calendar', 
      reqNatal: true, 
      active: location.pathname === '/transit-calendar',
      icon: 'star'
    },
    { 
      path: '/progressions', 
      label: 'Progressions', 
      reqNatal: true, 
      active: location.pathname === '/progressions',
      icon: 'sparkle'
    },
    { 
      path: '/synastry', 
      label: 'Synastry', 
      reqNatal: true, 
      active: location.pathname === '/synastry',
      icon: 'sparkle',
      isAi: true
    },
    { 
      path: '/tools', 
      label: 'Tools Archive', 
      reqNatal: false, 
      active: location.pathname === '/tools',
      icon: 'star'
    }
  ].filter(t => !puristMode || !t.isAi);

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
              if (!currentUser) {
                e.preventDefault();
                toast('Please log in to access this feature.');
                loginWithGoogle();
                return;
              }
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
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <UiIcon name="star" size={14} style={{ marginRight: 6 }} />
              {currentUser.displayName?.split(' ')[0] || 'User'}
            </span>
            <button onClick={logout} className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              Logout
            </button>
          </div>
        ) : (
          <button onClick={loginWithGoogle} className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            Login
          </button>
        )}
      </div>
    </nav>
  );
}

