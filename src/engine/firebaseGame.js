import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, remove, get, limitToLast, query as fbQuery } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';
import { SESSION_ID } from './presence.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

// ─── Active game sync ─────────────────────────────────────────────────────────

/**
 * Upsert current game snapshot to sessions/{SESSION_ID}.
 * Called each year. Data is removed when the game ends or the tab closes.
 */
export async function syncActiveGame(state) {
  const db = getDb();
  if (!db || !state.name) return;
  try {
    await set(ref(db, `sessions/${SESSION_ID}`), {
      sessionId:      SESSION_ID,
      name:           state.name,
      companyName:    state.companyName ?? '',
      year:           state.year ?? 1,
      age:            state.age ?? 18,
      valuation:      state.valuation ?? 0,
      cash:           state.cash ?? 0,
      personalCash:   state.personalCash ?? 0,
      stress:         state.stress ?? 0,
      propertiesOwned: (state.propertyList ?? []).length,
      achievements:   state.achievements ?? [],
      over:           false,
      updatedAt:      Date.now(),
    });
  } catch (e) {
    console.warn('syncActiveGame failed', e);
  }
}

/**
 * Remove the active game session (game ended or tab closed).
 */
export async function removeActiveGame() {
  const db = getDb();
  if (!db) return;
  try {
    await remove(ref(db, `sessions/${SESSION_ID}`));
  } catch (e) {
    console.warn('removeActiveGame failed', e);
  }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

/**
 * Push a finished run to the leaderboard.
 */
export async function pushFinishedGame(summary) {
  const db = getDb();
  if (!db) return;
  try {
    // Write under leaderboard/{SESSION_ID} so the same run overwrites itself
    await set(ref(db, `leaderboard/${SESSION_ID}`), {
      sessionId:      SESSION_ID,
      name:           summary.name ?? 'Joueur',
      companyName:    summary.companyName ?? '',
      finalVal:       summary.finalVal ?? 0,
      finalCash:      summary.finalCash ?? 0,
      personalCash:   summary.personalCash ?? 0,
      years:          summary.years ?? 0,
      age:            summary.age ?? 18,
      propertiesOwned: summary.propertiesOwned ?? 0,
      achievements:   summary.achievements ?? [],
      endingKind:     summary.endingKind ?? 'age_limit',
      over:           true,
      date:           new Date().toISOString(),
      updatedAt:      Date.now(),
    });
  } catch (e) {
    console.warn('pushFinishedGame failed', e);
  }
}

/**
 * Fetch combined leaderboard: finished runs + active sessions.
 * No orderByChild to avoid index requirement — sort client-side.
 * Returns null on error, [] if empty.
 */
export async function fetchCombinedLeaderboard() {
  const db = getDb();
  if (!db) return null;

  try {
    const [finishedSnap, activeSnap] = await Promise.all([
      get(ref(db, 'leaderboard')),
      get(ref(db, 'sessions')),
    ]);

    const entries = [];
    const nowMs = Date.now();
    const STALE_MS = 10 * 60 * 1000; // ignore sessions inactive for 10 min

    if (finishedSnap.exists()) {
      finishedSnap.forEach(child => {
        const v = child.val();
        entries.push({ ...v, _source: 'finished' });
      });
    }

    if (activeSnap.exists()) {
      activeSnap.forEach(child => {
        const v = child.val();
        // Skip stale sessions and our own
        if (v.sessionId === SESSION_ID) return;
        if (nowMs - (v.updatedAt ?? 0) > STALE_MS) return;
        entries.push({
          ...v,
          finalVal: v.valuation ?? 0,  // map to leaderboard field
          _source: 'active',
        });
      });
    }

    // Deduplicate by sessionId (prefer finished over active)
    const bySession = new Map();
    for (const e of entries) {
      const key = e.sessionId ?? `${e.name}|${e.date ?? ''}`;
      const existing = bySession.get(key);
      if (!existing || e._source === 'finished') bySession.set(key, e);
    }

    return [...bySession.values()]
      .sort((a, b) => (b.finalVal ?? b.valuation ?? 0) - (a.finalVal ?? a.valuation ?? 0));
  } catch (e) {
    console.warn('fetchCombinedLeaderboard failed:', e.message);
    return null;
  }
}
