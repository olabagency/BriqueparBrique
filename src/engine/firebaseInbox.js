import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onChildAdded, off, remove } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';
import { SESSION_ID } from './presence.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

export async function sendToInbox(targetSessionId, payload) {
  const db = getDb();
  if (!db || !targetSessionId) return;
  try {
    await push(ref(db, `inbox/${targetSessionId}`), {
      ...payload,
      fromSessionId: SESSION_ID,
    });
  } catch (e) {
    console.warn('sendToInbox failed', e);
  }
}

export function subscribeInbox(onMessage) {
  const db = getDb();
  if (!db) return () => {};

  const inboxRef = ref(db, `inbox/${SESSION_ID}`);
  const seenKeys = new Set();

  const handler = (snap) => {
    if (!snap.exists()) return;
    const key = snap.key;
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    onMessage({ ...snap.val(), _key: key });
    remove(snap.ref).catch(() => {});
  };

  onChildAdded(inboxRef, handler);
  return () => off(inboxRef, 'child_added', handler);
}
