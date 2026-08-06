import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useEffects } from '../../context/EffectsContext.jsx';
import { FIREBASE_ENABLED } from '../../engine/firebaseConfig.js';
import { updatePresence, subscribePresence, SESSION_ID } from '../../engine/presence.js';
import { subscribeLiveNotifications } from '../../engine/liveNotifications.js';
import globalBoard from '../../data/global_leaderboard.json';
import { fmtCash } from '../../engine/utils.js';

// ─── Simulated presence (fallback when Firebase is not configured) ─────────────

const SIM_ACTIONS = [
  () => `vient d'acheter un bien`,
  () => `a mis son bien en location`,
  () => `a renégocié son crédit`,
  () => `a débloqué un nouveau succès`,
  () => `vient de démarrer une nouvelle partie`,
  () => `a revendu avec plus-value`,
  () => `traverse une période de stress élevé`,
];

function pickSimPlayers() {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 4));
  const count = 3 + (seed % 4);
  return [...globalBoard].slice(0, count);
}

const SIM_PLAYERS = pickSimPlayers();

function useSimPresence(emit) {
  const timerRef = useRef(null);

  useEffect(() => {
    function scheduleNext() {
      timerRef.current = setTimeout(() => {
        const p = SIM_PLAYERS[Math.floor(Math.random() * SIM_PLAYERS.length)];
        const action = SIM_ACTIONS[Math.floor(Math.random() * SIM_ACTIONS.length)]();
        emit({ type: 'live', player: p, action });
        scheduleNext();
      }, 22000 + Math.random() * 28000);
    }
    const delay = 10000 + Math.random() * 15000;
    timerRef.current = setTimeout(scheduleNext, delay);
    return () => clearTimeout(timerRef.current);
  }, [emit]);

  return { players: SIM_PLAYERS, count: 8 + Math.floor(Math.random() * 18) };
}

// ─── Real Firebase presence ──────────────────────────────────────────────────

function useRealPresence(emit) {
  const { state } = useGame();
  const [players, setPlayers] = useState([]);
  const prevPlayersRef = useRef([]);

  // Push our own presence every 90s and on state changes
  useEffect(() => {
    if (!state.name) return;
    updatePresence({ name: state.name, year: state.year, valuation: state.valuation, stress: state.stress });
  }, [state.year, state.valuation, state.stress, state.name]);

  useEffect(() => {
    if (!state.name) return;
    const interval = setInterval(() => {
      updatePresence({ name: state.name, year: state.year, valuation: state.valuation, stress: state.stress });
    }, 90000);
    return () => clearInterval(interval);
  }, [state.name, state.year, state.valuation, state.stress]);

  // Subscribe to other players' presence
  useEffect(() => {
    const unsub = subscribePresence((live) => {
      const prev = prevPlayersRef.current;
      live.forEach(p => {
        const wasPresent = prev.some(q => q.name === p.name);
        if (!wasPresent && p.name) {
          const valStr = p.valuation > 0 ? ` · ${fmtCash(p.valuation)} de patrimoine` : '';
          emit({ type: 'live', player: p, action: `est en ligne${valStr}` });
        }
      });
      prevPlayersRef.current = live;
      setPlayers(live);
    });
    return unsub;
  }, [emit]);

  // Subscribe to real game-event notifications (buy, sell, achievements)
  const lastSeenTsRef = useRef(Date.now());
  useEffect(() => {
    const unsub = subscribeLiveNotifications((notifs) => {
      const newOnes = notifs
        .filter(n => n.ts > lastSeenTsRef.current && n.sessionId !== SESSION_ID);
      if (newOnes.length === 0) return;
      lastSeenTsRef.current = Math.max(...newOnes.map(n => n.ts));
      for (const n of newOnes) {
        emit({ type: 'live', player: { name: n.name }, action: n.action });
      }
    });
    return unsub;
  }, [emit]);

  return { players, count: players.length };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LivePresence() {
  const { emit } = useEffects();

  const real = FIREBASE_ENABLED ? useRealPresence(emit) : null;
  const sim  = !FIREBASE_ENABLED ? useSimPresence(emit) : null;

  const { players, count } = real ?? sim ?? { players: [], count: 0 };
  const displayCount = FIREBASE_ENABLED ? count : count;

  if (displayCount === 0 && FIREBASE_ENABLED) return null;

  const shownAvatars = players.slice(0, 4);

  return (
    <div className="live-presence" title={FIREBASE_ENABLED ? 'Joueurs en ligne maintenant' : 'Joueurs actifs aujourd\'hui'}>
      <span className="live-dot" />
      <span className="live-count">{displayCount} en ligne</span>
      <div className="live-avatars">
        {shownAvatars.map((p, i) => (
          <span
            key={i}
            className="live-avatar-chip"
            title={`${p.name}${p.year ? ` · An ${p.year}` : ''}${p.valuation ? ` · ${fmtCash(p.valuation)}` : ''}`}
          >
            {(p.name ?? '?')[0].toUpperCase()}
          </span>
        ))}
      </div>
      {!FIREBASE_ENABLED && (
        <span style={{ fontSize: 9, color: 'var(--muted)', opacity: .6 }}>sim.</span>
      )}
    </div>
  );
}
