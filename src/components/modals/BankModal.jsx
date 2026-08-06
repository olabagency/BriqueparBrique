import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { RETIREMENT_MIN_AGE } from '../../config.js';

const BANK_MAX_OPS = 2;
const WITHDRAW_FEE = 0.08;
const INJECT_FEE   = 0.02;

function TransferButton({ label, amount, disabled, onClick, variant = 'neutral' }) {
  const colors = {
    neutral: { bg: 'var(--surface2)', border: 'var(--border)', color: 'var(--text)' },
    out:     { bg: 'rgba(184,64,46,.08)', border: 'var(--red)', color: 'var(--red)' },
    in:      { bg: 'var(--accent-soft)', border: 'var(--accent)', color: 'var(--accent)' },
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: '1 1 calc(50% - 4px)', minWidth: 0,
        padding: '8px 6px', borderRadius: 10,
        background: disabled ? 'var(--surface2)' : colors.bg,
        border: `1px solid ${disabled ? 'var(--border)' : colors.border}`,
        color: disabled ? 'var(--muted)' : colors.color,
        fontSize: 11.5, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, textAlign: 'center', lineHeight: 1.3,
      }}
    >
      <div>{label}</div>
      <div style={{ fontFamily: 'monospace', fontSize: 13, marginTop: 2 }}>{fmtCash(amount)}</div>
    </button>
  );
}

const SALARY_LEVELS = [
  { id: 'none',        label: 'Aucun salaire',   annual: 0,   desc: 'Tout reste en trésorerie' },
  { id: 'modest',      label: 'Modeste',          annual: 8,   desc: '8 k€/an → épargne perso' },
  { id: 'comfortable', label: 'Confortable',      annual: 20,  desc: '20 k€/an → épargne perso' },
  { id: 'high',        label: 'Élevé',            annual: 45,  desc: '45 k€/an → épargne perso' },
];

