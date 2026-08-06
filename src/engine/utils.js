import { STAGE_MULTIPLIERS } from '../config.js';
import stages from '../data/stages.json';

/**
 * Format a cash value in k€ or M€.
 * @param {number} v  value in k€
 */
export function fmtCash(v) {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  if (abs >= 1000) {
    return (v / 1000).toFixed(1).replace('.0', '') + ' M€';
  }
  return Math.round(v) + ' k€';
}

/**
 * Return the stage id for a given year of play.
 * @param {number} year  1-based year of play
 */
export function stageFor(year) {
  for (const stage of stages) {
    if (year >= stage.min && year <= stage.max) return stage.name;
  }
  return stages[stages.length - 1].name;
}

/**
 * Return the stage multiplier for a given stage id.
 * @param {string} stageId
 */
export function stageMultiplier(stageId) {
  return STAGE_MULTIPLIERS[stageId] ?? 1;
}

/**
 * Fisher-Yates shuffle (in-place, returns the array).
 */
export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Return the number of events to show for a given year (1–3).
 */
export function randomEventsPerYear() {
  return 3 + Math.floor(Math.random() * 3); // 3, 4 ou 5
}

/**
 * Weighted random pick from an array of {item, weight} objects.
 */
export function weightedRandom(items) {
  const total = items.reduce((s, x) => s + (x.weight ?? 1), 0);
  let rand = Math.random() * total;
  for (const x of items) {
    rand -= x.weight ?? 1;
    if (rand <= 0) return x.item;
  }
  return items[items.length - 1].item;
}

/**
 * Generate a random integer between min and max (inclusive).
 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format a percentage with a + sign for positives.
 */
export function fmtPct(v) {
  const rounded = Math.round(v * 100);
  return (rounded >= 0 ? '+' : '') + rounded + '%';
}
