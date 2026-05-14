/**
 * src/lib/library.js
 * 
 * Manages the association between reference books (PDFs) and specific tools.
 */

const STORAGE_KEY = 'ephi_library';

/**
 * Returns the entire library mapping.
 * {
 *   'global': { uri: '...', name: '...' },
 *   'horary': { uri: '...', name: '...' },
 *   ...
 * }
 */
import { auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

export function getLibrary() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveToLibrary(toolKey, fileData) {
  const lib = getLibrary();
  lib[toolKey] = fileData;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));

  if (auth.currentUser) {
    const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'library');
    setDoc(ref, lib).catch(console.error);
  }
}

export function removeFromLibrary(toolKey) {
  const lib = getLibrary();
  delete lib[toolKey];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));

  if (auth.currentUser) {
    const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'library');
    setDoc(ref, lib).catch(console.error);
  }
}

export function getBookForTool(toolKey) {
  const lib = getLibrary();
  return lib[toolKey] || lib['global'] || null;
}

export const TOOL_LABELS = {
  global: 'Global Default',
  natal: 'Natal Chart',
  transit: 'Transits & Forecasts',
  horary: 'Horary Astrology',
  vedic: 'Vedic (Jyotish)',
  synastry: 'Synastry (Relationships)',
  bazi: 'Four Pillars (Bazi)',
  hellenistic: 'Hellenistic / Traditional',
};
