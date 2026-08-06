import React from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash } from '../engine/utils.js';
import { loadHistory } from '../engine/saveLoad.js';
import ThemeToggle from './ui/ThemeToggle.jsx';
import achievementsDef from '../data/achievements.json';
import { computeScore, scoreGrade } from '../engine/gameState.js';

const ENDINGS = {
  burnout: {
    emoji: '😵',
    title: 'Épuisement total',
    desc:  'Le stress accumulé a eu raison de toi. Ton corps et ton esprit ont dit stop. Il faut savoir s\'arrêter.',
  },
  retirement: {
    emoji: '🏖️',
    title: 'Bien mérité !',
    desc:  'Tu as décidé de lever le pied et de profiter de ce que tu as construit. Félicitations !',
  },
  age_limit: {
    emoji: '🎂',
    title: 'Fin de partie',
    desc:  'Tu as atteint la fin de ta vie active. Regarde le chemin parcouru !',
  },
  fatal_event: {
    emoji: '⚡',
    title: 'Coup du destin',
    desc:  'Un événement imprévisible a tout changé du jour au lendemain.',
  },
  insolvency: {
    emoji: '💸',
    title: 'Faillite',
    desc:  'Ta trésorerie a plongé trop bas — même en vendant tout en urgence, tu ne pouvais plus faire face. La partie s\'arrête ici.',
  },
};

export default function End() {
  const { state, resetGame } = useGame();
  const endingId = state.endingKind ?? state.endingId ?? 'age_limit';
  const ending   = ENDINGS[endingId] ?? ENDINGS.age_limit;
  const history  = loadHistory();

  const { name, year, age, valuation, cash, personalCash, achievements = [] } = state;
  const pseudo = name ?? state.pseudo ?? '—';
  const totalWealth = (valuation ?? 0) + (cash ?? 0) + (personalCash ?? 0);
  const propertiesCount = state.propertiesOwned ?? (state.propertyList ?? state.properties ?? []).length;

  const achievementCount = achievements.length;
  const totalAchievements = achievementsDef.length;

  const score = computeScore({ finalVal: valuation, finalCash: cash, personalCash, years: year, achievements, propertiesOwned: propertiesCount, endingKind: endingId });
  const grade = scoreGrade(score);

  return (
    <div className="app">
      <ThemeToggle />
      <div className="react-screen end-screen">
        <div style={{ fontSize: 48 }}>{ending.emoji}</div>
        <span className="eyebrow-pill">{pseudo} · {age} ans · An {year}</span>
        <h2>{ending.title}</h2>
        <p className="desc">{ending.desc}</p>

        {/* Score principal */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 8px',
          padding: '12px 20px', borderRadius: 16,
          background: grade.color + '15', border: `1px solid ${grade.color}44`,
        }}>
          <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', color: grade.color }}>
            {score.toLocaleString('fr-FR')}
          </span>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>Score</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: grade.color, lineHeight: 1 }}>{grade.label}</div>
          </div>
        </div>

        <div className="final-stats">
          <div className="stat-box">
            <div className="label">Patrimoine total</div>
            <div className="value" style={{ color: 'var(--accent)' }}>{fmtCash(totalWealth)}</div>
          </div>
          <div className="stat-box">
            <div className="label">Biens immobiliers</div>
            <div className="value">{propertiesCount}</div>
          </div>
          <div className="stat-box">
            <div className="label">Années jouées</div>
            <div className="value">{year}</div>
          </div>
          <div className="stat-box">
            <div className="label">Succès débloqués</div>
            <div className="value" style={{ color: 'var(--amber)' }}>{achievementCount}/{totalAchievements}</div>
          </div>
        </div>

        {achievements.length > 0 && (
          <div style={{ width: '100%', marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textAlign: 'center', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em' }}>
              Succès débloqués cette partie
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {achievements.map(id => {
                const def = achievementsDef.find(a => a.id === id);
                if (!def) return null;
                return (
                  <span
                    key={id}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 20, background: 'var(--accent-soft)', border: '1px solid rgba(31,122,77,.3)', color: 'var(--accent)' }}
                  >
                    {def.emoji} {def.title}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="past-lives">
            <div className="past-lives-title">Tes parties précédentes</div>
            <div className="past-lives-list">
              {history.slice(1, 5).map((run, i) => (
                <div className="past-life-row" key={i}>
                  <div className="past-life-main">
                    <span>{run.pseudo}</span>
                    <span className="past-life-badge">{fmtCash(run.finalVal)}</span>
                  </div>
                  <div className="past-life-sub">
                    {run.years} ans · {run.achievements?.length ?? 0} succès · {new Date(run.date).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="btn-primary restart-btn" onClick={resetGame} style={{ marginTop: 24 }}>
          🔄 Rejouer
        </button>

        <p className="footer-brand">BRIQUE PAR BRIQUE · v2.0</p>
      </div>
    </div>
  );
}
