import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import renovationEvents from '../../data/renovation_events.json';

export default function RenovationModal({ property, onClose }) {
  const { renovateProperty } = useGame();
  const [outcome, setOutcome] = useState(null);

  const event = useMemo(() => {
    return renovationEvents[Math.floor(Math.random() * renovationEvents.length)];
  }, []);

  const handleChoice = (choice) => {
    const propVal = property.value ?? property.baseValue ?? 0;
    const cost = Math.round(propVal * choice.costPct);
    const gain = Math.round(propVal * choice.gainPct);
    setOutcome({ choice, cost, gain });
  };

  const handleContinue = () => {
    renovateProperty({
      propertyId: property.id,
      costPct: outcome.choice.costPct,
      gainPct: outcome.choice.gainPct,
      keepUnrenovated: outcome.choice.keepUnrenovated ?? false,
      stress: outcome.choice.stress ?? 0,
    });
    onClose();
  };

  if (outcome) {
    const netGain = outcome.gain - outcome.cost;
    const positive = netGain >= 0;
    return (
      <Modal title="🔨 Résultat des travaux" onClose={onClose}>
        <div className={`outcome outcome-animated ${positive ? 'outcome-positive' : 'outcome-negative'}`} style={{ margin: 0, borderRadius: 12 }}>
          <div className="outcome-icon">{positive ? '🏠' : '😬'}</div>
          <div>{outcome.choice.out}</div>
          <div className="deltas" style={{ marginTop: 10 }}>
            <span className="delta-neg">💸 −{fmtCash(outcome.cost)} travaux</span>
            {outcome.gain > 0 && <span className="delta-pos">📈 +{fmtCash(outcome.gain)} valeur</span>}
            {outcome.choice.stress > 0 && <span className="delta-neg">😰 +{outcome.choice.stress} stress</span>}
            {outcome.choice.stress < 0 && <span className="delta-pos">😌 {outcome.choice.stress} stress</span>}
            {!outcome.choice.keepUnrenovated && <span className="delta-pos">✅ Bien rénové</span>}
          </div>
          <button className="continue-btn" onClick={handleContinue}>Valider →</button>
        </div>
      </Modal>
    );
  }

  const propVal = property.value ?? property.baseValue ?? 0;

  return (
    <Modal title={`🔨 Rénover : ${property.type}`} onClose={onClose}>
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '10px 14px',
        fontSize: 12,
        marginBottom: 4,
      }}>
        <div style={{ color: 'var(--muted)', marginBottom: 4 }}>Valeur actuelle : <strong style={{ color: 'var(--text)' }}>{fmtCash(propVal)}</strong></div>
        <div style={{ color: 'var(--muted)' }}>{property.place}</div>
      </div>

      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{event.title}</div>
      <p className="body-text" style={{ marginBottom: 12 }}>{event.body}</p>

      <div className="choices">
        {event.choices.map((choice, i) => {
          const cost = Math.round(propVal * choice.costPct);
          const gain = Math.round(propVal * choice.gainPct);
          return (
            <button
              key={i}
              className="choice-card choice-card-animated"
              style={{ animationDelay: `${i * 80}ms` }}
              onClick={() => handleChoice(choice)}
            >
              <div>{choice.label}</div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
