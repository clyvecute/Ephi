import { useState, useEffect } from 'react';
import {
  getSynastryAspects,
  scoreSynastry,
  getKeyConnections,
  groupAspectsByNature,
} from '../lib/synastry.js';
import { isOracleConfigured as isGeminiConfigured, generateSynastryReading } from '../lib/oracle';
import { PlanetIcon, UiIcon } from '../components/EphiIcons.jsx';
import { generatePrecisionNatalChart } from '../lib/natal.js';
import EphiMarkdown from '../components/EphiMarkdown';
import NatalForm from '../components/NatalForm.jsx';
import SynastryGrid from '../components/SynastryGrid.jsx';
import { SynastryWheel } from '../components/AstroChartWheel.jsx';
import { useNatal } from '../hooks/useNatal.js';

import { store } from '../lib/store';
import { getBookForTool } from '../lib/library.js';
import ChartProfilePicker from '../components/ChartProfilePicker.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPartners() {
  try { return store.getJSON('astro_partners', []); }
  catch { return []; }
}

function savePartner(partner) {
  try {
    const existing = getPartners();
    const updated  = [partner, ...existing.filter(p => p.name !== partner.name)].slice(0, 10);
    store.setJSON('astro_partners', updated);
  } catch {}
}

const NATURE_COLOR  = { hard: 'var(--tense)', soft: 'var(--harmonic)', neutral: 'var(--neutral)' };
const GRADE_COLOR   = { A: 'var(--harmonic)', B: 'var(--harmonic)', C: 'var(--neutral)', D: 'var(--tense)', F: 'var(--tense)', 'N/A': 'var(--text-muted)' };

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ harmony, grade }) {
  const color = GRADE_COLOR[grade] || 'var(--neutral)';
  const r     = 36;
  const circ  = 2 * Math.PI * r;
  const dash  = (harmony / 100) * circ;

  return (
    <div className="synastry-score-ring-wrap">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="8" />
        <circle
          cx="44" cy="44" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="var(--font-serif)">{grade}</text>
      </svg>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600 }}>{harmony}% Harmony</div>
    </div>
  );
}

