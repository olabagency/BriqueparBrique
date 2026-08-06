import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, query, orderByChild, limitToLast, get } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

/**
 * Push a finished run summary to Firebase global leaderboard.
 */
export async function pushGlobalScore(summary) {
  const db = getDb();
  if (!db) return;
  try {
    await push(ref(db, 'leaderboard'), {
      name:         summary.name ?? 'Joueur',
      companyName:  summary.companyName ?? '',
      finalVal:     summary.finalVal ?? 0,
      finalCash:    summary.finalCash ?? 0,
      personalCash: summary.personalCash ?? 0,
      years:        summary.years ?? 0,
      age:          summary.age ?? 18,
      propertiesOwned: summary.propertiesOwned ?? 0,
      achievements: summary.achievements ?? [],
      endingKind:   summary.endingKind ?? 'age_limit',
      date:         new Date().toISOString(),
    });
  } catch (e) {
    console.warn('pushGlobalScore failed', e);
  }
}

/**
 * Fetch top N scores from Firebase global leaderboard.
 * Returns [] if Firebase is not configured.
 */
export async function fetchGlobalScores(limit = 50) {
  const db = getDb();
  if (!db) return [];
  try {
    const q = query(ref(db, 'leaderboard'), orderByChild('finalVal'), limitToLast(limit));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const entries = [];
    snap.forEach(child => entries.push(child.val()));
    return entries.sort((a, b) => (b.finalVal ?? 0) - (a.finalVal ?? 0));
  } catch (e) {
    console.warn('fetchGlobalScores failed', e);
    return [];
  }
}
