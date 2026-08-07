import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, remove } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';
import { SESSION_ID } from './presence.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

export async function sendCrime(targetSessionId, payload) {
  const db = getDb();
  if (!db || !targetSessionId) return;
  try {
    await push(ref(db, `inbox/${targetSessionId}`), {
      ...payload,
      ts: Date.now(),
      fromSessionId: SESSION_ID,
    });
  } catch (e) {
    console.warn('sendCrime failed', e);
  }
}

// Listen for incoming crimes. onMessage is called once per crime, then the message is deleted.
export function subscribeInbox(onMessage) {
  const db = getDb();
  if (!db) return () => {};

  const inboxRef = ref(db, `inbox/${SESSION_ID}`);
  let lastTs = Date.now();

  const handler = (snap) => {
    if (!snap.exists()) return;
    const toDelete = [];
    snap.forEach(child => {
      const val = child.val();
      if ((val.ts ?? 0) > lastTs) {
        lastTs = Math.max(lastTs, val.ts);
        onMessage(val);
        toDelete.push(child.ref);
      }
    });
    toDelete.forEach(r => remove(r).catch(() => {}));
  };

  onValue(inboxRef, handler);
  return () => off(inboxRef, 'value', handler);
}
