import React, { useState, useEffect, useRef } from 'react';
import { useEffects } from '../../context/EffectsContext.jsx';
import globalBoard from '../../data/global_leaderboard.json';

const PROPERTY_TYPES = ['Studio', 'Appartement T2', 'Appartement T3', 'Duplex', 'Maison', 'Loft', 'Local commercial'];
const ACTIONS = [
  p => `vient d'acheter un ${PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)]}`,
  p => `a mis son bien en location`,
  p => `a renégocié son crédit`,
  p => `a atteint ${Math.floor(Math.random() * 30 + 5) * 100} k€ de patrimoine`,
  p => `vient de démarrer une nouvelle partie`,
  p => `a revendu un bien avec plus-value`,
  p => `a débloqué un nouveau succès`,
  p => `traverse une période de stress élevé`,
  p => `a réalisé sa meilleure année`,
  p => `vient de rembourser un crédit`,
];

function pickOnlinePlayers() {
  const seed = Math.floor(Date.now() / (1000 * 60 * 60 * 4));
  const shuffled = [...globalBoard].sort(() => {
    const h = ((seed * 2654435761) >>> 0);
    return (h % 3) - 1;
  });
  const count = 3 + (seed % 3);
  return shuffled.slice(0, count);
}

const ONLINE_PLAYERS = pickOnlinePlayers();

export default function LivePresence() {
  const { emit } = useEffects();
  const timerRef = useRef(null);
  const [onlineCount] = useState(() => 8 + Math.floor(Math.random() * 18));

  useEffect(() => {
    function scheduleNext() {
      const delay = 20000 + Math.random() * 25000;
      timerRef.current = setTimeout(() => {
        const player = ONLINE_PLAYERS[Math.floor(Math.random() * ONLINE_PLAYERS.length)];
        const actionFn = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        emit({ type: 'live', player, action: actionFn(player) });
        scheduleNext();
      }, delay);
    }

    const initialDelay = 8000 + Math.random() * 12000;
    timerRef.current = setTimeout(() => {
      scheduleNext();
    }, initialDelay);

    return () => clearTimeout(timerRef.current);
  }, [emit]);

  return (
    <div className="live-presence">
      <span className="live-dot" />
      <span className="live-count">{onlineCount} en ligne</span>
      <div className="live-avatars">
        {ONLINE_PLAYERS.slice(0, 4).map((p, i) => (
          <span key={i} className="live-avatar-chip" title={p.name}>
            {p.name[0]}
          </span>
        ))}
      </div>
    </div>
  );
}
