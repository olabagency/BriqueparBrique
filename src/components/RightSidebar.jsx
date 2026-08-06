import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash } from '../engine/utils.js';
import { calcRent as calcRentEngine } from '../engine/market.js';
import achievementsDef from '../data/achievements.json';

function getProgress(ach, state) {
  const props = state.propertyList ?? [];
  const unlocked = (state.achievements ?? []).includes(ach.id);
  const failed = ach.deadlineAge && state.age >= ach.deadlineAge && !unlocked;

  let current = null;
  let target = null;

  switch (ach.checkType) {
    case 'propertiesOwned':
      current = state.propertiesOwned ?? props.length;
      target = ach.checkValue;
      break;
    case 'valuation':
      current = state.valuation ?? 0;
      target = ach.checkValue;
      break;
    case 'stressBelow':
      current = Math.max(0, ach.checkValue - (state.stress ?? 0));
      target = ach.checkValue;
      break;
    default:
      break;
  }

  const pct = (current !== null && target > 0) ? Math.min(100, Math.round((current / target) * 100)) : null;
  return { unlocked, failed, current, target, pct };
}

export default function RightSidebar({ onOpenModal }) {
  const { state } = useGame();
  const {
    cash = 0, personalCash = 0, valuation = 0,
    propertyList = [], loans = [], stress = 0,
  } = state;

  const totalRent = propertyList.filter(p => p.rented).reduce((s, p) => s + calcRentEngine(p), 0);
  const totalLoans = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const netCashflow = totalRent - totalLoans;
  const totalWealth = valuation + cash + personalCash;

  const unlocked = state.achievements ?? [];

  // Sort: next to unlock first (pending, with progress), then unlocked, then endgame-only
  const sorted = [...achievementsDef].sort((a, b) => {
    const ua = unlocked.includes(a.id);
    const ub = unlocked.includes(b.id);
    if (ua !== ub) return ua ? 1 : -1;
    if (a.endgameOnly !== b.endgameOnly) return a.endgameOnly ? 1 : -1;
    return 0;
  });

  return (
    <div className="right-column-wrapper">
      {/* Financial overview */}
      <div className="right-column-box">
        <h3>📊 Finances</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>🏠 Loyers /an</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>+{fmtCash(totalRent)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>💳 Crédits /an</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--red)' }}>−{fmtCash(totalLoans)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 2, fontWeight: 700,
          }}>
            <span>Cashflow net</span>
            <span style={{ fontFamily: 'monospace', color: netCashflow >= 0 ? 'var(--accent)' : 'var(--red)' }}>
              {netCashflow >= 0 ? '+' : ''}{fmtCash(netCashflow)}
            </span>
          </div>
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>💰 Trésorerie</span>
            <span style={{ fontFamily: 'monospace', color: cash >= 0 ? 'var(--text)' : 'var(--red)' }}>{fmtCash(cash)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>👤 Épargne</span>
            <span style={{ fontFamily: 'monospace' }}>{fmtCash(personalCash)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted)' }}>📈 Parc immo</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(valuation)}</span>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 2, fontWeight: 700,
          }}>
            <span>Patrimoine total</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(totalWealth)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 11 }} onClick={() => onOpenModal('loans')}>💳 Crédits</button>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 11 }} onClick={() => onOpenModal('bank')}>🏦 Compte</button>
        </div>
      </div>

      {/* Achievements sidebar */}
      <div className="right-column-box">
        <h3>🏆 Succès <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>{unlocked.length}/{achievementsDef.length}</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(ach => {
            const { unlocked: isUnlocked, failed, current, target, pct } = getProgress(ach, state);
            return (
              <div
                key={ach.id}
                style={{
                  opacity: ach.endgameOnly && !isUnlocked && !failed ? 0.5 : 1,
                  textDecoration: failed ? 'line-through' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ fontSize: 14, opacity: isUnlocked ? 1 : 0.35, flexShrink: 0 }}>
                    {ach.emoji ?? '🎖️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: isUnlocked ? 'var(--accent)' : failed ? 'var(--red)' : 'var(--text)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ach.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
                      {isUnlocked ? ach.desc : ach.endgameOnly ? 'Débloqué à la fin de partie' : ach.desc}
                    </div>
                    {!isUnlocked && !failed && pct !== null && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                          <span>{ach.checkType === 'stressBelow' ? `Stress : ${state.stress ?? 0} / objectif ≤${target}` : `${current} / ${target}`}</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: pct >= 100 ? 'var(--accent)' : 'var(--amber)',
                            borderRadius: 2,
                            transition: 'width .3s',
                          }} />
                        </div>
                      </div>
                    )}
                    {ach.deadlineAge && !isUnlocked && !failed && (
                      <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 2 }}>
                        ⏳ Avant {ach.deadlineAge} ans · il te reste {Math.max(0, ach.deadlineAge - (state.age ?? 18))} ans
                      </div>
                    )}
                    {failed && (
                      <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 2 }}>
                        ❌ Échéance dépassée ({ach.deadlineAge} ans)
                      </div>
                    )}
                    {isUnlocked && (
                      <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>✅ Débloqué</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="btn-ghost"
          style={{ width: '100%', fontSize: 11, marginTop: 10 }}
          onClick={() => onOpenModal('achievements')}
        >
          Voir tous les succès →
        </button>
      </div>
    </div>
  );
}
