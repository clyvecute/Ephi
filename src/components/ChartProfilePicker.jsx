/**
 * Switch / add / remove saved natal chart profiles under one account.
 */
import { deleteProfile } from '../lib/profiles.js';
import { UiIcon } from './EphiIcons.jsx';
import { useNatal } from '../hooks/useNatal.js';

export default function ChartProfilePicker({ onNewProfile, compact = false }) {
  const {
    profiles,
    activeProfileId: activeId,
    setActiveProfile,
  } = useNatal();

  if (!profiles.length) return null;

  return (
    <div
      className="card"
      style={{
        padding: compact ? '0.75rem 1rem' : '1rem 1.25rem',
        marginBottom: compact ? '1rem' : '1.5rem',
        borderLeft: '3px solid var(--accent)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
          ✦ Chart profiles
        </span>
        {onNewProfile && (
          <button type="button" className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '4px 10px' }} onClick={onNewProfile}>
            + New chart
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          const meta = p.chart?.meta;
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isActive ? 'var(--accent-subtle)' : 'var(--bg-deep)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '0.35rem 0.5rem 0.35rem 0.65rem',
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  fontSize: '0.78rem',
                  padding: '4px 8px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--accent-dark)' : 'var(--text-primary)',
              }}
                onClick={() => setActiveProfile(p.id)}
              >
                {p.label}
                {meta?.date && (
                  <span style={{ marginLeft: '0.35rem', opacity: 0.65, fontWeight: 400 }}>
                    · {meta.date}
                  </span>
                )}
              </button>
              {profiles.length > 1 && (
                <button
                  type="button"
                  aria-label={`Remove ${p.label}`}
                  onClick={() => {
                    if (window.confirm(`Remove profile "${p.label}"?`)) {
                      deleteProfile(p.id);
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    lineHeight: 1,
                  }}
                >
                  <UiIcon name="warning" size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
