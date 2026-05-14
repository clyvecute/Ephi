// src/components/ChartWheel.jsx
//
// Reusable SVG Chart Wheel component for Natal, Transit, and Synastry modes.
// Uses SVG glyph paths from EphiIcons instead of emoji/Unicode characters.

import React from 'react';
import { PLANET_PATHS, ZODIAC_PATHS, ZODIAC_NAMES } from './EphiIcons';

const ZODIAC_SIGNS = [
  { name: 'Aries', key: 'aries', color: '#dc2626' },
  { name: 'Taurus', key: 'taurus', color: '#ca8a04' },
  { name: 'Gemini', key: 'gemini', color: '#0284c7' },
  { name: 'Cancer', key: 'cancer', color: '#7c3aed' },
  { name: 'Leo', key: 'leo', color: '#dc2626' },
  { name: 'Virgo', key: 'virgo', color: '#ca8a04' },
  { name: 'Libra', key: 'libra', color: '#0284c7' },
  { name: 'Scorpio', key: 'scorpio', color: '#7c3aed' },
  { name: 'Sagittarius', key: 'sagittarius', color: '#dc2626' },
  { name: 'Capricorn', key: 'capricorn', color: '#ca8a04' },
  { name: 'Aquarius', key: 'aquarius', color: '#0284c7' },
  { name: 'Pisces', key: 'pisces', color: '#7c3aed' },
];

const PLANET_META = {
  sun:     { label: 'Sun',     key: 'sun',     color: '#d97706' },
  moon:    { label: 'Moon',    key: 'moon',    color: '#475569' },
  mercury: { label: 'Mercury', key: 'mercury', color: '#6366f1' },
  venus:   { label: 'Venus',   key: 'venus',   color: '#db2777' },
  mars:    { label: 'Mars',    key: 'mars',    color: '#dc2626' },
  jupiter: { label: 'Jupiter', key: 'jupiter', color: '#ca8a04' },
  saturn:  { label: 'Saturn',  key: 'saturn',  color: '#4b5563' },
  uranus:  { label: 'Uranus',  key: 'uranus',  color: '#0d9488' },
  neptune: { label: 'Neptune', key: 'neptune', color: '#2563eb' },
  pluto:   { label: 'Pluto',   key: 'pluto',   color: '#9333ea' },
  nn:      { label: 'Node',    key: 'nn',      color: '#f43f5e' },
};

/**
 * Renders an SVG icon path at a given (cx, cy) position inside the chart SVG.
 * The icon viewBox is 24×24, so we scale it down to `iconSize` and center it.
 */
function SvgGlyph({ cx, cy, iconSize, color, children }) {
  const half = iconSize / 2;
  const scale = iconSize / 24;
  return (
    <g
      transform={`translate(${cx - half}, ${cy - half}) scale(${scale})`}
      style={{ color }}
    >
      {children}
    </g>
  );
}

