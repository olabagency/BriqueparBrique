import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { useGame } from '../../context/GameContext.jsx';
import { fmtCash } from '../../engine/utils.js';

export default function LoansModal({ onClose }) {
  const { state, repayLoan, renegotiateLoan, clearRenegotiationResult, massRepayLoans } = useGame();
  const { loans = [], propertyList = [], cash, lastRenegotiationResult } = state;

  const [resultBanner, setResultBanner] = useState(null);

  // Show result banner when renegotiation completes
  useEffect(() => {
    if (!lastRenegotiationResult) return;
    setResultBanner(lastRenegotiationResult);
    clearRenegotiationResult();
    const t = setTimeout(() => setResultBanner(null), 5000);
    return () => clearTimeout(t);
  }, [lastRenegotiationResult]); // eslint-disable-line

  const getProperty = (propertyId) => propertyList.find(p => p.id === propertyId);

  const totalYearly    = loans.reduce((s, l) => s + (l.annualPayment ?? l.totalYearly ?? 0), 0);
  const totalRemaining = loans.reduce((s, l) => s + Math.round(l.balance ?? l.remaining ?? 0), 0);
  const totalOriginal  = loans.reduce((s, l) => s + Math.round(l.originalAmount ?? (l.balance ?? 0)), 0);
  const massPayoff     = loans.reduce((s, l) => s + Math.round((l.balance ?? 0) * 1.03), 0);
  const debtRatio      = totalOriginal > 0 ? Math.round((totalRemaining / totalOriginal) * 100) : 0;

  const handleRepay = (loan) => {
    const payoff = Math.round((loan.balance ?? loan.remaining ?? 0) * 1.03);
    if ((cash ?? 0) < payoff) {
      alert(`Trésorerie insuffisante — il te faut ${fmtCash(payoff)}.`);
      return;
    }
    if (window.confirm(`Solder ce crédit pour ${fmtCash(payoff)} (indemnités incluses) ?`)) {
      repayLoan(loan.id);
    }
  };

  const handleRenegotiate = (loan) => {
    if (loan.lastNegotiatedYear === state.year) return;
    const fee = Math.round((loan.balance ?? 0) * 0.01);
    if ((cash ?? 0) < fee) {
      alert(`Trésorerie insuffisante pour payer les frais de renégociation (${fmtCash(fee)}).`);
      return;
    }
    if (window.confirm(
      `Renégocier le taux ?\n\n` +
      `• Frais : ${fmtCash(fee)} (1% du capital restant, prélevés immédiatement)\n` +
      `• En cas de réussite : taux réduit de −0.3 % à −0.5 %\n` +
      `• En cas d'échec : frais perdus, taux inchangé\n\n` +
      `Cette action est irréversible.`
    )) {
      renegotiateLoan(loan.id);
    }
  };

  const handleMassRepay = () => {
    if ((cash ?? 0) < massPayoff) {
      alert(`Trésorerie insuffisante — il te faut ${fmtCash(massPayoff)}.`);
      return;
    }
    if (window.confirm(`Racheter en masse tes ${loans.length} crédits pour ${fmtCash(massPayoff)} (indemnités incluses) ?`)) {
      massRepayLoans();
    }
  };

  if (loans.length === 0) {
    return (
      <Modal title="💳 Mes crédits" onClose={onClose} wide>
        <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--muted)', fontSize: 13 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🎉</div>
          Aucun crédit en cours — tous tes biens sont financés en fonds propres.
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`💳 Mes crédits (${loans.length})`} onClose={onClose} wide>

      {/* Result banner */}
      {resultBanner && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
          background: resultBanner.success ? 'rgba(31,122,77,.12)' : 'rgba(184,64,46,.1)',
          border: `1px solid ${resultBanner.success ? 'rgba(31,122,77,.3)' : 'rgba(184,64,46,.3)'}`,
          color: resultBanner.success ? 'var(--accent)' : 'var(--red)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>{resultBanner.success ? '✅' : '❌'}</span>
          <div>
            {resultBanner.success
              ? `Renégociation réussie ! Nouveau taux : ${(resultBanner.rateAfter * 100).toFixed(2)}% (−${((resultBanner.rateBefore - resultBanner.rateAfter) * 100).toFixed(2)}%). Économie : ${fmtCash(resultBanner.saving)}/an.`
              : `Renégociation refusée par la banque. Frais de ${fmtCash(resultBanner.fee)} prélevés.`}
          </div>
        </div>
      )}

      {/* Aggregate summary */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{
          flex: 1, background: 'rgba(184,64,46,.07)', border: '1px solid rgba(184,64,46,.2)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            Annuités
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: 'var(--red)' }}>
            −{fmtCash(totalYearly)}/an
          </div>
        </div>
        <div style={{
          flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 14px',
        }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 4 }}>
            Capital restant
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: 'var(--text)' }}>
            {fmtCash(totalRemaining)}
          </div>
        </div>
      </div>

      {/* Global progress bar */}
      {totalOriginal > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
            <span>Remboursé à {100 - debtRatio}%</span>
            <span>{fmtCash(totalOriginal - totalRemaining)} / {fmtCash(totalOriginal)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${100 - debtRatio}%`,
              background: debtRatio < 30 ? 'var(--accent)' : debtRatio < 70 ? 'var(--amber)' : 'var(--red)',
              borderRadius: 4, transition: 'width .4s',
            }} />
          </div>
        </div>
      )}

      {/* Mass repay */}
      {loans.length >= 2 && (
        <button
          onClick={handleMassRepay}
          disabled={(cash ?? 0) < massPayoff}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 10, fontWeight: 700,
            background: (cash ?? 0) >= massPayoff ? 'rgba(184,64,46,.1)' : 'var(--surface2)',
            border: `1px solid ${(cash ?? 0) >= massPayoff ? 'var(--red)' : 'var(--border)'}`,
            color: (cash ?? 0) >= massPayoff ? 'var(--red)' : 'var(--muted)',
            cursor: (cash ?? 0) >= massPayoff ? 'pointer' : 'not-allowed',
            fontSize: 12,
          }}
        >
          📦 Solder tous les crédits · {fmtCash(massPayoff)}
        </button>
      )}

      {/* Loan cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loans.map(loan => {
          const prop      = getProperty(loan.propertyId);
          const balance   = Math.round(loan.balance ?? loan.remaining ?? 0);
          const original  = Math.round(loan.originalAmount ?? balance);
          const payoff    = Math.round(balance * 1.03);
          const reNegFee  = Math.round(balance * 0.01);
          const canRepay  = (cash ?? 0) >= payoff;
          const canReNeg  = (cash ?? 0) >= reNegFee;
          const alreadyNeg = loan.lastNegotiatedYear === state.year;
          const pctDone   = original > 0 ? Math.round(((original - balance) / original) * 100) : 0;
          const rate      = ((loan.rate ?? 0.02) * 100).toFixed(2);

          return (
            <div
              key={loan.id}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px',
                borderColor: resultBanner?.loanId === loan.id
                  ? (resultBanner.success ? 'rgba(31,122,77,.4)' : 'rgba(184,64,46,.4)')
                  : undefined,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                    {prop ? `${prop.type}` : 'Bien vendu'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                    {prop?.place ?? ''} · {rate}% · {loan.yearsRemaining ?? '?'} an{(loan.yearsRemaining ?? 0) > 1 ? 's' : ''} restant{(loan.yearsRemaining ?? 0) > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: 'var(--red)' }}>
                    −{fmtCash(loan.annualPayment ?? loan.totalYearly ?? 0)}/an
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                    Capital restant : {fmtCash(balance)}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pctDone}%`,
                    background: pctDone >= 70 ? 'var(--accent)' : pctDone >= 30 ? 'var(--amber)' : 'var(--red)',
                    borderRadius: 3, transition: 'width .4s',
                  }} />
                </div>
                <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3, textAlign: 'right' }}>
                  {pctDone}% remboursé
                </div>
              </div>

              {/* Renegotiate info */}
              {!alreadyNeg && (
                <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6, padding: '5px 8px', background: 'var(--surface)', borderRadius: 6 }}>
                  Renégociation : frais {fmtCash(reNegFee)} · −0.3 à −0.5% si accepté
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleRenegotiate(loan)}
                  disabled={alreadyNeg || !canReNeg}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 600,
                    background: 'var(--surface)',
                    border: `1px solid ${alreadyNeg ? 'var(--border)' : canReNeg ? 'var(--amber)' : 'var(--border)'}`,
                    color: alreadyNeg ? 'var(--muted)' : canReNeg ? 'var(--amber)' : 'var(--muted)',
                    cursor: (alreadyNeg || !canReNeg) ? 'not-allowed' : 'pointer',
                    opacity: (alreadyNeg || !canReNeg) ? 0.5 : 1,
                  }}
                  title={alreadyNeg ? 'Déjà renégocié cette année' : !canReNeg ? `Frais insuffisants (${fmtCash(reNegFee)})` : `Frais : ${fmtCash(reNegFee)}`}
                >
                  {alreadyNeg ? '🔄 Renégocié' : `🔄 Renégocier`}
                </button>
                <button
                  onClick={() => handleRepay(loan)}
                  disabled={!canRepay}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    background: canRepay ? 'rgba(184,64,46,.1)' : 'var(--surface)',
                    border: `1px solid ${canRepay ? 'var(--red)' : 'var(--border)'}`,
                    color: canRepay ? 'var(--red)' : 'var(--muted)',
                    cursor: canRepay ? 'pointer' : 'not-allowed',
                    opacity: !canRepay ? 0.5 : 1,
                  }}
                  title={!canRepay ? `Il te faut ${fmtCash(payoff)}` : `Solder ce crédit`}
                >
                  Solder · {fmtCash(payoff)}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
