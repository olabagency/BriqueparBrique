import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';
import { FIREBASE_CONFIG, FIREBASE_ENABLED } from './firebaseConfig.js';

function getDb() {
  if (!FIREBASE_ENABLED) return null;
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
  return getDatabase(app);
}

export async function fetchShopOverrides() {
  const db = getDb();
  if (!db) return {};
  try {
    const snap = await get(ref(db, 'admin/shopOverrides'));
    return snap.exists() ? snap.val() : {};
  } catch { return {}; }
}

export async function saveShopOverrides(overrides) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, 'admin/shopOverrides'), overrides);
}

export async function fetchConfigOverrides() {
  const db = getDb();
  if (!db) return {};
  try {
    const snap = await get(ref(db, 'admin/gameConfig'));
    return snap.exists() ? snap.val() : {};
  } catch { return {}; }
}

// Returns an unsubscribe function. Calls callback immediately + on every change.
export function subscribeConfigOverrides(callback) {
  const db = getDb();
  if (!db) { callback({}); return () => {}; }
  const unsub = onValue(ref(db, 'admin/gameConfig'), snap => {
    callback(snap.exists() ? snap.val() : {});
  }, () => callback({}));
  return unsub;
}

export function subscribeShopOverrides(callback) {
  const db = getDb();
  if (!db) { callback({}); return () => {}; }
  const unsub = onValue(ref(db, 'admin/shopOverrides'), snap => {
    callback(snap.exists() ? snap.val() : {});
  }, () => callback({}));
  return unsub;
}

export async function saveConfigOverrides(overrides) {
  const db = getDb();
  if (!db) return;
  await set(ref(db, 'admin/gameConfig'), overrides);
}
