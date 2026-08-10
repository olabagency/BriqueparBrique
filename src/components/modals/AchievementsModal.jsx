import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import achievementsDef from '../../data/achievements.json';
import { fmtCash } from '../../engine/utils.js';

function getProgress(ach, state) {
  const { checkType, checkValue, checkFlag, checkFlagNot, endgameOnly } = ach;

  if (endgameOnly) return { pct: 0, label: 'Fin de partie uniquement', binary: true };

  switch (checkType) {
    case 'propertiesOwned': {
      const cur = (state.propertyList?.length) ?? (state.propertiesOwned ?? 0);
      return {
        pct: Math.min(1, cur / checkValue),
        label: `${cur} / ${checkValue} biens`,
      };
    }
    case 'valuation': {
      const cur = state.valuation ?? 0;
      return {
        pct: Math.min(1, cur / checkValue),
        label: `${fmtCash(cur)} / ${fmtCash(checkValue)}`,
      };
    }
    case 'stressBelow': {
      const stress = state.stress ?? 100;
      // Progress = how far stress has come down from 100 toward checkValue
      const pct = stress <= checkValue ? 1 : Math.max(0, (100 - stress) / (100 - checkValue));
      return {
        pct,
        label: `Stress actuel : ${Math.round(stress)} → objectif ≤ ${checkValue}`,
        invert: true,
      };
    }
    case 'flag': {
      const done = !!(state.flags ?? {})[checkFlag];
      return { pct: done ? 1 : 0, label: done ? 'Accompli' : 'À faire', binary: true };
    }
    case 'retirementRich': {
      const cur = state.valuation ?? 0;
      return {
        pct: Math.min(1, cur / checkValue),
        label: `${fmtCash(cur)} / ${fmtCash(checkValue)} + retraite`,
      };
    }
    default:
      return { pct: 0, label: '', binary: true };
  }
}

export default function AchievementsModal({ onClose }) {
  const { state } = useGame();
  const unlocked = state.achievements ?? [];

  const categories = {};
  for (const ach of achievementsDef) {
    const cat = ach.category ?? '⭐ Spéciaux';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(ach);
  }

  const total = achievementsDef.length;
  const count = unlocked.length;
  const globalPct = Math.round((count / total) * 100);

  return (
    <Modal title={`🏆 Succès (${count}/${total})`} onClose={onClose}>

      {/* Global progress */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
          <span>{count} débloqués sur {total}</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{globalPct}%</span>
        </div>
        <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${globalPct}%`,
            background: 'linear-gradient(90deg, var(--accent), #34d399)',
            borderRadius: 4,
            transition: 'width .4s ease',
          }} />
        </div>
      </div>

      {Object.entries(categories).map(([cat, achs]) => (
        <div key={cat} style={{ marginBottom: 8 }}>
          <div className="achievement-category">{cat}</div>
          {achs.map(ach => {
            const isUnlocked = unlocked.includes(ach.id);
            const { pct, label, binary } = getProgress(ach, state);
            const barColor = isUnlocked
              ? 'var(--accent)'
              : pct > 0.6 ? 'var(--amber)' : 'var(--muted)';

            return (
              <div
                key={ach.id}
                className="achievement-row"
                style={{ opacity: isUnlocked ? 1 : 0.75, flexDirection: 'column', alignItems: 'stretch', gap: 6 }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span className="achievement-icon" style={{ opacity: isUnlocked ? 1 : 0.35 }}>
                    {ach.category?.match(/^\S+/)?.[0] ?? '🎖️'}
                  </span>
                  <div className="achievement-text" style={{ flex: 1 }}>
                    <span className={`achievement-title ${isUnlocked ? 'is-success' : ''}`}>
                      {isUnlocked ? ach.title : '???'}
                    </span>
                    <span className="achievement-desc">
                      {isUnlocked ? ach.desc : (ach.hint ?? 'Continue à jouer pour débloquer')}
                    </span>
                  </div>
                  {isUnlocked && (
                    <span style={{ fontSize: 14, flexShrink: 0 }}>✅</span>
                  )}
                </div>

                {/* Progress bar */}
                {!binary && (
                  <div style={{ paddingLeft: 32 }}>
                    <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{
                        height: '100%',
                        width: `${Math.round(pct * 100)}%`,
                        background: barColor,
                        borderRadius: 3,
                        transition: 'width .4s ease',
                      }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {label}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </Modal>
  );
}
