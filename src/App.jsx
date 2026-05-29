// src/App.jsx
// Route definitions. NavBar persists across all pages.
// Pages are lazy-loaded so the dashboard loads instantly
// and the AI reading page only loads its bundle when visited.

import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import { ToastProvider } from './components/Toast';
import { scheduleAspectChecks, cancelChecks, getPreferences } from './lib/notifications';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Footer from './components/Footer';
import { getActiveChart } from './lib/profiles.js';

// Lazy load pages — keeps initial bundle small
const Landing     = lazy(() => import('./pages/Landing'));
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const ReadingPage = lazy(() => import('./pages/ReadingPage.jsx'));
const AlertsPage = lazy(() => import('./pages/AlertsPage.jsx'));
const HellenisticPage = lazy(() => import('./pages/HellenisticPage.jsx'));
const SynastryPage = lazy(() => import('./pages/SynastryPage.jsx'));
const ReturnsPage = lazy(() => import('./pages/ReturnsPage.jsx'));
const BaziPage = lazy(() => import('./pages/BaziPage.jsx'));
const HoraryPage = lazy(() => import('./pages/HoraryPage.jsx'));
const VedicPage = lazy(() => import('./pages/VedicPage.jsx'));
const ToolsPage = lazy(() => import('./pages/ToolsPage.jsx'));
const GrimoirePage = lazy(() => import('./pages/GrimoirePage.jsx'));
const ElectionalPage = lazy(() => import('./pages/ElectionalPage.jsx'));
const FaqPage = lazy(() => import('./pages/FaqPage.jsx'));
const SupportPage = lazy(() => import('./pages/SupportPage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage.jsx'));
const AdminPage = lazy(() => import('./pages/AdminPage.jsx'));
const SharedChartPage     = lazy(() => import('./pages/SharedChartPage.jsx'));
const TransitCalendarPage = lazy(() => import('./pages/TransitCalendarPage.jsx'));
const ProgressionsPage    = lazy(() => import('./pages/ProgressionsPage.jsx'));
import FeedbackModal from './components/FeedbackModal';
import { logPageView } from './lib/analytics';

// Minimal full-screen loading state shown during lazy load
function PageLoader() {
  return (
    <div style={styles.loader}>
      <span style={styles.loaderGlyph}>✦</span>
    </div>
  );
}

/**
 * Enforces login before accessing specific features.
 */
function ProtectedRoute({ children }) {
  const auth = useAuth();
  const bypassAuth = import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
  const { currentUser, loading } = bypassAuth 
    ? { currentUser: { uid: 'dev' }, loading: false } 
    : auth;
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Ephi UI caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '4rem', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '3rem', color: 'var(--tense)', marginBottom: '1rem' }}>✦</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Application Error</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '2rem' }}>
            We encountered a syntax or rendering error while loading this module.
          </p>
          <button className="btn btn-primary" onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard'; }}>
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const location = useLocation();

  useEffect(() => {
    // 1. Log page view
    logPageView(location.pathname);
    
    // 2. Reset scroll position to top
    window.scrollTo(0, 0);

    // 3. Start notifications background loop if enabled
    const prefs = getPreferences();
    if (prefs.enabled) {
      const natal = getActiveChart();
      if (natal) scheduleAspectChecks(natal);
      else cancelChecks();
    } else {
      cancelChecks();
    }

    // 4. Apply Dark Theme for specific routes
    if (location.pathname === '/admin' || location.pathname === '/sys-archive') {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [location.pathname]);

  useEffect(() => {
    const syncNotifications = () => {
      const prefs = getPreferences();
      if (!prefs.enabled) {
        cancelChecks();
        return;
      }
      const natal = getActiveChart();
      if (natal) scheduleAspectChecks(natal);
      else cancelChecks();
    };

    window.addEventListener('storage', syncNotifications);
    return () => window.removeEventListener('storage', syncNotifications);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <div style={styles.root}>
      {/* Persistent nav — visible on every page except Landing */}
      {location.pathname !== '/' && location.pathname !== '/sys-archive' && <NavBar />}

      {/* Page content */}
      <div style={styles.content}>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Landing page */}
              <Route path="/" element={<Landing />} />
              {/* Public shared chart — no login required */}
              <Route path="/chart/:encoded" element={<SharedChartPage />} />

              {/* Transit dashboard */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

              {/* AI reading page */}
              <Route path="/reading" element={<ProtectedRoute><ReadingPage /></ProtectedRoute>} />

              {/* Alerts page */}
              <Route path="/alerts" element={<ProtectedRoute><AlertsPage /></ProtectedRoute>} />

              {/* Synastry page */}
              <Route path="/synastry" element={<ProtectedRoute><SynastryPage /></ProtectedRoute>} />

              {/* Horary page */}
              <Route path="/horary" element={<ProtectedRoute><HoraryPage /></ProtectedRoute>} />

              {/* Returns page */}
              <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
              <Route path="/transit-calendar" element={<ProtectedRoute><TransitCalendarPage /></ProtectedRoute>} />
              <Route path="/progressions" element={<ProtectedRoute><ProgressionsPage /></ProtectedRoute>} />

              {/* Tools page */}
              <Route path="/tools" element={<ProtectedRoute><ToolsPage /></ProtectedRoute>} />

              {/* Bazi page */}
              <Route path="/bazi" element={<ProtectedRoute><BaziPage /></ProtectedRoute>} />

              {/* Hellenistic page */}
              <Route path="/hellenistic" element={<ProtectedRoute><HellenisticPage /></ProtectedRoute>} />

              {/* Vedic page */}
              <Route path="/vedic" element={<ProtectedRoute><VedicPage /></ProtectedRoute>} />

               {/* Grimoire (Restricted Library Management) */}
              <Route path="/sys-archive" element={<ProtectedRoute><GrimoirePage /></ProtectedRoute>} />
              
              {/* Electional Module */}
              <Route path="/chronos" element={<ProtectedRoute><ElectionalPage /></ProtectedRoute>} />

              {/* FAQ page */}
              <Route path="/faq" element={<FaqPage />} />

              {/* Support page */}
              <Route path="/support" element={<SupportPage />} />

              {/* About page */}
              <Route path="/about" element={<AboutPage />} />

              {/* Admin Panel */}
              <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

              {/* Catch-all — redirect unknown routes to dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>

        {location.pathname !== '/sys-archive' && <Footer />}
        <FeedbackModal />
      </div>
    </div>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: 'var(--bg-deep)',
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
  },
  content: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'transparent',
  },
  loader: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
  },
  loaderGlyph: {
    fontSize: '1.5rem',
    color: '#c9a0dc',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
};
