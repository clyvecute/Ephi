/**
 * src/hooks/useNatal.js
 * Manages natal chart state with localStorage persistence.
 */
import { useState, useEffect } from 'react';
import { generateNatalChart } from '../lib/natal.js';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const STORAGE_KEY = 'astro_natal';

export function useNatal() {
  const [natalChart, setNatalChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const chart = JSON.parse(raw);
        // Sanity check: ensure the chart isn't corrupted with NaNs
        if (chart?.positions?.sun != null && !isNaN(chart.positions.sun)) {
          setNatalChart(chart);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
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
            // Only update if it's a valid chart (ignore soft-deletes)
            if (data?.positions?.sun != null && !data._deleted) {
              setNatalChart(data);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
      const chart = generateNatalChart(birthData, { sidereal: birthData.sidereal });
      
      // Save local first for instant UX
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chart));
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
    localStorage.removeItem(STORAGE_KEY);
    setNatalChart(null);
    if (auth.currentUser) {
      const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'natal');
      await setDoc(ref, { _deleted: true }); // Soft delete or clear
    }
  }

  return { natalChart, saveChart, clearChart, loading, error };
}
