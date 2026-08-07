import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { loadGame, hasSave, loadHistory } from '../engine/saveLoad.js';
import ThemeToggle from './ui/ThemeToggle.jsx';
import { fmtCash } from '../engine/utils.js';
import { computeScore, scoreGrade } from '../engine/gameState.js';
import achievementsDef from '../data/achievements.json';
import globalBoard from '../data/global_leaderboard.json';
import { FIREBASE_ENABLED } from '../engine/firebaseConfig.js';
import { fetchCombinedLeaderboard, syncHistoryToFirebase } from '../engine/firebaseGame.js';
import { subscribePresence } from '../engine/presence.js';
import { ShaderBackground } from './ui/shader-r.tsx';

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

        {/* Property list */}
        {(run.propertyList ?? []).length > 0 ? (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              🏘️ Parc immobilier · {(run.propertyList ?? []).length} bien{(run.propertyList ?? []).length > 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {(run.propertyList ?? []).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).map((prop, idx) => {
                const condEmoji = { bonEtat: '✅', aRenover: '🔨', renove: '⭐', standing: '💎' }[prop.condition] ?? '🏠';
                return (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 10px', fontSize: 11,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{condEmoji}</span>
                      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{prop.type}</span>
                      <span style={{ color: 'var(--muted)' }}>· {prop.place}</span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {prop.rented && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>📬 loué</span>}
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' }}>{fmtCash(prop.value ?? 0)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (run.propertiesOwned ?? 0) > 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>Biens construits</div>
            <PropStrip count={run.propertiesOwned} />
          </div>
        ) : null}

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

        {/* Luxury items */}
        {(run.luxuryItems ?? []).length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>✨ Biens de luxe</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(run.luxuryItems ?? []).map((item, idx) => {
                const gain = item.currentValue && item.purchasePrice ? Math.round(((item.currentValue - item.purchasePrice) / item.purchasePrice) * 100) : 0;
                return (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '8px 10px', minWidth: 80, maxWidth: 100,
                  }}>
                    {item.image
                      ? <img src={item.image} alt={item.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                      : <span style={{ fontSize: 28 }}>{item.icon ?? '✨'}</span>
                    }
                    <div style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', color: 'var(--text)', lineHeight: 1.2 }}>{item.name}</div>
                    {gain !== 0 && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: gain > 0 ? 'var(--accent)' : 'var(--red)' }}>
                        {gain > 0 ? '+' : ''}{gain}%
                      </div>
                    )}
                  </div>
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
          ? `${run.year ?? '?'} ans · ${run.age ?? '?'} ans`
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
        {isActive ? `${run.year ?? '?'} ans` : `${run.years ?? '?'} ans`}
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
  const [onlinePlayers, setOnlinePlayers] = useState([]);
  const [hoveredOnlinePlayer, setHoveredOnlinePlayer] = useState(null);
  const hoverRef = useRef(null);

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    fetchCombinedLeaderboard().then(scores => {
      setLiveScores(scores);
      setLoadingScores(false);
    });
    // Push any unsynced local history entries to Firebase
    if (history.length > 0) syncHistoryToFirebase(history);
  }, []);

  useEffect(() => {
    if (!FIREBASE_ENABLED) return;
    const unsub = subscribePresence(setOnlinePlayers);
    return unsub;
  }, []);

  // Close hover modal on outside click
  useEffect(() => {
    if (!hoveredOnlinePlayer) return;
    const handler = (e) => {
      if (hoverRef.current && !hoverRef.current.contains(e.target)) setHoveredOnlinePlayer(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [hoveredOnlinePlayer]);

  const handleResume = () => {
    const saved = loadGame();
    if (saved) loadSave(saved);
  };

  const firebaseScores = liveScores && liveScores.length > 0 ? liveScores : null;
  // Only finished games in top 10 — filter out active/live sessions
  const finishedOnly = (firebaseScores ?? globalBoard).filter(r => r._source !== 'active');
  const withScore = (r) => r.score ?? computeScore(r);
  const merged = [...finishedOnly, ...history].sort((a, b) => withScore(b) - withScore(a));
  const seen = new Set();
  const deduped = merged.filter(r => {
    // Build all candidate keys for this entry — check AND mark all of them
    const composite = `${r.name}|${r.finalVal ?? r.valuation}|${r.date ?? ''}`;
    const keys = [r.runId, r.sessionId, composite].filter(Boolean);
    if (keys.some(k => seen.has(k))) return false;
    keys.forEach(k => seen.add(k));
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
      <div className="l-hero-banner">
        <ShaderBackground className="l-hero-shader" />
        <div className="l-hero-overlay" />
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
            <div className="l-kpi"><span className="l-kpi-val">950+</span><span className="l-kpi-label">événements</span></div>
            <div className="l-kpi-sep" />
            <div className="l-kpi"><span className="l-kpi-val">23</span><span className="l-kpi-label">succès</span></div>
            <div className="l-kpi-sep" />
            <div className="l-kpi"><span className="l-kpi-val">10+</span><span className="l-kpi-label">types de biens</span></div>
          </div>
        </div>

        <div className="l-hero-right">
          <div className="l-feature-grid">
            {[
              { icon: '🎲', title: '950+ situations', desc: 'Perso, immo, macro — jamais deux parties identiques' },
              { icon: '🏦', title: 'Vrais crédits', desc: 'Taux, durée, renégociation — la vraie finance' },
              { icon: '🏆', title: '23 succès', desc: 'Des défis cachés à débloquer au fil du jeu' },
              { icon: '🌐', title: 'Multijoueur live', desc: 'Compare-toi aux autres joueurs en temps réel' },
              { icon: '💼', title: 'Gestion complète', desc: 'Salaire, épargne, stress — tout compte' },
              { icon: '🏘️', title: '118 emplacements', desc: 'Paris, Lyon, Côte d\'Azur, Alpes — tout le territoire' },
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
      </div>

      {/* ── Online players ── */}
      {FIREBASE_ENABLED && onlinePlayers.length > 0 && (
        <section style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span className="live-dot" style={{ display: 'inline-block' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
              {onlinePlayers.length} joueur{onlinePlayers.length > 1 ? 's' : ''} en ligne maintenant
            </h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }} ref={hoverRef}>
            {onlinePlayers.map((player, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <button
                  onClick={() => setHoveredOnlinePlayer(hoveredOnlinePlayer?.name === player.name ? null : player)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '8px 12px', cursor: 'pointer',
                    transition: 'border-color .15s',
                    borderColor: hoveredOnlinePlayer?.name === player.name ? 'var(--accent)' : undefined,
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'var(--accent-soft)', border: '2px solid var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                  }}>
                    {(player.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{player.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {player.genderEmoji ?? ''} {player.age ? `${player.age} ans · ` : ''}{player.year ?? 1} ans · {fmtCash(player.valuation ?? 0)}
                    </div>
                  </div>
                </button>

                {/* Hover detail modal */}
                {hoveredOnlinePlayer?.name === player.name && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 9100,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.2)',
                    padding: '14px 16px', minWidth: 240, maxWidth: 300,
                  }}
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
                          <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{player.year} ans</span>
                        </div>
                      )}
                    </div>
                    {/* Luxury items */}
                    {(player.luxuryItems ?? []).length > 0 && (
                      <div>
                        <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>✨ Biens de luxe</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(player.luxuryItems ?? []).map((item, j) => (
                            <div key={j} title={item.name} style={{
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

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
