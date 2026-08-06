import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { loadGame, hasSave, loadHistory } from '../engine/saveLoad.js';
import ThemeToggle from './ui/ThemeToggle.jsx';
import { fmtCash } from '../engine/utils.js';

const CHALLENGES = [
  { id: 'no_funding',    label: "Termine sans jamais lever de fonds" },
  { id: 'billionaire_45', label: "Deviens milliardaire avant 45 ans" },
];

export default function Landing() {
  const { setScreen, loadSave } = useGame();
  const [saveExists] = useState(() => hasSave());
  const [history]    = useState(() => loadHistory() ?? []);

  const handleResume = () => {
    const saved = loadGame();
    if (saved) loadSave(saved);
  };

  const top5 = [...history].sort((a, b) => (b.finalVal ?? 0) - (a.finalVal ?? 0)).slice(0, 5);
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

        {top5.length > 0 && (
          <div className="past-lives" id="leaderboardSection">
            <div className="past-lives-title">🏆 Meilleurs scores</div>
            <div className="past-lives-list">
              {top5.map((run, i) => (
                <div key={i} className="past-life-row">
                  <div className="past-life-main">
                    <span>{run.name ?? run.pseudo} {run.companyName ? `· ${run.companyName}` : ''}</span>
                    <span className="past-life-badge">{fmtCash(run.finalVal ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {last5.length > 0 && (
          <div className="past-lives" id="pastLivesSection">
            <div className="past-lives-title">🕰️ Tes vies précédentes</div>
            <div className="past-lives-list">
              {last5.map((run, i) => (
                <div key={i} className="past-life-row">
                  <div className="past-life-main">
                    <span>{run.name ?? run.pseudo} · An {run.years}</span>
                    <span className="past-life-badge">{fmtCash(run.finalVal ?? 0)}</span>
                  </div>
                  <div className="past-life-sub">{run.achievements?.length ?? 0} succès</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
