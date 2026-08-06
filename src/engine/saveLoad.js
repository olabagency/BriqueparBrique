const SAVE_KEY   = 'bpb_save';
const THEME_KEY  = 'bpb_theme';
const HISTORY_KEY = 'bpb_history';
const MAX_HISTORY = 10;

// ─── Save / Load ────────────────────────────────────────────────────────────

/**
 * Persist the full game state to localStorage.
 * @param {object} state
 */
export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('saveGame: could not write to localStorage', e);
  }
}

/**
 * Load the persisted game state from localStorage.
 * @returns {object|null}
 */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn('loadGame: could not read from localStorage', e);
    return null;
  }
}

/**
 * Delete the persisted save.
 */
export function deleteSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.warn('deleteSave: could not remove from localStorage', e);
  }
}

/**
 * Return true if a save exists.
 */
export function hasSave() {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
}

// ─── Run history ─────────────────────────────────────────────────────────────

/**
 * Append a completed run summary to the history list.
 * Only the last MAX_HISTORY runs are kept.
 * @param {object} summary  { pseudo, sector, finalVal, finalCash, years, achievements, date }
 */
export function appendHistory(summary) {
  const history = loadHistory();
  history.unshift({ ...summary, date: new Date().toISOString() });
  const trimmed = history.slice(0, MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('appendHistory: could not write to localStorage', e);
  }
}

/**
 * Load the run history list.
 * @returns {Array}
 */
export function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Clear the run history.
 */
export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {
    console.warn('clearHistory failed', e);
  }
}

// ─── Theme ───────────────────────────────────────────────────────────────────

/**
 * Persist the user's theme preference ('light' | 'dark').
 * @param {string} theme
 */
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('saveTheme failed', e);
  }
}

/**
 * Load the persisted theme preference.
 * Falls back to the system preference if nothing is stored.
 * @returns {'light'|'dark'}
 */
export function loadTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // ignore
  }
  // System preference fallback
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}
