import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { loadGame, hasSave, loadHistory } from '../engine/saveLoad.js';
import ThemeToggle from './ui/ThemeToggle.jsx';
import { fmtCash } from '../engine/utils.js';
import { computeScore, scoreGrade } from '../engine/gameState.js';
import achievementsDef from '../data/achievements.json';
import globalBoard from '../data/global_leaderboard.json';
import { FIREBASE_ENABLED } from '../engine/firebaseConfig.js';
import { fetchCombinedLeaderboard } from '../engine/firebaseGame.js';

const ENDINGS = {
  burnout:     { emoji: '😵', title: 'Épuisement total',  color: 'var(--red)' },
  retirement:  { emoji: '🏖️', title: 'Retraite méritée', color: 'var(--accent)' },
  age_limit:   { emoji: '🎂', title: 'Fin de vie',        color: 'var(--muted)' },
  fatal_event: { emoji: '⚡', title: 'Coup du destin',    color: 'var(--amber)' },
  insolvency:  { emoji: '💸', title: 'Faillite',          color: 'var(--red)' },
};

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const MEDAL_BG = ['rgba(245,158,11,.1)', 'rgba(156,163,175,.08)', 'rgba(180,83,9,.08)'];

// ─── Mini SVG bar chart for run stats ────────────────────────────────────────
function StatChart({ run }) {
  const vals = [
    { label: 'Immo', v: run.finalVal ?? 0, color: 'var(--accent)' },
    { label: 'Cash', v: run.finalCash ?? 0, color: 'var(--amber)' },
    { label: 'Perso', v: run.personalCash ?? 0, color: '#6366f1' },
  ];
  const max = Math.max(...vals.map(x => x.v), 1);
  const W = 220, H = 60, BAR_W = 48, GAP = 20;
  return (
    <svg width={W} height={H + 20} style={{ display: 'block', margin: '0 auto' }}>
      {vals.map((item, i) => {
        const x = i * (BAR_W + GAP) + 10;
        const barH = Math.max(4, Math.round((item.v / max) * H));
        return (
          <g key={item.label}>
            <rect x={x} y={H - barH} width={BAR_W} height={barH} rx={4} fill={item.color} opacity={0.85} />
            <text x={x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize={9} fill="var(--muted)">{item.label}</text>
            <text x={x + BAR_W / 2} y={H - barH - 4} textAnchor="middle" fontSize={9} fill={item.color} fontWeight="700">
              {item.v >= 1000 ? `${Math.round(item.v / 1000)}M` : item.v > 0 ? `${item.v}k` : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Property emoji strip ─────────────────────────────────────────────────────
function PropStrip({ count }) {
  if (!count) return null;
  const show = Math.min(count, 12);
  const more = count - show;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: show }).map((_, i) => (
        <span key={i} style={{ fontSize: 14 }}>🏠</span>
      ))}
      {more > 0 && <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>+{more}</span>}
    </div>
  );
}

// ─── Run Detail Modal ─────────────────────────────────────────────────────────
function RunDetailModal({ run, rank, onClose, onPlay }) {
  const ending = ENDINGS[run.endingKind] ?? ENDINGS.age_limit;
  const immo   = run.finalVal ?? 0;
  const cash   = run.finalCash ?? 0;
  const perso  = run.personalCash ?? 0;
  const totalWealth = immo + cash + perso;
  const runAchievements = (run.achievements ?? [])
    .map(id => achievementsDef.find(a => a.id === id))
    .filter(Boolean);
  const dateStr = run.date
    ? new Date(run.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;
  const medalColor = MEDAL_COLORS[rank] ?? 'var(--muted)';
  const isActive = run._source === 'active';

  const durationMin = run.durationMs ? Math.round(run.durationMs / 60000) : null;

  // Patrimoine breakdown bar
  const barTotal = Math.max(totalWealth, 1);
  const immoPct  = Math.round((immo  / barTotal) * 100);
  const cashPct  = Math.round((cash  / barTotal) * 100);
  const persoPct = Math.max(0, 100 - immoPct - cashPct);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-sheet modal-sheet--wide l-detail-modal" role="dialog" aria-modal="true">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ fontSize: 42, lineHeight: 1 }}>{ending.emoji}</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: medalColor }}>{MEDAL[rank] ?? `#${rank + 1}`}</span>
                <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {run.name ?? run.pseudo}
                </span>
                {isActive && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', padding: '2px 7px', borderRadius: 20, border: '1px solid var(--accent)' }}>
                    ● EN COURS
                  </span>
                )}
              </div>
              {run.companyName && (
                <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>
                  {run.companyName}{run.sector?.name ? ` · ${run.sector.name}` : ''}
                </div>
              )}
              <div style={{ fontSize: 12, color: ending.color, fontWeight: 700, marginTop: 4 }}>
                {ending.title}
                {dateStr && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>{dateStr}</span>}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        {/* Wealth headline + breakdown bar */}
        <div style={{
          background: 'var(--accent-soft)', border: '1px solid rgba(31,122,77,.25)',
          borderRadius: 14, padding: '16px 20px',
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4, textAlign: 'center' }}>Patrimoine total</div>
          <div style={{ fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: 'var(--accent)', textAlign: 'center', marginBottom: 14 }}>
            {fmtCash(totalWealth)}
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 10 }}>
            {immoPct > 0 && <div style={{ width: `${immoPct}%`, background: 'var(--accent)', borderRadius: 4 }} />}
            {cashPct > 0 && <div style={{ width: `${cashPct}%`, background: 'var(--amber)', borderRadius: 4 }} />}
            {persoPct > 0 && <div style={{ width: `${persoPct}%`, background: '#6366f1', borderRadius: 4 }} />}
          </div>

          {/* 3 currency details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: '🏘️ Immo',  value: fmtCash(immo),  color: 'var(--accent)' },
              { label: '💰 Cash',  value: fmtCash(cash),  color: 'var(--amber)' },
              { label: '💶 Perso', value: fmtCash(perso), color: '#6366f1' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'monospace', color }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { emoji: '📅', label: 'Années jouées',    value: `${run.years ?? '—'} ans` },
            { emoji: '🎂', label: 'Âge final',        value: `${run.age ?? '—'} ans` },
            { emoji: '🏠', label: 'Biens acquis',     value: run.propertiesOwned ?? '—' },
            { emoji: '🏆', label: 'Succès',           value: `${(run.achievements ?? []).length} / ${achievementsDef.length}` },
            { emoji: '⭐', label: 'Rang',             value: MEDAL[rank] ?? `#${rank + 1}` },
            ...(durationMin !== null ? [{ emoji: '⏱️', label: 'Durée de partie', value: durationMin < 60 ? `${durationMin} min` : `${Math.floor(durationMin / 60)}h${String(durationMin % 60).padStart(2, '0')}` }] : []),
          ].map(({ emoji, label, value, accent }) => (
            <div key={label} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{emoji}</div>
              <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'monospace', color: accent ? 'var(--accent)' : 'var(--text)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Property strip */}
        {(run.propertiesOwned ?? 0) > 0 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Biens construits</div>
            <PropStrip count={run.propertiesOwned} />
          </div>
        )}

        {/* Achievements with emojis */}
        {runAchievements.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Succès débloqués</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {runAchievements.map(ach => {
                const catEmoji = ach.category?.match(/^\S+/)?.[0] ?? '🏆';
                return (
                  <span key={ach.id} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 20,
                    background: 'var(--accent-soft)', border: '1px solid rgba(31,122,77,.25)',
                    color: 'var(--accent)', fontWeight: 600,
                  }}>
                    {catEmoji} {ach.title}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        {onPlay && (
          <div style={{ textAlign: 'center', paddingTop: 4 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 10px' }}>
              Tu penses pouvoir faire mieux ?
            </p>
            <button
              className="l-btn-primary"
              style={{ fontSize: 14 }}
              onClick={() => { onClose(); onPlay(); }}
            >
              🎯 Relever le défi →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Podium card (top 3) ──────────────────────────────────────────────────────
function PodiumCard({ run, rank, onClick }) {
  const ending = ENDINGS[run.endingKind] ?? ENDINGS.age_limit;
  const isFirst = rank === 0;
  const color = MEDAL_COLORS[rank];
  const bg = MEDAL_BG[rank];
  const isActive = run._source === 'active';
  const score = run.score ?? computeScore(run);
  const grade = scoreGrade(score);
  return (
    <button
      onClick={onClick}
      className="l-podium-card"
      style={{ '--podium-color': color, '--podium-bg': bg, order: rank === 0 ? 0 : rank === 1 ? -1 : 1 }}
      data-first={isFirst ? 'true' : undefined}
    >
      <div className="l-podium-medal">{MEDAL[rank]}</div>
      {isFirst && <div className="l-podium-crown">👑</div>}
      <div className="l-podium-ending">{ending.emoji}</div>
      <div className="l-podium-name">{run.name ?? run.pseudo}</div>
      {run.companyName && <div className="l-podium-company">{run.companyName}</div>}
      {/* Score + grade */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '4px 0 2px' }}>
        <span
          style={{
            fontSize: 11, fontWeight: 800, padding: '2px 7px', borderRadius: 20,
            background: grade.color + '22', color: grade.color, letterSpacing: '.04em',
          }}
        >{grade.label}</span>
        <span className="l-podium-val" style={{ margin: 0 }}>{score.toLocaleString('fr-FR')} pts</span>
      </div>
      {/* Wealth secondary */}
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
        {fmtCash((run.finalVal ?? 0) + (run.finalCash ?? 0) + (run.personalCash ?? 0))} total
      </div>
      <div className="l-podium-meta">
        {isActive
          ? `An ${run.year ?? '?'} · ${run.age ?? '?'} ans`
          : `${run.years ?? '?'} ans · ${run.age ?? '?'} ans`}
        {' · '}
        <span>{(run.achievements ?? []).length} 🏆</span>
        {run.propertiesOwned ? ` · ${run.propertiesOwned} 🏠` : ''}
        {isActive && <span className="l-live-badge">● live</span>}
      </div>
      <div className="l-podium-hover">Voir la fiche →</div>
    </button>
  );
}

// ─── List row (rank 4–10) ────────────────────────────────────────────────────
function ListRow({ run, rank, onClick }) {
  const ending = ENDINGS[run.endingKind] ?? ENDINGS.age_limit;
  const isActive = run._source === 'active';
  const score = run.score ?? computeScore(run);
  const grade = scoreGrade(score);
  return (
    <button onClick={onClick} className="l-list-row">
      <span className="l-list-rank">#{rank + 1}</span>
      <span className="l-list-ending">{ending.emoji}</span>
      <span className="l-list-name">
        {run.name ?? run.pseudo}
        {run.companyName && <span className="l-list-company"> · {run.companyName}</span>}
        {isActive && <span className="l-live-badge">● live</span>}
      </span>
      <span className="l-list-meta">
        {isActive ? `An ${run.year ?? '?'}` : `${run.years ?? '?'} ans`}
        {' · '}{(run.achievements ?? []).length} 🏆
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20,
          background: grade.color + '22', color: grade.color,
        }}>{grade.label}</span>
        <span className="l-list-val">{score.toLocaleString('fr-FR')}</span>
      </span>
    </button>
  );
}

// ─── Past lives row ───────────────────────────────────────────────────────────
function PastRow({ run, rank, onClick }) {
  const ending = ENDINGS[run.endingKind] ?? ENDINGS.age_limit;
  const dateStr = run.date
    ? new Date(run.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const score = run.score ?? computeScore(run);
  const grade = scoreGrade(score);
  return (
    <button onClick={onClick} className="l-list-row">
      <span className="l-list-ending">{ending.emoji}</span>
      <span className="l-list-name">
        {run.name ?? run.pseudo}
        {run.companyName && <span className="l-list-company"> · {run.companyName}</span>}
      </span>
      <span className="l-list-meta">{dateStr} · {run.years ?? '?'} ans · {(run.achievements ?? []).length} 🏆</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 20,
          background: grade.color + '22', color: grade.color,
        }}>{grade.label}</span>
        <span className="l-list-val">{score.toLocaleString('fr-FR')}</span>
      </span>
    </button>
  );
}

// ─── Main landing ─────────────────────────────────────────────────────────────
export default function Landing() {
  const { setScreen, loadSave } = useGame();
  const [saveExists] = useState(() => hasSave());
  const [history]    = useState(() => loadHistory() ?? []);
  const [selectedRun, setSelectedRun] = useState(null);
  const [liveScores, setLiveScores]   = useState(null);
  const [loadingScores, setLoadingScores] = useState(FIREBASE_ENABLED);
  const [tab, setTab] = useState('top10');

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    fetchCombinedLeaderboard().then(scores => {
      setLiveScores(scores);
      setLoadingScores(false);
    });
  }, []);

  const handleResume = () => {
    const saved = loadGame();
    if (saved) loadSave(saved);
  };

  const firebaseScores = liveScores && liveScores.length > 0 ? liveScores : null;
  const baseGlobal = firebaseScores ?? globalBoard;
  const withScore = (r) => r.score ?? computeScore(r);
  const merged = [...baseGlobal, ...history].sort((a, b) => withScore(b) - withScore(a));
  const seen = new Set();
  const deduped = merged.filter(r => {
    const key = r.sessionId ?? `${r.name}|${r.finalVal ?? r.valuation}|${r.date ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const top10 = deduped.slice(0, 10);
  const podium = top10.slice(0, 3);
  const restList = top10.slice(3);
  const last10 = [...history].reverse().slice(0, 10);

  return (
    <div className="landing-root">

      {/* ── Navigation ── */}
      <nav className="l-nav">
        <div className="l-nav-brand">
          <span className="l-nav-emoji">🏘️</span>
          <span className="l-nav-title">Brique <span style={{ color: 'var(--accent)' }}>par</span> Brique</span>
          <span className="l-nav-pill">Simulateur</span>
        </div>
        <div className="l-nav-actions">
          <ThemeToggle />
          {saveExists && (
            <button className="l-btn-ghost" onClick={handleResume}>▶ Reprendre</button>
          )}
          <button className="l-btn-primary" onClick={() => setScreen('onboarding')}>
            Nouvelle partie →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="l-hero">
        <div className="l-hero-left">
          <div className="l-hero-eyebrow">🏆 Simulateur d'empire immobilier</div>
          <h1 className="l-hero-title">
            Construis ton empire,<br />
            <span className="l-hero-accent">brique par brique.</span>
          </h1>
          <p className="l-hero-lead">
            Pars de 25 000 €, achète ton premier studio, rénove, loue ou revends.
            Traverse 60 ans de vie : crises, opportunités, héritages et coups du destin.
            Bâtis l'empire qui définira ta légende.
          </p>
          <div className="l-hero-ctas">
            <button className="l-btn-primary l-btn-large" onClick={() => setScreen('onboarding')}>
              Commencer l'aventure →
            </button>
            {saveExists && (
              <button className="l-btn-ghost l-btn-large" onClick={handleResume}>
                ▶ Reprendre ma partie
              </button>
            )}
          </div>
          <div className="l-hero-kpis">
            <div className="l-kpi"><span className="l-kpi-val">534</span><span className="l-kpi-label">événements</span></div>
            <div className="l-kpi-sep" />
            <div className="l-kpi"><span className="l-kpi-val">23</span><span className="l-kpi-label">succès</span></div>
            <div className="l-kpi-sep" />
            <div className="l-kpi"><span className="l-kpi-val">62</span><span className="l-kpi-label">ans à simuler</span></div>
            <div className="l-kpi-sep" />
            <div className="l-kpi"><span className="l-kpi-val">10+</span><span className="l-kpi-label">types de biens</span></div>
          </div>
        </div>

        <div className="l-hero-right">
          <div className="l-feature-grid">
            {[
              { icon: '🎲', title: '534+ situations', desc: 'Perso, immo, macro — jamais deux parties identiques' },
              { icon: '🏦', title: 'Vrais crédits', desc: 'Taux, durée, renégociation — la vraie finance' },
              { icon: '🗺️', title: 'Carte du parc', desc: 'Visualise ton empire bien par bien' },
              { icon: '🏆', title: '23 succès', desc: 'Des défis cachés à débloquer au fil du jeu' },
              { icon: '🌐', title: 'Multijoueur live', desc: 'Compare-toi aux autres joueurs en temps réel' },
              { icon: '💼', title: 'Gestion complète', desc: 'Salaire, épargne, stress — tout compte' },
            ].map(f => (
              <div key={f.title} className="l-feature-card">
                <span className="l-feature-icon">{f.icon}</span>
                <div>
                  <div className="l-feature-title">{f.title}</div>
                  <div className="l-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="l-board">
        <div className="l-board-header">
          <div>
            <h2 className="l-board-title">Classement mondial</h2>
            <p className="l-board-sub">Les plus grands empires immobiliers jamais construits</p>
          </div>
          <div className="l-tab-bar">
            <button
              className={`l-tab${tab === 'top10' ? ' l-tab--active' : ''}`}
              onClick={() => setTab('top10')}
            >
              🏆 Top 10
              {FIREBASE_ENABLED && !loadingScores && firebaseScores && (
                <span className="l-live-dot">● live</span>
              )}
            </button>
            {last10.length > 0 && (
              <button
                className={`l-tab${tab === 'past' ? ' l-tab--active' : ''}`}
                onClick={() => setTab('past')}
              >
                🕰️ Mes parties ({last10.length})
              </button>
            )}
          </div>
        </div>

        {tab === 'top10' && (
          <>
            {loadingScores ? (
              <div className="l-board-loading">
                <span className="l-loading-dot" />
                <span className="l-loading-dot" style={{ animationDelay: '.15s' }} />
                <span className="l-loading-dot" style={{ animationDelay: '.3s' }} />
                <span style={{ marginLeft: 10, color: 'var(--muted)', fontSize: 13 }}>Chargement du classement…</span>
              </div>
            ) : top10.length === 0 ? (
              <div className="l-board-empty">
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Aucun score enregistré</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>Sois le premier à inscrire ton nom dans l'histoire !</div>
              </div>
            ) : (
              <>
                {/* Hint */}
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
                  Clique sur un joueur pour voir sa fiche complète
                </div>

                {/* Podium */}
                {podium.length > 0 && (
                  <div className="l-podium">
                    {podium.map((run, i) => (
                      <PodiumCard
                        key={i} run={run} rank={i}
                        onClick={() => setSelectedRun({ run, rank: i })}
                      />
                    ))}
                  </div>
                )}

                {/* Rest of top 10 */}
                {restList.length > 0 && (
                  <div className="l-list">
                    {restList.map((run, i) => (
                      <ListRow
                        key={i} run={run} rank={i + 3}
                        onClick={() => setSelectedRun({ run, rank: i + 3 })}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {tab === 'past' && (
          <div className="l-list">
            {last10.length === 0 ? (
              <div className="l-board-empty">Aucune partie précédente enregistrée localement.</div>
            ) : last10.map((run, i) => (
              <PastRow
                key={i} run={run}
                rank={top10.findIndex(r => r === run)}
                onClick={() => setSelectedRun({ run, rank: top10.findIndex(r => r === run) })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Footer CTA ── */}
      <div className="l-footer-cta">
        <div className="l-footer-inner">
          <div style={{ fontSize: 32, marginBottom: 10 }}>🏘️</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 22, fontFamily: "'Space Grotesk',sans-serif" }}>Prêt à construire ton empire ?</h3>
          <p style={{ color: 'var(--muted)', margin: '0 0 20px', fontSize: 14 }}>
            Chaque décision compte. Chaque brique pose les fondations de ta légende.
          </p>
          <button className="l-btn-primary l-btn-large" onClick={() => setScreen('onboarding')}>
            Démarrer l'aventure →
          </button>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '20px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: 'var(--muted)',
        fontSize: 12,
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span>Créé avec ❤️ par <strong style={{ color: 'var(--text)' }}>Bubu</strong></span>
        <span style={{ fontFamily: 'monospace', fontSize: 11 }}>v2.0.0</span>
      </footer>

      {/* ── Run detail modal ── */}
      {selectedRun && (
        <RunDetailModal
          run={selectedRun.run}
          rank={selectedRun.rank === -1 ? 99 : selectedRun.rank}
          onClose={() => setSelectedRun(null)}
          onPlay={() => setScreen('onboarding')}
        />
      )}
    </div>
  );
}
