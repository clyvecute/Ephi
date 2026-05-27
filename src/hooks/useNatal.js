/**
 * src/hooks/useNatal.js
 * Manages natal chart state with localStorage persistence.
 */
import { useState, useEffect } from 'react';
import { generatePrecisionNatalChart } from '../lib/natal.js';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { store } from '../lib/store';
import {
  getProfiles,
  getActiveChart,
  getActiveProfileId,
  upsertActiveProfile,
  addProfile,
  deleteProfile,
  setActiveProfile,
  loadProfilesFromFirestore,
} from '../lib/profiles.js';

const STORAGE_KEY = 'astro_natal';

export function useNatal() {
  const [natalChart, setNatalChart] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [activeProfileId, setActiveProfileId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refreshProfiles = () => {
    setProfiles(getProfiles());
    setActiveProfileId(getActiveProfileId());
    setNatalChart(getActiveChart());
  };

  // Load from store on mount
  useEffect(() => {
    try {
      refreshProfiles();
      const chart = getActiveChart() || store.getJSON(STORAGE_KEY);
      if (chart) {
        const hasSun = chart?.positions?.Sun || chart?.positions?.sun;
        if (hasSun != null) {
          setNatalChart(chart);
        } else {
          store.remove(STORAGE_KEY);
        }
      }
    } catch {
      store.remove(STORAGE_KEY);
    }
    const onStorage = () => refreshProfiles();
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Sync with Firestore if logged in
  useEffect(() => {
    let unsubNatal = () => {};
    let unsubProfiles = () => {};
    const unregisterAuth = onAuthStateChanged(auth, async (user) => {
      unsubNatal();
      unsubProfiles();
      if (user) {
        try {
          await user.getIdToken(true);
          const profilesRef = doc(db, 'users', user.uid, 'data', 'natal_profiles');
          const natalRef = doc(db, 'users', user.uid, 'data', 'natal');

          unsubProfiles = onSnapshot(profilesRef, (snap) => {
            if (snap.exists()) {
              loadProfilesFromFirestore(snap.data());
              refreshProfiles();
            }
          }, () => {});

          unsubNatal = onSnapshot(natalRef, (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              const hasSun = data?.positions?.Sun || data?.positions?.sun;
              if (hasSun != null && !data._deleted) {
                if (!getProfiles().length) {
                  upsertActiveProfile(data, data.meta?.name);
                }
                refreshProfiles();
              }
            }
          }, (err) => {
            if (err.code !== 'permission-denied') {
              console.error('Natal sync error:', err);
            }
          });
        } catch (e) {
          console.error('Auth sync error in useNatal:', e);
        }
      }
    });

    return () => {
      unregisterAuth();
      unsubNatal();
      unsubProfiles();
    };
  }, []);

  async function saveChart(birthData) {
    setLoading(true);
    setError(null);
    try {
      // Always use precision chart now
      const chart = await generatePrecisionNatalChart(birthData, {
        sidereal: birthData.sidereal,
        houseSystem: birthData.houseSystem || 'P',
      });
      
      const label = birthData.name?.trim() || chart.meta?.name;
      if (birthData.newProfile) {
        addProfile(chart, label);
      } else {
        upsertActiveProfile(chart, label);
      }
      refreshProfiles();
      setNatalChart(chart);
      
      return chart;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function clearChart() {
    const id = getActiveProfileId();
    if (id) deleteProfile(id);
    else {
      store.remove(STORAGE_KEY);
      setNatalChart(null);
    }
    refreshProfiles();
    if (auth.currentUser) {
      const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal');
      try {
        await deleteDoc(ref);
      } catch (e) {
        console.error('Failed to clear cloud natal:', e);
      }
    }
  }

  return {
    natalChart,
    profiles,
    activeProfileId,
    setActiveProfile: (id) => { setActiveProfile(id); refreshProfiles(); },
    saveChart,
    clearChart,
    loading,
    error,
  };
}
