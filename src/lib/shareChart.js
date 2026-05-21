// src/lib/shareChart.js
//
// Chart Sharing Utilities
// Encodes/Decodes chart payloads client-side with base64url encoding

import { getZodiacInfo } from './ephemeris.js';
import { getActiveAspects } from './aspects.js';
import { getInterpretation } from './interpretations.js';

/**
 * Encodes the given natal chart into a highly compressed, base64url-safe string.
 */
export function encodeChart(natalChart) {
  if (!natalChart || !natalChart.positions) {
    throw new Error('Invalid natal chart data for encoding.');
  }

  // 1. Pack meta (strip redundant fields, round lat/lon)
  const meta = {
    n: natalChart.meta?.name || 'Shared Chart',
    d: natalChart.meta?.date,
    t: natalChart.meta?.time,
    lat: natalChart.meta?.lat ? parseFloat(natalChart.meta.lat.toFixed(4)) : 0,
    lon: natalChart.meta?.lon ? parseFloat(natalChart.meta.lon.toFixed(4)) : 0,
    c: natalChart.meta?.city || '',
    tz: natalChart.meta?.timezone || 'UTC',
    s: !!natalChart.meta?.sidereal,
    h: natalChart.meta?.houseSystem || 'P'
  };

  // 2. Pack positions (round longitudes to 2 decimals, track retrograde)
  const positions = {};
  for (const [key, val] of Object.entries(natalChart.positions)) {
    const lon = typeof val === 'object' ? val.longitude : val;
    if (lon != null) {
      positions[key] = {
        l: parseFloat(lon.toFixed(2)),
        r: !!val.retrograde
      };
    }
  }

  // 3. Pack angles & house cusps
  const ascLon = natalChart.ascendant?.longitude ?? 0;
  const mcLon = natalChart.mc?.longitude ?? 0;
  const cusps = (natalChart.cusps || []).map(c => {
    const lon = typeof c === 'object' ? c.longitude : c;
    return parseFloat(lon.toFixed(1));
  });

  const payload = {
    v: 1, // version
    m: meta,
    p: positions,
    a: parseFloat(ascLon.toFixed(2)),
    mc: parseFloat(mcLon.toFixed(2)),
    c: cusps
  };

  // 4. Serialize & Base64URL encode
  const jsonStr = JSON.stringify(payload);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes the base64url token back into a fully formed natal chart object.
 */
export function decodeChart(encodedStr) {
  if (!encodedStr) {
    throw new Error('Empty share token.');
  }

  // 1. Decode base64url to JSON string
  let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const jsonStr = decodeURIComponent(escape(atob(base64)));
  const payload = JSON.parse(jsonStr);

  if (payload.v !== 1) {
    throw new Error(`Unsupported share version: ${payload.v}`);
  }

  // 2. Reconstruct meta
  const meta = {
    name: payload.m.n,
    date: payload.m.d,
    time: payload.m.t,
    lat: payload.m.lat,
    lon: payload.m.lon,
    city: payload.m.c,
    timezone: payload.m.tz,
    sidereal: payload.m.s,
    houseSystem: payload.m.h,
    generated: new Date().toISOString()
  };

  // 3. Reconstruct positions
  const positions = {};
  for (const [key, val] of Object.entries(payload.p)) {
    positions[key] = {
      longitude: val.l,
      retrograde: val.r,
      ...getZodiacInfo(val.l)
    };
  }

  // 4. Reconstruct ascendant & mc
  const ascendant = {
    longitude: payload.a,
    ...getZodiacInfo(payload.a)
  };
  const mc = {
    longitude: payload.mc,
    ...getZodiacInfo(payload.mc)
  };

  // 5. Reconstruct cusps
  const cusps = payload.c.map(lon => ({
    longitude: lon,
    ...getZodiacInfo(lon)
  }));

  // 6. Calculate aspects
  const posLons = {};
  for (const [k, v] of Object.entries(positions)) {
    posLons[k.toLowerCase()] = v.longitude;
  }
  let aspects = getActiveAspects(posLons, posLons);
  aspects = aspects.map(a => {
    const interp = getInterpretation(a.transitPlanet, a.aspectName, a.natalPlanet) || {};
    return {
      ...a,
      interp,
      keywords: interp.keywords || [],
      description: interp.core || null
    };
  });

  const sunSign = getZodiacInfo(positions.Sun?.longitude || positions.sun?.longitude)?.sign || '';
  const moonSign = getZodiacInfo(positions.Moon?.longitude || positions.moon?.longitude)?.sign || '';

  return {
    meta,
    positions,
    ascendant,
    mc,
    cusps,
    aspects,
    sunSign,
    moonSign,
    risingSign: ascendant.sign
  };
}

/**
 * Copies the public share URL to clipboard.
 */
export async function copyShareUrl(natalChart) {
  const encoded = encodeChart(natalChart);
  const shareUrl = `${window.location.origin}/chart/${encoded}`;
  await navigator.clipboard.writeText(shareUrl);
  return shareUrl;
}
