import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, remove, get, limitToLast, query as fbQuery, orderByChild } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';
import { SESSION_ID } from './presence.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

// ─── History sync ────────────────────────────────────────────────────────────

const SYNCED_KEY = 'bpb_synced_runs';

function loadSyncedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(SYNCED_KEY) ?? '[]')); } catch { return new Set(); }
}
function saveSyncedIds(ids) {
  try { localStorage.setItem(SYNCED_KEY, JSON.stringify([...ids])); } catch {}
}

/**
 * Push localStorage history entries to Firebase leaderboard.
 * Each run is stored under leaderboard/{runId} so it's idempotent.
 * Already-synced runs are skipped via a localStorage Set.
 */
export async function syncHistoryToFirebase(runs) {
  const db = getDb();
  if (!db || !runs?.length) return;

  const syncedIds = loadSyncedIds();
  const pending = runs.filter(r => {
    const id = r.runId ?? `${r.name}|${r.finalVal ?? 0}|${r.date ?? ''}`;
    return !syncedIds.has(id);
  });
  if (!pending.length) return;

  for (const run of pending) {
    // Use runId as the Firebase key so the same run can't be duplicated
    const key = run.runId ?? `hist-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const localId = run.runId ?? `${run.name}|${run.finalVal ?? 0}|${run.date ?? ''}`;
    try {
      await set(ref(db, `leaderboard/${key}`), {
        runId:          key,
        sessionId:      key,            // use runId as sessionId — unique per run
        name:           run.name ?? 'Joueur',
        companyName:    run.companyName ?? '',
        sector:         run.sector ?? null,
        traitId:        run.traitId ?? null,
        score:          run.score ?? 0,
        finalVal:       run.finalVal ?? 0,
        finalCash:      run.finalCash ?? 0,
        personalCash:   run.personalCash ?? 0,
        years:          run.years ?? 0,
        age:            run.age ?? 18,
        propertiesOwned: run.propertiesOwned ?? 0,
        propertyList:   (run.propertyList ?? []).slice(0, 50),
        achievements:   run.achievements ?? [],
        endingKind:     run.endingKind ?? 'age_limit',
        luxuryItems:    run.luxuryItems ?? [],
        gender:         run.gender ?? null,
        durationMs:     run.durationMs ?? null,
        over:           true,
        date:           typeof run.date === 'number' ? new Date(run.date).toISOString() : (run.date ?? new Date().toISOString()),
        updatedAt:      Date.now(),
      });
      syncedIds.add(localId);
    } catch (e) {
      console.warn('syncHistoryToFirebase: failed for run', key, e);
    }
  }
  saveSyncedIds(syncedIds);
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
 * Push a finished run to the leaderboard AND to the permanent runs archive.
 * - leaderboard/{SESSION_ID}: overwritten each time (keeps best/last per session for scoreboard)
 * - runs/{runId}: keyed by the run's unique UUID → idempotent, no duplicates even if called twice
 */
export async function pushFinishedGame(summary) {
  const db = getDb();
  if (!db) return;

  const runId = summary.runId ?? SESSION_ID;

  const payload = {
    runId,
    sessionId:       SESSION_ID,
    name:            summary.name ?? 'Joueur',
    companyName:     summary.companyName ?? '',
    sector:          summary.sector ?? null,
    traitId:         summary.traitId ?? null,
    score:           summary.score ?? 0,
    finalVal:        summary.finalVal ?? 0,
    finalCash:       summary.finalCash ?? 0,
    personalCash:    summary.personalCash ?? 0,
    years:           summary.years ?? 0,
    age:             summary.age ?? 18,
    propertiesOwned: summary.propertiesOwned ?? 0,
    propertyList:    (summary.propertyList ?? []).slice(0, 50),
    achievements:    summary.achievements ?? [],
    endingKind:      summary.endingKind ?? 'age_limit',
    luxuryItems:     summary.luxuryItems ?? [],
    durationMs:      summary.durationMs ?? null,
    over:            true,
    date:            new Date().toISOString(),
    updatedAt:       Date.now(),
  };

  try {
    // Leaderboard: one entry per session (upsert — fast scoreboard reads)
    await set(ref(db, `leaderboard/${SESSION_ID}`), payload);
  } catch (e) {
    console.warn('pushFinishedGame (leaderboard) failed', e);
  }

  try {
    // Archive: keyed by runId (UUID) → set() is idempotent, no duplicates on double-call
    await set(ref(db, `runs/${runId}`), payload);
  } catch (e) {
    console.warn('pushFinishedGame (runs archive) failed', e);
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
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } catch (e) {
    console.warn('fetchCombinedLeaderboard failed:', e.message);
    return null;
  }
}
