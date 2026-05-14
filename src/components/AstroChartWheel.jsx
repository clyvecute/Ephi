// src/components/AstroChartWheel.jsx
//
// Professional SVG chart wheel using @astrodraw/astrochart
// Closest open-source equivalent to Astro-Seek's chart style.
//
// Usage:
//   // Natal only
//   <AstroChartWheel natal={natalData} size={500} />
//
//   // Natal + transits overlay (bi-wheel)
//   <AstroChartWheel natal={natalData} transits={currentPositions} size={500} />
//
//   // Synastry (bi-wheel with person B as outer ring)
//   <AstroChartWheel natal={natalDataA} transits={natalDataB} size={500} mode="synastry" />
 
import { useEffect, useRef, useId } from 'react';
 
// ─── Data formatters ──────────────────────────────────────────────────────────
// astrochart expects planets as { PlanetName: [longitude, speed?] }
// Our natal data is { sun: { longitude: 36.28 }, moon: { longitude: ... } }
 
const PLANET_KEY_MAP = {
  sun:     'Sun',
  moon:    'Moon',
  mercury: 'Mercury',
  venus:   'Venus',
  mars:    'Mars',
  jupiter: 'Jupiter',
  saturn:  'Saturn',
  uranus:  'Uranus',
  neptune: 'Neptune',
  pluto:   'Pluto',
  nnode:   'North Node',
  snode:   'South Node',
  lilith:  'Lilith',
  fortune: 'Part of Fortune',
  ascendant: 'Ascendant',
  mc:        'Midheaven',
};
 
/**
 * Convert our natal/position data to astrochart format.
 * @param {Object} data — { planets: { sun: { longitude }, ... } } OR { sun: 36.28, ... }
 * @returns {{ planets: { Sun: [lon] }, cusps: number[] }}
 */
function toAstroChart(data) {
  if (!data) return null;
 
  const planets = {};
 
  // Handle both formats
  const source = data.planets || data;
 
  for (const [key, val] of Object.entries(source)) {
    const chartKey = PLANET_KEY_MAP[key];
    if (!chartKey) continue;
    const lon = typeof val === 'object' ? val.longitude : val;
    if (lon == null || isNaN(lon)) continue;
    planets[chartKey] = [parseFloat(lon.toFixed(4))];
  }

  // Handle angles if they are not in the planets list but in the root data
  if (data.ascendant && !planets.Ascendant) {
    const lon = typeof data.ascendant === 'object' ? data.ascendant.longitude : data.ascendant;
    if (lon != null && !isNaN(lon)) planets.Ascendant = [parseFloat(lon.toFixed(4))];
  }
  if (data.mc && !planets.Midheaven) {
    const lon = typeof data.mc === 'object' ? data.mc.longitude : data.mc;
    if (lon != null && !isNaN(lon)) planets.Midheaven = [parseFloat(lon.toFixed(4))];
  }
 
  // Generate house cusps if ascendant is available
  // natal chart has .ascendant object, transit data might just be planets
  let ascLon = null;
  if (data.ascendant && typeof data.ascendant === 'object') {
    ascLon = data.ascendant.longitude;
  } else if (typeof data.ascendant === 'number') {
    ascLon = data.ascendant;
  } else if (data.asc && typeof data.asc === 'object') {
    ascLon = data.asc.longitude;
  }

  const cusps = generateCusps(ascLon);

  return { planets, cusps };
}
 
/**
 * Generate 12 house cusps.
 * If ascendant is known, uses whole sign houses.
 * Otherwise falls back to equal houses from 0° Aries.
 */
function generateCusps(ascLon) {
  if (ascLon != null && !isNaN(ascLon)) {
    // Whole sign: ascendant sign starts house 1
    const ascSign = Math.floor(((parseFloat(ascLon) % 360) + 360) % 360 / 30);
    return Array.from({ length: 12 }, (_, i) => ((ascSign + i) * 30) % 360);
  }
  // No ascendant or invalid — equal houses from 0° (purely visual)
  return Array.from({ length: 12 }, (_, i) => (i * 30) % 360);
}
 
// ─── Dark theme settings ──────────────────────────────────────────────────────
 
