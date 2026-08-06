import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { loadGame, hasSave, loadHistory } from '../engine/saveLoad.js';
import ThemeToggle from './ui/ThemeToggle.jsx';
import { fmtCash } from '../engine/utils.js';
import achievementsDef from '../data/achievements.json';
import globalBoard from '../data/global_leaderboard.json';

const CHALLENGES = [
  { id: 'no_funding',    label: "Termine sans jamais lever de fonds" },
  { id: 'billionaire_45', label: "Deviens milliardaire avant 45 ans" },
];

const ENDINGS = {
  burnout:     { emoji: '😵', title: 'Épuisement total' },
  retirement:  { emoji: '🏖️', title: 'Bien mérité !' },
  age_limit:   { emoji: '🎂', title: 'Fin de partie' },
  fatal_event: { emoji: '⚡', title: 'Coup du destin' },
};

const MEDAL = ['🥇', '🥈', '🥉'];

function RunDetailModal({ run, rank, onClose }) {
  const ending = ENDINGS[run.endingKind] ?? ENDINGS.age_limit;
  const totalWealth = (run.finalVal ?? 0) + (run.finalCash ?? 0) + (run.personalCash ?? 0);
  const runAchievements = (run.achievements ?? []).map(id => achievementsDef.find(a => a.id === id)).filter(Boolean);
  const dateStr = run.date ? new Date(run.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-sheet" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3>{MEDAL[rank] ?? `#${rank + 1}`} {run.name ?? run.pseudo ?? '—'}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>
        <div className="modal-body">

          <div style={{ textAlign: 'center', paddingBottom: 8 }}>
            <div style={{ fontSize: 36 }}>{ending.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{ending.title}</div>
            {run.companyName && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {run.companyName}
                {run.sector?.name && ` · ${run.sector.name}`}
              </div>
            )}
            {dateStr && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{dateStr}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Patrimoine immo.', value: fmtCash(run.finalVal ?? 0), accent: true },
              { label: 'Cash final', value: fmtCash(run.finalCash ?? 0) },
              { label: 'Richesse totale', value: fmtCash(totalWealth), accent: true },
              { label: 'Épargne perso.', value: fmtCash(run.personalCash ?? 0) },
              { label: 'Années jouées', value: `${run.years ?? '—'} ans` },
              { label: 'Âge final', value: `${run.age ?? '—'} ans` },
              { label: 'Biens acquis', value: run.propertiesOwned ?? '—' },
              { label: 'Succès', value: `${(run.achievements ?? []).length} / ${achievementsDef.length}` },
            ].map(({ label, value, accent }) => (
              <div key={label} style={{
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                <div style={{
                  fontSize: 15,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: accent ? 'var(--accent)' : 'var(--text)',
                }}>{value}</div>
              </div>
            ))}
          </div>

          {runAchievements.length > 0 && (
            <div>
              <div className="finance-section-title">Succès débloqués</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {runAchievements.map(ach => (
                  <span key={ach.id} style={{
                    fontSize: 11,
                    padding: '4px 9px',
                    borderRadius: 20,
                    background: 'var(--accent-soft)',
                    border: '1px solid rgba(31,122,77,.3)',
                    color: 'var(--accent)',
                  }}>
                    {ach.emoji} {ach.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { setScreen, loadSave } = useGame();
  const [saveExists] = useState(() => hasSave());
  const [history]    = useState(() => loadHistory() ?? []);
  const [selectedRun, setSelectedRun] = useState(null);

  const handleResume = () => {
    const saved = loadGame();
    if (saved) loadSave(saved);
  };

  const merged = [...globalBoard, ...history].sort((a, b) => (b.finalVal ?? 0) - (a.finalVal ?? 0));
  const top10 = merged.slice(0, 10);
  const last5 = [...history].slice(-5).reverse();

  return (
    <div className="app">
      <ThemeToggle />
      <div id="landing" className="react-screen landing">
        <div className="emoji-hero">🏘️</div>
        <h1 className="brand-word">Brique par Brique</h1>
        <span className="eyebrow-pill">Simulateur d'empire immobilier</span>
        <p className="lead">
          Pars de zéro, achète ton premier studio, rénove, loue ou revends.
          Construis un vrai parc immobilier, décision après décision, jusqu'à ta retraite —
          avec de vrais crédits, un marché à parcourir, et une vie qui continue à côté.
        </p>

        <div className="feature-grid">
          <div className="feature-card"><span className="feature-icon">🎲</span><span className="feature-text">450+ situations uniques</span></div>
          <div className="feature-card"><span className="feature-icon">🏦</span><span className="feature-text">Vrais crédits à négocier</span></div>
          <div className="feature-card"><span className="feature-icon">🗺️</span><span className="feature-text">Carte de ton parc</span></div>
          <div className="feature-card"><span className="feature-icon">🏆</span><span className="feature-text">23 succès à débloquer</span></div>
        </div>

        <div className="stat-teaser">
          <span>💰 Argent</span>
          <span>📈 Valeur du parc</span>
          <span>⭐ Réputation</span>
          <span>😰 Stress</span>
        </div>

        <div className="challenge-teaser">
          <div className="challenge-teaser-title">🎯 Défis possibles (facultatifs)</div>
          <div className="challenge-tags">
            {CHALLENGES.map(c => (
              <span key={c.id} className="challenge-tag">{c.label}</span>
            ))}
          </div>
        </div>

        {saveExists && (
          <button className="btn-primary" id="resumeBtn" onClick={handleResume}>
            ▶️ Reprendre ta vie
          </button>
        )}
        <button className="btn-primary" id="landingStart" style={{ marginTop: 10 }} onClick={() => setScreen('onboarding')}>
          Commencer l'aventure →
        </button>

        {top10.length > 0 && (
          <div className="past-lives" id="leaderboardSection">
            <div className="past-lives-title">🏆 Top 10 — Meilleurs scores</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginBottom: 8 }}>
              Clique sur une ligne pour voir le détail complet
            </div>
            <div className="past-lives-list">
              {top10.map((run, i) => (
                <button
                  key={i}
                  className="past-life-row"
                  onClick={() => setSelectedRun({ run, rank: i })}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div className="past-life-main">
                    <span style={{ minWidth: 22, display: 'inline-block' }}>
                      {MEDAL[i] ?? <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700 }}>#{i + 1}</span>}
                    </span>
                    <span style={{ flex: 1 }}>{run.name ?? run.pseudo}{run.companyName ? ` · ${run.companyName}` : ''}</span>
                    <span className="past-life-badge">{fmtCash(run.finalVal ?? 0)}</span>
                  </div>
                  <div className="past-life-sub" style={{ paddingLeft: 26 }}>
                    {run.years ?? '?'} ans joués · {(run.achievements ?? []).length} succès
                    {run.endingKind && ` · ${ENDINGS[run.endingKind]?.emoji ?? ''} ${ENDINGS[run.endingKind]?.title ?? ''}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {last5.length > 0 && (
          <div className="past-lives" id="pastLivesSection">
            <div className="past-lives-title">🕰️ Tes vies précédentes</div>
            <div className="past-lives-list">
              {last5.map((run, i) => (
                <button
                  key={i}
                  className="past-life-row"
                  onClick={() => setSelectedRun({ run, rank: top10.findIndex(r => r === run) })}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '8px 12px',
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div className="past-life-main">
                    <span style={{ flex: 1 }}>{run.name ?? run.pseudo} · An {run.years}</span>
                    <span className="past-life-badge">{fmtCash(run.finalVal ?? 0)}</span>
                  </div>
                  <div className="past-life-sub">{run.achievements?.length ?? 0} succès</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedRun && (
        <RunDetailModal
          run={selectedRun.run}
          rank={selectedRun.rank}
          onClose={() => setSelectedRun(null)}
        />
      )}
    </div>
  );
}
