import React from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';

export default function LoansModal({ onClose }) {
  const { state, repayLoan } = useGame();
  const { loans = [], propertyList = [], cash } = state;
  const properties = propertyList;

  const getPropertyName = (propertyId) => {
    const prop = properties.find(p => p.id === propertyId);
    return prop ? `${prop.type} — ${prop.place}` : 'Bien vendu';
  };

  const totalYearly = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const totalRemaining = loans.reduce((s, l) => s + (l.balance ?? l.remaining ?? 0), 0);

  return (
    <Modal title={`💳 Mes emprunts (${loans.length})`} onClose={onClose}>
      {loans.length === 0 ? (
        <p className="portfolio-empty">Aucun emprunt en cours. 🎉</p>
      ) : (
        <>
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Mensualités totales</span>
              <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtCash(totalYearly / 12)}/mois</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--muted)' }}>Capital restant dû</span>
              <span style={{ fontWeight: 700 }}>{fmtCash(totalRemaining)}</span>
            </div>
          </div>

          <div className="portfolio-list">
            {loans.map(loan => {
              const canRepay = cash >= (loan.balance ?? loan.remaining ?? 0);
              return (
                <div className="loan-card" key={loan.id}>
                  <div className="loan-info">
                    <span className="loan-name">{getPropertyName(loan.propertyId)}</span>
                    <span className="loan-details">
                      Restant : {fmtCash(loan.balance ?? loan.remaining)} · Mensualité : {fmtCash(loan.monthlyPayment)}/mois
                    </span>
                    <span className="loan-details" style={{ color: 'var(--muted)' }}>
                      Taux : {((loan.interestRate ?? 0.02) * 100).toFixed(1)}% · {loan.termYears} ans
                    </span>
                  </div>
                  <button
                    className="loan-repay-btn"
                    disabled={!canRepay}
                    onClick={() => {
                      if (window.confirm(`Rembourser {fmtCash(loan.balance ?? loan.remaining)} ?`)) repayLoan(loan.id);
                    }}
                    title={!canRepay ? `Il te faut ${fmtCash(loan.balance ?? loan.remaining)} pour rembourser` : 'Rembourser par anticipation'}
                  >
                    Solder
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
