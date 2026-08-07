import React, { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import { fmtCash, stageFor, stageMultiplier } from '../engine/utils.js';
import { modifyEffByTrait } from '../engine/traitEffect.js';

const CATEGORY_CONFIG = {
  perso:    { cls: 'cat-perso',    text: '💜 Vie personnelle' },
  immo:     { cls: 'cat-sector',   text: '🏘️ Immobilier' },
  reno:     { cls: 'cat-sector',   text: '🔨 Rénovation' },
  tenant:   { cls: 'cat-tenant',   text: '👥 Locataires' },
  network:  { cls: 'cat-network',  text: '🤝 Réseau professionnel' },
  economic: { cls: 'cat-economic', text: '📊 Conjoncture économique' },
  business: { cls: 'cat-business', text: '💼 Vie professionnelle' },
  sector:   { cls: 'cat-sector',   text: '🏘️ Immobilier' },
};

function applyStageScale(eff, year) {
  if (!eff) return {};
  const scale = stageMultiplier(stageFor(year ?? 1));
  const out = { ...eff };
  if (out.cash !== undefined)         out.cash         = Math.round(out.cash * scale);
  if (out.val  !== undefined)         out.val          = Math.round(out.val  * scale);
  if (out.personalCash !== undefined) out.personalCash = Math.round(out.personalCash * scale);
  return out;
}

export default function EventCard() {
  const { state, resolveEvent } = useGame();
  const [outcome, setOutcome] = useState(null);

  const event = (state.pendingEvents ?? [])[state.currentEventIndex ?? 0];
  if (!event) return null;

  const pool = event._pool ?? event.category ?? 'perso';
  const catCfg = CATEGORY_CONFIG[pool] ?? CATEGORY_CONFIG.immo;

  const handleChoice = (choice) => {
    const rawEff   = choice.eff ?? {};
    // setSalary is not scaled — preserve it separately
    const setSalary = rawEff.setSalary;
    const scaled   = applyStageScale({ ...rawEff, setSalary: undefined }, state.year);
    const eff      = modifyEffByTrait(state.traitId, scaled);
    if (setSalary) eff.setSalary = setSalary;
    setOutcome({
      text: choice.out,
      eff,
      choice,
      targetProperty: event._targetProperty,
    });
  };

  const handleContinue = () => {
    const { eff, choice, targetProperty } = outcome;

    // Fatal probability roll — capped at 8% max to avoid frustration
    let fatal = false;
    if (choice.fatal && typeof choice.fatal === 'object') {
      const cappedChance = Math.min(0.08, choice.fatal.chance ?? 0);
      fatal = Math.random() < cappedChance;
    } else if (choice.fatal === true) {
      fatal = Math.random() < 0.05;
    }

    resolveEvent({
      eff,
      flag:            choice.flag,
      unsetFlag:       choice.unsetFlag,
      fatal,
      keepUnrenovated: choice.keepUnrenovated ?? false,
      costPct:         choice.costPct,
      gainPct:         choice.gainPct,
      targetProperty,
      contact:         choice.contact,
      valMultiplier:   choice.valMultiplier,
      eventPool:       event._pool,
    });
    setOutcome(null);
  };

  if (outcome) {
    const deltas = buildDeltas(outcome.eff, outcome.choice);
    const netScore = (outcome.eff?.cash ?? 0) * 0.5 + (outcome.eff?.val ?? 0) * 0.5 - (outcome.eff?.stress ?? 0) * 1.5;
    const icon = netScore > 10 ? '🎉' : netScore >= 0 ? '👍' : netScore > -15 ? '😬' : '💥';
    return (
      <div className={`outcome outcome-animated ${netScore >= 0 ? 'outcome-positive' : 'outcome-negative'}`} id="outcome">
        <div className="outcome-icon" id="outcomeIcon">{icon}</div>
        <div id="outcomeText">{outcome.text}</div>
        {deltas.length > 0 && (
          <div className="deltas" id="outcomeDeltas">
            {deltas.map((d, i) => (
              <span key={i} className={d.positive ? 'delta-pos' : 'delta-neg'}>{d.label}</span>
            ))}
          </div>
        )}
        <button className="continue-btn" id="continueBtn" onClick={handleContinue}>
          Continuer →
        </button>
      </div>
    );
  }

  return (
    <div className={`event-card event-card-enter${(state.stress ?? 0) >= 90 ? ' event-card-danger' : ''}`} id="eventCard">
      <div className={`category-badge ${catCfg.cls}`} id="categoryBadge">{catCfg.text}</div>
      <div className="eyebrow" id="eyEvent">
        Année {state.year ?? 1} · {state.age ?? 18} ans
      </div>
      <h2 id="evTitle">{event.title}</h2>
      <p className="body-text" id="evBody">{event.body}</p>
      <div className="choices" id="evChoices">
        {(event.choices ?? []).map((choice, i) => (
          <button
            key={i}
            className="choice-card choice-card-animated"
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

const SALARY_LABELS = { none: 'Aucun salaire', modest: '8 k€/an', comfortable: '20 k€/an', high: '45 k€/an' };

function buildDeltas(eff, choice) {
  if (!eff) return [];
  const deltas = [];
  if (eff.cash)         deltas.push({ label: `💰 ${eff.cash > 0 ? '+' : ''}${eff.cash} k€`,          positive: eff.cash > 0 });
  if (eff.personalCash) deltas.push({ label: `💶 ${eff.personalCash > 0 ? '+' : ''}${eff.personalCash} k€`, positive: eff.personalCash > 0 });
  if (eff.val !== undefined && eff.val !== 0) deltas.push({ label: `📈 ${eff.val > 0 ? '+' : ''}${eff.val} k€`, positive: eff.val > 0 });
  if (eff.stress)       deltas.push({ label: `😰 ${eff.stress > 0 ? '+' : ''}${eff.stress}`,           positive: eff.stress < 0 });
  if (eff.setSalary)    deltas.push({ label: `💼 Salaire fixé : ${SALARY_LABELS[eff.setSalary] ?? eff.setSalary}`, positive: eff.setSalary !== 'none' });
  if (eff.properties && eff.properties !== 0) deltas.push({ label: `🏠 ${eff.properties > 0 ? '+' : ''}${eff.properties} bien${Math.abs(eff.properties) > 1 ? 's' : ''}`, positive: eff.properties > 0 });
  if (choice.contact) {
    const labels = { courtier: 'Courtier', notaire: 'Notaire', expert_comptable: 'Expert-comptable', agent_immo: 'Agent immo' };
    deltas.push({ label: `🤝 ${labels[choice.contact] ?? choice.contact} rejoint ton réseau`, positive: true });
  }
  if (choice.valMultiplier !== undefined) {
    const pct = Math.round((choice.valMultiplier - 1) * 100);
    deltas.push({ label: `🏘️ Parc ${pct > 0 ? '+' : ''}${pct}%`, positive: pct >= 0 });
  }
  if (choice.costPct !== undefined) {
    deltas.push({ label: 'Coût travaux', positive: false });
    if (choice.gainPct > 0) deltas.push({ label: '+Valorisation', positive: true });
  }
  return deltas;
}
