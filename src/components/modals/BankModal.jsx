import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';
import { calcRent as calcRentEngine } from '../../engine/market.js';
import { RETIREMENT_MIN_AGE } from '../../config.js';

const BANK_MAX_OPS = 2;
const WITHDRAW_FEE = 0.08;
const INJECT_FEE   = 0.02;

export default function BankModal({ onClose }) {
  const { state, retire, bankWithdraw, bankInject } = useGame();
  const { cash, personalCash, valuation, propertyList = [], loans = [], age, bankOpsThisYear = 0 } = state;
  const properties   = propertyList;
  const totalRent    = properties.filter(p => p.rented).reduce((s, p) => s + calcRentEngine(p), 0);
  const totalYearly  = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const netCashflow  = totalRent - totalYearly;
  const totalWealth  = (valuation ?? 0) + (personalCash ?? 0) + (cash ?? 0);
  const canRetire    = age >= RETIREMENT_MIN_AGE;
  const opsRemaining = Math.max(0, BANK_MAX_OPS - bankOpsThisYear);
  const canOperate   = opsRemaining > 0;

  const handleWithdraw = (pct) => {
    if (!canOperate) { alert("Tu as atteint la limite d'opérations bancaires pour cette année."); return; }
    if ((cash ?? 0) <= 0) { alert('Ta trésorerie est vide, rien à retirer.'); return; }
    const amount = Math.round((cash ?? 0) * pct);
    const fee    = Math.round(amount * WITHDRAW_FEE);
    const net    = amount - fee;
    if (window.confirm(`Retirer ${fmtCash(amount)} de la trésorerie ? Frais : ${fmtCash(fee)}. Tu recevras net ${fmtCash(net)} sur ton épargne personnelle.`)) {
      bankWithdraw(pct);
    }
  };

  const handleInject = (pct) => {
    if (!canOperate) { alert("Tu as atteint la limite d'opérations bancaires pour cette année."); return; }
    if ((personalCash ?? 0) <= 0) { alert('Ton épargne personnelle est vide, rien à injecter.'); return; }
    const amount = Math.round((personalCash ?? 0) * pct);
    const fee    = Math.round(amount * INJECT_FEE);
    const net    = amount - fee;
    if (window.confirm(`Injecter ${fmtCash(amount)} dans la trésorerie ? Frais : ${fmtCash(fee)}. La trésorerie recevra ${fmtCash(net)}.`)) {
      bankInject(pct);
    }
  };

  const handleRetire = () => {
    if (window.confirm('Prendre ta retraite maintenant ? Cette action met fin à la partie.')) {
      retire();
      onClose();
    }
  };

  return (
    <Modal title="🏦 Bilan financier" onClose={onClose}>
      {/* Wealth overview */}
      <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.03em', fontWeight: 700 }}>
          Patrimoine total
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent)' }}>
          {fmtCash(totalWealth)}
        </div>
      </div>

      {/* Breakdown */}
      <div>
        <div className="finance-section-title">Détail du patrimoine</div>
        <div className="finance-row">
          <span className="finance-row-label">🏠 Patrimoine immobilier</span>
          <span className="finance-row-value is-income">{fmtCash(valuation ?? 0)}</span>
        </div>
        <div className="finance-row">
          <span className="finance-row-label">💰 Trésorerie entreprise</span>
          <span className={`finance-row-value ${cash >= 0 ? 'is-income' : 'is-expense'}`}>{fmtCash(cash)}</span>
        </div>
        <div className="finance-row">
          <span className="finance-row-label">👤 Épargne personnelle</span>
          <span className="finance-row-value is-income">{fmtCash(personalCash)}</span>
        </div>
      </div>

      {/* Cashflow */}
      <div>
        <div className="finance-section-title">Flux annuels</div>
        <div className="finance-row">
          <span className="finance-row-label">📬 Loyers perçus</span>
          <span className="finance-row-value is-income">+{fmtCash(totalRent)}/an</span>
        </div>
        <div className="finance-row">
          <span className="finance-row-label">💳 Remboursements crédit</span>
          <span className="finance-row-value is-expense">−{fmtCash(totalYearly)}/an</span>
        </div>
        <div className="finance-net">
          <span>Cash-flow net</span>
          <span style={{ color: netCashflow >= 0 ? 'var(--accent)' : 'var(--red)' }}>
            {netCashflow >= 0 ? '+' : ''}{fmtCash(netCashflow)}/an
          </span>
        </div>
      </div>

      {/* Bank transfers */}
      <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div className="finance-row">
          <span className="finance-row-label">Trésorerie</span>
          <span className="finance-row-value">{fmtCash(cash)}</span>
        </div>
        <div className="finance-row">
          <span className="finance-row-label">Épargne personnelle</span>
          <span className="finance-row-value">{fmtCash(personalCash)}</span>
        </div>
        <p className="hint" style={{ margin: '8px 0', fontSize: 11.5 }}>
          {opsRemaining} opération{opsRemaining > 1 ? 's' : ''} restante{opsRemaining > 1 ? 's' : ''} cette année
          · frais de {Math.round(WITHDRAW_FEE * 100)}% en retrait, {Math.round(INJECT_FEE * 100)}% en injection.
        </p>

        <div className="finance-section-title">Retirer vers mon épargne</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[0.25, 0.5, 0.75, 1].map(pct => {
            const amount = Math.max(0, Math.round((cash ?? 0) * pct));
            const disabled = !canOperate || (cash ?? 0) <= 0;
            return (
              <button
                key={pct}
                className="portfolio-renovate-btn"
                disabled={disabled}
                style={{ opacity: disabled ? 0.5 : 1 }}
                onClick={() => handleWithdraw(pct)}
              >
                {Math.round(pct * 100)}% · {fmtCash(amount)}
              </button>
            );
          })}
        </div>

        <div className="finance-section-title">Injecter dans la trésorerie</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {[0.25, 0.5, 0.75, 1].map(pct => {
            const amount = Math.max(0, Math.round((personalCash ?? 0) * pct));
            const disabled = !canOperate || (personalCash ?? 0) <= 0;
            return (
              <button
                key={pct}
                className="portfolio-sell-btn"
                disabled={disabled}
                style={{ opacity: disabled ? 0.5 : 1 }}
                onClick={() => handleInject(pct)}
              >
                {Math.round(pct * 100)}% · {fmtCash(amount)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Retirement */}
      <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {canRetire ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 10 }}>
              Tu as l'âge de prendre ta retraite. Clôture la partie ici et découvre ton bilan final.
            </p>
            <button className="btn-primary" onClick={handleRetire} style={{ background: 'var(--accent)' }}>
              🏖️ Prendre ma retraite
            </button>
          </>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
            La retraite sera possible à {RETIREMENT_MIN_AGE} ans (encore {RETIREMENT_MIN_AGE - age} ans).
          </p>
        )}
      </div>
    </Modal>
  );
}