const DARK_SETTINGS = {
  // Background
  COLOR_BACKGROUND:          '#0d0c14',
 
  // Zodiac sign ring
  COLORS_SIGNS: [
    // Fire: Aries Leo Sag — dark red/orange tones
    '#1a0d0d', '#100808', '#180c08',
    // Water: Cancer Scorpio Pisces — dark blue/teal
    '#0a0f1a', '#08100f', '#0a0d18',
    // Air: Gemini Libra Aquarius — dark slate
    '#0d1018', '#0c0f18', '#0d1020',
    // Earth: Taurus Virgo Cap — dark green/brown
    '#0d1208', '#0c1008', '#0f120a',
  ],
 
  // Lines & circles
  CIRCLE_COLOR:              '#2a2740',
  LINE_COLOR:                '#2a2740',
  CIRCLE_STRONG:             1,
 
  // Planet symbols
  POINTS_COLOR:              '#1e1c2a',
  POINTS_TEXT_SIZE:          10,
  POINTS_STROKE:             1.2,
 
  // Sign symbols
  SIGNS_COLOR:               '#5a5470',
  SIGNS_STROKE:              1.2,
 
  // House cusp numbers
  CUSPS_FONT_COLOR:          '#7a7090',
  CUSPS_STROKE:              0.8,
 
  // Axis labels (ASC, MC, DS, IC)
  SYMBOL_AXIS_FONT_COLOR:    '#c9a84c',
  SYMBOL_AXIS_STROKE:        1.8,
 
  // Aspect line colours
  ASPECTS: {
    conjunction: { degree: 0,   orbit: 8,  color: '#C9A84C' }, // gold
    opposition:  { degree: 180, orbit: 8,  color: '#e06c75' }, // red-ish
    square:      { degree: 90,  orbit: 7,  color: '#e06c75' }, // red-ish
    trine:       { degree: 120, orbit: 8,  color: '#5CB87A' }, // green
    sextile:     { degree: 60,  orbit: 5,  color: '#5B7FD4' }, // blue
  },
 
  // Layout
  SYMBOL_SCALE:              1.1,
  MARGIN:                    50,
  PADDING:                   18,
  COLLISION_RADIUS:          12,
  INDOOR_CIRCLE_RADIUS_RATIO:2.1,
  INNER_CIRCLE_RADIUS_RATIO: 8,
  RULER_RADIUS:              4,
  SHIFT_IN_DEGREES:          180,
 
  // Features
  SHOW_DIGNITIES_TEXT:       false,
  SHOW_DEGREES:              true,   // Show the degree numbers!
  ADD_CLICK_AREA:            false,
  STROKE_ONLY:               false,
  DEBUG:                     false,
};

const LIGHT_SETTINGS = {
  ...DARK_SETTINGS,
  COLOR_BACKGROUND: '#ffffff',
  CIRCLE_COLOR: '#dcdcdc',
  LINE_COLOR: '#dcdcdc',
  POINTS_COLOR: '#222222',
  SIGNS_COLOR: '#444444',
  CUSPS_FONT_COLOR: '#888888',
  SYMBOL_AXIS_FONT_COLOR: '#b8860b', // Darker gold
  
  // High-fidelity sign ring colors (Astro-Seek style)
  COLORS_SIGNS: [
    '#fce4e4', '#e8f5e9', '#fff9c4', '#e3f2fd', // Ari (F), Tau (E), Gem (A), Can (W)
    '#ffe0b2', '#f1f8e9', '#e0f2f1', '#f3e5f5', // Leo (F), Vir (E), Lib (A), Sco (W)
    '#fff3e0', '#efebe9', '#e1f5fe', '#e8eaf6', // Sag (F), Cap (E), Aqu (A), Pis (W)
  ],

  SYMBOL_SCALE: 1.2,
  MARGIN: 45,
  PADDING: 22,
  INDOOR_CIRCLE_RADIUS_RATIO: 1.8,
  INNER_CIRCLE_RADIUS_RATIO: 9,
  POINTS_TEXT_SIZE: 11,
};
 
// ─── React component ──────────────────────────────────────────────────────────
 
