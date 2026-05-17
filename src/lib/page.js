'use client';

/**
 * app/page.js
 *
 * Main transit dashboard.
 * - Loads natal chart from localStorage
 * - Shows NatalForm if no chart saved yet
 * - Polls /api/aspects every 5 minutes
 * - Displays all active transits as cards with orb, strength, applying/separating,
 *   interpretation keywords, and full reading on tap
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import NatalForm from '@/components/NatalForm';
import { store } from './store.js';

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ─── Planet glyphs & colors (duplicated here so page has no extra import) ────
const PLANET = {
  sun:     { label: 'Sun',     glyph: '☉', color: '#F5A623' },
  moon:    { label: 'Moon',    glyph: '☽', color: '#C0C0C0' },
  mercury: { label: 'Mercury', glyph: '☿', color: '#9B8FC7' },
  venus:   { label: 'Venus',   glyph: '♀', color: '#E87D9B' },
  mars:    { label: 'Mars',    glyph: '♂', color: '#E05A3A' },
  jupiter: { label: 'Jupiter', glyph: '♃', color: '#D4942A' },
  saturn:  { label: 'Saturn',  glyph: '♄', color: '#7A9B7A' },
  uranus:  { label: 'Uranus',  glyph: '♅', color: '#5CB8C4' },
  neptune: { label: 'Neptune', glyph: '♆', color: '#5B7FD4' },
  pluto:   { label: 'Pluto',   glyph: '♇', color: '#A05CA0' },
};

const NATURE_COLOR = {
  hard:    '#E05A3A',
  soft:    '#5CB87A',
  neutral: '#C9A84C',
};

const STRENGTH_LABEL = {
  exact:    { label: 'EXACT',    bg: '#2a1a0a', color: '#E8943A' },
  strong:   { label: 'STRONG',   bg: '#1a2a1a', color: '#5CB87A' },
  moderate: { label: 'MODERATE', bg: '#1a1a2a', color: '#7A8BC9' },
  wide:     { label: 'WIDE',     bg: '#1e1c2a', color: '#5a5470' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNatalLongitudes(natalData) {
  // Extract just the longitude values for the API call
  const out = {};
  for (const [planet, info] of Object.entries(natalData.planets)) {
    out[planet] = info.longitude;
  }
  return out;
}

function formatTime(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeSince(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ natalData, lastUpdated, onReset, onRefresh, loading }) {
  const birth = natalData?.meta;
  return (
    <div style={s.header}>
      <div style={s.headerLeft}>
        <span style={s.logo}>✦ Transits</span>
        {birth && (
          <span style={s.birthTag}>
            {birth.birthDate}{birth.birthTime ? ` · ${birth.birthTime}` : ''}{birth.birthCity ? ` · ${birth.birthCity}` : ''}
          </span>
        )}
      </div>
      <div style={s.headerRight}>
        {lastUpdated && (
          <span style={s.updated}>Updated {timeSince(lastUpdated)}</span>
        )}
        <button style={s.iconBtn} onClick={onRefresh} disabled={loading} title="Refresh now">
          {loading ? '⏳' : '↻'}
        </button>
        <button style={s.iconBtn} onClick={onReset} title="Change birth data">
          ✎
        </button>
      </div>
    </div>
  );
}

function SummaryBar({ summary, currentPositions }) {
  if (!summary) return null;
  return (
    <div style={s.summaryBar}>
      <div style={s.summaryItem}>
        <span style={{ ...s.summaryNum, color: '#e8e6f0' }}>{summary.total}</span>
        <span style={s.summaryLbl}>active</span>
      </div>
      <div style={s.summaryDivider} />
      <div style={s.summaryItem}>
        <span style={{ ...s.summaryNum, color: NATURE_COLOR.hard }}>{summary.hard}</span>
        <span style={s.summaryLbl}>hard</span>
      </div>
      <div style={s.summaryItem}>
        <span style={{ ...s.summaryNum, color: NATURE_COLOR.soft }}>{summary.soft}</span>
        <span style={s.summaryLbl}>soft</span>
      </div>
      <div style={s.summaryItem}>
        <span style={{ ...s.summaryNum, color: NATURE_COLOR.neutral }}>{summary.neutral}</span>
        <span style={s.summaryLbl}>neutral</span>
      </div>
      <div style={s.summaryDivider} />
      <div style={s.summaryItem}>
        <span style={{ ...s.summaryNum, color: '#C9A84C' }}>{summary.applying}</span>
        <span style={s.summaryLbl}>applying</span>
      </div>

      {/* Live Moon position */}
      {currentPositions?.moon && (
        <>
          <div style={s.summaryDivider} />
          <div style={s.summaryItem}>
            <span style={{ ...s.summaryNum, color: PLANET.moon.color, fontSize: '1rem' }}>
              ☽
            </span>
            <span style={{ ...s.summaryLbl, color: '#c0c0c0' }}>
              {currentPositions.moon.displayStr}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function AspectCard({ aspect }) {
  const [expanded, setExpanded] = useState(false);
  const tMeta = PLANET[aspect.transitPlanet] || {};
  const nMeta = PLANET[aspect.natalPlanet]   || {};
  const strengthStyle = STRENGTH_LABEL[aspect.strength] || STRENGTH_LABEL.wide;
  const natureColor = NATURE_COLOR[aspect.nature] || '#888';
  const interp = aspect.interpretation || {};

  return (
    <div
      style={{
        ...s.card,
        borderLeftColor: natureColor,
        cursor: 'pointer',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      {/* Card header row */}
      <div style={s.cardTop}>
        {/* Planet pair */}
        <div style={s.planetPair}>
          <span style={{ ...s.planetGlyph, color: tMeta.color }}>
            {tMeta.glyph}
          </span>
          <span style={{ ...s.aspectSymbol, color: natureColor }}>
            {aspect.symbol}
          </span>
          <span style={{ ...s.planetGlyph, color: nMeta.color }}>
            {nMeta.glyph}
          </span>
        </div>

        {/* Names */}
        <div style={s.cardMid}>
          <div style={s.cardTitle}>
            <span style={{ color: tMeta.color }}>{tMeta.label}</span>
            {' '}{aspect.aspectName}{' '}
            <span style={{ color: '#7a7090' }}>natal </span>
            <span style={{ color: nMeta.color }}>{nMeta.label}</span>
          </div>
          <div style={s.cardSub}>
            {aspect.natalZodiac?.displayStr} natal
            {' · '}
            {aspect.applying
              ? <span style={{ color: '#5CB87A' }}>▲ applying</span>
              : <span style={{ color: '#7a7090' }}>▼ separating</span>}
            {aspect.exactAtLabel && (
              <span style={{ color: '#C9A84C' }}> · {aspect.exactAtLabel}</span>
            )}
          </div>
        </div>

        {/* Right side: orb + strength */}
        <div style={s.cardRight}>
          <div style={s.orbVal}>{aspect.orb.toFixed(2)}°</div>
          <div style={{ ...s.strengthBadge, background: strengthStyle.bg, color: strengthStyle.color }}>
            {strengthStyle.label}
          </div>
        </div>
      </div>

      {/* Orb bar */}
      <div style={s.orbBarWrap}>
        <div
          style={{
            ...s.orbBar,
            width: `${Math.max(4, 100 - (aspect.orb / 8) * 100)}%`,
            background: natureColor,
            opacity: 0.6,
          }}
        />
      </div>

      {/* Keywords */}
      {interp.keywords && (
        <div style={s.keywords}>
          {interp.keywords.slice(0, 4).map((kw) => (
            <span key={kw} style={s.kwTag}>{kw}</span>
          ))}
        </div>
      )}

      {/* Expanded interpretation */}
      {expanded && interp.core && (
        <div style={s.expanded}>
          <div style={s.expandSection}>
            <p style={s.expandText}>{interp.core}</p>
          </div>

          <div style={s.expandGrid}>
            <div style={s.expandBlock}>
              <div style={{ ...s.expandLabel, color: NATURE_COLOR.hard }}>Shadow</div>
              <div style={s.expandSmall}>{interp.shadow}</div>
            </div>
            <div style={s.expandBlock}>
              <div style={{ ...s.expandLabel, color: NATURE_COLOR.soft }}>Gift</div>
              <div style={s.expandSmall}>{interp.gift}</div>
            </div>
          </div>

          <div style={s.expandSection}>
            <div style={{ ...s.expandLabel, color: '#C9A84C' }}>Advice</div>
            <div style={s.expandSmall}>{interp.advice}</div>
          </div>

          {interp.domains && (
            <div style={s.domainRow}>
              {interp.domains.map((d) => (
                <span key={d} style={s.domainTag}>{d}</span>
              ))}
            </div>
          )}

          <div style={s.tapHint}>tap to collapse</div>
        </div>
      )}

      {!expanded && (
        <div style={s.tapHint}>tap to read interpretation</div>
      )}
    </div>
  );
}

function CurrentPlanets({ positions }) {
  if (!positions) return null;
  const order = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  return (
    <div style={s.planetRow}>
      {order.map((p) => {
        const pos = positions[p];
        if (!pos) return null;
        const meta = PLANET[p] || {};
        return (
          <div key={p} style={s.planetPill} title={`${meta.label}: ${pos.displayStr}`}>
            <span style={{ color: meta.color, fontSize: '0.85rem' }}>{meta.glyph}</span>
            <span style={s.pillText}>{pos.displayStr}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={s.emptyState}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✦</div>
      <div style={{ color: '#7a7090', fontSize: '0.9rem' }}>
        No active aspects found within orb.
      </div>
      <div style={{ color: '#5a5070', fontSize: '0.8rem', marginTop: '0.35rem' }}>
        The sky is quiet — check back soon.
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [natalData, setNatalData]         = useState(null);
  const [aspects, setAspects]             = useState([]);
  const [currentPositions, setCurrentPos] = useState(null);
  const [summary, setSummary]             = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [filter, setFilter]               = useState('all'); // all | hard | soft | exact
  const intervalRef = useRef(null);

  // Load natal from store on mount
  useEffect(() => {
    try {
      const saved = store.getJSON('astro_natal');
      if (saved) {
        setNatalData(saved);
      }
    } catch {
      store.remove('astro_natal');
    }
  }, []);

  // Fetch aspects whenever natal changes
  const fetchAspects = useCallback(async (natal) => {
    if (!natal) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/aspects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ natal: getNatalLongitudes(natal) }),
      });
      if (!res.ok) throw new Error('Failed to fetch aspects');
      const data = await res.json();
      setAspects(data.aspects || []);
      setCurrentPos(data.currentPositions || null);
      setSummary(data.summary || null);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError('Could not load transits. Will retry shortly.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (!natalData) return;
    fetchAspects(natalData);
    intervalRef.current = setInterval(() => fetchAspects(natalData), REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [natalData, fetchAspects]);

  function handleNatalComplete(data) {
    setNatalData(data);
  }

  function handleReset() {
    if (!confirm('Reset your natal chart data?')) return;
    store.remove('astro_natal');
    store.remove('astro_birth_form');
    setNatalData(null);
    setAspects([]);
    setSummary(null);
    setCurrentPos(null);
  }

  // Filter aspects
  const filtered = aspects.filter((a) => {
    if (filter === 'hard')  return a.nature === 'hard';
    if (filter === 'soft')  return a.nature === 'soft';
    if (filter === 'exact') return a.strength === 'exact' || a.strength === 'strong';
    return true;
  });

  // Show NatalForm if no chart saved
  if (!natalData) {
    return (
      <main style={{ background: '#0a0a0f', minHeight: '100vh' }}>
        <NatalForm onComplete={handleNatalComplete} />
      </main>
    );
  }

  return (
    <main style={s.main}>
      <Header
        natalData={natalData}
        lastUpdated={lastUpdated}
        onReset={handleReset}
        onRefresh={() => fetchAspects(natalData)}
        loading={loading}
      />

      {/* Current sky positions */}
      <CurrentPlanets positions={currentPositions} />

      {/* Summary bar */}
      <SummaryBar summary={summary} currentPositions={currentPositions} />

      {/* Filter tabs */}
      <div style={s.filterRow}>
        {['all','hard','soft','exact'].map((f) => (
          <button
            key={f}
            style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}
            onClick={() => setFilter(f)}
          >
            {f === 'exact' ? 'tight' : f}
            {f === 'all' && summary ? ` (${summary.total})` : ''}
            {f === 'hard' && summary ? ` (${summary.hard})` : ''}
            {f === 'soft' && summary ? ` (${summary.soft})` : ''}
            {f === 'exact' && summary ? ` (${summary.exact + summary.strong})` : ''}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <p style={s.error}>{error}</p>}

      {/* Aspect cards */}
      <div style={s.cardList}>
        {loading && aspects.length === 0 ? (
          <div style={s.emptyState}>
            <div style={{ color: '#7a7090', fontSize: '0.9rem' }}>Scanning the sky…</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          filtered.map((asp, i) => (
            <AspectCard key={`${asp.transitPlanet}-${asp.natalPlanet}-${asp.aspectName}-${i}`} aspect={asp} />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={s.footer}>
        <span>Auto-refreshes every 5 min</span>
        <span style={{ margin: '0 0.5rem' }}>·</span>
        <span>Tap any card for interpretation</span>
      </div>
    </main>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  main: {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#e8e6f0',
    fontFamily: "'Georgia', serif",
    maxWidth: '680px',
    margin: '0 auto',
    padding: '0 0 4rem',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #1c1a28',
    position: 'sticky',
    top: 0,
    background: '#0a0a0f',
    zIndex: 10,
  },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  logo: { fontSize: '1rem', fontWeight: '600', letterSpacing: '0.06em', color: '#c9a84c' },
  birthTag: { fontSize: '0.72rem', color: '#5a5470', letterSpacing: '0.03em' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  updated: { fontSize: '0.72rem', color: '#5a5470' },
  iconBtn: {
    background: 'none',
    border: '1px solid #2a2740',
    borderRadius: '6px',
    color: '#9990b8',
    cursor: 'pointer',
    fontSize: '0.9rem',
    padding: '4px 8px',
    lineHeight: 1,
  },

  // Planet row
  planetRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid #1c1a28',
  },
  planetPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '20px',
    padding: '3px 10px',
    cursor: 'default',
  },
  pillText: { fontSize: '0.72rem', color: '#8a8499', letterSpacing: '0.02em' },

  // Summary bar
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.25rem',
    borderBottom: '1px solid #1c1a28',
    flexWrap: 'wrap',
  },
  summaryItem: { display: 'flex', alignItems: 'baseline', gap: '4px' },
  summaryNum: { fontSize: '1.1rem', fontWeight: '600' },
  summaryLbl: { fontSize: '0.72rem', color: '#5a5470', letterSpacing: '0.04em' },
  summaryDivider: { width: '1px', height: '16px', background: '#2a2740', margin: '0 4px' },

  // Filters
  filterRow: {
    display: 'flex',
    gap: '6px',
    padding: '0.75rem 1.25rem',
    borderBottom: '1px solid #1c1a28',
  },
  filterBtn: {
    background: 'none',
    border: '1px solid #2a2740',
    borderRadius: '20px',
    color: '#5a5470',
    cursor: 'pointer',
    fontSize: '0.78rem',
    padding: '4px 12px',
    letterSpacing: '0.04em',
    fontFamily: "'Georgia', serif",
  },
  filterBtnActive: {
    background: '#1e1c2a',
    borderColor: '#c9a84c',
    color: '#c9a84c',
  },

  // Card list
  cardList: { padding: '0.75rem 1rem' },

  // Aspect card
  card: {
    background: '#13121a',
    border: '1px solid #2a2740',
    borderLeft: '3px solid',
    borderRadius: '12px',
    padding: '0.875rem 1rem',
    marginBottom: '10px',
    transition: 'border-color 0.15s',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  planetPair: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    minWidth: '60px',
    paddingTop: '2px',
  },
  planetGlyph: { fontSize: '1.1rem' },
  aspectSymbol: { fontSize: '1rem', fontWeight: '600' },
  cardMid: { flex: 1 },
  cardTitle: { fontSize: '0.9rem', color: '#e8e6f0', lineHeight: 1.4, marginBottom: '3px' },
  cardSub: { fontSize: '0.75rem', color: '#5a5470', lineHeight: 1.4 },
  cardRight: { textAlign: 'right', minWidth: '54px' },
  orbVal: { fontSize: '1rem', fontWeight: '600', color: '#e8e6f0', lineHeight: 1 },
  strengthBadge: {
    display: 'inline-block',
    fontSize: '0.6rem',
    fontWeight: '700',
    letterSpacing: '0.07em',
    padding: '2px 6px',
    borderRadius: '4px',
    marginTop: '3px',
  },

  // Orb bar
  orbBarWrap: {
    height: '2px',
    background: '#1e1c2a',
    borderRadius: '2px',
    margin: '8px 0',
    overflow: 'hidden',
  },
  orbBar: { height: '100%', borderRadius: '2px', transition: 'width 0.4s ease' },

  // Keywords
  keywords: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '4px' },
  kwTag: {
    background: '#1e1c2a',
    border: '1px solid #2a2740',
    borderRadius: '4px',
    color: '#7a7090',
    fontSize: '0.72rem',
    padding: '2px 8px',
    letterSpacing: '0.02em',
  },

  // Expanded interpretation
  expanded: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px solid #1e1c2a',
  },
  expandSection: { marginBottom: '10px' },
  expandGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '10px',
  },
  expandBlock: {},
  expandLabel: {
    fontSize: '0.68rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  expandText: { fontSize: '0.85rem', color: '#c8c4d8', lineHeight: 1.65 },
  expandSmall: { fontSize: '0.8rem', color: '#9990b8', lineHeight: 1.55 },
  domainRow: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
  domainTag: {
    background: '#1a1828',
    border: '1px solid #2a2740',
    borderRadius: '4px',
    color: '#5a5470',
    fontSize: '0.68rem',
    padding: '2px 7px',
    letterSpacing: '0.03em',
  },
  tapHint: {
    fontSize: '0.68rem',
    color: '#3d3a52',
    textAlign: 'right',
    marginTop: '6px',
    letterSpacing: '0.03em',
  },

  // Misc
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1rem',
    color: '#5a5470',
  },
  error: {
    color: '#E05A3A',
    fontSize: '0.82rem',
    textAlign: 'center',
    padding: '0.5rem 1.25rem',
  },
  footer: {
    textAlign: 'center',
    fontSize: '0.72rem',
    color: '#3d3a52',
    padding: '2rem 1rem 0',
    letterSpacing: '0.03em',
  },
};
