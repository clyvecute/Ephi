import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

/**
 * Ephi Monetization & Credit System
 */

const FREE_DAILY_CREDITS = 3;

/**
 * Get current user credit balance.
 */
export async function getCredits() {
  if (!auth.currentUser) return 0;
  
  const userRef = doc(db, 'users', auth.currentUser.uid);
  const snap = await getDoc(userRef);
  
  if (snap.exists()) {
    return snap.data().credits || 0;
  }
  return 0;
}

/**
 * Deduct a credit for a premium action.
 */
export async function useCredit(amount = 1) {
  if (!auth.currentUser) throw new Error('Authentication required.');

  const userRef = doc(db, 'users', auth.currentUser.uid);
  const snap = await getDoc(userRef);
  
  if (!snap.exists()) throw new Error('User record not found.');
  
  const current = snap.data().credits || 0;
  if (current < amount) {
    throw new Error('Insufficient Divine Credits. Visit the Support Hub to recharge.');
  }

  await updateDoc(userRef, {
    credits: increment(-amount)
  });

  return current - amount;
}

/**
 * Award credits (used after successful payment).
 */
export async function addCredits(amount) {
  if (!auth.currentUser) return;

  const userRef = doc(db, 'users', auth.currentUser.uid);
  await updateDoc(userRef, {
    credits: increment(amount)
  });
}

/**
 * Tier definitions for the Support Page.
 */
export const CREDIT_TIERS = [
  { id: 'tier_1', amount: 10,  price: 3,    label: 'Neophyte Bundle',  description: '10 High-Precision Readings' },
  { id: 'tier_2', amount: 50,  price: 10,   label: 'Adept Bundle',     description: '50 High-Precision Readings + Priority Support' },
  { id: 'tier_3', amount: 200, price: 30,   label: 'Master Grimoire', description: '200 Readings for serious practitioners' }
];
