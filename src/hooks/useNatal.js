/**
 * src/hooks/useNatal.js
 * Manages natal chart state with localStorage persistence.
 */
import { useState, useEffect } from 'react';
import { generatePrecisionNatalChart } from '../lib/natal.js';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { store } from '../lib/store';

const STORAGE_KEY = 'astro_natal';

export function useNatal() {
  const [natalChart, setNatalChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load from store on mount
  useEffect(() => {
    try {
      const chart = store.getJSON(STORAGE_KEY);
      if (chart) {
        // Sanity check: ensure the chart isn't corrupted with NaNs
        // Check for both legacy and new structure (positions.Sun vs positions.sun)
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
  }, []);

  // Sync with Firestore if logged in
  useEffect(() => {
    let unsubscribe = () => {};
    const unregisterAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Subscribe to cloud doc
        const ref = doc(db, 'users', user.uid, 'data', 'natal');
        unsubscribe = onSnapshot(ref, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const hasSun = data?.positions?.Sun || data?.positions?.sun;
            // Only update if it's a valid chart (ignore soft-deletes)
            if (hasSun != null && !data._deleted) {
              setNatalChart(data);
              store.setJSON(STORAGE_KEY, data);
            }
          }
        });
      } else {
        unsubscribe();
      }
    });

    return () => {
      unregisterAuth();
      unsubscribe();
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
      
      // Save local first for instant UX
      store.setJSON(STORAGE_KEY, chart);
      setNatalChart(chart);

      // Sync to cloud if authenticated
      if (auth.currentUser) {
        const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal');
        await setDoc(ref, chart);
      }
      
      return chart;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function clearChart() {
    store.remove(STORAGE_KEY);
    setNatalChart(null);
    if (auth.currentUser) {
      const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal');
      await setDoc(ref, { _deleted: true }); // Soft delete or clear
    }
  }

  return { natalChart, saveChart, clearChart, loading, error };
}
