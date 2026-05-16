// src/components/AstroChartWheel.jsx
// Custom SVG chart wheel — Astro-Seek grade quality.
// No external chart library dependency.

import { useMemo, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

const SIGN_GLYPHS = {
  Aries:'♈', Taurus:'♉', Gemini:'♊', Cancer:'♋', Leo:'♌', Virgo:'♍',
  Libra:'♎', Scorpio:'♏', Sagittarius:'♐', Capricorn:'♑', Aquarius:'♒', Pisces:'♓',
};

const SIGN_COLORS = [
  '#fce4e4','#e8f5e9','#fff9c4','#e3f2fd',
  '#ffe0b2','#f1f8e9','#e0f2f1','#f3e5f5',
  '#fff3e0','#efebe9','#e1f5fe','#e8eaf6',
];

const ELEMENT_COLORS = {
  fire:'#e06c75', earth:'#98c379', air:'#61afef', water:'#c678dd',
};

const SIGN_ELEMENTS = {
  Aries:'fire', Leo:'fire', Sagittarius:'fire',
  Taurus:'earth', Virgo:'earth', Capricorn:'earth',
  Gemini:'air', Libra:'air', Aquarius:'air',
  Cancer:'water', Scorpio:'water', Pisces:'water',
};

const PLANET_GLYPHS = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇',
  node:'☊', nnode:'☊', snode:'☋', lilith:'⚸', fortune:'⊕',
};

const PLANET_COLORS = {
  sun:'#f5a623', moon:'#a0a0d0', mercury:'#7ec8e3', venus:'#98c379',
  mars:'#e06c75', jupiter:'#c678dd', saturn:'#c0a070', uranus:'#56b6c2',
  neptune:'#6ba8d6', pluto:'#e5c07b', node:'#aaaaaa', nnode:'#aaaaaa', snode:'#aaaaaa',
};

