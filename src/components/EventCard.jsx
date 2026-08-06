import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash } from '../engine/utils.js';
import { modifyEffByTrait } from '../engine/traitEffect.js';

const CATEGORY_ICONS = {
  perso:   '👤',
  immo:    '🏘️',
  reno:    '🔨',
  business:'💼',
  sector:  '🏢',
};
const CATEGORY_LABELS = {
  perso:   'Vie personnelle',
  immo:    'Immobilier',
  reno:    'Rénovation',
  business:'Vie professionnelle',
  sector:  'Secteur',
};

export default function EventCard() {
  const { state, resolveEvent } = useGame();
  const [outcome, setOutcome] = useState(null);

  const event = (state.pendingEvents ?? [])[state.currentEventIndex ?? 0];
  if (!event) return null;

  const pool = event._pool ?? event.category ?? 'perso';
  const icon  = CATEGORY_ICONS[pool]  ?? '💼';
  const label = CATEGORY_LABELS[pool] ?? pool;

  const handleChoice = (choice) => {
    const eff = modifyEffByTrait(state.traitId, choice.eff ?? {});
    setOutcome({
      text: choice.out,
      eff,
      choice,
      targetProperty: event._targetProperty,
    });
  };

  const handleContinue = () => {
    const { eff, choice, targetProperty } = outcome;
    resolveEvent({
      eff,
      flag:            choice.flag,
      fatal:           choice.fatal ?? false,
      keepUnrenovated: choice.keepUnrenovated ?? false,
      costPct:         choice.costPct,
      gainPct:         choice.gainPct,
      targetProperty,
    });
    setOutcome(null);
  };

  if (outcome) {
    const deltas = buildDeltas(outcome.eff, outcome.choice);
    return (
      <div className="outcome" id="outcome">
        <div className="outcome-icon" id="outcomeIcon">
          {deltas.some(d => d.positive) && deltas.every(d => d.positive) ? '✅' : deltas.some(d => !d.positive) && deltas.every(d => !d.positive) ? '⚠️' : '💡'}
        </div>
        <div id="outcomeText">{outcome.text}</div>
        {deltas.length > 0 && (
          <div className="deltas" id="outcomeDeltas">
            {deltas.map((d, i) => (
              <span key={i} className={d.positive ? 'delta-pos' : 'delta-neg'}>{d.label}</span>
            ))}
          </div>
        )}
        <div className="near-miss-banner" id="nearMissBanner" style={{ display: 'none' }} />
        <div className="trait-line" id="traitLine" style={{ display: 'none' }} />
        <button className="continue-btn" id="continueBtn" onClick={handleContinue}>
          Continuer →
        </button>
      </div>
    );
  }

  return (
    <div className="event-card" id="eventCard">
      <div className="category-badge" id="categoryBadge">{icon} {label}</div>
      <div className="eyebrow" id="eyEvent">
        Année {state.year ?? 1} · {state.age ?? 18} ans
      </div>
      <div className="milestone-teaser" id="milestoneTeaser" style={{ display: 'none' }}>
        ⚡ Un grand moment approche d'ici quelques années...
      </div>
      <h2 id="evTitle">{event.title}</h2>
      <p className="body-text" id="evBody">{event.body}</p>
      <div className="choices" id="evChoices">
        {(event.choices ?? []).map((choice, i) => (
          <button
            key={i}
            className="choice-card"
            style={{ animationDelay: `${i * 80}ms` }}
            onClick={() => handleChoice(choice)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function buildDeltas(eff, choice) {
  if (!eff) return [];
  const deltas = [];
  if (eff.cash)         deltas.push({ label: `Tréso ${eff.cash > 0 ? '+' : ''}${fmtCash(eff.cash)}`,             positive: eff.cash > 0 });
  if (eff.personalCash) deltas.push({ label: `Perso ${eff.personalCash > 0 ? '+' : ''}${fmtCash(eff.personalCash)}`, positive: eff.personalCash > 0 });
  if (eff.val !== undefined) deltas.push({ label: `Valeur ${eff.val > 0 ? '+' : ''}${fmtCash(eff.val)}`,         positive: eff.val > 0 });
  if (eff.stress)       deltas.push({ label: `Stress ${eff.stress > 0 ? '+' : ''}${eff.stress}`,                positive: eff.stress < 0 });
  if (choice.costPct !== undefined) {
    deltas.push({ label: 'Coût travaux', positive: false });
    if (choice.gainPct > 0) deltas.push({ label: '+Valorisation', positive: true });
  }
  return deltas;
}