function AspectCard({ aspect, expanded, onToggle }) {
  if (!aspect?.p1 || !aspect?.p2) return null;
  const nc = NATURE_COLOR[aspect.nature] || 'var(--neutral)';
  return (
    <div
      className={`synastry-aspect-card ${expanded ? 'expanded' : ''}`}
      style={{ borderLeftColor: nc }}
      onClick={onToggle}
    >
      <div className="synastry-aspect-top">
        <div className="synastry-aspect-glyphs">
          <PlanetIcon name={(aspect.p1 || '').toLowerCase()} size={20} />
          <span style={{ color: nc, fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>
             <UiIcon name="sparkle" size={12} />
          </span>
          <PlanetIcon name={(aspect.p2 || '').toLowerCase()} size={20} />
        </div>
        <div className="synastry-aspect-mid">
          <div className="synastry-aspect-title">
            <span style={{ fontWeight: 700 }}>{aspect.metaFrom?.label}</span>
            <span className="synastry-aspect-dir"> ({aspect.labelFrom})</span>
            {' '}{aspect.aspectName}{' '}
            <span style={{ fontWeight: 700 }}>{aspect.metaTo?.label}</span>
            <span className="synastry-aspect-dir"> ({aspect.labelTo})</span>
          </div>
          <div className="synastry-aspect-sub">
            {aspect.displayFrom} · {aspect.displayTo}
          </div>
        </div>
        <div className="synastry-aspect-right">
          <div className="synastry-orb-val">{aspect.orb?.toFixed(1) || '0.0'}°</div>
          <div className="synastry-nature-badge" style={{ color: nc }}>{aspect.nature}</div>
        </div>
      </div>

      {expanded && aspect.core && (
        <div className="synastry-aspect-expanded">
          <p className="synastry-aspect-core">{aspect.core}</p>
          <div className="synastry-tap-hint">tap to collapse</div>
        </div>
      )}
      {!expanded && (
        <div className="synastry-tap-hint">tap to read</div>
      )}
    </div>
  );
}

function KeyConnectionCard({ aspect }) {
  if (!aspect?.p1 || !aspect?.p2) return null;
  const nc = NATURE_COLOR[aspect.nature] || 'var(--neutral)';
  return (
    <div className="synastry-key-card" style={{ borderColor: nc + '44' }}>
      <div className="synastry-key-header">
        <div className="synastry-key-icons">
          <PlanetIcon name={(aspect.p1 || '').toLowerCase()} size={18} />
          <UiIcon name="sparkle" size={10} color={nc} />
          <PlanetIcon name={(aspect.p2 || '').toLowerCase()} size={18} />
        </div>
        <span className="synastry-key-title">
          {aspect.metaFrom?.label} {aspect.aspectName} {aspect.metaTo?.label}
        </span>
        <span className="synastry-key-orb">{aspect.orb?.toFixed(1) || '0.0'}°</span>
      </div>
      <p className="synastry-key-core">{aspect.core}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SynastryPage() {
  const { natalChart, profiles, activeProfileId, setActiveProfile } = useNatal();
  const [natalA,        setNatalA]        = useState(null);
  const [natalB,        setNatalB]        = useState(null);
  const [nameA,         setNameA]         = useState('You');
  const [nameB,         setNameB]         = useState('Them');
  const [aspects,       setAspects]       = useState([]);
  const [score,         setScore]         = useState(null);
  const [keyConns,      setKeyConns]      = useState([]);
  const [grouped,       setGrouped]       = useState(null);
  const [status,        setStatus]        = useState('idle'); // idle|loading|done|error
  const [errorMsg,      setErrorMsg]      = useState('');
  const [expandedIdx,   setExpandedIdx]   = useState(null);
  const [activeTab,     setActiveTab]     = useState('key'); // key|soft|hard|all
  const [geminiText,    setGeminiText]    = useState('');
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [geminiError,   setGeminiError]   = useState('');
  const [partners,      setPartners]      = useState([]);
  const [puristMode,    setPuristMode]    = useState(false);

  useEffect(() => {
    const settings = store.getJSON('ephi_settings') || {};
    setPuristMode(settings.puristMode || false);
    setPartners(getPartners());
  }, []);

  useEffect(() => {
    setNatalA(natalChart || null);
    setNameA(natalChart?.meta?.name || 'You');
  }, [natalChart]);

  useEffect(() => {
    if (!natalA || !natalB) {
      if (!natalA) {
        setStatus('idle');
        setAspects([]);
        setScore(null);
        setKeyConns([]);
        setGrouped(null);
        setGeminiText('');
      }
      return;
    }

    const asp = getSynastryAspects(natalA, natalB);
    const sc = scoreSynastry(asp);
    setAspects(asp);
    setScore(sc);
    setKeyConns(getKeyConnections(asp, 5));
    setGrouped(groupAspectsByNature(asp));
    setStatus('done');
    setGeminiText('');
    setExpandedIdx(null);
  }, [natalA, natalB]);

  function selectProfileA(id) {
    setActiveProfile(id);
    const p = profiles.find(x => x.id === id);
    if (p?.chart) {
      setNatalA(p.chart);
      setNameA(p.label || p.chart.meta?.name || 'You');
    }
  }

  function loadProfileB(profile) {
    if (!profile?.chart) return;
    setNatalB(profile.chart);
    setNameB(profile.label || profile.chart.meta?.name || 'Them');
    const asp = getSynastryAspects(natalA, profile.chart);
    const sc = scoreSynastry(asp);
    setAspects(asp);
    setScore(sc);
    setKeyConns(getKeyConnections(asp, 5));
    setGrouped(groupAspectsByNature(asp));
    setStatus('done');
  }

  async function handleSubmitB(form) {
    if (!form.date) { setErrorMsg('Birth date is required.'); return; }
    if (!form.time) { setErrorMsg('Birth time is required.'); return; }
    setStatus('loading');
    setErrorMsg('');
    setGeminiText('');

    try {
      const natal = await generatePrecisionNatalChart(form);
      const bName = form.name?.trim() || 'Them';

      setNatalB(natal);
      setNameB(bName);

      const asp  = getSynastryAspects(natalA, natal);
      const sc   = scoreSynastry(asp);
      const keys = getKeyConnections(asp, 5);
      const grp  = groupAspectsByNature(asp);

      setAspects(asp);
      setScore(sc);
      setKeyConns(keys);
      setGrouped(grp);
      setStatus('done');

      savePartner({ name: bName, natal, date: form.date, savedAt: new Date().toISOString() });
      setPartners(getPartners());

    } catch (err) {
      setErrorMsg(err.message || 'Failed to calculate synastry.');
      setStatus('error');
    }
  }

  async function handleGemini() {
    if (!natalA || !natalB) return;
    setGeminiLoading(true);
    setGeminiError('');
    try {
      const { text } = await generateSynastryReading({
        nameA,
        chartA: natalA,
        nameB,
        chartB: natalB,
        aspects,
        score
      });
      setGeminiText(text);
    } catch (err) {
      setGeminiError(err.message);
    } finally {
      setGeminiLoading(false);
    }
  }

  function handleReset() {
    setNatalB(null);
    setAspects([]);
    setScore(null);
    setKeyConns([]);
    setGrouped(null);
    setStatus('idle');
    setGeminiText('');
    setExpandedIdx(null);
  }

  function handleLoadPartner(partner) {
    setNatalB(partner.natal);
    setNameB(partner.name);
    const asp  = getSynastryAspects(natalA, partner.natal);
    const sc   = scoreSynastry(asp);
    const keys = getKeyConnections(asp, 5);
    const grp  = groupAspectsByNature(asp);
    setAspects(asp);
    setScore(sc);
    setKeyConns(keys);
    setGrouped(grp);
    setGeminiText('');
    setStatus('done');
  }

  const displayAspects =
    activeTab === 'key'  ? keyConns :
    activeTab === 'soft' ? (grouped?.soft  || []) :
    activeTab === 'hard' ? (grouped?.hard  || []) :
    aspects;

  if (!natalA) {
    return (
      <div className="page-wrap">
        <div className="empty-state" style={{ paddingTop: '10vh' }}>
          <div style={{ marginBottom: '1.5rem' }}><PlanetIcon name="moon" size={48} color="var(--accent)" /></div>
          <h2 className="page-title" style={{ textAlign: 'center' }}>Set up your natal chart first</h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
            Go to the Transits page and enter your birth details before comparing charts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-header">
        <span className="page-label">Relationships</span>
        <h1 className="page-title">Synastry Playback</h1>
        <p className="page-subtitle">Compare your natal chart with another person's to reveal the energetic dynamics of your relationship.</p>
      </div>

      <ChartProfilePicker compact />

      <div className="reading-natal-summary ephi-card">
        <span className="reading-natal-label">Person A</span>
        <span className="reading-natal-value">
          {nameA} — {natalA.meta?.date || natalA.meta?.birthDate}
          {natalA.meta?.city || natalA.meta?.birthCity ? ` · ${natalA.meta?.city || natalA.meta?.birthCity}` : ''}
        </span>
      </div>

      {profiles.length > 1 && status !== 'done' && (
        <div className="card" style={{ padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Switch Person A</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {profiles.map(p => (
              <button
                key={p.id}
                type="button"
                className={`btn ${activeProfileId === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '0.78rem' }}
                onClick={() => selectProfileA(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {status !== 'done' ? (
        <>
          <NatalForm
            title={<span><UiIcon name="sparkle" size={16} color="var(--accent)" style={{marginRight:'8px'}} /> Person B — birth details</span>}
            buttonText="Compare Charts →"
            onSave={handleSubmitB}
            loading={status === 'loading'}
            error={errorMsg}
          />

          {(partners.length > 0 || profiles.filter(p => p.id !== activeProfileId).length > 0) && (
            <div className="synastry-saved-wrap">
              <div className="reading-past-label">Person B — saved charts</div>
              {profiles.filter(p => p.id !== activeProfileId).map(p => (
                <button key={p.id} type="button" className="reading-past-item" onClick={() => loadProfileB(p)}>
                  <span className="reading-past-focus">{p.label}</span>
                  <span className="reading-past-time">{p.chart?.meta?.date}</span>
                  <span className="reading-past-chevron">›</span>
                </button>
              ))}
              {partners.map((p, i) => (
                <button key={`partner-${i}`} type="button" className="reading-past-item" onClick={() => handleLoadPartner(p)}>
                  <span className="reading-past-focus">{p.name}</span>
                  <span className="reading-past-time">{p.date || p.birthDate}</span>
                  <span className="reading-past-chevron">›</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="synastry-results-header">
            <div className="reading-natal-summary ephi-card" style={{ flex: 1, marginBottom: 0 }}>
              <span className="reading-natal-label">{nameB}</span>
              <span className="reading-natal-value">{natalB?.meta?.date || natalB?.meta?.birthDate}</span>
            </div>
            <button className="btn btn-ghost" onClick={handleReset} style={{ whiteSpace: 'nowrap' }}>
              ← Compare another
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <SynastryWheel 
                personA={natalA} 
                personB={natalB} 
                aspects={aspects}
                onAspectClick={(asp) => {
                  if (asp.unknown) alert('Select an aspect from the list below for deep interpretation.');
                  else setExpandedIdx(aspects.indexOf(asp));
                }}
                size={480} 
              />
            </div>
          </div>

          {score && (
            <div className="synastry-score-card card">
              <ScoreRing harmony={score.harmony} grade={score.grade} />
              <div className="synastry-score-info">
                <div className="synastry-score-title">Compatibility — {nameA} & {nameB}</div>
                <div className="synastry-score-summary">{score.summary}</div>
                <div className="synastry-score-bars">
                  <div className="synastry-bar-row">
                    <span className="synastry-bar-label">Harmony</span>
                    <div className="synastry-bar-track">
                      <div className="synastry-bar-fill" style={{ width: `${score.harmony}%`, background: 'var(--harmonic)' }} />
                    </div>
                    <span className="synastry-bar-val" style={{ color: 'var(--harmonic)' }}>{score.harmony}%</span>
                  </div>
                  <div className="synastry-bar-row">
                    <span className="synastry-bar-label">Tension</span>
                    <div className="synastry-bar-track">
                      <div className="synastry-bar-fill" style={{ width: `${score.tension}%`, background: 'var(--tense)' }} />
                    </div>
                    <span className="synastry-bar-val" style={{ color: 'var(--tense)' }}>{score.tension}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="tab-bar" style={{ background: 'transparent', padding: 0, marginBottom: '1.5rem', justifyContent: 'flex-start', border: 'none' }}>
            {[
              { key: 'key',  label: `Key (${keyConns.length})` },
              { key: 'grid', label: 'Technical Grid' },
              { key: 'soft', label: `Soft (${grouped?.soft?.length || 0})` },
              { key: 'hard', label: `Hard (${grouped?.hard?.length || 0})` },
              { key: 'all',  label: `All (${aspects.length})` },
            ].map(tab => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); setExpandedIdx(null); }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'grid' && (
            <div style={{ marginBottom: '2rem' }}>
              <SynastryGrid aspects={aspects} />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                Rows: {nameA} · Columns: {nameB}
              </p>
            </div>
          )}

          {activeTab === 'key' && keyConns.length > 0 ? (
            <div className="synastry-key-list">
              {keyConns.map((asp, i) => (
                <KeyConnectionCard key={i} aspect={asp} />
              ))}
            </div>
          ) : (
            <div className="synastry-aspect-list">
              {displayAspects.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>No aspects in this category.</div>
              ) : (
                displayAspects.map((asp, i) => (
                  <AspectCard
                    key={i}
                    aspect={asp}
                    expanded={expandedIdx === i}
                    onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  />
                ))
              )}
            </div>
          )}

          <div className="reading-section">
            <div className="reading-section-title">AI Relationship Reading</div>
            {!isGeminiConfigured() ? (
              <div className="reading-banner-wrap card" style={{ minHeight: 'auto', padding: '2rem' }}>
                 <p style={{ color: 'var(--text-muted)' }}>Add <code>VITE_GEMINI_API_KEY</code> to enable readings.</p>
              </div>
            ) : geminiText ? (
              <div className="reading-body card"><EphiMarkdown text={geminiText} /></div>
            ) : geminiLoading ? (
              <div className="reading-loading-wrap">
                <div className="reading-loading-glyph"><UiIcon name="sparkle" size={32} /></div>
                <div className="reading-loading-msg">Reading your synastry…</div>
              </div>
            ) : (
              <div className="reading-banner-wrap card" style={{ minHeight: 'auto', padding: '2rem' }}>
                <p className="reading-banner-text">
                  Get a personalized reading for {nameA} & {nameB} based on their synastry aspects.
                  {(() => {
                    const books = getBookForTool('synastry').filter(b => b.uri && b.uri !== 'pending_upload');
                    if (books.length === 0) return null;
                    return (
                      <span style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--accent)' }}>
                        RAG active: {books.map(b => b.name).join(', ')} (bound under Synastry in Sys-Archive)
                      </span>
                    );
                  })()}
                </p>
                <button className="btn btn-primary" onClick={handleGemini}>
                  <UiIcon name="sparkle" size={18} /> Generate Reading
                </button>
                {geminiError && <div style={{ color: 'var(--tense)', marginTop: '1rem' }}>{geminiError}</div>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
