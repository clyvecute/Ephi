/**
 * Multi-chart profiles per account (natal + synastry person A/B).
 * Keeps astro_natal in sync with the active profile for backward compatibility.
 */
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { store } from './store';

const PROFILES_KEY = 'astro_natal_profiles';
const ACTIVE_KEY = 'astro_active_profile_id';
const LEGACY_KEY = 'astro_natal';

function newId() {
  return globalThis.crypto?.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getProfiles() {
  let profiles = store.getJSON(PROFILES_KEY, []);
  if (!profiles.length) {
    const legacy = store.getJSON(LEGACY_KEY);
    if (legacy?.positions && (legacy.positions.sun || legacy.positions.Sun)) {
      const id = newId();
      profiles = [{
        id,
        label: legacy.meta?.name || 'Primary chart',
        chart: legacy,
        createdAt: new Date().toISOString(),
      }];
      store.setJSON(PROFILES_KEY, profiles);
      store.set(ACTIVE_KEY, id);
    }
  }
  return profiles;
}

export function getActiveProfileId() {
  const profiles = getProfiles();
  const id = store.get(ACTIVE_KEY);
  if (id && profiles.some(p => p.id === id)) return id;
  return profiles[0]?.id || null;
}

export function getActiveChart() {
  const profiles = getProfiles();
  const id = getActiveProfileId();
  const match = profiles.find(p => p.id === id);
  return match?.chart || null;
}

function syncLegacyAndCloud(profiles, activeId) {
  const active = profiles.find(p => p.id === activeId);
  if (active?.chart) {
    store.setJSON(LEGACY_KEY, active.chart);
  }
  if (auth.currentUser) {
    const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal_profiles');
    // Strip undefined values for Firestore compatibility
    const cleanProfiles = JSON.parse(JSON.stringify(profiles));
    const cleanActiveChart = active?.chart ? JSON.parse(JSON.stringify(active.chart)) : null;

    setDoc(ref, { profiles: cleanProfiles, activeId: activeId || null }, { merge: true }).catch(console.error);
    if (cleanActiveChart) {
      const natalRef = doc(db, 'users', auth.currentUser.uid, 'data', 'natal');
      setDoc(natalRef, cleanActiveChart).catch(console.error);
    }
  }
}

export function setActiveProfile(id) {
  const profiles = getProfiles();
  if (!profiles.some(p => p.id === id)) return false;
  store.set(ACTIVE_KEY, id);
  syncLegacyAndCloud(profiles, id);
  window.dispatchEvent(new Event('storage'));
  return true;
}

export function upsertActiveProfile(chart, label) {
  const profiles = getProfiles();
  let activeId = getActiveProfileId();
  const existing = profiles.find(p => p.id === activeId);

  if (existing) {
    existing.chart = chart;
    if (label) existing.label = label;
    else if (chart.meta?.name) existing.label = chart.meta.name;
  } else {
    activeId = newId();
    profiles.push({
      id: activeId,
      label: label || chart.meta?.name || 'Primary chart',
      chart,
      createdAt: new Date().toISOString(),
    });
    store.set(ACTIVE_KEY, activeId);
  }

  store.setJSON(PROFILES_KEY, profiles);
  syncLegacyAndCloud(profiles, activeId);
  window.dispatchEvent(new Event('storage'));
  return activeId;
}

export function addProfile(chart, label) {
  const profiles = getProfiles();
  const id = newId();
  profiles.push({
    id,
    label: label || chart.meta?.name || `Chart ${profiles.length + 1}`,
    chart,
    createdAt: new Date().toISOString(),
  });
  store.set(ACTIVE_KEY, id);
  store.setJSON(PROFILES_KEY, profiles);
  syncLegacyAndCloud(profiles, id);
  window.dispatchEvent(new Event('storage'));
  return id;
}

export function deleteProfile(id) {
  let profiles = getProfiles().filter(p => p.id !== id);
  store.setJSON(PROFILES_KEY, profiles);

  let activeId = getActiveProfileId();
  if (activeId === id) {
    activeId = profiles[0]?.id || null;
    if (activeId) store.set(ACTIVE_KEY, activeId);
    else {
      store.remove(ACTIVE_KEY);
      store.remove(LEGACY_KEY);
    }
  }

  if (profiles.length) syncLegacyAndCloud(profiles, activeId);
  else {
    store.remove(LEGACY_KEY);
    if (auth.currentUser) {
      const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal_profiles');
      setDoc(ref, { profiles: [], activeId: null }, { merge: true }).catch(console.error);
    }
  }
  window.dispatchEvent(new Event('storage'));
}

export function loadProfilesFromFirestore(data) {
  if (!data?.profiles?.length) return;
  store.setJSON(PROFILES_KEY, data.profiles);
  if (data.activeId) store.set(ACTIVE_KEY, data.activeId);
  const active = data.profiles.find(p => p.id === data.activeId) || data.profiles[0];
  if (active?.chart) store.setJSON(LEGACY_KEY, active.chart);
}
