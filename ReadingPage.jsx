// src/pages/ReadingPage.jsx
//
// AI Reading page — /reading
// Loads natal + aspects from localStorage, lets user pick a focus,
// calls Gemini Flash, and displays the synthesized reading.

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { generateReading, isGeminiConfigured, FOCUS_AREAS } from '../lib/gemini';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNatalFromStorage() {
  try {
    const raw = localStorage.getItem('astro_natal');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getAspectsFromStorage() {
  try {
    const raw = localStorage.getItem('astro_aspects');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveReadingToStorage(reading) {
  try {
    const existing = JSON.parse(localStorage.getItem('astro_readings') || '[]');
    const updated  = [reading, ...existing].slice(0, 20); // keep last 20
    localStorage.setItem('astro_readings', JSON.stringify(updated));
  } catch {}
}

function getReadingsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('astro_readings') || '[]');
  } catch { return []; }
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Parse markdown-style **bold** and bullet points for display
function parseReadingText(text) {
  return text
    .split('\n')
    .map((line, i) => {
      // Section headers: **Title**
      const headerMatch = line.match(/^\*\*(.+?)\*\*$/);
      if (headerMatch) {
        return (
          <div key={i} style={s.sectionHeader}>
            {headerMatch[1]}
          </div>
        );
      }
      // Numbered sections: 1. **Title** or 1. Title
      const numberedMatch = line.match(/^\d+\.\s+\*\*(.+?)\*\*[:\s]*(.*)/);
      if (numberedMatch) {
        return (
          <div key={i} style={s.sectionHeader}>
            {numberedMatch[1]}
            {numberedMatch[2] && <span style={s.sectionSub}> — {numberedMatch[2]}</span>}
          </div>
        );
      }
      // Bullet points
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return (
          <div key={i} style={s.bullet}>
            <span style={s.bulletDot}>·</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      // Empty line → spacer
      if (!line.trim()) return <div key={i} style={s.spacer} />;
      // Regular paragraph — handle inline **bold**
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} style={s.para}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <strong key={j} style={s.bold}>{part}</strong>
              : part
          )}
        </p>
      );
    });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FocusSelector({ selected, onChange, disabled }) {
  return (
    <div style={s.focusRow}>
      {FOCUS_AREAS.map((f) => (
        <button
          key={f.value}
          style={{
            ...s.focusBtn,
            ...(selected === f.value ? s.focusBtnActive : {}),
            ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
          }}
          onClick={() => !disabled && onChange(f.value)}
          disabled={disabled}
        >
          <span style={s.focusEmoji}>{f.emoji}</span>
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

function LoadingState({ focus }) {
  const focusLabel = FOCUS_AREAS.find((f) => f.value === focus)?.label || 'General';
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  const messages = [
    'Reading the current sky…',
    'Consulting your natal chart…',
    `Weaving your ${focusLabel} reading…`,
    'Synthesizing the transits…',
    'Almost ready…',
  ];
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.loadingWrap}>
      <div style={s.loadingGlyph}>✦</div>
      <div style={s.loadingMsg}>
        {messages[msgIdx]}{'·'.repeat(dot + 1)}
      </div>
      <div style={s.loadingBar}>
        <div style={s.loadingBarInner} />
      </div>
      <p style={s.loadingNote}>Gemini is reading your chart — usually takes 5–15 seconds</p>
    </div>
  );
}

function ReadingDisplay({ reading, onNew }) {
  const focusMeta = FOCUS_AREAS.find((f) => f.value === reading.focus);

  return (
    <div style={s.readingWrap}>
      {/* Reading meta bar */}
      <div style={s.readingMeta}>
        <div style={s.readingMetaLeft}>
          <span style={s.focusPill}>
            {focusMeta?.emoji} {focusMeta?.label || reading.focus}
          </span>
          <span style={s.readingTime}>{timeAgo(reading.timestamp)}</span>
          {reading.aspectCount > 0 && (
            <span style={s.aspectCount}>{reading.aspectCount} active transits</span>
          )}
        </div>
        <button style={s.newReadingBtn} onClick={onNew}>
          New reading
        </button>
      </div>

      {/* Reading body */}
      <div style={s.readingBody}>
        {parseReadingText(reading.text)}
      </div>

      {/* Footer */}
      <div style={s.readingFooter}>
        <span>Generated by Gemini Flash · </span>
        <Link to="/" style={s.backLink}>← Back to live transits</Link>
      </div>
    </div>
  );
}

function PastReadings({ readings, onSelect }) {
  if (!readings.length) return null;
  return (
    <div style={s.pastWrap}>
      <div style={s.pastLabel}>Past readings</div>
      {readings.map((r, i) => {
        const focusMeta = FOCUS_AREAS.find((f) => f.value === r.focus);
        return (
          <button key={i} style={s.pastItem} onClick={() => onSelect(r)}>
            <span style={s.pastEmoji}>{focusMeta?.emoji || '✦'}</span>
            <span style={s.pastFocus}>{focusMeta?.label || r.focus}</span>
            <span style={s.pastTime}>{timeAgo(r.timestamp)}</span>
            <span style={s.pastChevron}>›</span>
          </button>
        );
      })}
    </div>
  );
}

function NoKeyBanner() {
  return (
    <div style={s.bannerWrap}>
      <div style={s.bannerIcon}>⚙</div>
      <div style={s.bannerTitle}>Gemini API key not configured</div>
      <p style={s.bannerText}>
        To enable AI readings, add your free Gemini API key to a <code style={s.code}>.env</code> file
        in your project root:
      </p>
      <div style={s.codeBlock}>
        VITE_GEMINI_API_KEY=your_key_here
      </div>
      <p style={s.bannerText}>
        Get a free key at{' '}
        <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={s.link}>
          aistudio.google.com
        </a>
        {' '}— no credit card required. Free tier: 15 requests/min.
      </p>
      <Link to="/" style={s.backBtn}>← Back to transit dashboard</Link>
    </div>
  );
}

function NoNatalBanner() {
  return (
    <div style={s.bannerWrap}>
      <div style={s.bannerIcon}>☽</div>
      <div style={s.bannerTitle}>No natal chart found</div>
      <p style={s.bannerText}>
        You need to enter your birth details first so the AI can personalise your reading.
      </p>
      <Link to="/" style={s.backBtn}>← Set up your natal chart</Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReadingPage() {
  const navigate = useNavigate();

  const [natal,       setNatal]       = useState(null);
  const [aspects,     setAspects]     = useState([]);
  const [focus,       setFocus]       = useState('general');
  const [status,      setStatus]      = useState('idle'); // idle | loading | done | error
  const [reading,     setReading]     = useState(null);
  const [errorMsg,    setErrorMsg]    = useState('');
  const [pastReadings,setPastReadings]= useState([]);
  const [configured,  setConfigured]  = useState(true);
  const abortRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    setConfigured(isGeminiConfigured());
    const natalData = getNatalFromStorage();
    setNatal(natalData);

    const aspectData = getAspectsFromStorage();
    if (aspectData?.aspects) {
      setAspects(aspectData.aspects);
    }

    setPastReadings(getReadingsFromStorage());
  }, []);

  // Fetch fresh aspects if not cached
  useEffect(() => {
    if (!natal || aspects.length > 0) return;

    async function fetchAspects() {
      try {
        const natalLongitudes = {};
        for (const [p, info] of Object.entries(natal.planets)) {
          natalLongitudes[p] = info.longitude;
        }
        const res = await fetch('/api/aspects', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ natal: natalLongitudes }),
        });
        if (!res.ok) return;
        const data = await res.json();
        setAspects(data.aspects || []);
        // Cache for this session
        localStorage.setItem('astro_aspects', JSON.stringify(data));
      } catch {}
    }

    fetchAspects();
  }, [natal]);

  async function handleGenerate() {
    if (!natal) return;
    abortRef.current = false;
    setStatus('loading');
    setErrorMsg('');
    setReading(null);

    try {
      const result = await generateReading({ natal, aspects, focus });
      if (abortRef.current) return;

      saveReadingToStorage(result);
      setPastReadings(getReadingsFromStorage());
      setReading(result);
      setStatus('done');
    } catch (err) {
      if (abortRef.current) return;
      setErrorMsg(err.message || 'Failed to generate reading.');
      setStatus('error');
    }
  }

  function handleNewReading() {
    setReading(null);
    setStatus('idle');
    setErrorMsg('');
  }

  function handleSelectPast(r) {
    setReading(r);
    setStatus('done');
  }

  // ── Render guards ──────────────────────────────────────────────────────────
  if (!configured) return <NoKeyBanner />;
  if (natal === null && status === 'idle') return (
    // Still loading from localStorage — brief empty state
    <div style={s.page}>
      <div style={s.loadingWrap}>
        <div style={{ color: '#5a5470', fontSize: '0.9rem' }}>Loading…</div>
      </div>
    </div>
  );
  if (!natal) return <NoNatalBanner />;

  // ── Done — show reading ────────────────────────────────────────────────────
  if (status === 'done' && reading) {
    return (
      <div style={s.page}>
        <ReadingDisplay reading={reading} onNew={handleNewReading} />
        <PastReadings readings={pastReadings.slice(1)} onSelect={handleSelectPast} />
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div style={s.page}>
        <LoadingState focus={focus} />
      </div>
    );
  }

  // ── Idle / error — main UI ─────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div style={s.pageTitle}>
          <span style={s.pageTitleGlyph}>✦</span>
          AI Reading
        </div>
        <p style={s.pageSubtitle}>
          Gemini synthesizes your natal chart with today's live transits into a personalised reading.
        </p>
      </div>

      {/* Natal summary */}
      <div style={s.natalSummary}>
        <span style={s.natalLabel}>Reading for</span>
        <span style={s.natalValue}>
          {natal.meta?.birthDate || 'your natal chart'}
          {natal.meta?.birthCity ? ` · ${natal.meta.birthCity}` : ''}
        </span>
      </div>

      {/* Active aspects count */}
      {aspects.length > 0 && (
        <div style={s.aspectsSummary}>
          <span style={s.aspectsDot} />
          <span style={s.aspectsText}>
            {aspects.filter(a => ['exact','strong'].includes(a.strength)).length} significant transits active now
          </span>
        </div>
      )}

      {/* Focus selector */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Choose your focus</div>
        <FocusSelector
          selected={focus}
          onChange={setFocus}
          disabled={status === 'loading'}
        />
      </div>

      {/* Error */}
      {status === 'error' && (
        <div style={s.errorBox}>
          <span style={s.errorIcon}>⚠</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generate button */}
      <div style={s.generateWrap}>
        <button style={s.generateBtn} onClick={handleGenerate}>
          <span style={s.generateGlyph}>✦</span>
          Generate {FOCUS_AREAS.find(f => f.value === focus)?.label} Reading
        </button>
        <p style={s.generateNote}>
          Uses ~1 of your 15 free Gemini requests per minute
        </p>
      </div>

      {/* Past readings */}
      <PastReadings readings={pastReadings} onSelect={handleSelectPast} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0f',
    color: '#e8e6f0',
    fontFamily: "'Georgia', serif",
    maxWidth: '680px',
    margin: '0 auto',
    padding: '1.5rem 1.25rem 5rem',
  },

  // Page header
  pageHeader: { marginBottom: '1.5rem' },
  pageTitle: {
    fontSize: '1.25rem',
    fontWeight: '500',
    letterSpacing: '0.04em',
    color: '#f0ede8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '0.4rem',
  },
  pageTitleGlyph: { color: '#c9a84c', fontSize: '1rem' },
  pageSubtitle: {
    fontSize: '0.85rem',
    color: '#5a5470',
    lineHeight: 1.6,
    margin: 0,
  },

  // Natal summary
  natalSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    marginBottom: '0.75rem',
  },
  natalLabel: { fontSize: '0.72rem', color: '#5a5470', letterSpacing: '0.05em', textTransform: 'uppercase' },
  natalValue: { fontSize: '0.85rem', color: '#9990b8' },

  // Aspects summary
  aspectsSummary: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  aspectsDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    background: '#1D9E75',
    flexShrink: 0,
    boxShadow: '0 0 6px #1D9E75',
  },
  aspectsText: { fontSize: '0.8rem', color: '#5a7a5a' },

  // Section
  section: { marginBottom: '1.75rem' },
  sectionTitle: {
    fontSize: '0.72rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#5a5470',
    marginBottom: '0.75rem',
  },

  // Focus selector
  focusRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  focusBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '20px',
    color: '#7a7090',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: "'Georgia', serif",
    padding: '6px 14px',
    letterSpacing: '0.02em',
    transition: 'all 0.15s',
  },
  focusBtnActive: {
    background: '#1e1c2a',
    border: '1px solid #c9a84c',
    color: '#c9a84c',
  },
  focusEmoji: { fontSize: '0.9rem' },

  // Generate
  generateWrap: { marginBottom: '2rem', textAlign: 'center' },
  generateBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: '#c9a84c',
    border: 'none',
    borderRadius: '10px',
    color: '#0a0a0f',
    cursor: 'pointer',
    fontSize: '1rem',
    fontFamily: "'Georgia', serif",
    fontWeight: '600',
    letterSpacing: '0.03em',
    padding: '0.85rem 2rem',
    width: '100%',
    justifyContent: 'center',
  },
  generateGlyph: { fontSize: '0.9rem' },
  generateNote: {
    fontSize: '0.72rem',
    color: '#3d3a52',
    marginTop: '0.5rem',
    letterSpacing: '0.02em',
  },

  // Error
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    background: '#1a0f0f',
    border: '1px solid #4a2020',
    borderRadius: '8px',
    color: '#e05a5a',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
  },
  errorIcon: { flexShrink: 0, marginTop: '1px' },

  // Loading
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    gap: '1rem',
    padding: '2rem',
  },
  loadingGlyph: {
    fontSize: '2rem',
    color: '#c9a84c',
    animation: 'spin 4s linear infinite',
  },
  loadingMsg: {
    fontSize: '0.9rem',
    color: '#9990b8',
    letterSpacing: '0.03em',
    minHeight: '1.4rem',
    textAlign: 'center',
  },
  loadingBar: {
    width: '160px',
    height: '2px',
    background: '#1e1c2a',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  loadingBarInner: {
    height: '100%',
    width: '40%',
    background: '#c9a84c',
    borderRadius: '2px',
    animation: 'slide 1.8s ease-in-out infinite',
  },
  loadingNote: {
    fontSize: '0.72rem',
    color: '#3d3a52',
    textAlign: 'center',
    margin: 0,
  },

  // Reading display
  readingWrap: { marginBottom: '2rem' },
  readingMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
    flexWrap: 'wrap',
    gap: '8px',
  },
  readingMetaLeft: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' },
  focusPill: {
    background: '#1e1c2a',
    border: '1px solid #c9a84c',
    borderRadius: '20px',
    color: '#c9a84c',
    fontSize: '0.78rem',
    padding: '3px 12px',
    letterSpacing: '0.03em',
  },
  readingTime: { fontSize: '0.75rem', color: '#5a5470' },
  aspectCount: { fontSize: '0.75rem', color: '#5a5070' },
  newReadingBtn: {
    background: 'none',
    border: '1px solid #2a2740',
    borderRadius: '6px',
    color: '#7a7090',
    cursor: 'pointer',
    fontSize: '0.78rem',
    fontFamily: "'Georgia', serif",
    padding: '4px 12px',
  },

  // Reading body — parsed text
  readingBody: {
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '12px',
    padding: '1.5rem',
    lineHeight: 1.75,
  },
  sectionHeader: {
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#c9a84c',
    marginTop: '1.5rem',
    marginBottom: '0.5rem',
    paddingBottom: '4px',
    borderBottom: '1px solid #1e1c2a',
  },
  sectionSub: {
    fontSize: '0.65rem',
    color: '#5a5470',
    textTransform: 'none',
    letterSpacing: '0',
    fontWeight: '400',
  },
  para: {
    fontSize: '0.92rem',
    color: '#c8c4d8',
    margin: '0 0 0.85rem',
    lineHeight: 1.75,
  },
  bold: { color: '#e8e6f0', fontWeight: '600' },
  bullet: {
    display: 'flex',
    gap: '10px',
    fontSize: '0.88rem',
    color: '#9990b8',
    marginBottom: '0.6rem',
    lineHeight: 1.6,
  },
  bulletDot: { color: '#c9a84c', flexShrink: 0, marginTop: '1px' },
  spacer: { height: '0.4rem' },

  // Reading footer
  readingFooter: {
    fontSize: '0.72rem',
    color: '#3d3a52',
    marginTop: '1rem',
    textAlign: 'center',
  },
  backLink: { color: '#5a5470', textDecoration: 'none' },

  // Past readings
  pastWrap: { marginTop: '2rem' },
  pastLabel: {
    fontSize: '0.68rem',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#3d3a52',
    marginBottom: '0.6rem',
  },
  pastItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    background: 'none',
    border: '1px solid #1e1c2a',
    borderRadius: '8px',
    color: '#5a5470',
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
    fontSize: '0.82rem',
    padding: '0.6rem 0.875rem',
    marginBottom: '6px',
    textAlign: 'left',
  },
  pastEmoji: { fontSize: '0.9rem', flexShrink: 0 },
  pastFocus: { flex: 1, color: '#7a7090' },
  pastTime: { fontSize: '0.72rem', color: '#3d3a52' },
  pastChevron: { color: '#3d3a52', fontSize: '1rem' },

  // Banners (no key / no natal)
  bannerWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    background: '#0a0a0f',
    textAlign: 'center',
    maxWidth: '480px',
    margin: '0 auto',
  },
  bannerIcon: { fontSize: '2rem', color: '#c9a84c', marginBottom: '1rem' },
  bannerTitle: {
    fontSize: '1.1rem',
    fontWeight: '500',
    color: '#e8e6f0',
    marginBottom: '0.75rem',
    fontFamily: "'Georgia', serif",
  },
  bannerText: {
    fontSize: '0.88rem',
    color: '#7a7090',
    lineHeight: 1.65,
    marginBottom: '1rem',
  },
  codeBlock: {
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '8px',
    color: '#c9a84c',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    width: '100%',
  },
  code: {
    background: '#1e1c2a',
    borderRadius: '4px',
    color: '#9990b8',
    fontFamily: 'monospace',
    fontSize: '0.85em',
    padding: '1px 6px',
  },
  link: { color: '#c9a84c', textDecoration: 'none' },
  backBtn: {
    display: 'inline-block',
    marginTop: '0.5rem',
    background: '#13121a',
    border: '1px solid #2a2740',
    borderRadius: '8px',
    color: '#9990b8',
    fontSize: '0.88rem',
    fontFamily: "'Georgia', serif",
    padding: '0.65rem 1.25rem',
    textDecoration: 'none',
  },
};
