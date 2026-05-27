import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTransits } from '../hooks/useTransits.js';
import { useNatal } from '../hooks/useNatal.js';
import PlanetTable from '../components/PlanetTable.jsx';
import AspectList from '../components/AspectList.jsx';
import NatalForm from '../components/NatalForm.jsx';
import NatalSummary from '../components/NatalSummary.jsx';
import { NatalWheel, TransitWheel } from '../components/AstroChartWheel.jsx';
import { getZodiacInfo } from '../lib/ephemeris.js';
import { getActiveAspects } from '../lib/aspects.js';
import { calculateProfections } from '../lib/hellenistic.js';
import { PlanetIcon, ZodiacIcon, UiIcon } from '../components/EphiIcons.jsx';
import HouseTransits from '../components/HouseTransits.jsx';
import EphiTimePicker from '../components/EphiTimePicker.jsx';
import ChartProfilePicker from '../components/ChartProfilePicker.jsx';

import EphiMarkdown from '../components/EphiMarkdown.jsx';
import { useToast } from '../components/Toast';
import AdSlot from '../components/AdSlot.jsx';
import { store } from '../lib/store';
import { copyShareUrl } from '../lib/shareChart.js';

const TABS = [
  { id: 'sky',      label: 'Live Sky' },
  { id: 'transits', label: 'My Transits' },
  { id: 'natal',    label: 'Natal Chart' },
];