export default function AstroChartWheel({
  natal,                // natal chart data (required)
  transits  = null,     // transit or synastry partner data (optional)
  aspects   = [],       // aspects array to link to visual lines
  size      = 480,      // chart diameter in px
  mode      = 'natal',  // 'natal' | 'transit' | 'synastry'
  className = '',
  style     = {},
  onReady   = null,     // called when chart renders: onReady(chartInstance)
  onAspectClick = null, // (aspectData) => void
  onHouseClick  = null, // (houseNum) => void
}) {
  const containerId = useId().replace(/:/g, 'c');
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const lastAspects  = useRef(aspects);

  useEffect(() => {
    lastAspects.current = aspects;
  }, [aspects]);
 
  useEffect(() => {
    if (!containerRef.current || !natal) return;
 
    // Dynamically import to avoid SSR issues
    import('@astrodraw/astrochart').then(({ Chart }) => {
      // Clear any previous chart
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
 
      const natalFormatted    = toAstroChart(natal);
      const transitFormatted  = transits ? toAstroChart(transits) : null;
 
      if (!natalFormatted) return;
 
      // Create chart instance
      const settings = LIGHT_SETTINGS; // Always use light mode for now as requested
      const chart = new Chart(containerId, size, size, settings);
 
      // Draw natal radix
      const radix = chart.radix(natalFormatted);
      radix.aspects();
 
      // Draw transit or synastry outer ring if provided
      if (transitFormatted && transits) {
        const transitChart = radix.transit(transitFormatted);
        transitChart.aspects();
      }

      // ─── Post-render: Add interactivity ──────────────────────────
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        // 1. Aspect Lines
        const lines = Array.from(svg.querySelectorAll('g.aspects line, g.aspects path'));
        lines.forEach((line, index) => {
          line.style.cursor = 'pointer';
          line.style.strokeWidth = '6px'; 
          line.style.strokeOpacity = '0.4';
          line.style.pointerEvents = 'auto';
          line.addEventListener('mouseenter', () => { line.style.strokeOpacity = '1'; line.style.filter = 'drop-shadow(0 0 3px var(--accent))'; });
          line.addEventListener('mouseleave', () => { line.style.strokeOpacity = '0.4'; line.style.filter = 'none'; });
          line.addEventListener('click', (e) => {
            e.stopPropagation();
            const aspData = lastAspects.current[index] || { unknown: true, index };
            if (onAspectClick) onAspectClick(aspData);
          });
        });

        // 2. House Numbers
        // @astrodraw/astrochart puts house numbers in <text> elements within the cusps group
        const houseTexts = svg.querySelectorAll('g.cusps text');
        houseTexts.forEach((txt) => {
          const num = parseInt(txt.textContent);
          if (isNaN(num)) return;

          txt.style.cursor = 'pointer';
          txt.style.transition = 'all 0.2s';
          txt.addEventListener('mouseenter', () => { txt.style.fill = 'var(--accent)'; txt.style.fontWeight = 'bold'; });
          txt.addEventListener('mouseleave', () => { txt.style.fill = settings.CUSPS_FONT_COLOR; txt.style.fontWeight = 'normal'; });
          txt.addEventListener('click', (e) => {
            e.stopPropagation();
            if (onHouseClick) onHouseClick(num);
          });
        });
      }

      chartRef.current = chart;
      onReady?.(chart);
    }).catch(err => {
      console.error('[AstroChartWheel] Failed to load @astrodraw/astrochart:', err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="
            display:flex;align-items:center;justify-content:center;
            height:${size}px;color:#5a5470;font-size:13px;
            font-family:Georgia,serif;text-align:center;padding:2rem;
          ">
            Chart library not found.<br/>
            Run: <code style="background:#1e1c2a;padding:2px 6px;border-radius:4px;margin-top:8px;display:inline-block">
              npm install @astrodraw/astrochart
            </code>
          </div>
        `;
      }
    });
 
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [natal, transits, size, containerId, onReady, onAspectClick, onHouseClick]);
 
  const handleDownload = () => {
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const svgSize = svg.getBoundingClientRect();
    
    // High-res export (3x scale)
    const scale = 3;
    canvas.width = svgSize.width * scale || size * scale;
    canvas.height = svgSize.height * scale || size * scale;
    
    const ctx = canvas.getContext('2d');
    
    // Fill white background (since SVG might be transparent)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `ephi-chart-${mode}-${Date.now()}.png`;
      a.href = pngUrl;
      a.click();
    };
    
    const b64 = btoa(unescape(encodeURIComponent(svgData)));
    img.src = "data:image/svg+xml;base64," + b64;
  };

  return (
    <div
      style={{
        position:        'relative',
        width:           '100%',
        height:          'auto',
        aspectRatio:     '1 / 1',
        maxWidth:        size,
        margin:          '0 auto',
        background:      '#ffffff',
        borderRadius:    '50%',
        boxShadow:       '0 12px 48px -12px rgba(0,0,0,0.18), 0 0 1px 1px rgba(0,0,0,0.04)',
        border:          '6px solid #f8f9fa',
        ...style,
      }}
      className={className}
    >
      {/* Container must not have overflow:hidden if we want the download button to be outside the circle,
          but if it's overflow:hidden, we place the button inside. */}
      
      {/* Chart renders here */}
      <div
        id={containerId}
        ref={containerRef}
        style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}
      />
 
      {/* Mode label */}
      {mode !== 'natal' && (
        <div style={{
          position:   'absolute',
          top:        16,
          left:       '50%',
          transform:  'translateX(-50%)',
          fontSize:   '0.65rem',
          fontFamily: 'Georgia, serif',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color:      '#3d3a52',
          pointerEvents: 'none',
        }}>
          {mode === 'synastry' ? 'Synastry' : 'Transits'}
        </div>
      )}

      {/* Export Button */}
      <button 
        onClick={handleDownload}
        title="Download high-resolution chart"
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 10,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
    </div>
  );
}
 
// ─── Convenience wrappers ─────────────────────────────────────────────────────
 
/** Natal-only chart */
export function NatalWheel({ natal, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={natal} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="natal" />;
}
 
/** Bi-wheel: natal inside, transits outside */
export function TransitWheel({ natal, transits, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={natal} transits={transits} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="transit" />;
}
 
/** Bi-wheel: person A inside, person B outside */
export function SynastryWheel({ personA, personB, aspects, onAspectClick, onHouseClick, size = 480 }) {
  return <AstroChartWheel natal={personA} transits={personB} aspects={aspects} onAspectClick={onAspectClick} onHouseClick={onHouseClick} size={size} mode="synastry" />;
}
