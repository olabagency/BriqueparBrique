import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useEffects } from '../../context/EffectsContext.jsx';
import { FIREBASE_ENABLED } from '../../engine/firebaseConfig.js';
import { updatePresence, subscribePresence, SESSION_ID } from '../../engine/presence.js';
import { subscribeLiveNotifications } from '../../engine/liveNotifications.js';
import { fmtCash } from '../../engine/utils.js';

// ─── Real Firebase presence ──────────────────────────────────────────────────

function useRealPresence(emit) {
  const { state } = useGame();
  const [players, setPlayers] = useState([]);
  const prevPlayersRef = useRef([]);

  // Push our own presence on state changes and every 90s
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
  // Exclude own SESSION_ID (done in presence.js) AND own name (stale entries from old tabs)
  useEffect(() => {
    const unsub = subscribePresence((live) => {
      const myName = state.name?.trim().toLowerCase();
      const others = live.filter(p => p.name?.trim().toLowerCase() !== myName);
      const prev = prevPlayersRef.current;
      others.forEach(p => {
        const wasPresent = prev.some(q => q.name === p.name);
        if (!wasPresent && p.name) {
          const valStr = p.valuation > 0 ? ` · ${fmtCash(p.valuation)} de patrimoine` : '';
          emit({ type: 'live', player: p, action: `est en ligne${valStr}` });
        }
      });
      prevPlayersRef.current = others;
      setPlayers(others);
    });
    return unsub;
  }, [emit, state.name]);

  // Subscribe to real game-event notifications
  const lastSeenTsRef = useRef(Date.now());
  useEffect(() => {
    const unsub = subscribeLiveNotifications((notifs) => {
      const newOnes = notifs.filter(n => n.ts > lastSeenTsRef.current && n.sessionId !== SESSION_ID);
      if (newOnes.length === 0) return;
      lastSeenTsRef.current = Math.max(...newOnes.map(n => n.ts));
      for (const n of newOnes) {
        emit({ type: 'live', player: { name: n.name }, action: n.action });
      }
    });
    return unsub;
  }, [emit]);

  // Count = only real Firebase players (never inflated)
  return { players, count: players.length };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LivePresence() {
  const { emit } = useEffects();

  const { players, count } = FIREBASE_ENABLED
    ? useRealPresence(emit)
    : { players: [], count: 0 };

  // Hide when alone or Firebase disabled
  if (count === 0) return null;

  const shownAvatars = players.slice(0, 4);

  return (
    <div className="live-presence" title="Joueurs en ligne maintenant">
      <span className="live-dot" />
      <span className="live-count">{count} en ligne</span>
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
    </div>
  );
}
