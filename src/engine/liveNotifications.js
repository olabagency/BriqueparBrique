import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';
import { SESSION_ID } from './presence.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

const TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function pushLiveNotification({ name, action }) {
  const db = getDb();
  if (!db || !name) return;
  try {
    await push(ref(db, 'notifications'), {
      name,
      action,
      ts: Date.now(),
      sessionId: SESSION_ID,
    });
  } catch (e) {
    console.warn('pushLiveNotification failed', e);
  }
}

export function subscribeLiveNotifications(callback) {
  const db = getDb();
  if (!db) return () => {};
  const q = query(ref(db, 'notifications'), orderByChild('ts'), limitToLast(30));
  return onValue(q, snap => {
    if (!snap.exists()) return;
    const now = Date.now();
    const entries = [];
    snap.forEach(child => entries.push(child.val()));
    callback(entries.filter(e => now - (e.ts ?? 0) < TTL_MS));
  });
}
