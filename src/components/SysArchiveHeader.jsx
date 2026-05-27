import { Link } from 'react-router-dom';
import { UiIcon } from './EphiIcons';
import { useAuth } from '../contexts/AuthContext';

const SECTIONS = [
  { id: 'sys-rag', label: 'RAG Library' },
  { id: 'sys-observatory', label: 'Observatory' },
  { id: 'sys-analytics', label: 'Analytics' },
];

export default function SysArchiveHeader() {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sys-archive-header">
      <div className="sys-archive-header-inner">
        <div className="sys-archive-brand">
          <UiIcon name="gear" size={18} color="var(--accent)" />
          <div>
            <span className="sys-archive-brand-title">Sys-Archive</span>
            <span className="sys-archive-brand-sub">Operations Console</span>
          </div>
        </div>

        <nav className="sys-archive-nav" aria-label="Sys-Archive sections">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="sys-archive-nav-link">
              {s.label}
            </a>
          ))}
        </nav>

        <div className="sys-archive-header-actions">
          {currentUser && (
            <span className="sys-archive-user">
              {currentUser.displayName?.split(' ')[0] || 'Admin'}
            </span>
          )}
          <Link to="/dashboard" className="btn btn-ghost sys-archive-exit">
            <UiIcon name="sparkle" size={14} style={{ marginRight: 6 }} />
            Observatory App
          </Link>
          {currentUser && (
            <button type="button" className="btn btn-ghost" onClick={logout} style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
