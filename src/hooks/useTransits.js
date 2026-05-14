/**
 * src/hooks/useTransits.js — Step 7 core
 * Auto-refreshing transit engine. Updates every 60 seconds by default.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPlanetPositions } from '../lib/ephemeris.js';
import { getActiveAspects } from '../lib/aspects.js';
import { getInterpretation } from '../lib/interpretations.js';

const DEFAULT_INTERVAL_MS = 60_000; // 1 minute

export function useTransits(natalChart = null, intervalMs = DEFAULT_INTERVAL_MS, baseDate = null) {
  const [transitPositions, setTransitPositions] = useState(null);
  const [skyAspects, setSkyAspects] = useState([]);
  const [transitToNatal, setTransitToNatal] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  const refresh = useCallback(() => {
    const now = baseDate ? new Date(baseDate) : new Date();
    const options = { sidereal: !!natalChart?.meta?.sidereal };
    const positions = getPlanetPositions(now, null, options);
    
    // getActiveAspects without natal chart gives sky aspects
    let aspects = getActiveAspects(positions);
    aspects = aspects.map(a => {
      const interp = getInterpretation(a.transitPlanet, a.aspectName, a.natalPlanet) || {};
      return { ...a, interp, keywords: interp.keywords || [], description: interp.core || null };
    });

    setTransitPositions(positions);
    setSkyAspects(aspects);
    setLastUpdated(now);

    if (natalChart?.positions) {
      // getActiveAspects with natal chart gives transits to natal
      let tn = getActiveAspects(positions, natalChart.positions);
      tn = tn.map(a => {
        const interp = getInterpretation(a.transitPlanet, a.aspectName, a.natalPlanet) || {};
        return { ...a, interp, keywords: interp.keywords || [], description: interp.core || null };
      });
      setTransitToNatal(tn);
    }

    setTick(t => t + 1);
  }, [natalChart]);

  // Initial fetch + interval
  useEffect(() => {
    refresh();
    if (!baseDate) {
      intervalRef.current = setInterval(refresh, intervalMs);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [refresh, intervalMs, baseDate]);

  return {
    transitPositions,
    skyAspects,
    transitToNatal,
    lastUpdated,
    tick,
    refresh,
  };
}
