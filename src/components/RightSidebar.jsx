import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash, stageFor } from '../engine/utils.js';
import { calcRent as calcRentEngine } from '../engine/market.js';
import achievementsDef from '../data/achievements.json';
import MiniChart from './ui/MiniChart.jsx';
import { fetchCombinedLeaderboard } from '../engine/firebaseGame.js';
import { FIREBASE_ENABLED } from '../engine/firebaseConfig.js';

const STAGE_LABELS = {
  'IDÉE': { emoji: '💡', color: 'var(--muted)' },
  'LANCEMENT': { emoji: '🚀', color: 'var(--amber)' },
  'CROISSANCE': { emoji: '📈', color: 'var(--accent)' },
  'EXPANSION': { emoji: '🏗️', color: 'var(--accent)' },
  'MATURITÉ': { emoji: '🏛️', color: '#6366f1' },
  'HÉRITAGE': { emoji: '👑', color: '#f59e0b' },
};

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
    currentYearFinance = {}, wealthHistory = [], year = 1,
  } = state;

  const [liveBoard, setLiveBoard] = useState(null);
  const fetchedRef = useRef(false);

  // Fetch live leaderboard once on mount, then every 2 minutes
  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    const doFetch = () => fetchCombinedLeaderboard().then(data => { if (data) setLiveBoard(data); });
    doFetch();
    const iv = setInterval(doFetch, 120_000);
    return () => clearInterval(iv);
  }, []);

  const totalRent = propertyList.filter(p => p.rented).reduce((s, p) => s + calcRentEngine(p), 0);
  const totalLoans = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const netCashflow = totalRent - totalLoans;
  const totalWealth = valuation + cash + personalCash;

  const unlocked = state.achievements ?? [];
  const evtsGain = currentYearFinance.evenements ?? 0;
  const renoGain = currentYearFinance.renovations ?? 0;

  const currentStage = stageFor(year);
  const stageInfo = STAGE_LABELS[currentStage] ?? { emoji: '💡', color: 'var(--muted)' };

  // Next milestone: highest-pct unachieved achievement with a measurable progress
  const pending = achievementsDef
    .map(ach => ({ ach, ...getProgress(ach, state) }))
    .filter(({ unlocked: u, failed, pct }) => !u && !failed && pct !== null)
    .sort((a, b) => b.pct - a.pct);
  const nextMilestone = pending[0] ?? null;

  // Live ranking
  const myVal = valuation;
  const rankingData = liveBoard
    ? [...liveBoard].sort((a, b) => (b.finalVal ?? b.valuation ?? 0) - (a.finalVal ?? a.valuation ?? 0))
    : null;
  const myRank = rankingData
    ? rankingData.findIndex(r => (r.finalVal ?? r.valuation ?? 0) <= myVal)
    : -1;

  // Sorted achievements for sidebar list
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>📊 Finances</h3>
          <span className="stage-badge">{stageInfo.emoji} {currentStage}</span>
        </div>

        {wealthHistory.length >= 2 && (
          <div style={{ marginBottom: 10 }}>
            <MiniChart history={wealthHistory} keys={['cash', 'personalCash']} />
          </div>
        )}

        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, marginBottom: 4 }}>Cashflow annuel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>📬 Loyers</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>+{fmtCash(totalRent)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>💳 Crédits</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--red)' }}>−{fmtCash(totalLoans)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 2, fontWeight: 700 }}>
              <span>Net</span>
              <span style={{ fontFamily: 'monospace', color: netCashflow >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                {netCashflow >= 0 ? '+' : ''}{fmtCash(netCashflow)}
              </span>
            </div>
          </div>
        </div>

        {(evtsGain !== 0 || renoGain !== 0) && (
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, marginBottom: 4 }}>Cette année</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {evtsGain !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>🎲 Événements</span>
                  <span style={{ fontFamily: 'monospace', color: evtsGain >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                    {evtsGain >= 0 ? '+' : ''}{fmtCash(evtsGain)}
                  </span>
                </div>
              )}
              {renoGain !== 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>🔨 Rénovations</span>
                  <span style={{ fontFamily: 'monospace', color: 'var(--red)' }}>{fmtCash(renoGain)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, marginBottom: 4 }}>Snapshot</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>💰 Trésorerie</span>
              <span style={{ fontFamily: 'monospace', color: cash >= 0 ? 'var(--text)' : 'var(--red)' }}>{fmtCash(cash)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>👤 Épargne perso</span>
              <span style={{ fontFamily: 'monospace' }}>{fmtCash(personalCash)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>📈 Parc immo</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(valuation)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 2, fontWeight: 700 }}>
              <span>Patrimoine total</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{fmtCash(totalWealth)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }} onClick={() => onOpenModal('loans')}>💳 Crédits</button>
          <button className="btn-ghost" style={{ flex: 1, fontSize: 11, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }} onClick={() => onOpenModal('bank')}>🏦 Compte</button>
        </div>
      </div>

      {/* Live ranking */}
      {FIREBASE_ENABLED && (
        <div className="right-column-box">
          <h3>🌐 Classement live</h3>
          {!rankingData ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Chargement…</div>
          ) : rankingData.length === 0 ? (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', padding: '8px 0' }}>Aucun joueur en ligne</div>
          ) : (
            <>
              {myRank >= 0 && (
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Tu es #{myRank + 1} parmi {rankingData.length} joueur{rankingData.length > 1 ? 's' : ''}
                </div>
              )}
              <div>
                {rankingData.slice(0, 5).map((r, i) => {
                  const rVal = r.finalVal ?? r.valuation ?? 0;
                  const isMe = rVal <= myVal && (!rankingData[i - 1] || (rankingData[i - 1].finalVal ?? 0) > myVal);
                  const isActive = r._source === 'active';
                  return (
                    <div key={i} className={`live-rank-row${isMe ? ' live-rank-row--me' : ''}`}>
                      <span style={{ fontSize: 12, minWidth: 18, fontWeight: 700, color: i < 3 ? ['#f59e0b','#9ca3af','#b45309'][i] : 'var(--muted)' }}>
                        {['🥇','🥈','🥉'][i] ?? `#${i+1}`}
                      </span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name ?? r.pseudo ?? '—'}
                        {isActive && <span style={{ marginLeft: 4, fontSize: 8, color: 'var(--accent)', fontWeight: 700 }}>● live</span>}
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>{fmtCash(rVal)}</span>
                    </div>
                  );
                })}
                {myRank >= 5 && (
                  <div className="live-rank-row live-rank-row--me" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, minWidth: 18 }}>#{myRank + 1}</span>
                    <span style={{ flex: 1 }}>Toi</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent)' }}>{fmtCash(myVal)}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Next milestone spotlight */}
      {nextMilestone && (
        <div className="right-column-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700, marginBottom: 8 }}>🎯 Prochain jalon</div>
          <div className="milestone-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{nextMilestone.ach.emoji ?? '🎖️'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{nextMilestone.ach.title}</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{nextMilestone.ach.desc}</div>
              </div>
            </div>
            <div className="milestone-bar">
              <div className="milestone-bar-fill" style={{ width: `${nextMilestone.pct}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              <span>
                {nextMilestone.ach.checkType === 'stressBelow'
                  ? `Stress : ${state.stress ?? 0} → objectif ≤${nextMilestone.target}`
                  : `${nextMilestone.current >= 1000 ? fmtCash(nextMilestone.current) : nextMilestone.current} / ${nextMilestone.target >= 1000 ? fmtCash(nextMilestone.target) : nextMilestone.target}`
                }
              </span>
              <span style={{ fontWeight: 700, color: nextMilestone.pct >= 80 ? 'var(--accent)' : 'var(--amber)' }}>{nextMilestone.pct}%</span>
            </div>
            {nextMilestone.ach.deadlineAge && (
              <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 4 }}>
                ⏳ Avant {nextMilestone.ach.deadlineAge} ans · {Math.max(0, nextMilestone.ach.deadlineAge - (state.age ?? 18))} an(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievements sidebar */}
      <div className="right-column-box">
        <h3>🏆 Succès <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)' }}>{unlocked.length}/{achievementsDef.length}</span></h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(ach => {
            const { unlocked: isUnlocked, failed, current, target, pct } = getProgress(ach, state);
            return (
              <div key={ach.id} style={{ opacity: ach.endgameOnly && !isUnlocked && !failed ? 0.45 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ fontSize: 14, opacity: isUnlocked ? 1 : 0.3, flexShrink: 0, marginTop: 1 }}>
                    {ach.emoji ?? '🎖️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 700,
                      color: isUnlocked ? 'var(--accent)' : failed ? 'var(--red)' : 'var(--text)',
                      textDecoration: failed ? 'line-through' : 'none',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {ach.title}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.35, marginTop: 1 }}>
                      {ach.endgameOnly && !isUnlocked ? 'Débloqué à la fin de partie' : ach.desc}
                    </div>
                    {!isUnlocked && !failed && pct !== null && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                          <span>
                            {ach.checkType === 'stressBelow'
                              ? `Stress : ${state.stress ?? 0} → ≤${target}`
                              : `${current >= 1000 ? fmtCash(current) : current} / ${target >= 1000 ? fmtCash(target) : target}`
                            }
                          </span>
                          <span style={{ fontWeight: 700 }}>{pct}%</span>
                        </div>
                        <div style={{ height: 3, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: pct >= 75 ? 'var(--accent)' : 'var(--amber)',
                            borderRadius: 2, transition: 'width .4s',
                          }} />
                        </div>
                      </div>
                    )}
                    {ach.deadlineAge && !isUnlocked && !failed && (
                      <div style={{ fontSize: 10, color: 'var(--amber)', marginTop: 2 }}>
                        ⏳ Avant {ach.deadlineAge} ans · {Math.max(0, ach.deadlineAge - (state.age ?? 18))} an(s)
                      </div>
                    )}
                    {failed && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 1 }}>❌ Délai dépassé</div>}
                    {isUnlocked && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 1 }}>✅ Débloqué</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button
          className="btn-ghost"
          style={{ width: '100%', fontSize: 11, marginTop: 10, padding: '6px 0', border: '1px solid var(--border)', borderRadius: 8 }}
          onClick={() => onOpenModal('achievements')}
        >
          Voir tous →
        </button>
      </div>
    </div>
  );
}
