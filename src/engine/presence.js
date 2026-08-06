import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, remove, onValue, off, serverTimestamp } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';

const SESSION_TTL_MS = 5 * 60 * 1000; // 5 min
let app = null;
let db  = null;

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  if (!db) {
    app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    db  = getDatabase(app);
  }
  return db;
}

// Unique session ID per browser tab
const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/**
 * Write/update this player's presence.
 * @param {{ name: string, year: number, valuation: number, stress: number }} data
 */
export function updatePresence(data) {
  const database = getDb();
  if (!database) return;
  const presenceRef = ref(database, `presence/${SESSION_ID}`);
  set(presenceRef, {
    name:      data.name ?? 'Joueur',
    year:      data.year ?? 1,
    valuation: data.valuation ?? 0,
    stress:    data.stress ?? 0,
    lastSeen:  Date.now(),
  }).catch(() => {});
}

/**
 * Remove this player's presence (game ended, tab closed).
 */
export function removePresence() {
  const database = getDb();
  if (!database) return;
  remove(ref(database, `presence/${SESSION_ID}`)).catch(() => {});
}

/**
 * Subscribe to the presence list.
 * @param {(players: Array) => void} callback
 * @returns {() => void} unsubscribe
 */
export function subscribePresence(callback) {
  const database = getDb();
  if (!database) {
    callback([]);
    return () => {};
  }

  const presenceRef = ref(database, 'presence');

  const handler = (snapshot) => {
    const now = Date.now();
    const raw = snapshot.val() ?? {};
    const alive = Object.entries(raw)
      .filter(([id, p]) => id !== SESSION_ID && now - (p.lastSeen ?? 0) < SESSION_TTL_MS)
      .map(([, p]) => p)
      .sort((a, b) => (b.valuation ?? 0) - (a.valuation ?? 0));
    callback(alive);
  };

  onValue(presenceRef, handler);
  return () => off(presenceRef, 'value', handler);
}

// Remove presence when the tab closes
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', removePresence);
}
