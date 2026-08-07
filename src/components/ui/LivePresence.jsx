import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import { useEffects } from '../../context/EffectsContext.jsx';
import { FIREBASE_ENABLED } from '../../engine/firebaseConfig.js';
import { updatePresence, subscribePresence, SESSION_ID } from '../../engine/presence.js';
import { subscribeLiveNotifications, pushLiveNotification } from '../../engine/liveNotifications.js';
import { subscribeInbox } from '../../engine/firebaseInbox.js';
import { fmtCash } from '../../engine/utils.js';

// ─── Real Firebase presence ──────────────────────────────────────────────────

function useRealPresence(emit) {
  const { state, dispatch } = useGame();
  const [players, setPlayers] = useState([]);
  const prevPlayersRef = useRef([]);

  // Push our own presence on state changes and every 90s
  useEffect(() => {
    if (!state.name) return;
    updatePresence({
      name: state.name,
      year: state.year,
      age: state.age,
      valuation: state.valuation,
      cash: state.cash,
      personalCash: state.personalCash,
      stress: state.stress,
      companyName: state.companyName,
      genderEmoji: state.gender?.emoji ?? '🙂',
      luxuryItems: state.luxuryItems ?? [],
    });
  }, [state.year, state.valuation, state.stress, state.name, state.cash, state.personalCash]);

  useEffect(() => {
    if (!state.name) return;
    const interval = setInterval(() => {
      updatePresence({
        name: state.name,
        year: state.year,
        age: state.age,
        valuation: state.valuation,
        cash: state.cash,
        personalCash: state.personalCash,
        stress: state.stress,
        companyName: state.companyName,
        genderEmoji: state.gender?.emoji ?? '🙂',
        luxuryItems: state.luxuryItems ?? [],
      });
    }, 90000);
    return () => clearInterval(interval);
  }, [state.name, state.year, state.valuation, state.stress, state.cash, state.personalCash]);

  // Subscribe to other players' presence
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
        emit({ type: 'live', player: { name: n.name, sessionId: n.sessionId }, action: n.action });
      }
    });
    return unsub;
  }, [emit]);

  // Subscribe to crime inbox
  useEffect(() => {
    const unsub = subscribeInbox((payload) => {
      dispatch({ type: 'RECEIVE_CRIME', payload });
      // Emit the crime toast for the victim
      emit({
        type: 'crime',
        variant: 'victim',
        crimeType: payload.type,
        attackerCompany: payload.attackerCompany ?? null,
        pct: payload.pct,
      });
      // Flash red
      emit({ type: 'flash', color: 'red' });
    });
    return unsub;
  }, [dispatch, emit]);

  return { players, count: players.length };
}

// ─── Player hover modal ──────────────────────────────────────────────────────

