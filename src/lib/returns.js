// src/lib/returns.js
//
// Solar and Lunar Return calculations.
// Finds the precise date/time the Sun or Moon returns to their exact natal longitudes.

import { getPlanetPositions } from './ephemeris.js';

function lonOf(position) {
  return typeof position === 'number' ? position : position?.longitude;
}

function angularDiff(a, b) {
  let diff = a - b;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

export async function findSolarReturn(natalSunLon, year, lat = 0, lng = 0, sidereal = false) {
  let t1 = new Date(Date.UTC(year, 0, 1)).getTime();
  let t2 = t1 + 10 * 24 * 60 * 60 * 1000; // 10 days
  const endTime = new Date(Date.UTC(year, 11, 31)).getTime();
  
  let found = false;
  while (t2 <= endTime + 10 * 24 * 60 * 60 * 1000) {
    const lon1 = lonOf((await getPlanetPositions(new Date(t1), null, { sidereal })).sun);
    const lon2 = lonOf((await getPlanetPositions(new Date(t2), null, { sidereal })).sun);
    
    const diff1 = angularDiff(lon1, natalSunLon);
    const diff2 = angularDiff(lon2, natalSunLon);
    
    if (diff1 * diff2 <= 0) {
      found = true;
      break;
    }
    t1 = t2;
    t2 += 10 * 24 * 60 * 60 * 1000;
  }
  
  if (!found) {
    // Search tightly around expected birthday
    let approxDay = (natalSunLon / 360) * 365.25 + 80;
    t1 = new Date(Date.UTC(year, 0, 1)).getTime() + (approxDay - 15) * 24 * 60 * 60 * 1000;
    t2 = t1 + 30 * 24 * 60 * 60 * 1000;
  }

  // Bisection
  let low = t1;
  let high = t2;
  let mid = (low + high) / 2;
  
  for (let i = 0; i < 30; i++) {
    mid = (low + high) / 2;
    const midLon = lonOf((await getPlanetPositions(new Date(mid), null, { sidereal })).sun);
    const midDiff = angularDiff(midLon, natalSunLon);
    
    if (Math.abs(midDiff) < 0.0001) break;
    
    const lowLon = lonOf((await getPlanetPositions(new Date(low), null, { sidereal })).sun);
    const lowDiff = angularDiff(lowLon, natalSunLon);
    
    if (lowDiff * midDiff < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const exactDate = new Date(mid);
  const planets = await getPlanetPositions(exactDate, null, { sidereal, lat, lon: lng });
  
  return {
    date: exactDate.toISOString(),
    planets,
    type: 'Solar Return',
    targetYear: year,
  };
}

export async function findLunarReturn(natalMoonLon, fromDate = new Date(), sidereal = false) {
  let t1 = new Date(fromDate).getTime();
  let t2 = t1 + 3 * 24 * 60 * 60 * 1000; // 3 days
  const endTime = t1 + 32 * 24 * 60 * 60 * 1000;
  
  let found = false;
  while (t2 <= endTime) {
    const lon1 = lonOf((await getPlanetPositions(new Date(t1), null, { sidereal })).moon);
    const lon2 = lonOf((await getPlanetPositions(new Date(t2), null, { sidereal })).moon);
    
    const diff1 = angularDiff(lon1, natalMoonLon);
    const diff2 = angularDiff(lon2, natalMoonLon);
    
    if (diff1 * diff2 <= 0) {
      found = true;
      break;
    }
    t1 = t2;
    t2 += 3 * 24 * 60 * 60 * 1000;
  }
  
  if (!found) {
    t1 = new Date(fromDate).getTime();
    t2 = t1 + 30 * 24 * 60 * 60 * 1000;
  }

  // Bisection
  let low = t1;
  let high = t2;
  let mid = (low + high) / 2;
  
  for (let i = 0; i < 30; i++) {
    mid = (low + high) / 2;
    const midLon = lonOf((await getPlanetPositions(new Date(mid), null, { sidereal })).moon);
    const midDiff = angularDiff(midLon, natalMoonLon);
    
    if (Math.abs(midDiff) < 0.0001) break;
    
    const lowLon = lonOf((await getPlanetPositions(new Date(low), null, { sidereal })).moon);
    const lowDiff = angularDiff(lowLon, natalMoonLon);
    
    if (lowDiff * midDiff < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const exactDate = new Date(mid);
  const planets = await getPlanetPositions(exactDate, null, { sidereal });
  
  return {
    date: exactDate.toISOString(),
    planets,
    type: 'Lunar Return',
  };
}

/**
 * Calculates Secondary Progressions for a given age.
 * Rule: 1 day = 1 year.
 * 
 * @param {Date} birthDate
 * @param {Date} targetDate
 * @param {number} ascLon - Optional natal ASC
 * @returns {Object} Progressed positions
 */
export function getSecondaryProgressions(birthDate, targetDate, ascLon = null, sidereal = false) {
  const birthMs = new Date(birthDate).getTime();
  const targetMs = new Date(targetDate).getTime();
  
  // Diff in years
  const diffYears = (targetMs - birthMs) / (365.2425 * 24 * 60 * 60 * 1000);
  
  // Progressed date = birth date + diffYears in days
  const progressedDate = new Date(birthMs + diffYears * 24 * 60 * 60 * 1000);
  
  return {
    date: progressedDate.toISOString(),
    age: diffYears.toFixed(2),
    positions: getPlanetPositions(progressedDate, ascLon, { sidereal }),
  };
}
