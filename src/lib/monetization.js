import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';

/**
 * Ephi Monetization & Divine Credits (see README.md)
 */

const FREE_DAILY_CREDITS = Number(import.meta.env.VITE_FREE_DAILY_CREDITS) || 3;
const FREE_TRIAL_READS = Number(import.meta.env.VITE_FREE_TRIAL_READS) || 3;
const SESSION_TRIAL_KEY = 'ephi_session_reads';

export async function getCredits() {
  if (!auth.currentUser) return 0;
  const userRef = doc(db, 'users', auth.currentUser.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    const c = snap.data().credits;
    return c == null ? FREE_DAILY_CREDITS : c;
  }
  return 0;
}

/**
 * Bootstrap legacy accounts missing credits before any deduction.
 */
export async function ensureNewUserCredits(uid) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return snap.data()?.credits ?? 0;
  const data = snap.data();
  if (data.credits == null) {
    await updateDoc(userRef, {
      credits: FREE_DAILY_CREDITS,
      lastCreditGrant: serverTimestamp(),
    });
    return FREE_DAILY_CREDITS;
  }
  return data.credits;
}

/**
 * Grant daily credits if 24+ hours since lastCreditGrant (not on first bootstrap).
 */
export async function grantDailyCreditsIfDue(uid, userData) {
  if (userData?.credits == null) return false;

  const last = userData?.lastCreditGrant?.toDate?.()
    || (userData?.lastCreditGrant ? new Date(userData.lastCreditGrant) : null);

  if (!last) return false;

  const now = Date.now();
  if (now - last.getTime() < 24 * 60 * 60 * 1000) return false;

  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    credits: increment(FREE_DAILY_CREDITS),
    lastCreditGrant: serverTimestamp(),
  });
  return true;
}

export async function useCredit(amount = 1) {
  if (!auth.currentUser) throw new Error('Authentication required.');

  const uid = auth.currentUser.uid;
  let current = await ensureNewUserCredits(uid);

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User record not found.');

  current = snap.data().credits ?? current;

  if (current < amount) {
    throw new Error('Insufficient Divine Credits. Visit the Support Hub to recharge.');
  }

  await updateDoc(userRef, { credits: increment(-amount) });
  return current - amount;
}

export async function addCredits(amount) {
  if (!auth.currentUser) return;
  const userRef = doc(db, 'users', auth.currentUser.uid);
  await updateDoc(userRef, { credits: increment(amount) });
}

/**
 * Gate every AI Oracle call — logged-in users spend Firestore credits;
 * guests get a limited session trial (README: 3 free reads per session).
 */
export async function checkAndDeductCredit() {
  if (auth.currentUser) {
    // #region agent log
    const before = await getCredits();
    fetch('http://127.0.0.1:7910/ingest/c590a0d4-115c-4fbc-95e4-3aead585a382',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6ebf6'},body:JSON.stringify({sessionId:'b6ebf6',location:'monetization.js:checkAndDeductCredit',message:'credits before deduct',data:{before,uid:auth.currentUser.uid},timestamp:Date.now(),hypothesisId:'H-credits',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    const after = await useCredit(1);
    // #region agent log
    fetch('http://127.0.0.1:7910/ingest/c590a0d4-115c-4fbc-95e4-3aead585a382',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6ebf6'},body:JSON.stringify({sessionId:'b6ebf6',location:'monetization.js:checkAndDeductCredit',message:'credits after deduct',data:{after},timestamp:Date.now(),hypothesisId:'H-credits',runId:'post-fix'})}).catch(()=>{});
    // #endregion
    return;
  }
  const used = parseInt(sessionStorage.getItem(SESSION_TRIAL_KEY) || '0', 10);
  if (used >= FREE_TRIAL_READS) {
    throw new Error(
      `Free trial limit (${FREE_TRIAL_READS} readings). Log in for daily Divine Credits or visit Support.`
    );
  }
  sessionStorage.setItem(SESSION_TRIAL_KEY, String(used + 1));
}

export const CREDIT_TIERS = [
  { id: 'tier_1', amount: 10, price: '$3', paypalAmount: '3', name: 'Neophyte', desc: '10 High-Precision Readings' },
  { id: 'tier_2', amount: 50, price: '$10', paypalAmount: '10', name: 'Adept', desc: '50 Readings + Priority Support' },
  { id: 'tier_3', amount: 200, price: '$30', paypalAmount: '30', name: 'Master', desc: 'Unlimited Depth Archive' },
];

export function getPayPalAcquireUrl(amountUsd) {
  const base = (import.meta.env.VITE_PAYPAL_URL || 'https://paypal.me/jellyephi').replace(/\/$/, '');
  return `${base}/${amountUsd}USD`;
}