function scrubToParts(iso) {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

function partsToIso(dateStr, timeStr) {
  if (!dateStr) return null;
  const [h, m] = (timeStr || '12:00').split(':').map(Number);
  const local = new Date(dateStr);
  local.setHours(h, m, 0, 0);
  return local.toISOString();
}

const HOUSE_MEANINGS = {
  1: 'Self, Appearance, Vitality',
  2: 'Finances, Values, Resources',
  3: 'Communication, Siblings, Local Travel',
  4: 'Home, Roots, Family, Private Life',
  5: 'Creativity, Romance, Children, Joy',
  6: 'Health, Work, Routine, Service',
  7: 'Partnerships, Marriage, Open Enemies',
  8: 'Transformation, Shared Wealth, Taboo',
  9: 'Wisdom, Travel, Philosophy, Law',
  10: 'Career, Status, Public Reputation',
  11: 'Friendships, Groups, Hopes, Dreams',
  12: 'Solitude, Subconscious, Hidden Things',
};

function SummaryBar({ aspects, positions, natal }) {
  if (!aspects || !positions) return null;
  const total = aspects.length;
  const hard = aspects.filter(a => a.nature === 'hard').length;
  const soft = aspects.filter(a => a.nature === 'soft').length;
  
  const moonLon = positions['moon'];
  const moonZodiac = moonLon != null ? getZodiacInfo(moonLon) : null;

  // Annual Profections (Professional Timing)
  const profection = natal ? calculateProfections(natal.houses?.[0]?.longitude ?? natal.ascendant?.longitude, natal.meta.date) : null;

  return (
    <div style={{
      display: 'flex', gap: '1.25rem', 
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      padding: '0.75rem 1.25rem', borderRadius: '12px', margin: '0 0 1.25rem',
      flexWrap: 'wrap', fontSize: '0.82rem', alignItems: 'center',
      boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
    }}>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <span title="Hard Aspects (Challenges)"><strong style={{ color: 'var(--tense)' }}>{hard}</strong>H</span>
        <span title="Soft Aspects (Flow)"><strong style={{ color: 'var(--harmonic)' }}>{soft}</strong>S</span>
        <span><strong>{total}</strong> Total</span>
      </div>

      {profection && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderLeft: '1px solid var(--border)', paddingLeft: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Time Lord</span>
          <span className="pill" style={{ fontSize: '0.72rem', background: 'var(--accent-subtle)', color: 'var(--accent-dark)' }}>
            {profection.lord.toUpperCase()}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>in {profection.sign}</span>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Moon:</span>
        {moonZodiac && <span style={{ 
          background: 'var(--bg-deep)', border: '1px solid var(--border)',
          padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem',
          color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem'
        }}>
          <PlanetIcon name="moon" size={12} /> {moonZodiac.displayStr}
        </span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'sky';
  });

  const [puristMode, setPuristMode] = useState(false);

  useEffect(() => {
    const settings = store.getJSON('ephi_settings') || {};
    setPuristMode(settings.puristMode || false);

    const params = new URLSearchParams(location.search);
    if (params.get('tab')) setTab(params.get('tab'));
  }, [location.search]);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const { natalChart, saveChart, clearChart, loading: natalLoading, error: natalError } = useNatal();
  const [scrubDate, setScrubDate] = useState(null); // null = Live
  const { transitPositions, skyAspects, transitToNatal, lastUpdated, refresh, error: transitError } = useTransits(natalChart, 60_000, scrubDate);
  const [deepDive, setDeepDive] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const toast = useToast();

  const handleShare = async () => {
    if (!natalChart) return;
    try {
      await copyShareUrl(natalChart);
      setShareCopied(true);
      toast('Share URL copied to clipboard!');
      setTimeout(() => setShareCopied(false), 2500);
    } catch (e) {
      console.error('Share failed:', e);
      toast('Failed to generate share URL.');
    }
  };

  // Toast for ephemeris failure
  useEffect(() => {
    if (transitError) {
      toast(`Ephemeris error: ${transitError.message || 'Transit calculation failed.'}`);
    }
  }, [transitError, toast]);

  const jumpTime = (amount, unit) => {
    const baseDate = scrubDate ? new Date(scrubDate) : new Date();
    if (unit === 'd') {
      baseDate.setDate(baseDate.getDate() + amount);
    } else if (unit === 'w') {
      baseDate.setDate(baseDate.getDate() + amount * 7);
    } else if (unit === 'm') {
      baseDate.setMonth(baseDate.getMonth() + amount);
    }
    setScrubDate(baseDate.toISOString());
  };

  const handleTabKeyDown = (e) => {
    const currentIndex = TABS.findIndex(t => t.id === tab);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % TABS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
    } else {
      return;
    }

    e.preventDefault();
    const nextTabId = TABS[nextIndex].id;
    setTab(nextTabId);
    
    // Set focus to the newly activated tab button
    setTimeout(() => {
      document.getElementById(`tab-${nextTabId}`)?.focus();
    }, 0);
  };

  const handleSynthesize = async (asp) => {
    setDeepDive({ asp, loading: true, text: '' });
    try {
      const { generateAspectReading } = await import('../lib/gemini');
      const res = await generateAspectReading({
        transitPlanet: asp.transitPlanet,
        natalPlanet: asp.natalPlanet || asp.planet2,
        aspectName: asp.aspectName,
        natal: natalChart
      });
      setDeepDive({ asp, loading: false, text: res.text });
    } catch (err) {
      setDeepDive({ asp, loading: false, text: 'The Oracle is silent on this connection.' });
    }
  };

  const handleResetTime = () => {
    setScrubDate(null);
    toast('Returned to live sky.');
  };

  const handleSaveNatal = async (data) => {
    await saveChart(data);
    setIsEditing(false);
    setIsAddingNew(false);
  };

  return (
    <div className="page-wrap" style={{ maxWidth: '1100px' }}>
      <div className="page-header">
        <span className="page-label">Dashboard</span>
        <h1 className="page-title">Transit Observatory</h1>
      </div>

      <AdSlot type="banner" slotId="dashboard-top" />

      {natalChart && (
        <ChartProfilePicker
          onNewProfile={() => {
            setTab('natal');
            setIsAddingNew(true);
            setIsEditing(true);
          }}
        />
      )}

      {/* Tab bar */}
      <nav className="tab-bar" role="tablist" onKeyDown={handleTabKeyDown}>
        {TABS.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            role="tab"
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Refresh info bar */}
      <div className="refresh-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          {scrubDate ? (
            <strong style={{ color: 'var(--accent)' }}>✦ TIME TRAVEL MODE: {new Date(scrubDate).toLocaleString()}</strong>
          ) : (
            'VSOP87 series · Julian Day computation · 60s intervals'
          )}
        </span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {scrubDate && (
            <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.72rem', color: 'var(--tense)' }} onClick={handleResetTime}>
              Reset to Live
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '0.25rem 0.75rem', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }} onClick={refresh}>
            <UiIcon name="refresh" size={13} /> {scrubDate ? 'Recalculate' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Transit Time Picker (live sky + personal transits only) ── */}
      {(tab === 'sky' || tab === 'transits') && <div className="card" style={{
        margin: '1rem 0 2rem',
        padding: '1rem 1.5rem',
        borderLeft: scrubDate ? '3px solid var(--accent)' : '1px solid var(--border)',
        transition: 'border-color 0.3s ease',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            View Transit For
          </span>

          {(() => {
            const parts = scrubToParts(scrubDate);
            return (
              <div style={{ display: 'flex', flex: 1, minWidth: '240px', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="date"
                  value={parts.date}
                  onChange={(e) => setScrubDate(partsToIso(e.target.value, parts.time))}
                  style={{
                    flex: '1 1 140px',
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.85rem',
                    colorScheme: 'dark',
                  }}
                />
                <span className="ephi-time-sep" aria-hidden="true">at</span>
                <div style={{ flex: '1 1 120px', minWidth: '110px' }}>
                  <EphiTimePicker
                    value={parts.time}
                    onChange={(t) => setScrubDate(partsToIso(parts.date, t))}
                    placeholder="Select time"
                  />
                </div>
              </div>
            );
          })()}

          {/* Quick-jump buttons */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(-1, 'd')} title="Subtract 1 day">-1d</button>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(1, 'd')} title="Add 1 day">+1d</button>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(-1, 'w')} title="Subtract 1 week">-1w</button>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(1, 'w')} title="Add 1 week">+1w</button>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(-1, 'm')} title="Subtract 1 month">-1m</button>
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.72rem', minWidth: '36px', height: '36px', justifyContent: 'center' }} onClick={() => jumpTime(1, 'm')} title="Add 1 month">+1m</button>
          </div>

          <button
            className="btn btn-ghost"
            onClick={handleResetTime}
            style={{
              fontSize: '0.78rem',
              padding: '8px 14px',
              color: scrubDate ? 'var(--accent)' : 'var(--text-muted)',
              borderColor: scrubDate ? 'var(--accent)' : 'var(--border)',
              whiteSpace: 'nowrap'
            }}
          >
            {scrubDate ? '✦ Live' : 'Live Sky'}
          </button>
        </div>

        {scrubDate && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-dark)' }}>
            Snapshot: {new Date(scrubDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
          </div>
        )}
      </div>}

      {/* ── Tab: Live Sky ─────────────────────────────────────────── */}
      {tab === 'sky' && (
        <div className="dashboard-grid">
          {/* Left Column: Observatory */}
          <div style={{ position: 'sticky', top: '2rem' }}>
            <div className="card" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', padding: '2.5rem' }}>
              <NatalWheel 
                natal={transitPositions} 
                aspects={skyAspects} 
                onAspectClick={(asp) => {
                  if (asp.unknown) toast('Select an aspect from the list for deep interpretation.');
                  else handleSynthesize(asp);
                }}
                onHouseClick={(num) => toast(`House ${num}: ${HOUSE_MEANINGS[num]}`)}
                size={480} 
              />
            </div>
            <SummaryBar aspects={skyAspects} positions={transitPositions} />
          </div>

          {/* Right Column: Inventory & Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                <strong>The Live Sky.</strong> This maps the exact geometry of the planets at this moment. The inventory below tracks their positions, while the aspect list identifies the archetypal conversations occurring between them.
              </p>
            </div>
            <PlanetTable positions={transitPositions} natal={natalChart} />
            <AspectList
              aspects={skyAspects}
              title="Current Sky Aspects"
              emptyMsg="No notable aspects in the sky right now."
              onSynthesize={puristMode ? null : handleSynthesize}
            />
          </div>
        </div>
      )}

      {/* ── Tab: My Transits ──────────────────────────────────────── */}
      {tab === 'transits' && (
        natalChart ? (
          <div className="dashboard-grid">
            {/* Left Column: Personal Observatory */}
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', padding: '2.5rem' }}>
                <TransitWheel 
                  natal={natalChart} 
                  transits={transitPositions} 
                  aspects={transitToNatal}
                  onAspectClick={(asp) => {
                    if (asp.unknown) toast('Select a transit aspect from the list for deep interpretation.');
                    else handleSynthesize(asp);
                  }}
                  onHouseClick={(num) => toast(`House ${num}: ${HOUSE_MEANINGS[num]}`)}
                  size={480} 
                />
              </div>
              <SummaryBar aspects={transitToNatal} positions={transitPositions} natal={natalChart} />
            </div>

            {/* Right Column: Personal Impacts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  <strong>Your Personal Transits.</strong> The inner wheel is your birth chart; the outer wheel is the sky today. The list below interprets how these movements are activating your unique potential.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to="/progressions" className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UiIcon name="sparkle" size={13} />
                    Secondary Progressions
                  </Link>
                </div>
              </div>
              <PlanetTable positions={transitPositions} natal={natalChart} />
              <HouseTransits transitPositions={transitPositions} natalChart={natalChart} />
              <AspectList
                aspects={transitToNatal}
                title={`Transits to ${natalChart.meta.name}'s Chart`}
                emptyMsg="No transit aspects to your natal chart right now."
                onSynthesize={puristMode ? null : handleSynthesize}
              />
            </div>
          </div>
        ) : (
          <div className="empty-state" style={{ paddingTop: '5rem' }}>
            <div style={{ marginBottom: '1rem' }}><PlanetIcon name="moon" size={32} color="var(--accent)" /></div>
            <div style={{ color: 'var(--text-secondary)' }}>
              Enter your birth details in the <strong>Natal Chart</strong> tab
              <br />to see transits personalised to your chart.
            </div>
          </div>
        )
      )}

      {/* ── Tab: Natal Chart ──────────────────────────────────────── */}
      {tab === 'natal' && (
        natalChart && !isEditing ? (
          <div className="dashboard-grid">
            {/* Left Column: The Blueprint */}
            <div style={{ position: 'sticky', top: '2rem' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
                <NatalWheel 
                  natal={natalChart} 
                  aspects={natalChart.positions ? getActiveAspects(natalChart.positions) : []}
                  onAspectClick={(asp) => {
                    if (asp.unknown) toast('Select an aspect from the summary for deep interpretation.');
                    else handleSynthesize(asp);
                  }}
                  onHouseClick={(num) => toast(`House ${num}: ${HOUSE_MEANINGS[num]}`)}
                  size={480} 
                />
              </div>
            </div>

            {/* Right Column: Analysis */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  <strong>Your Natal Blueprint.</strong> This is the snapshot of the cosmos at your first breath. It represents your fundamental architecture and the soul's primary curriculum.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleShare}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', alignSelf: 'flex-start', fontSize: '0.8rem', padding: '8px 16px' }}
                >
                  <UiIcon name="sparkle" size={12} />
                  {shareCopied ? '✓ Copied!' : '⎘ Share Chart'}
                </button>
              </div>
              <NatalSummary chart={natalChart} onClear={() => setIsEditing(true)} />
            </div>
          </div>
        ) : (
          <NatalForm
            title={isAddingNew ? '✦ New chart profile' : 'Your Birth Chart'}
            buttonText={isAddingNew ? 'Save new profile' : 'Generate Natal Chart'}
            initialData={isAddingNew ? undefined : natalChart?.meta}
            newProfile={isAddingNew}
            onSave={handleSaveNatal}
            onCancel={natalChart ? () => { setIsEditing(false); setIsAddingNew(false); } : undefined}
            loading={natalLoading}
            error={natalError}
          />
        )
      )}
      
      {/* Deep Dive Modal */}
      {deepDive && (
        <div className="reading-modal-overlay" onClick={() => setDeepDive(null)}>
          <div className="reading-modal-content card" style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '10px', background: 'var(--bg-deep)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                  <UiIcon name="sparkle" size={20} color="var(--accent)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', textTransform: 'capitalize' }}>
                  {deepDive.asp.transitPlanet} {deepDive.asp.aspectName} {deepDive.asp.natalPlanet || deepDive.asp.planet2}
                </h3>
              </div>
              <button onClick={() => setDeepDive(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
            </div>

            {deepDive.loading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }} />
                <p>Consulting the archives...</p>
              </div>
            ) : (
              <div className="reading-body" style={{ padding: 0 }}>
                <EphiMarkdown text={deepDive.text} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
