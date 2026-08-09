import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import renovationEvents from '../../data/renovation_events.json';

// ─── Incendie : reconstruction à coût fixe 10% ──────────────────────────────

function ReconstructionModal({ property, onClose }) {
  const { renovateProperty } = useGame();
  const propVal = property.value ?? property.baseValue ?? 0;
  const cost    = Math.round(propVal * 0.10);

  const handleConfirm = () => {
    renovateProperty({
      propertyId:      property.id,
      costPct:         0.10,
      gainPct:         0,
      keepUnrenovated: false,
      targetCondition: 'bonEtat',
    });
    onClose();
  };

  return (
    <Modal title="🔥 Reconstruire le bien" onClose={onClose}>
      <div style={{
        background: 'rgba(184,64,46,.08)', border: '1px solid var(--red)',
        borderRadius: 10, padding: '12px 14px', marginBottom: 14,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', marginBottom: 6 }}>
          🔥 Bien sinistré — Reconstruction nécessaire
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          Le bien a perdu 20 % de sa valeur suite à l'incendie. La reconstruction le remettra en état (Bon état) sans changer sa valeur.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
        <Row label="Valeur actuelle (post-incendie)" value={fmtCash(propVal)} />
        <Row label="Coût de reconstruction (10 %)" value={`−${fmtCash(cost)}`} color="var(--red)" />
        <Row label="Condition après travaux" value="Bon état" color="var(--accent)" />
      </div>

      <button
        onClick={handleConfirm}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700,
          background: 'var(--red)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14,
        }}
      >
        🔨 Reconstruire pour {fmtCash(cost)}
      </button>
    </Modal>
  );
}

function Row({ label, value, color = 'var(--text)' }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

// ─── Rénovation normale (aRenover) ───────────────────────────────────────────

export default function RenovationModal({ property, onClose }) {
  if (property.condition === 'incendie') {
    return <ReconstructionModal property={property} onClose={onClose} />;
  }

  return <NormalRenovationModal property={property} onClose={onClose} />;
}

function NormalRenovationModal({ property, onClose }) {
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