function PlayerHoverModal({ player, myState, dispatch, emit, onClose, onGreet }) {
  const canCrime  = !myState.crimeUsedThisYear;
  const cash      = myState.cash ?? 0;
  const val       = myState.valuation ?? 0;
  const insuranceCost = Math.round(15 + val * 0.003);

  const commitCrime = (crimeType) => {
    dispatch({
      type: 'COMMIT_CRIME',
      payload: { crimeType, targetSessionId: player.sessionId, targetName: player.name },
    });
    onClose();
  };

  const buyInsurance = () => {
    dispatch({ type: 'BUY_INSURANCE' });
    onClose();
  };

  return (
    <div
      className="player-hover-modal"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--accent-soft)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: 'var(--accent)',
        }}>
          {(player.name ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>{player.name}</div>
          {player.companyName && (
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>🏢 {player.companyName}</div>
          )}
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 20 }}>{player.genderEmoji ?? '🙂'}</div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
        {player.age && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--muted)' }}>🎂 Âge</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{player.age} ans</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--muted)' }}>📈 Patrimoine immo</span>
          <span style={{ fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 700 }}>{fmtCash(player.valuation ?? 0)}</span>
        </div>
        {player.cash !== undefined && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--muted)' }}>💰 Trésorerie</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmtCash(player.cash)}</span>
          </div>
        )}
        {player.year && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
            <span style={{ color: 'var(--muted)' }}>📅 Année en cours</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>An {player.year}</span>
          </div>
        )}
      </div>

      {/* Luxury items */}
      {(player.luxuryItems ?? []).length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>✨ Biens de luxe</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {(player.luxuryItems ?? []).map((item, i) => (
              <div key={i} title={item.name} style={{
                width: 36, height: 36, borderRadius: 6, overflow: 'hidden',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>
                {item.image
                  ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span>{item.icon ?? '✨'}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Greet button */}
      <button
        onClick={() => { onGreet(player); onClose(); }}
        style={{
          width: '100%', padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
          color: 'var(--accent)', cursor: 'pointer', marginBottom: 10,
        }}
      >
        👋 Saluer {player.name?.split(' ')[0]}
      </button>

      {/* Separator */}
      <div style={{ borderTop: '1px solid var(--border)', marginBottom: 8 }} />

      {/* Criminal actions */}
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        ⚠️ Actions criminelles
      </div>

      {myState.crimeUsedThisYear ? (
        <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '6px 0', marginBottom: 6 }}>
          Une action par an — attends l'année prochaine.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            className="crime-btn"
            disabled={cash < 50}
            title={cash < 50 ? 'Fonds insuffisants (50k€)' : '55% de chance de succès'}
            onClick={() => commitCrime('incendie')}
          >
            🔥 Incendie
            <span className="crime-btn-cost">50k€</span>
          </button>
          <button
            className="crime-btn"
            disabled={cash < 25}
            title={cash < 25 ? 'Fonds insuffisants (25k€)' : '60% de chance de succès'}
            onClick={() => commitCrime('cambriolage')}
          >
            🔓 Cambriolage
            <span className="crime-btn-cost">25k€</span>
          </button>
        </div>
      )}

      {/* Insurance */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        {myState.hasInsurance ? (
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>
            🛡️ Tu es assuré·e cette année
          </div>
        ) : (
          <button
            className="crime-btn crime-btn-insurance"
            disabled={cash < insuranceCost}
            title={`Réduit de 50% les dégâts des attaques reçues`}
            onClick={buyInsurance}
          >
            🛡️ Souscrire l'assurance
            <span className="crime-btn-cost">{insuranceCost}k€/an</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function LivePresence() {
  const { state, dispatch } = useGame();
  const { emit } = useEffects();
  const [hoveredPlayer, setHoveredPlayer] = useState(null);
  const hoverRef = useRef(null);
  const lastCrimeResultRef = useRef(null);

  const { players, count } = FIREBASE_ENABLED
    ? useRealPresence(emit)
    : { players: [], count: 0 };

  const handleGreet = useCallback((player) => {
    if (!state.name) return;
    pushLiveNotification({ name: state.name, action: `👋 salue ${player.name} !` });
  }, [state.name]);

  // Emit crime result toast after COMMIT_CRIME resolves
  useEffect(() => {
    const result = state.lastCrimeResult;
    if (!result || result === lastCrimeResultRef.current) return;
    lastCrimeResultRef.current = result;
    emit({
      type: 'crime',
      variant: result.success ? 'attacker_success' : 'attacker_fail',
      crimeType: result.crimeType,
      targetName: result.targetName,
    });
    dispatch({ type: 'CLEAR_CRIME_RESULT' });
  }, [state.lastCrimeResult, emit, dispatch]);

  // Close hover modal on outside click
  useEffect(() => {
    if (!hoveredPlayer) return;
    const handler = (e) => {
      if (hoverRef.current && !hoverRef.current.contains(e.target)) setHoveredPlayer(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hoveredPlayer]);

  if (count === 0) return null;

  const shownAvatars = players.slice(0, 4);

  return (
    <div className="live-presence" title="Joueurs en ligne maintenant" style={{ position: 'relative' }}>
      <span className="live-dot" />
      <span className="live-count">{count} en ligne</span>
      <div className="live-avatars" ref={hoverRef} style={{ position: 'relative' }}>
        {shownAvatars.map((p, i) => (
          <span
            key={i}
            className="live-avatar-chip"
            title={`${p.name}${p.year ? ` · An ${p.year}` : ''}${p.valuation ? ` · ${fmtCash(p.valuation)}` : ''} — Cliquer pour voir le profil`}
            style={{ cursor: 'pointer' }}
            onClick={() => setHoveredPlayer(hoveredPlayer?.name === p.name ? null : p)}
          >
            {(p.name ?? '?')[0].toUpperCase()}
          </span>
        ))}
        {hoveredPlayer && (
          <PlayerHoverModal
            player={hoveredPlayer}
            myState={state}
            dispatch={dispatch}
            emit={emit}
            onClose={() => setHoveredPlayer(null)}
            onGreet={handleGreet}
          />
        )}
      </div>
    </div>
  );
}
