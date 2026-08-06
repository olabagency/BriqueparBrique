import React from 'react';
import { useEffects } from '../../context/EffectsContext.jsx';

export default function EffectsLayer({ stress = 0 }) {
  const { effects } = useEffects();

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000 }}>

      {/* Stress vignette — always visible when stress is high */}
      {stress >= 70 && (
        <div
          className={stress >= 88 ? 'fx-stress-vignette fx-stress-critical' : 'fx-stress-vignette'}
          style={{ '--stress-intensity': Math.min(1, (stress - 70) / 30) }}
        />
      )}

      {effects.map(e => {
        switch (e.type) {
          case 'float':       return <FloatNum key={e.id} {...e} />;
          case 'achievement': return <AchievementToast key={e.id} {...e} />;
          case 'year':        return <YearFlash key={e.id} {...e} />;
          case 'live':        return <LiveToast key={e.id} {...e} />;
          case 'flash':       return <ScreenFlash key={e.id} {...e} />;
          default:            return null;
        }
      })}
    </div>
  );
}

function FloatNum({ label, positive, xPct = 50 }) {
  return (
    <div
      className={`fx-float ${positive ? 'fx-float-pos' : 'fx-float-neg'}`}
      style={{ left: `${xPct}%`, top: '42%' }}
    >
      {label}
    </div>
  );
}

function AchievementToast({ def }) {
  if (!def) return null;
  return (
    <div className="fx-achievement">
      <span style={{ fontSize: 22 }}>{def.emoji}</span>
      <div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Succès débloqué</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 1 }}>{def.title}</div>
      </div>
    </div>
  );
}

function YearFlash({ year }) {
  return (
    <div className="fx-year">
      <div className="fx-year-label">Année {year}</div>
    </div>
  );
}

function LiveToast({ player, action }) {
  const initial = (player?.name ?? '?')[0].toUpperCase();
  return (
    <div className="fx-live">
      <div className="fx-live-avatar">{initial}</div>
      <div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text)' }}>{player?.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>{action}</div>
      </div>
    </div>
  );
}

function ScreenFlash({ color }) {
  const bg = color === 'red'
    ? 'rgba(184,64,46,0.18)'
    : color === 'green'
    ? 'rgba(31,122,77,0.14)'
    : 'rgba(255,255,255,0.1)';
  return <div className="fx-screen-flash" style={{ background: bg }} />;
}
