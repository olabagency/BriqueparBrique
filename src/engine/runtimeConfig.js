import { GAME_CONFIG } from '../config.js';

let _resolved = { ...GAME_CONFIG };

export function getGameConfig() { return _resolved; }

export function applyGameConfigOverrides(overrides) {
  if (!overrides || typeof overrides !== 'object') return;
  _resolved = { ...GAME_CONFIG, ...overrides };
}
