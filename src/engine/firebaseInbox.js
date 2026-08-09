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
    const result = await push(ref(db, `inbox/${targetSessionId}`), {
      ...payload,
      fromSessionId: SESSION_ID,
    });
    console.log('[inbox] sent to', targetSessionId, 'key=', result.key, payload);
  } catch (e) {
    console.error('[inbox] sendToInbox FAILED', e);
  }
}

export function subscribeInbox(onMessage) {
  const db = getDb();
  if (!db) { console.warn('[inbox] Firebase not available'); return () => {}; }

  console.log('[inbox] subscribing to inbox/', SESSION_ID);
  const inboxRef = ref(db, `inbox/${SESSION_ID}`);
  const seenKeys = new Set();

  const handler = (snap) => {
    console.log('[inbox] onChildAdded fired, key=', snap.key, snap.val());
    if (!snap.exists()) return;
    const key = snap.key;
    if (!key || seenKeys.has(key)) return;
    seenKeys.add(key);
    onMessage({ ...snap.val(), _key: key });
    remove(snap.ref).catch(() => {});
  };

  const unsub = onChildAdded(inboxRef, handler, (err) => {
    console.error('[inbox] onChildAdded error:', err);
  });
  return unsub;
}