export default function BankModal({ onClose }) {
  const { state, retire, bankWithdraw, bankInject, changeSalary } = useGame();
  const { cash, personalCash, age, bankOpsThisYear = 0, salary = 'none', year = 1, lastSalaryChangeYear = 0 } = state;
  const SALARY_COOLDOWN = 3;
  const canChangeSalary = (year - lastSalaryChangeYear) >= SALARY_COOLDOWN || lastSalaryChangeYear === 0;

  const opsRemaining = Math.max(0, BANK_MAX_OPS - bankOpsThisYear);
  const canOperate   = opsRemaining > 0;
  const canRetire    = age >= RETIREMENT_MIN_AGE;
  const yearsLeft    = Math.max(0, RETIREMENT_MIN_AGE - age);

  const handleWithdraw = (pct) => {
    if (!canOperate) { alert("Limite d'opérations bancaires atteinte pour cette année."); return; }
    if ((cash ?? 0) <= 0) { alert('Trésorerie vide, rien à retirer.'); return; }
    const amount = Math.round((cash ?? 0) * pct);
    const fee    = Math.round(amount * WITHDRAW_FEE);
    const net    = amount - fee;
    if (window.confirm(`Retirer ${fmtCash(amount)} de la trésorerie ?\nFrais ${Math.round(WITHDRAW_FEE * 100)}% = ${fmtCash(fee)}\nReçu en épargne : ${fmtCash(net)}`)) {
      bankWithdraw(pct);
    }
  };

  const handleInject = (pct) => {
    if (!canOperate) { alert("Limite d'opérations bancaires atteinte pour cette année."); return; }
    if ((personalCash ?? 0) <= 0) { alert('Épargne vide, rien à injecter.'); return; }
    const amount = Math.round((personalCash ?? 0) * pct);
    const fee    = Math.round(amount * INJECT_FEE);
    const net    = amount - fee;
    if (window.confirm(`Injecter ${fmtCash(amount)} dans la trésorerie ?\nFrais ${Math.round(INJECT_FEE * 100)}% = ${fmtCash(fee)}\nReçu en tréso : ${fmtCash(net)}`)) {
      bankInject(pct);
    }
  };

  const handleRetire = () => {
    if (window.confirm('Prendre ta retraite ? Cette action clôt définitivement la partie.')) {
      retire();
      onClose();
    }
  };

  return (
    <Modal title="🏦 Compte" onClose={onClose} wide>

      {/* Balance cards */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          flex: 1, background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px',
          border: `1px solid ${(cash ?? 0) < 0 ? 'var(--red)' : 'var(--border)'}`,
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            💰 Trésorerie
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: (cash ?? 0) < 0 ? 'var(--red)' : 'var(--accent)' }}>
            {fmtCash(cash ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Compte entreprise</div>
        </div>
        <div style={{
          flex: 1, background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            👤 Épargne perso
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
            {fmtCash(personalCash ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Compte personnel</div>
        </div>
      </div>

      {/* Ops counter */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderRadius: 8,
        background: canOperate ? 'var(--accent-soft)' : 'rgba(184,64,46,.07)',
        border: `1px solid ${canOperate ? 'rgba(31,122,77,.2)' : 'rgba(184,64,46,.2)'}`,
        fontSize: 11.5, color: 'var(--muted)',
      }}>
        <span style={{ fontSize: 14 }}>{canOperate ? '✅' : '🔒'}</span>
        {canOperate
          ? <span><strong style={{ color: 'var(--text)' }}>{opsRemaining}</strong> opération{opsRemaining > 1 ? 's' : ''} restante{opsRemaining > 1 ? 's' : ''} cette année</span>
          : <span style={{ color: 'var(--red)' }}>Limite atteinte — disponible l'année prochaine</span>
        }
      </div>

      {/* Withdraw */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
          Retirer vers l'épargne <span style={{ fontWeight: 400, color: 'var(--red)' }}>· frais {Math.round(WITHDRAW_FEE * 100)}%</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0.25, 0.5, 0.75, 1].map(pct => {
            const amount = Math.max(0, Math.round((cash ?? 0) * pct));
            const net    = amount - Math.round(amount * WITHDRAW_FEE);
            return (
              <TransferButton
                key={pct}
                label={`${Math.round(pct * 100)}% → épargne`}
                amount={net}
                disabled={!canOperate || (cash ?? 0) <= 0}
                onClick={() => handleWithdraw(pct)}
                variant="out"
              />
            );
          })}
        </div>
      </div>

      {/* Inject */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
          Injecter dans la tréso <span style={{ fontWeight: 400, color: 'var(--accent)' }}>· frais {Math.round(INJECT_FEE * 100)}%</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[0.25, 0.5, 0.75, 1].map(pct => {
            const amount = Math.max(0, Math.round((personalCash ?? 0) * pct));
            const net    = amount - Math.round(amount * INJECT_FEE);
            return (
              <TransferButton
                key={pct}
                label={`${Math.round(pct * 100)}% → tréso`}
                amount={net}
                disabled={!canOperate || (personalCash ?? 0) <= 0}
                onClick={() => handleInject(pct)}
                variant="in"
              />
            );
          })}
        </div>
      </div>

      {/* Salary */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>
          💼 Salaire fondateur
          {!canChangeSalary && (
            <span style={{ fontWeight: 400, color: 'var(--amber)', marginLeft: 8 }}>
              · modifiable dans {SALARY_COOLDOWN - (year - lastSalaryChangeYear)} an(s)
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {SALARY_LEVELS.map(lvl => {
            const isActive = (salary || 'none') === lvl.id;
            return (
              <button
                key={lvl.id}
                disabled={!canChangeSalary && !isActive}
                onClick={() => { if (!isActive) changeSalary(lvl.id); }}
                style={{
                  padding: '8px 10px', borderRadius: 10, textAlign: 'left',
                  background: isActive ? 'var(--accent-soft)' : 'var(--surface2)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  cursor: (!canChangeSalary && !isActive) ? 'not-allowed' : isActive ? 'default' : 'pointer',
                  opacity: (!canChangeSalary && !isActive) ? 0.45 : 1,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700 }}>{lvl.label}{isActive ? ' ✓' : ''}</div>
                <div style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--muted)', marginTop: 2 }}>{lvl.desc}</div>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
          Le salaire est prélevé de la trésorerie chaque année et versé sur ton épargne personnelle.
        </div>
      </div>

      {/* Retirement */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        {canRetire ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              Tu as {age} ans — la retraite est possible. Clôture la partie pour découvrir ton bilan.
            </div>
            <button
              onClick={handleRetire}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 10, fontWeight: 700,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14,
              }}
            >
              🏖️ Prendre ma retraite
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 12 }}>
            <span style={{ fontSize: 20 }}>🏖️</span>
            <span>Retraite disponible à {RETIREMENT_MIN_AGE} ans — encore <strong style={{ color: 'var(--text)' }}>{yearsLeft} an{yearsLeft > 1 ? 's' : ''}</strong></span>
          </div>
        )}
      </div>
    </Modal>
  );
}
