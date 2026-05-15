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
  if (!lib[toolKey]) {
    lib[toolKey] = [];
  } else if (!Array.isArray(lib[toolKey])) {
    lib[toolKey] = [lib[toolKey]];
  }
  lib[toolKey].push(fileData);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));

  if (auth.currentUser) {
    const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'library');
    setDoc(ref, lib).catch(console.error);
  }
}

export function removeFromLibrary(toolKey, index = null) {
  const lib = getLibrary();
  if (!lib[toolKey]) return;

  if (index !== null && Array.isArray(lib[toolKey])) {
    lib[toolKey].splice(index, 1);
    if (lib[toolKey].length === 0) {
      delete lib[toolKey];
    }
  } else {
    delete lib[toolKey];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));

  if (auth.currentUser) {
    const ref = doc(db, 'users', auth.currentUser.uid, 'data', 'library');
    setDoc(ref, lib).catch(console.error);
  }
}

export function getBookForTool(toolKey) {
  const lib = getLibrary();
  let items = lib[toolKey] || lib['global'] || [];
  if (!Array.isArray(items) && items) {
    items = [items];
  }
  return items;
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
