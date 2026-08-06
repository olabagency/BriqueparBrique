import React, { useState, useMemo } from 'react';
import { useGame } from '../context/GameContext.jsx';
import ThemeToggle from './ui/ThemeToggle.jsx';
import traits from '../data/traits.json';
import genders from '../data/genders.json';

const NAME_SUGGESTIONS = ['Pierrevie', 'Habitô', 'Muranova', 'Loginéo', 'Bâtisens'];

const SECTOR = { id: 'immo', emoji: '🏘️', name: 'Entrepreneur Immobilier', desc: 'Acheter, rénover, louer ou revendre : bâtir un parc, un bien à la fois.' };

const TOTAL_SLIDES = 4;

export default function Onboarding() {
  const { startGame, setScreen } = useGame();
  const [slide, setSlide]               = useState(0);
  const [name, setName]                 = useState('');
  const [companyName, setCompanyName]   = useState('');
  const [gender, setGender]             = useState(null);

  // Random trait assigned once at component mount
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
    <div className="app">
      <ThemeToggle />
      <div id="onboarding" className="react-screen onboarding">

        {/* Progress dots */}
        <div className="dots">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <div key={i} className={`dot ${i < slide ? 'done' : i === slide ? 'current' : ''}`} />
          ))}
        </div>

        {/* Slide 0 — Nom du joueur */}
        {slide === 0 && (
          <div className="slide active">
            <span className="eyebrow-pill">Étape 1 sur 4</span>
            <h2>Comment tu t'appelles&nbsp;?</h2>
            <input
              id="nameInput"
              type="text"
              className="text-input"
              placeholder="Ton pseudo"
              maxLength={20}
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <button className="btn-primary" id="next0" onClick={goNext} disabled={!canContinue()}>
              Suivant →
            </button>
          </div>
        )}

        {/* Slide 1 — Nom de l'entreprise */}
        {slide === 1 && (
          <div className="slide active">
            <span className="eyebrow-pill">Étape 2 sur 4</span>
            <h2>Comment s'appelle ton entreprise&nbsp;?</h2>
            <div className="name-suggestions" id="nameSuggestions">
              {NAME_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className={companyName === s ? 'selected' : ''}
                  onClick={() => setCompanyName(s)}
                >{s}</button>
              ))}
            </div>
            <input
              id="companyInput"
              type="text"
              className="text-input"
              placeholder="...ou écris ton propre nom"
              maxLength={24}
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
            />
            <button className="btn-primary" id="nextCompany" onClick={goNext} disabled={!canContinue()}>
              Suivant →
            </button>
            <button className="btn-ghost" id="backCompany" onClick={goBack}>← Retour</button>
          </div>
        )}

        {/* Slide 2 — Genre */}
        {slide === 2 && (
          <div className="slide active">
            <span className="eyebrow-pill">Étape 3 sur 4</span>
            <h2>Tu es...</h2>
            <div className="card-grid" id="genderGrid">
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
            <button className="btn-ghost" id="back2" onClick={goBack}>← Retour</button>
          </div>
        )}

        {/* Slide 3 — Révélation du trait */}
        {slide === 3 && (
          <div className="slide active">
            <span className="eyebrow-pill">Étape 4 sur 4</span>
            <h2>Ta personnalité se révèle...</h2>
            <p className="hint">Un trait de caractère te suit toute ta vie. Il influencera certains résultats, parfois.</p>
            <div className="trait-card" id="traitCard">
              <div className="trait-emoji" id="traitEmoji">{trait.emoji}</div>
              <h3 id="traitName">{trait.name}</h3>
              <p id="traitDesc">{trait.desc}</p>
            </div>
            <button className="btn-primary" id="launchGame" onClick={goNext}>
              Lancer l'aventure →
            </button>
            <button className="btn-ghost" id="back3" onClick={goBack}>← Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}