const ASPECT_CONFIG = {
  conjunction: { deg:0,   color:'#C9A84C', width:2.5, dash:'' },
  opposition:  { deg:180, color:'#e06c75', width:2.0, dash:'' },
  square:      { deg:90,  color:'#e06c75', width:1.5, dash:'' },
  trine:       { deg:120, color:'#5CB87A', width:1.5, dash:'' },
  sextile:     { deg:60,  color:'#5B7FD4', width:1.0, dash:'4,3' },
  quincunx:    { deg:150, color:'#888888', width:0.8, dash:'3,4' },
  semisextile: { deg:30,  color:'#aaaaaa', width:0.8, dash:'2,4' },
};

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Convert ecliptic longitude to SVG angle (0° Aries = 9 o'clock, clockwise) */
function eclipticToSvgAngle(lon, ascendant = 0) {
  // Rotate so ascendant is on the left (180° in SVG terms)
  return (180 - (lon - ascendant) + 360) % 360;
}

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx, cy, r, startDeg, endDeg) {
  const s = polarToXY(cx, cy, r, startDeg);
  const e = polarToXY(cx, cy, r, endDeg);
  const large = ((endDeg - startDeg + 360) % 360) > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

// ─── Main SVG Component ───────────────────────────────────────────────────────

export default function AstroChartWheel({
  natal,
  transits   = null,
  aspects    = [],
  size       = 500,
  mode       = 'natal',
  onAspectClick = null,
  onHouseClick  = null,
}) {
  const cx = size / 2;
  const cy = size / 2;

  // Radii
  const R = {
    outer:     size * 0.498,  // outermost clip
    ruler:     size * 0.478,  // degree tick outer edge
    rulerIn:   size * 0.445,  // degree tick inner edge
    signOuter: size * 0.445,
    signInner: size * 0.385,
    signGlyph: size * 0.415,
    cuspsOuter:size * 0.385,
    cuspsInner:size * 0.310,
    houseNum:  size * 0.348,
    planets:   size * 0.268,
    aspectRing:size * 0.220,
    center:    size * 0.150,
  };

  // Extract ascendant longitude
  const ascLon = useMemo(() => {
    if (!natal) return 0;
    if (natal.ascendant?.longitude != null) return natal.ascendant.longitude;
    if (natal.asc?.longitude != null) return natal.asc.longitude;
    if (typeof natal.ascendant === 'number') return natal.ascendant;
    if (natal.cusps?.[0]) return typeof natal.cusps[0] === 'object' ? natal.cusps[0].longitude : natal.cusps[0];
    return 0;
  }, [natal]);

  // Extract cusps
  const cusps = useMemo(() => {
    if (!natal) return Array.from({length:12}, (_,i) => i*30);
    if (natal.cusps && natal.cusps.length >= 12) {
      return natal.cusps.map(c => typeof c === 'object' ? c.longitude : c);
    }
    // Whole-sign fallback
    const ascSign = Math.floor(((ascLon % 360) + 360) % 360 / 30);
    return Array.from({length:12}, (_,i) => (ascSign*30 + i*30) % 360);
  }, [natal, ascLon]);

  // Extract planets
  const planets = useMemo(() => {
    if (!natal) return [];
    const src = natal.positions || natal.planets || natal;
    return Object.entries(src)
      .filter(([k]) => PLANET_GLYPHS[k.toLowerCase()])
      .map(([k, v]) => {
        const lon = typeof v === 'object' ? v.longitude : v;
        if (lon == null || isNaN(lon)) return null;
        const deg = Math.floor(((lon % 360) + 360) % 360);
        const min = Math.floor((((lon % 360) + 360) % 360 - deg) * 60);
        const retrograde = v?.retrograde || v?.isRetrograde || (v?.speed != null && v.speed < 0);
        return { key: k.toLowerCase(), lon: ((lon % 360) + 360) % 360, deg, min, retrograde };
      })
      .filter(Boolean);
  }, [natal]);

  // Transit planets
  const transitPlanets = useMemo(() => {
    if (!transits) return [];
    const src = transits.positions || transits.planets || transits;
    return Object.entries(src)
      .filter(([k]) => PLANET_GLYPHS[k.toLowerCase()])
      .map(([k, v]) => {
        const lon = typeof v === 'object' ? v.longitude : v;
        if (lon == null || isNaN(lon)) return null;
        const deg = Math.floor(((lon % 360) + 360) % 360);
        const min = Math.floor((((lon % 360) + 360) % 360 - deg) * 60);
        const retrograde = v?.retrograde || v?.isRetrograde || (v?.speed != null && v.speed < 0);
        return { key: k.toLowerCase(), lon: ((lon % 360) + 360) % 360, deg, min, retrograde };
      })
      .filter(Boolean);
  }, [transits]);

  // Spread planets to avoid overlap
  function spreadPlanets(planetList, radius) {
    if (!planetList.length) return [];
    const sorted = [...planetList].sort((a,b) => a.lon - b.lon);
    const MIN_GAP_DEG = 7;
    const result = sorted.map(p => ({ ...p, displayLon: p.lon }));
    for (let iter = 0; iter < 5; iter++) {
      for (let i = 0; i < result.length; i++) {
        const prev = result[(i - 1 + result.length) % result.length];
        let diff = (result[i].displayLon - prev.displayLon + 360) % 360;
        if (diff < MIN_GAP_DEG) {
          result[i].displayLon = (result[i].displayLon + (MIN_GAP_DEG - diff) / 2 + 360) % 360;
          prev.displayLon = (prev.displayLon - (MIN_GAP_DEG - diff) / 2 + 360) % 360;
        }
      }
    }
    return result;
  }

  const spreadNatal   = useMemo(() => spreadPlanets(planets,   R.planets),   [planets]);
  const spreadTransit = useMemo(() => spreadPlanets(transitPlanets, R.planets * 1.38), [transitPlanets]);

  const toAngle = useCallback((lon) => eclipticToSvgAngle(lon, ascLon), [ascLon]);

  const handleDownload = () => {
    const svg = document.querySelector(`[data-ephi-chart] svg`);
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const scale = 3;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.download = `ephi-chart-${Date.now()}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(data)));
  };

  if (!natal) return null;

  // ── SVG Build ────────────────────────────────────────────────────────────────

  return (
    <div style={{ position:'relative', width:size, height:size, margin:'0 auto' }} data-ephi-chart>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:'block' }}>

        {/* White background circle */}
        <circle cx={cx} cy={cy} r={R.outer} fill="#ffffff" stroke="#e0e0e0" strokeWidth="1"/>

        {/* ── 1. Degree ruler ring ─────────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.ruler}  fill="none" stroke="#cccccc" strokeWidth="0.5"/>
        <circle cx={cx} cy={cy} r={R.rulerIn} fill="#f8f9fa" stroke="#cccccc" strokeWidth="0.5"/>
        {Array.from({length:360}, (_,i) => {
          const isMajor = i % 10 === 0;
          const isMid   = i % 5 === 0;
          const tickLen = isMajor ? R.ruler - R.rulerIn : isMid ? (R.ruler - R.rulerIn)*0.6 : (R.ruler - R.rulerIn)*0.35;
          const ang = toAngle(i);
          const outer = polarToXY(cx, cy, R.ruler, ang);
          const inner = polarToXY(cx, cy, R.ruler - tickLen, ang);
          return (
            <line key={i}
              x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
              stroke="#bbbbbb" strokeWidth={isMajor ? 1 : 0.5}
            />
          );
        })}

        {/* ── 2. Zodiac sign band ─────────────────────────────────── */}
        {SIGNS.map((sign, i) => {
          const startLon = i * 30;
          const endLon   = startLon + 30;
          const startAng = toAngle(startLon);
          const endAng   = toAngle(endLon);
          const midAng   = toAngle(startLon + 15);
          const glyph    = polarToXY(cx, cy, R.signGlyph, midAng);
          const elem     = SIGN_ELEMENTS[sign];
          const elemColor = ELEMENT_COLORS[elem];
          const outerArc = arcPath(cx, cy, R.signOuter, startAng, endAng);
          const innerArc = arcPath(cx, cy, R.signInner, endAng, startAng);
          const s1 = polarToXY(cx, cy, R.signOuter, startAng);
          const s2 = polarToXY(cx, cy, R.signInner, startAng);
          const e1 = polarToXY(cx, cy, R.signOuter, endAng);
          const e2 = polarToXY(cx, cy, R.signInner, endAng);
          return (
            <g key={sign}>
              <path
                d={`${outerArc} L ${e2.x} ${e2.y} ${innerArc} L ${s1.x} ${s1.y} Z`}
                fill={SIGN_COLORS[i]} stroke="#cccccc" strokeWidth="0.5"
              />
              {/* Sign divider lines */}
              <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#bbbbbb" strokeWidth="0.7"/>
              {/* Glyph */}
              <text
                x={glyph.x} y={glyph.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={size * 0.034} fill={elemColor} fontWeight="600"
                style={{ userSelect:'none' }}
              >
                {SIGN_GLYPHS[sign]}
              </text>
            </g>
          );
        })}

        {/* ── 3. House cusp ring ──────────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.cuspsOuter} fill="#fafafa" stroke="#d0d0d0" strokeWidth="0.7"/>
        <circle cx={cx} cy={cy} r={R.cuspsInner} fill="#ffffff" stroke="#d0d0d0" strokeWidth="0.7"/>

        {cusps.map((cuspLon, i) => {
          const ang = toAngle(cuspLon);
          const outer = polarToXY(cx, cy, R.cuspsOuter, ang);
          const inner = polarToXY(cx, cy, R.cuspsInner, ang);
          const isAxis = [0,3,6,9].includes(i);
          // House number midpoint
          const nextLon = cusps[(i+1)%12];
          let midLon = cuspLon + ((nextLon - cuspLon + 360) % 360) / 2;
          const midAng = toAngle(midLon);
          const numPos = polarToXY(cx, cy, R.houseNum, midAng);
          return (
            <g key={i}>
              <line x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y}
                stroke={isAxis ? '#888888' : '#cccccc'}
                strokeWidth={isAxis ? 1.2 : 0.6}
              />
              <text
                x={numPos.x} y={numPos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={size * 0.026} fill="#999999"
                style={{ userSelect:'none', cursor:'pointer' }}
                onClick={() => onHouseClick?.(i+1)}
              >
                {i+1}
              </text>
            </g>
          );
        })}

        {/* ── 4. ASC / DSC / MC / IC axis labels ─────────────────── */}
        {[
          { label:'AC', lon: ascLon,      side:-1 },
          { label:'DC', lon: ascLon+180,  side:1  },
          { label:'MC', lon: (natal.mc?.longitude ?? ascLon+270), side:0, top:true },
          { label:'IC', lon: (natal.mc?.longitude ?? ascLon+270)+180, side:0, top:false },
        ].map(({ label, lon, side, top }) => {
          const ang = toAngle(((lon%360)+360)%360);
          const pos = polarToXY(cx, cy, R.signOuter + size*0.028, ang);
          return (
            <text key={label} x={pos.x} y={pos.y}
              textAnchor="middle" dominantBaseline="central"
              fontSize={size * 0.030} fill="#b8860b" fontWeight="800"
              style={{ userSelect:'none' }}
            >
              {label}
            </text>
          );
        })}

        {/* ── 5. Aspect lines (inner circle) ──────────────────────── */}
        <circle cx={cx} cy={cy} r={R.aspectRing} fill="#fafafa" stroke="#e8e8e8" strokeWidth="0.5"/>
        {aspects.map((asp, idx) => {
          const p1key = (asp.transitPlanet || asp.planet1 || '').toLowerCase();
          const p2key = (asp.natalPlanet  || asp.planet2 || '').toLowerCase();
          const p1 = planets.find(p => p.key === p1key);
          const p2 = planets.find(p => p.key === p2key);
          if (!p1 || !p2) return null;
          const cfg = ASPECT_CONFIG[asp.aspectName] || ASPECT_CONFIG.sextile;
          const strengthMult = asp.strength === 'exact' ? 2.5 : asp.strength === 'strong' ? 1.8 : 1.0;
          const a1 = toAngle(p1.lon);
          const a2 = toAngle(p2.lon);
          const pt1 = polarToXY(cx, cy, R.aspectRing, a1);
          const pt2 = polarToXY(cx, cy, R.aspectRing, a2);
          return (
            <line key={idx}
              x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y}
              stroke={cfg.color}
              strokeWidth={cfg.width * strengthMult}
              strokeDasharray={cfg.dash}
              strokeOpacity="0.7"
              style={{ cursor:'pointer' }}
              onClick={() => onAspectClick?.(asp)}
              onMouseEnter={e => { e.target.style.strokeOpacity='1'; e.target.style.strokeWidth = cfg.width*strengthMult*1.5; }}
              onMouseLeave={e => { e.target.style.strokeOpacity='0.7'; e.target.style.strokeWidth = cfg.width*strengthMult; }}
            />
          );
        })}

        {/* ── 6. Natal planet glyphs + degree labels ──────────────── */}
        {spreadNatal.map(p => {
          const dispAng = toAngle(p.displayLon);
          const realAng = toAngle(p.lon);
          const gPos = polarToXY(cx, cy, R.planets, dispAng);
          const dPos = polarToXY(cx, cy, R.planets - size*0.065, dispAng);
          const tickOuter = polarToXY(cx, cy, R.cuspsInner - size*0.004, realAng);
          const tickInner = polarToXY(cx, cy, R.cuspsInner - size*0.025, realAng);
          const color = PLANET_COLORS[p.key] || '#444444';
          return (
            <g key={p.key}>
              {/* Tick from cusp ring to real position */}
              <line x1={tickOuter.x} y1={tickOuter.y} x2={tickInner.x} y2={tickInner.y}
                stroke={color} strokeWidth="1"/>
              {/* Connector from real position to displayed glyph */}
              {Math.abs(p.displayLon - p.lon) > 1 && (() => {
                const realPos = polarToXY(cx, cy, R.planets + size*0.028, realAng);
                const dispConnector = polarToXY(cx, cy, R.planets + size*0.012, dispAng);
                return <line x1={realPos.x} y1={realPos.y} x2={dispConnector.x} y2={dispConnector.y}
                  stroke={color} strokeWidth="0.5" strokeOpacity="0.5" strokeDasharray="2,2"/>;
              })()}
              {/* Glyph */}
              <text x={gPos.x} y={gPos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={size * 0.040} fill={color}
                style={{ userSelect:'none', fontWeight:'600' }}
              >
                {PLANET_GLYPHS[p.key]}
              </text>
              {/* Retrograde marker */}
              {p.retrograde && (
                <text x={gPos.x + size*0.020} y={gPos.y - size*0.022}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={size * 0.020} fill={color} fontStyle="italic"
                  style={{ userSelect:'none' }}
                >R</text>
              )}
              {/* Degree + minute label */}
              <text x={dPos.x} y={dPos.y}
                textAnchor="middle" dominantBaseline="central"
                fontSize={size * 0.022} fill="#666666"
                style={{ userSelect:'none' }}
              >
                {p.deg}°{String(p.min).padStart(2,'0')}′
              </text>
            </g>
          );
        })}

        {/* ── 7. Transit ring (bi-wheel) ───────────────────────────── */}
        {transits && (
          <>
            <circle cx={cx} cy={cy} r={R.cuspsOuter * 1.05} fill="none" stroke="#aaccff" strokeWidth="1" strokeDasharray="4,3"/>
            {spreadTransit.map(p => {
              const dispAng = toAngle(p.displayLon);
              const color = PLANET_COLORS[p.key] || '#4488cc';
              const gPos = polarToXY(cx, cy, R.signInner - size*0.050, dispAng);
              return (
                <g key={`t-${p.key}`}>
                  <text x={gPos.x} y={gPos.y}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={size * 0.036} fill={color} opacity="0.85"
                    style={{ userSelect:'none' }}
                  >
                    {PLANET_GLYPHS[p.key]}
                  </text>
                  {p.retrograde && (
                    <text x={gPos.x + size*0.018} y={gPos.y - size*0.020}
                      fontSize={size*0.018} fill={color} fontStyle="italic"
                      style={{ userSelect:'none' }}
                    >R</text>
                  )}
                </g>
              );
            })}
          </>
        )}

        {/* ── 8. Center circle ────────────────────────────────────── */}
        <circle cx={cx} cy={cy} r={R.center} fill="#ffffff" stroke="#e0e0e0" strokeWidth="0.8"/>

      </svg>

      {/* Download button */}
      <button
        onClick={handleDownload}
        title="Download chart as PNG"
        style={{
          position:'absolute', bottom:10, right:10,
          background:'rgba(255,255,255,0.9)', border:'1px solid #ddd',
          borderRadius:'50%', width:30, height:30,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', color:'#666', boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
          fontSize:'14px', zIndex:10,
        }}
      >
        ↓
      </button>
    </div>
  );
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export function NatalWheel({ natal, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={natal} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="natal"/>;
}

export function TransitWheel({ natal, transits, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={natal} transits={transits} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="transit"/>;
}

export function SynastryWheel({ personA, personB, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={personA} transits={personB} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="synastry"/>;
}