export default function ChartWheel({ 
  planets = {}, 
  aspects = [], 
  ascendant = 0, 
  houseCusps = null,
  size = 400, 
  mode = 'natal',
  bgColor = '#ffffff',
  strokeColor = '#e2e8f0',
  onPlanetClick = null,
  onAspectClick = null
}) {
  const center = size / 2;
  const outerRadius = (size / 2) - 10;
  const zodiacRadius = outerRadius - 25;
  const outerRingRadius = zodiacRadius - 25;
  const innerRingRadius = outerRingRadius - 35;
  const aspectRadius = innerRingRadius - 25;

  // Icon sizes scale with chart size
  const zodiacIconSize = size > 350 ? 18 : 14;
  const planetIconSizeLg = size > 350 ? 16 : 12;
  const planetIconSm = size > 350 ? 14 : 11;

  const getLon = (val) => {
    if (val == null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'object' && val.longitude != null) return val.longitude;
    return 0;
  };

  const getPoint = (deg, r) => {
    const angle = (180 - (deg - ascendant)) * (Math.PI / 180);
    return {
      x: center + r * Math.cos(angle),
      y: center - r * Math.sin(angle),
    };
  };

  let innerSet = {};
  let outerSet = {};

  if (mode === 'transit' || mode === 'synastry') {
    if (planets && planets.inner) {
      innerSet = planets.inner;
      outerSet = planets.outer || {};
    } else {
      innerSet = planets || {};
    }
  } else {
    innerSet = planets || {};
  }

  return (
    <div style={{ width: size, height: size, margin: '0 auto', position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={outerRadius} fill={bgColor} stroke={strokeColor} strokeWidth="2" />

        {/* 1. Zodiac Wheel */}
        {ZODIAC_SIGNS.map((sign, i) => {
          const startDeg = i * 30;
          const midDeg = startDeg + 15;

          const pStart = getPoint(startDeg, outerRadius);
          const pInnerStart = getPoint(startDeg, zodiacRadius);
          const pMid = getPoint(midDeg, (outerRadius + zodiacRadius) / 2);

          const svgContent = ZODIAC_PATHS[sign.key];

          return (
            <g key={sign.name}>
              <line x1={pStart.x} y1={pStart.y} x2={pInnerStart.x} y2={pInnerStart.y} stroke={strokeColor} strokeWidth="1" />
              {svgContent && (
                <SvgGlyph cx={pMid.x} cy={pMid.y} iconSize={zodiacIconSize} color={sign.color}>
                  {svgContent}
                </SvgGlyph>
              )}
            </g>
          );
        })}
        <circle cx={center} cy={center} r={zodiacRadius} fill="none" stroke={strokeColor} strokeWidth="1" />

        {/* 2. House Divisions */}
        {[...Array(12)].map((_, i) => {
          const houseNum = i + 1;
          const houseDeg = houseCusps ? houseCusps[houseNum] : i * 30 + ascendant;
          
          let nextHouseDeg;
          if (houseCusps) {
            nextHouseDeg = houseCusps[houseNum === 12 ? 1 : houseNum + 1];
          } else {
            nextHouseDeg = (i + 1) * 30 + ascendant;
          }
          
          let diff = nextHouseDeg - houseDeg;
          if (diff < 0) diff += 360;
          const midHouseDeg = houseDeg + diff / 2;

          const lineStart = getPoint(houseDeg, zodiacRadius);
          const lineEnd = getPoint(houseDeg, aspectRadius);
          const numPt = getPoint(midHouseDeg, aspectRadius + 15);

          return (
            <g key={`house-${i}`}>
              <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#cbd5e1" strokeDasharray="2 4" strokeWidth="1" />
              <text
                x={numPt.x}
                y={numPt.y}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}
              >
                {i + 1}
              </text>
            </g>
          );
        })}

        {/* 3. Aspect Lines */}
        {aspects.map((asp, i) => {
          const p1 = asp.planet1 || asp.natalPlanet;
          const p2 = asp.planet2 || asp.transitPlanet;

          if (!p1 || !p2) return null;
          
          const pos1 = innerSet[p1] || outerSet[p1];
          const pos2 = innerSet[p2] || outerSet[p2];

          if (!pos1 || !pos2) return null;

          const pt1 = getPoint(getLon(pos1), aspectRadius);
          const pt2 = getPoint(getLon(pos2), aspectRadius);

          const color = asp.nature === 'hard' ? '#ef4444' : '#22c55e';
          const thickness = asp.strength === 'exact' ? 2 : 1;

          return (
            <g key={`asp-${i}`} style={{ cursor: onAspectClick ? 'pointer' : 'default' }} onClick={() => onAspectClick && onAspectClick(asp)}>
              {/* Invisible wide hit area for easier clicking */}
              <line
                x1={pt1.x} y1={pt1.y}
                x2={pt2.x} y2={pt2.y}
                stroke="transparent"
                strokeWidth="12"
              />
              <line
                x1={pt1.x} y1={pt1.y}
                x2={pt2.x} y2={pt2.y}
                stroke={color}
                strokeWidth={thickness}
                opacity={0.4}
                className="aspect-line"
              />
            </g>
          );
        })}
        <circle cx={center} cy={center} r={aspectRadius} fill="none" stroke={strokeColor} strokeWidth="1" />

        {/* 4. Outer Ring Planets */}
        {Object.entries(outerSet).map(([planet, val]) => {
          const meta = PLANET_META[planet];
          if (!meta) return null;

          const svgContent = PLANET_PATHS[meta.key];
          if (!svgContent) return null;

          const lon = getLon(val);
          const pt = getPoint(lon, outerRingRadius);
          const linePt = getPoint(lon, aspectRadius);

          return (
            <g 
              key={`outer-${planet}`} 
              onClick={() => onPlanetClick && onPlanetClick(planet, 'outer')}
              style={{ cursor: onPlanetClick ? 'pointer' : 'default' }}
              className="planet-hotspot"
            >
              <line x1={pt.x} y1={pt.y} x2={linePt.x} y2={linePt.y} stroke={meta.color} strokeWidth="1" opacity="0.3" />
              <circle 
                cx={pt.x} cy={pt.y} r="12" 
                fill={bgColor} stroke={meta.color} strokeWidth="1.5" 
                className="planet-circle"
              />
              <SvgGlyph cx={pt.x} cy={pt.y} iconSize={planetIconSm} color={meta.color}>
                {svgContent}
              </SvgGlyph>
            </g>
          );
        })}

        {/* 5. Inner Ring Planets */}
        {Object.entries(innerSet).map(([planet, val]) => {
          const meta = PLANET_META[planet];
          if (!meta) return null;

          const svgContent = PLANET_PATHS[meta.key];
          if (!svgContent) return null;

          const lon = getLon(val);
          const radius = (mode === 'transit' || mode === 'synastry') ? innerRingRadius : outerRingRadius;
          const pt = getPoint(lon, radius);
          const linePt = getPoint(lon, aspectRadius);

          return (
            <g 
              key={`inner-${planet}`}
              onClick={() => onPlanetClick && onPlanetClick(planet, 'inner')}
              style={{ cursor: onPlanetClick ? 'pointer' : 'default' }}
              className="planet-hotspot"
            >
              <line x1={pt.x} y1={pt.y} x2={linePt.x} y2={linePt.y} stroke={meta.color} strokeWidth="1" opacity="0.3" />
              <circle 
                cx={pt.x} cy={pt.y} r="13" 
                fill={bgColor} stroke={meta.color} strokeWidth="1.5"
                className="planet-circle"
              />
              <SvgGlyph cx={pt.x} cy={pt.y} iconSize={planetIconSizeLg} color={meta.color}>
                {svgContent}
              </SvgGlyph>
            </g>
          );
        })}

        {/* Ascendant Indicator */}
        {ascendant != null && (
          <line 
            x1={getPoint(ascendant, outerRadius).x} 
            y1={getPoint(ascendant, outerRadius).y} 
            x2={getPoint(ascendant, aspectRadius).x} 
            y2={getPoint(ascendant, aspectRadius).y} 
            stroke="#6366f1" 
            strokeWidth="2.5" 
          />
        )}
      </svg>
    </div>
  );
}
