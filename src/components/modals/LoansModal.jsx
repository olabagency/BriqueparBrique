import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';

export default function LoansModal({ onClose }) {
  const { state, repayLoan, renegotiateLoan, massRepayLoans } = useGame();
  const { loans = [], propertyList = [], cash } = state;

  const getPropertyName = (propertyId) => {
    const prop = propertyList.find(p => p.id === propertyId);
    return prop ? `${prop.type} — ${prop.place}` : 'Bien vendu';
  };

  const totalYearly    = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const totalRemaining = loans.reduce((s, l) => s + Math.round(l.balance ?? l.remaining ?? 0), 0);
  const massPayoff     = loans.reduce((s, l) => s + Math.round((l.balance ?? 0) * 1.03), 0);

  const handleRepay = (loan) => {
    const payoff = Math.round((loan.balance ?? loan.remaining ?? 0) * 1.03);
    if ((cash ?? 0) < payoff) {
      alert(`Trésorerie insuffisante pour ce remboursement anticipé (il te faut ${fmtCash(payoff)}).`);
      return;
    }
    if (window.confirm(`Rembourser intégralement ce crédit pour ${fmtCash(payoff)} (indemnités de remboursement anticipé incluses) ?`)) {
      repayLoan(loan.id);
    }
  };

  const handleRenegotiate = (loan) => {
    if (loan.lastNegotiatedYear === state.year) return;
    const reduction = 0.3 + Math.random() * 0.2;
    if (window.confirm(`Renégocier le taux de ce crédit ? Réduction estimée : -${reduction.toFixed(1)}%\n\nLe résultat exact dépendra de la négociation.`)) {
      renegotiateLoan(loan.id);
    }
  };

  const handleMassRepay = () => {
    if ((cash ?? 0) < massPayoff) {
      alert(`Trésorerie insuffisante pour racheter tous les crédits (il te faut ${fmtCash(massPayoff)}).`);
      return;
    }
    if (window.confirm(`Racheter en masse tes ${loans.length} crédits pour ${fmtCash(massPayoff)} au total (indemnités incluses) ?`)) {
      massRepayLoans();
    }
  };

  return (
    <Modal title={`💳 Mes emprunts (${loans.length})`} onClose={onClose}>
      {loans.length === 0 ? (
        <p className="portfolio-empty">Tu n'as aucun crédit en cours — tous tes biens sont payés comptant.</p>
      ) : (
        <>
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Remboursements annuels</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtCash(totalYearly)}/an</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Capital restant dû</span>
              <span style={{ fontWeight: 700 }}>{fmtCash(totalRemaining)}</span>
            </div>
          </div>

          {loans.length >= 2 && (
            <button
              className="btn-ghost"
              style={{ width: '100%', marginBottom: 4 }}
              onClick={handleMassRepay}
            >
              📦 Racheter en masse tes {loans.length} crédits · {fmtCash(massPayoff)}
            </button>
          )}

          <div className="portfolio-list">
            {loans.map(loan => {
              const payoff = Math.round((loan.balance ?? loan.remaining ?? 0) * 1.03);
              const canRepay = (cash ?? 0) >= payoff;
              const alreadyNeg = loan.lastNegotiatedYear === state.year;
              return (
                <div className="loan-card" key={loan.id}>
                  <div className="loan-info">
                    <span className="loan-name">{getPropertyName(loan.propertyId)}</span>
                    <span className="loan-details">
                      Reste dû : {fmtCash(Math.round(loan.balance ?? loan.remaining ?? 0))}
                      {' · '}{loan.yearsRemaining ?? '?'} an{(loan.yearsRemaining ?? 0) > 1 ? 's' : ''} restant{(loan.yearsRemaining ?? 0) > 1 ? 's' : ''}
                      {' · '}{Math.round((loan.rate ?? 0.02) * 1000) / 10}%
                      {' · '}{fmtCash(loan.annualPayment ?? loan.totalYearly ?? 0)}/an
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <button
                      className="portfolio-renovate-btn"
                      disabled={alreadyNeg}
                      style={{ opacity: alreadyNeg ? 0.5 : 1, fontSize: 11 }}
                      onClick={() => handleRenegotiate(loan)}
                      title={alreadyNeg ? 'Une seule renégociation par bien par an' : ''}
                    >
                      {alreadyNeg ? '🔄 Déjà négocié' : '🔄 Renégocier'}
                    </button>
                    <button
                      className="portfolio-sell-btn"
                      disabled={!canRepay}
                      style={{ fontSize: 11 }}
                      onClick={() => handleRepay(loan)}
                      title={!canRepay ? `Il te faut ${fmtCash(payoff)} pour rembourser` : ''}
                    >
                      Solder · {fmtCash(payoff)}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
