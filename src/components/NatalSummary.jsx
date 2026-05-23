/**
 * src/components/NatalSummary.jsx
 * Shows saved natal chart identity — sun/moon/rising + planet table.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ALL_PLANETS, PLANET_META, getZodiacInfo, getPlanetPositions } from '../lib/ephemeris.js';
import { SIGN_RULERS } from '../lib/astronomy.js';
import { calculateDignity, calculateLots } from '../lib/hellenistic.js';
import { PlanetIcon, ZodiacIcon, UiIcon } from './EphiIcons.jsx';
import { getActiveAspects } from '../lib/aspects.js';
import { detectPatterns } from '../lib/patterns.js';

const BIG_THREE = [
  { key: 'sunSign',   label: 'Sun',    planet: 'sun' },
  { key: 'moonSign',  label: 'Moon',   planet: 'moon' },
  { key: 'risingSign',label: 'Rising', planet: 'rising' },
];

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const NATAL_PLANET_KEYWORDS = {
  sun: 'Your core identity, vital energy, and conscious purpose',
  moon: 'Your emotional needs, instincts, and inner world',
  mercury: 'Your communication style, learning process, and intellect',
  venus: 'Your values, relationship needs, and aesthetic tastes',
  mars: 'Your drive, assertiveness, and how you take action',
  jupiter: 'Where you find growth, luck, and your philosophical outlook',
  saturn: 'Where you face restrictions, build discipline, and mature',
  uranus: 'Where you seek freedom, rebel, and innovate',
  neptune: 'Where you experience idealism, illusions, and spiritual connection',
  pluto: 'Where you face deep transformation, power dynamics, and rebirth',
};

const NATAL_SIGN_KEYWORDS = {
  Aries: 'in a bold, pioneering, and fast-paced way.',
  Taurus: 'with a focus on stability, endurance, and physical comfort.',
  Gemini: 'through curiosity, adaptability, and an exchange of ideas.',
  Cancer: 'sensitively, protectively, and with emotional depth.',
  Leo: 'with dramatic flair, warmth, and a need for creative expression.',
  Virgo: 'analytically, practically, and with a focus on refinement.',
  Libra: 'seeking balance, harmony, and partnership.',
  Scorpio: 'intensely, strategically, and with a desire for profound truth.',
  Sagittarius: 'optimistically, philosophically, and with a need for freedom.',
  Capricorn: 'with ambition, discipline, and pragmatism.',
  Aquarius: 'innovatively, objectively, and unconventionally.',
  Pisces: 'imaginatively, empathetically, and fluidly.',
};

const HOUSE_NAMES = [
  '1st House (Identity, Self, Appearance)',
  '2nd House (Values, Finances, Resources)',
  '3rd House (Communication, Learning, Local)',
  '4th House (Home, Family, Roots, Private Life)',
  '5th House (Creativity, Romance, Joy, Children)',
  '6th House (Health, Daily Routines, Work)',
  '7th House (Partnerships, Marriage, 1-on-1s)',
  '8th House (Transformation, Shared Resources, Shadow)',
  '9th House (Higher Learning, Travel, Beliefs)',
  '10th House (Career, Public Image, Calling)',
  '11th House (Community, Friends, Future Vision)',
  '12th House (Subconscious, Retreat, Spirituality)'
];

const HOUSE_THEMES = [
  "projects your identity, vitality, and first impressions onto the world.",
  "influences your values, personal finances, and sense of security.",
  "is expressed through your mind, local community, and how you share ideas.",
  "shapes your private life, family roots, and emotional foundation.",
  "is channeled into creativity, romance, children, and personal pleasure.",
  "manifests through your daily work, health habits, and sense of duty.",
  "plays out in your committed relationships, business partnerships, and open interactions.",
  "influences shared resources, deep intimacy, and personal evolution.",
  "seeks expansion through higher education, travel, and spiritual philosophies.",
  "drives your public status, career ambitions, and overall legacy.",
  "is expressed through your social networks, friendships, and future hopes.",
  "is focused on your inner life, subconscious, and spiritual release."
];

import { calculateBaZi } from '../lib/bazi.js';

export default function NatalSummary({ chart, onClear }) {
  if (!chart) {
    return (
      <div className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', opacity: 0.6, animation: 'ephi-pulse-glow 2s infinite ease-in-out' }}>
        <div style={{ height: '32px', width: '40%', background: 'var(--bg-secondary)', borderRadius: '8px' }} />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-secondary)' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
            <div style={{ height: '16px', width: '100%', background: 'var(--bg-secondary)', borderRadius: '4px' }} />
            <div style={{ height: '16px', width: '80%', background: 'var(--bg-secondary)', borderRadius: '4px' }} />
          </div>
        </div>
      </div>
    );
  }
  const { meta, positions } = chart;
  const isSidereal = !!meta.sidereal;
  const ascSignIndex = chart.risingSign ? SIGNS.indexOf(chart.risingSign) : null;

  const bazi = useMemo(() => {
    const d = new Date(meta.date + 'T' + meta.time);
    return calculateBaZi(d);
  }, [meta.date, meta.time]);

  // Calculate alternate system for side-by-side comparison
  const alternatePositions = useMemo(() => {
    const d = new Date(meta.date + 'T' + meta.time);
    const altOptions = { sidereal: !isSidereal, lat: meta.lat, lon: meta.lon };
    // We need to approximate Asc for the alternate system too if we want Part of Fortune etc.
    // For now, let's just get the raw planetary longitudes
    return getPlanetPositions(d, null, altOptions);
  }, [meta, isSidereal]);

  const natalAspects = useMemo(() => {
    if (!positions) return [];
    const all = getActiveAspects(positions);
    const validPlanets = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
    return all.filter(a => validPlanets.includes(a.transitPlanet) && validPlanets.includes(a.natalPlanet) && a.orb <= 8);
  }, [positions]);

  const chartRulerInfo = useMemo(() => {
    if (!chart.risingSign || !positions) return null;
    const rulerKeys = SIGN_RULERS[chart.risingSign];
    const planetKey = rulerKeys.traditional;
    const lon = positions[planetKey];
    if (lon == null) return null;
    const zodiac = getZodiacInfo(lon);
    const metaObj = PLANET_META[planetKey];

    let houseNum = null;
    if (ascSignIndex !== null) {
      const signIdx = SIGNS.indexOf(zodiac.sign);
      houseNum = (signIdx - ascSignIndex + 12) % 12;
    }

    return { planetKey, zodiac, meta: metaObj, houseNum, houseLabel: houseNum !== null ? HOUSE_NAMES[houseNum] : '' };
  }, [chart.risingSign, positions, ascSignIndex]);

  const patterns = useMemo(() => {
    if (!positions) return [];
    return detectPatterns(positions);
  }, [positions]);

  const dignities = useMemo(() => {
    if (!positions) return {};
    const res = {};
    Object.keys(positions).forEach(p => {
      // Ensure we pass the raw longitude number
      const lon = typeof positions[p] === 'number' ? positions[p] : positions[p].longitude;
      res[p] = calculateDignity(p, lon, meta.isDay);
    });
    return res;
  }, [positions, meta.isDay]);

  const lots = useMemo(() => {
    if (!positions) return null;
    // Fallback to ascendant longitude if full house system isn't present
    const ascLon = chart.houses?.[0]?.longitude ?? chart.ascendant?.longitude;
    if (ascLon == null) return null;

    const getLon = (p) => typeof positions[p] === 'number' ? positions[p] : positions[p].longitude;

    return calculateLots(
      ascLon,
      getLon('sun'), getLon('moon'), getLon('mars'),
      getLon('jupiter'), getLon('saturn'), getLon('venus'), getLon('mercury'),
      meta.isDay
    );
  }, [positions, chart.houses, chart.ascendant, meta.isDay]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', marginTop: '1rem' }}>
      {/* Identity Header */}
      <div className="card" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '-1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{meta.name}</div>
              <span className="pill" style={{ fontSize: '0.65rem', padding: '3px 10px', borderRadius: '4px' }}>
                {isSidereal ? 'Sidereal (Vedic)' : 'Tropical (Western)'}
              </span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {meta.date} · {meta.timeUnknown ? 'Unknown (≈ noon)' : meta.time} · {meta.city}
            </div>
          </div>
          <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }} onClick={onClear}>
            Modify Data <UiIcon name="edit" size={12} />
          </button>
        </div>
      </div>

      {/* Layered Analysis: Surface to Roots */}
      <section id="layer-persona">
        <h3 style={{ 
          fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', 
          letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span style={{ width: '24px', height: '1px', background: 'var(--border)' }}></span>
          Layer 1: The Persona & Vitality
        </h3>
          <div className="responsive-grid-3">
            {BIG_THREE.map(({ key, label, planet }) => (
              <div key={key} className="stat-block">
                <div style={{ marginBottom: '0.5rem', opacity: 0.8 }}><PlanetIcon name={planet} size={28} color="var(--accent)" /></div>
                <div className="stat-value" style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{chart[key]}</div>
                <div className="stat-label" style={{ fontSize: '0.7rem', opacity: 0.6 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '1.25rem' }}>
            {chartRulerInfo && (
              <div style={{ padding: '1.25rem', background: 'var(--accent-subtle)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.25rem', border: '1px solid var(--accent)' }}>
                <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '50%', border: `1px solid ${chartRulerInfo.meta.color}40`, display: 'flex' }}>
                  <PlanetIcon name={chartRulerInfo.planetKey} size={32} color={chartRulerInfo.meta.color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--accent-dark)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '0.2rem' }}>Steering the Life (Chart Ruler)</div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.4, fontFamily: 'var(--font-serif)' }}>
                    Your path is guided by <strong>{chartRulerInfo.meta.label}</strong> in <strong>{chartRulerInfo.zodiac.sign}</strong>. This planet acts as your primary navigator, focusing your vital energy through the lens of the <strong>{chartRulerInfo.houseLabel.split(' (')[0]}</strong>.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Layer 2: The Engine (Internal Dynamics) */}
        <section id="layer-engine">
          <h3 style={{ 
            fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', 
            letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--border)' }}></span>
            Layer 2: The Internal Engine (Aspects & Patterns)
          </h3>
          {patterns.length > 0 ? (
            <div className="responsive-grid-2">
              {patterns.map((p, i) => (
                <div key={i} className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent)' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{p.type}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{p.description}</div>
                  <div style={{ marginTop: '1rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-dark)', textTransform: 'uppercase' }}>Strategic Focus: {p.focus}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No major geometric patterns detected. The internal engine operates through direct aspects.
            </div>
          )}
        </section>

        {/* Layer 3: The Essence (Root Foundation) */}
        <section id="layer-essence">
          <h3 style={{ 
            fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', 
            letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            <span style={{ width: '24px', height: '1px', background: 'var(--border)' }}></span>
            Layer 3: The Essence & Soul Foundation
          </h3>
          <div className="responsive-grid-2">
            {/* Essential Dignity Matrix */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-deep)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800, marginBottom: '1rem' }}>Planetary Power (Essential Dignities)</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                This matrix measures the raw strength and "purity" of your planets based on traditional medieval scoring. High scores indicate planets that operate with natural ease; low scores indicate areas where the planet is "peregrine" or challenged.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {['sun','moon','mercury','venus','mars','jupiter','saturn'].map(pKey => {
                  const d = dignities[pKey];
                  const p = PLANET_META[pKey];
                  return (
                    <div key={pKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <PlanetIcon name={pKey} size={14} color={p.color} />
                        <span style={{ fontWeight: 600 }}>{p.label}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 6px', borderRadius: '4px' }}>{d.status}</span>
                        <span style={{ 
                          fontWeight: 800, 
                          color: d.score > 0 ? 'var(--harmonic)' : d.score < 0 ? 'var(--tense)' : 'var(--text-muted)',
                          minWidth: '24px', textAlign: 'right'
                        }}>{d.score > 0 ? `+${d.score}` : d.score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hermetic Lots */}
            <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-deep)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 800, marginBottom: '1rem' }}>Hermetic Lots (Soul Anchors)</div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                Lots are mathematical points representing the intersection of planetary cycles. They act as "soul anchors" that ground your consciousness into physical and social reality.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {lots && Object.entries(lots).map(([key, info]) => (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'capitalize' }}>Lot of {key}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem' }}>{info.degree}° {info.sign}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {key === 'fortune' ? 'The "Body": Health, prosperity, and physical circumstances.' : 
                       key === 'spirit' ? 'The "Soul": Volition, intent, and social contribution.' : 
                       key === 'eros' ? 'The "Heart": Friendships, desires, and social bonds.' : 
                       key === 'necessity' ? 'The "Mind": Constraints, unavoidable duties, and logic.' :
                       key === 'victory' ? 'The "Will": Success through effort, competition, and victory.' :
                       key === 'nemesis' ? 'The "Limit": Challenges from others, justice, and hidden enemies.' :
                       'The "Action": Courage, initiative, and the force of will.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>


      {/* Natal planet table */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: '1rem' }}>Natal Placements</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ALL_PLANETS.map(key => {
            const lon = positions?.[key];
            if (lon == null) return null;
            
            const metaObj = PLANET_META[key];
            const zodiac = getZodiacInfo(lon);
            const transitSignIndex = SIGNS.indexOf(zodiac.sign);
            
            let houseString = null;
            let houseNum = null;
            if (ascSignIndex !== null && transitSignIndex !== -1) {
              houseNum = (transitSignIndex - ascSignIndex + 12) % 12;
              houseString = HOUSE_NAMES[houseNum];
            }

            const interpretation = `${NATAL_PLANET_KEYWORDS[key]} is expressed ${NATAL_SIGN_KEYWORDS[zodiac.sign] || ''}`;
            
            let houseTheme = null;
            if (houseNum !== null) {
              houseTheme = `This energy ${HOUSE_THEMES[houseNum]}`;
            }

            return (
              <div key={key} style={{
                display: 'flex', flexDirection: 'column', gap: '0.4rem',
                background: 'var(--bg-surface)', padding: '0.8rem 1rem',
                borderRadius: '8px', borderLeft: `3px solid ${metaObj.color}`,
                borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <PlanetIcon name={key} size={18} color={metaObj.color} />
                    <strong style={{ fontSize: '0.95rem' }}>{metaObj.label} in {zodiac.sign}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <ZodiacIcon name={zodiac.sign.toLowerCase()} size={14} color="currentColor" />
                    <span>{zodiac.displayStr}</span>
                  </div>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {interpretation} {houseTheme && <span>{houseTheme}</span>}
                </div>
                
                {houseString && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-dark)', marginTop: '0.2rem', fontWeight: 500 }}>
                    ✦ Placed in your {houseString}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Natal Aspects table */}
      {natalAspects.length > 0 && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: '1rem' }}>Notable Aspects</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {natalAspects.map((aspect, idx) => {
              const p1 = PLANET_META[aspect.transitPlanet];
              const p2 = PLANET_META[aspect.natalPlanet];
              
              let aspectColor = 'var(--text-secondary)';
              if (aspect.nature === 'hard') aspectColor = '#e06c75';
              else if (aspect.nature === 'soft') aspectColor = '#98c379';
              
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.75rem', background: 'var(--bg-surface)',
                  border: '1px solid var(--border)', borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                    <PlanetIcon name={aspect.transitPlanet} size={16} color={p1.color} />
                    <span style={{ margin: '0 0.25rem', color: aspectColor, fontSize: '1.2rem' }}>{aspect.symbol}</span>
                    <PlanetIcon name={aspect.natalPlanet} size={16} color={p2.color} />
                    <span style={{ fontSize: '0.9rem' }}>
                      {p1.label} {aspect.aspectName} {p2.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Orb: {aspect.orb.toFixed(1)}°
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PillarItem({ label, pillar }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{pillar.label}</div>
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{pillar.element} {pillar.animal}</div>
    </div>
  );
}

function StatItem({ label, sign, planet }) {
  return (
    <div className="stat-block">
      <div style={{ marginBottom: '0.25rem', opacity: 0.8 }}>
        <PlanetIcon name={planet || 'sun'} size={22} color="var(--accent)" />
      </div>
      <div className="stat-value" style={{ fontSize: '1rem' }}>{sign}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
