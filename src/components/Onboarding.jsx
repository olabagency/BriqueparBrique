import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import traits from '../data/traits.json';
import genders from '../data/genders.json';

const NAME_SUGGESTIONS = ['Pierrevie', 'Habitô', 'Muranova', 'Loginéo', 'Bâtisens'];
const SECTOR = { id: 'immo', emoji: '🏘️', name: 'Entrepreneur Immobilier', desc: 'Acheter, rénover, louer ou revendre : bâtir un parc, un bien à la fois.' };
const TOTAL_SLIDES = 4;

const PREVIEW_ITEMS = [
  { icon: '🏠', text: 'Achetez votre premier studio à 25 000 €' },
  { icon: '🔨', text: 'Rénovez pour valoriser vos biens' },
  { icon: '📬', text: 'Louez et percevez des loyers chaque année' },
  { icon: '📈', text: 'Gérez crédits, salaire et épargne' },
  { icon: '🎲', text: '534 événements imprévus à traverser' },
  { icon: '🏆', text: 'Défiez les autres joueurs en temps réel' },
];

export default function Onboarding() {
  const { startGame, setScreen } = useGame();
  const [slide, setSlide]             = useState(0);
  const [name, setName]               = useState('');
  const [companyName, setCompanyName] = useState('');
  const [gender, setGender]           = useState(null);
  const trait = useMemo(() => traits[Math.floor(Math.random() * traits.length)], []);

  const goNext = () => {
    if (slide < TOTAL_SLIDES - 1) setSlide(s => s + 1);
    else {
      startGame({
        name: name.trim(),
        companyName: companyName.trim() || 'Mon Entreprise',
        gender: gender ?? genders[0],
        sector: SECTOR,
        traitId: trait.id,
        challengeId: null,
      });
    }
  };

  const goBack = () => {
    if (slide === 0) setScreen('landing');
    else setSlide(s => s - 1);
  };

  const canContinue = () => {
    if (slide === 0) return name.trim().length >= 2;
    if (slide === 1) return companyName.trim().length >= 2;
    if (slide === 2) return gender !== null;
    return true;
  };

  return (
    <div className="onb-root">
      <ThemeToggle />

      {/* ── Left decorative panel ── */}
      <div className="onb-left">
        <div className="onb-brand">
          <span className="onb-brand-emoji">🏘️</span>
          <span className="onb-brand-name">Brique par Brique</span>
        </div>

        <div className="onb-preview">
          <div className="onb-preview-title">Ce qui t'attend</div>
          {PREVIEW_ITEMS.map(item => (
            <div key={item.text} className="onb-preview-item">
              <span className="onb-preview-icon">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        <div className="onb-preview-stats">
          <div className="onb-stat-item">
            <span className="onb-stat-val">62</span>
            <span className="onb-stat-label">ans à vivre</span>
          </div>
          <div className="onb-stat-item">
            <span className="onb-stat-val">534</span>
            <span className="onb-stat-label">événements</span>
          </div>
          <div className="onb-stat-item">
            <span className="onb-stat-val">23</span>
            <span className="onb-stat-label">succès</span>
          </div>
        </div>

        <div className="onb-back-link">
          <button className="onb-back-btn" onClick={() => setScreen('landing')}>
            ← Retour à l'accueil
          </button>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="onb-right">
        {/* Progress bar */}
        <div className="onb-progress">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div key={i} className={`onb-dot ${i < slide ? 'done' : i === slide ? 'current' : ''}`} />
          ))}
          <span className="onb-progress-label">Étape {slide + 1} / {TOTAL_SLIDES}</span>
        </div>

        {/* Slide 0 — Pseudo */}
        {slide === 0 && (
          <div className="onb-step">
            <div className="onb-step-icon">👤</div>
            <h2 className="onb-step-title">Comment tu t'appelles ?</h2>
            <p className="onb-step-hint">
              Ton pseudonyme de bâtisseur. Il apparaîtra dans le classement mondial.
            </p>
            <input
              type="text"
              className="text-input"
              placeholder="Ton pseudo"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canContinue() && goNext()}
              autoFocus
            />
            <button className="btn-primary" onClick={goNext} disabled={!canContinue()}>
              Continuer →
            </button>
          </div>
        )}

        {/* Slide 1 — Nom de l'entreprise */}
        {slide === 1 && (
          <div className="onb-step">
            <div className="onb-step-icon">🏢</div>
            <h2 className="onb-step-title">Ton entreprise ?</h2>
            <p className="onb-step-hint">
              Le nom qui figurera sur tous tes actes de propriété et dans ton empire.
            </p>
            <div className="name-suggestions">
              {NAME_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className={companyName === s ? 'selected' : ''}
                  onClick={() => setCompanyName(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="text-input"
              placeholder="...ou écris ton propre nom"
              maxLength={24}
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canContinue() && goNext()}
            />
            <button className="btn-primary" onClick={goNext} disabled={!canContinue()}>
              Continuer →
            </button>
            <button className="btn-ghost" onClick={goBack}>← Retour</button>
          </div>
        )}

        {/* Slide 2 — Genre */}
        {slide === 2 && (
          <div className="onb-step">
            <div className="onb-step-icon">🎭</div>
            <h2 className="onb-step-title">Tu es...</h2>
            <p className="onb-step-hint">
              Cela influencera les dialogues et certains événements de ta vie.
            </p>
            <div className="card-grid">
              {genders.map(g => (
                <button
                  key={g.id}
                  className={`card-select ${gender?.id === g.id ? 'selected' : ''}`}
                  onClick={() => { setGender(g); setSlide(3); }}
                >
                  <span className="emoji">{g.emoji}</span>
                  <h3>{g.name}</h3>
                </button>
              ))}
            </div>
            <button className="btn-ghost" onClick={goBack}>← Retour</button>
          </div>
        )}

        {/* Slide 3 — Révélation du trait */}
        {slide === 3 && (
          <div className="onb-step">
            <div className="onb-step-icon">🌟</div>
            <h2 className="onb-step-title">Ta personnalité se révèle...</h2>
            <p className="onb-step-hint">
              Ce trait t'accompagnera toute ta vie et amplifie certains événements clés.
            </p>
            <div className="trait-card">
              <div className="trait-emoji">{trait.emoji}</div>
              <h3>{trait.name}</h3>
              <p>{trait.desc}</p>
            </div>
            <button className="btn-primary" onClick={goNext}>
              🚀 Lancer l'aventure
            </button>
            <button className="btn-ghost" onClick={goBack}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}
